'use client';

import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { addToast, removeToast, clearToasts, Toast } from '@/lib/redux/features/toastSlice';
import { useCallback } from 'react';

export function useReduxToast() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.toast.toasts);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const toastId = dispatch(addToast(toast)).payload;
    
    // Auto remove toast after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      dispatch(removeToast(toastId as unknown as string));
    }, duration);
    
    return toastId;
  }, [dispatch]);

  const hideToast = useCallback((id: string) => {
    dispatch(removeToast(id));
  }, [dispatch]);

  const clearAllToasts = useCallback(() => {
    dispatch(clearToasts());
  }, [dispatch]);

  // Convenience methods
  const success = useCallback((title: string, description?: string) => {
    return showToast({ type: 'success', title, description });
  }, [showToast]);

  const error = useCallback((title: string, description?: string) => {
    return showToast({ type: 'error', title, description });
  }, [showToast]);

  const warning = useCallback((title: string, description?: string) => {
    return showToast({ type: 'warning', title, description });
  }, [showToast]);

  const info = useCallback((title: string, description?: string) => {
    return showToast({ type: 'info', title, description });
  }, [showToast]);

  return {
    toasts,
    addToast: showToast,
    removeToast: hideToast,
    clearToasts: clearAllToasts,
    success,
    error,
    warning,
    info,
  };
}