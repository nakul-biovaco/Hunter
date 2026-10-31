import React, { useState, useEffect } from 'react';
import { Bike, X } from 'lucide-react';

interface ToastData {
  title: string;
  body: string;
  id: number;
}

export const InAppNotificationBanner: React.FC = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handleNotification = (e: any) => {
      const detail = e.detail || {};
      const newToast: ToastData = {
        title: detail.title || 'Hunter Fund Alert',
        body: detail.body || '',
        id: Date.now(),
      };

      setToasts((prev) => [newToast, ...prev].slice(0, 3));

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 6000);
    };

    window.addEventListener('hunter-inapp-notification', handleNotification);
    return () => window.removeEventListener('hunter-inapp-notification', handleNotification);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-emerald-200 rounded-2xl p-4 shadow-elevated flex items-start justify-between gap-3 animate-slide-up"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 tracking-tight">{toast.title}</h4>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{toast.body}</p>
            </div>
          </div>

          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 shrink-0 tap-highlight"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
