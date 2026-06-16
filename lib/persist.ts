// Lightweight store persistence for AsyncStorage.
//
// We intentionally avoid `zustand/middleware`'s `persist` because that barrel
// also pulls in the `devtools` middleware, which contains `import.meta.env`
// that Metro's web bundler cannot transform (crashes the bundle). This helper
// hydrates a store from AsyncStorage on startup and writes a debounced subset
// of state back on every change.
import AsyncStorage from "@react-native-async-storage/async-storage";

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

  // Persist a debounced snapshot on change.
  let timer: ReturnType<typeof setTimeout> | null = null;
  store.subscribe((state) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      AsyncStorage.setItem(key, JSON.stringify(pick(state))).catch(() => {});
    }, 150);
  });
}
