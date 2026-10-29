import { create } from "zustand";
import { normalizeDialog, type AlertButton, type DialogSpec } from "./dialog-core";

interface DialogState {
  current: DialogSpec | null;
  open: (title: string, message?: string, buttons?: AlertButton[]) => void;
  /** Close the dialog, then run the chosen button's action. */
  choose: (button: AlertButton) => void;
  dismiss: () => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  current: null,
  open: (title, message, buttons) => set({ current: normalizeDialog(title, message, buttons) }),
  choose: (button) => {
    if (!get().current) return;
    set({ current: null });
    void button.onPress?.();
  },
  // Tapping outside / hardware back behaves like Cancel when there is one, otherwise just closes.
  dismiss: () => {
    const cancel = get().current?.buttons.find((b) => b.style === "cancel");
    set({ current: null });
    void cancel?.onPress?.();
  },
}));
