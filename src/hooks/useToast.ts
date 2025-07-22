import { useState, useCallback } from 'react';
import type { Toast } from '../components/ToastNotification';

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((
    toast: Omit<Toast, 'id'> | string,
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    const newToast: Toast = typeof toast === 'string' 
      ? {
        id,
        type: 'info',
        message: toast,
      }
      : {
        id,
        ...toast,
      };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    return addToast({
      type: 'success',
      message,
      ...options,
    });
  }, [addToast]);

  const error = useCallback((message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    return addToast({
      type: 'error',
      message,
      duration: 7000, // Errors stay longer by default
      ...options,
    });
  }, [addToast]);

  const warning = useCallback((message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    return addToast({
      type: 'warning',
      message,
      ...options,
    });
  }, [addToast]);

  const info = useCallback((message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    return addToast({
      type: 'info',
      message,
      ...options,
    });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
  };
}