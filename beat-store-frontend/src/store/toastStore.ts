// /store/toastStore.ts
import { create } from 'zustand';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

interface ToastState {
  open: boolean;
  message: string;
  severity: ToastSeverity;
  autoHideDuration: number;
  show: (message: string, severity?: ToastSeverity, autoHideDuration?: number) => void;
  close: () => void;
}

export const useToastStore = create<ToastState>(set => ({
  open: false,
  message: '',
  severity: 'info',
  autoHideDuration: 3000,
  show: (message, severity = 'info', autoHideDuration = 3000) =>
    set({ open: true, message, severity, autoHideDuration }),
  close: () => set({ open: false }),
}));
