// Lightweight store persistence for AsyncStorage.
//
// We intentionally avoid `zustand/middleware`'s `persist` because that barrel
// also pulls in the `devtools` middleware, which contains `import.meta.env`
// that Metro's web bundler cannot transform (crashes the bundle). This helper
// hydrates a store from AsyncStorage on startup and writes a debounced subset
// of state back on every change.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerSyncTarget, pushState, isCloudSyncActive } from "./cloud-sync";

interface StoreApi<T> {
  getState: () => T;
  setState: (partial: Partial<T>) => void;
  subscribe: (listener: (state: T) => void) => () => void;
}

export function attachPersistence<T extends object>(
  store: StoreApi<T>,
  key: string,
  pick: (state: T) => Partial<T>,
  options?: { onHydrated?: (state: T) => void }
) {
  // Hydrate once on startup.
  AsyncStorage.getItem(key)
    .then((raw) => {
      if (raw) {
        try {
          store.setState(JSON.parse(raw) as Partial<T>);
        } catch {
          // ignore corrupt payloads
        }
      }
    })
    .finally(() => {
      options?.onHydrated?.(store.getState());
    });

  // Register this store for cloud sync (Supabase). `read` returns the current
  // snapshot to upload; `apply` merges a snapshot pulled from the cloud and
  // mirrors it to AsyncStorage so the two stay in step.
  registerSyncTarget({
    key,
    read: () => pick(store.getState()) as Record<string, unknown>,
    apply: (data) => {
      store.setState(data as Partial<T>);
      AsyncStorage.setItem(key, JSON.stringify(data)).catch(() => {});
    },
  });

  // Persist a debounced snapshot on change — to AsyncStorage always, and to the
  // cloud when a user is signed in.
  let timer: ReturnType<typeof setTimeout> | null = null;
  store.subscribe((state) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const snapshot = pick(state);
      AsyncStorage.setItem(key, JSON.stringify(snapshot)).catch(() => {});
      if (isCloudSyncActive()) {
        pushState(key, snapshot as Record<string, unknown>).catch(() => {});
      }
    }, 150);
  });
}
