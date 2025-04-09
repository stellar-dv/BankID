import React from 'react';
import { useToast } from './use-toast';
import { ToastContainer } from './toast';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, dismissToast } = useToast();

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}; 