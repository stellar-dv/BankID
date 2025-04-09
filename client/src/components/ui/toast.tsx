import { type HTMLAttributes, createContext, useContext } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toast as ToastType, useToast, ToastOptions } from './use-toast';

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        success: 'border-green-500 bg-green-500 text-white',
        error: 'border-red-500 bg-red-500 text-white',
        warning: 'border-yellow-500 bg-yellow-500 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface ToastProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof toastVariants> {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss, className, variant, ...props }: ToastProps) {
  return (
    <div
      className={cn(toastVariants({ variant: toast.type || variant }), className)}
      {...props}
    >
      <div className="grid gap-1">
        <ToastTitle>{toast.title}</ToastTitle>
        {toast.description && (
          <ToastDescription>{toast.description}</ToastDescription>
        )}
      </div>
      <ToastClose onClick={() => onDismiss(toast.id)} />
    </div>
  );
}

export function ToastClose({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
      onClick={onClick}
    >
      <X className="h-4 w-4" />
    </button>
  );
}

export function ToastDescription({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm opacity-90">
      {children}
    </div>
  );
}

export function ToastTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-semibold">
      {children}
    </div>
  );
}

export const ToastContainer: React.FC<{ toasts: ToastType[]; onDismiss: (id: string) => void }> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <ToastViewport>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </ToastViewport>
  );
};

export function ToastViewport({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {children}
    </div>
  );
}

interface ToastContextType {
  toasts: ToastType[];
  toast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toastState = useToast();

  return (
    <ToastContext.Provider value={toastState}>
      {children}
      <ToastContainer toasts={toastState.toasts} onDismiss={toastState.dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}
