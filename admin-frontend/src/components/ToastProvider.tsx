// src/components/ToastProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface Toast {
  id: number;
  message: string;
  variant: 'error' | 'success';
}

interface ToastContextType {
  showToast: (message: string, variant?: 'error' | 'success') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function showToast(message: string, variant: 'error' | 'success' = 'error') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  // Listen for the custom event fired by the axios interceptor on 403
  useEffect(() => {
    function handleForbidden(e: Event) {
      const detail = (e as CustomEvent).detail;
      showToast(detail?.message ?? 'You do not have permission to do this.', 'error');
    }
    window.addEventListener('app:forbidden', handleForbidden);
    return () => window.removeEventListener('app:forbidden', handleForbidden);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm text-white ${
              toast.variant === 'error' ? 'bg-red-600' : 'bg-emerald-600'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}