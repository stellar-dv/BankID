import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type ToastType = 'default' | 'success' | 'error' | 'warning';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

export interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
  type?: ToastType;
}

const DEFAULT_TOAST_DURATION = 5000; // 5 seconds

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, duration = DEFAULT_TOAST_DURATION, type = 'default' }: ToastOptions) => {
    const id = uuidv4();
    const newToast: Toast = {
      id,
      title,
      description,
      type,
      duration,
    };

    setToasts((currentToasts) => [...currentToasts, newToast]);

    if (duration !== Infinity) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  return {
    toast,
    toasts,
    dismissToast,
  };
}; 