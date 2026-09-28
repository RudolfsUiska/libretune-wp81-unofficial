import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import './ToastContext.css';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  leaving?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/* Every toast is also kept for the action centre's notification list. */
export interface ToastLogEntry {
  id: number;
  message: string;
  type: ToastType;
  time: Date;
}
export const TOAST_LOG_EVENT = 'libretune:toast-log';
const LOG_MAX = 50;
let toastLog: ToastLogEntry[] = [];

export function getToastLog(): ToastLogEntry[] {
  return toastLog;
}

export function clearToastLog(): void {
  toastLog = [];
  window.dispatchEvent(new CustomEvent(TOAST_LOG_EVENT));
}

function logToast(entry: ToastLogEntry) {
  toastLog = [...toastLog, entry].slice(-LOG_MAX);
  window.dispatchEvent(new CustomEvent(TOAST_LOG_EVENT));
}

/**
 * Windows Phone toast notifications: a band across the top of the screen,
 * one at a time, newest on top. Tap or swipe right to dismiss.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 250);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000) => {
      const id = nextId.current++;
      logToast({ id, message, type, time: new Date() });
      // Keep at most three visible; older ones fall away.
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
      setTimeout(() => removeToast(id), type === 'error' ? Math.max(duration, 6500) : duration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

const TITLES: Record<ToastType, string> = {
  info: 'LibreTune',
  success: 'LibreTune',
  warning: 'Warning',
  error: 'Error',
};

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const startX = useRef<Record<number, number>>({});
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts
        .slice()
        .reverse()
        .map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}${toast.leaving ? ' leaving' : ''}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
            onClick={() => onDismiss(toast.id)}
            onTouchStart={(e) => (startX.current[toast.id] = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              const s = startX.current[toast.id];
              if (s !== undefined && e.changedTouches[0].clientX - s > 60) onDismiss(toast.id);
            }}
          >
            <span className="toast-icon" aria-hidden />
            <span className="toast-message">
              <b>{TITLES[toast.type]}</b> {toast.message}
            </span>
          </div>
        ))}
    </div>
  );
}

export default ToastContext;
