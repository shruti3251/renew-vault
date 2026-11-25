import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
  error: { icon: XCircle, cls: 'text-red-600 dark:text-red-400', bar: 'bg-red-500' },
  warning: { icon: AlertTriangle, cls: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' },
  info: { icon: Info, cls: 'text-indigo-600 dark:text-indigo-400', bar: 'bg-indigo-500' },
};

const DURATION = 5000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (message, { type = 'success', title, action } = {}) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t.slice(-3), { id, message, type, title, action }]);
      timers.current[id] = setTimeout(() => dismiss(id), DURATION);
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      show,
      success: (m, o) => show(m, { ...o, type: 'success' }),
      error: (m, o) => show(m, { ...o, type: 'error' }),
      warning: (m, o) => show(m, { ...o, type: 'warning' }),
      info: (m, o) => show(m, { ...o, type: 'info' }),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-end gap-2 p-3 sm:inset-x-auto sm:right-0 sm:top-2 sm:w-96"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const s = STYLES[t.type] || STYLES.info;
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl bg-white p-3 pl-4 shadow-lg ring-1 ring-slate-900/5 animate-toast-in dark:bg-slate-800 dark:ring-white/10"
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${s.bar}`} aria-hidden="true" />
              <Icon className={`mt-0.5 h-5 w-5 flex-none ${s.cls}`} aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">
                {t.title && <p className="font-semibold text-slate-900 dark:text-white">{t.title}</p>}
                <p className="text-slate-700 dark:text-slate-200">{t.message}</p>
                {t.action && (
                  <button
                    type="button"
                    className="mt-1 font-semibold text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded dark:text-indigo-300"
                    onClick={() => {
                      t.action.onClick();
                      dismiss(t.id);
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="-m-1 rounded-lg p-1 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:hover:text-white"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
