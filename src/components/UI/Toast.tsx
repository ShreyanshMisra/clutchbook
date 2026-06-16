import { CheckCircle2, Info, Trophy, XCircle } from 'lucide-react';
import type { ToastMessage, ToastVariant } from '../../types';

const ICONS: Record<ToastVariant, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  win: Trophy,
  loss: XCircle,
};

const ICON_COLOR: Record<ToastVariant, string> = {
  info: 'var(--cyan)',
  success: 'var(--lime)',
  win: 'var(--lime)',
  loss: 'var(--crimson)',
};

interface ToasterProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function Toaster({ toasts, onDismiss }: ToasterProps) {
  return (
    <div
      className="toaster fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.variant];
        return (
          <div
            key={toast.id}
            className={`toast toast-${toast.variant}`}
            role="status"
            onClick={() => onDismiss(toast.id)}
          >
            <span className="toast-accent" aria-hidden />
            <Icon size={18} style={{ color: ICON_COLOR[toast.variant], flexShrink: 0, marginTop: 1 }} />
            <div className="min-w-0">
              <div className="font-head" style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                {toast.title}
              </div>
              {toast.description && (
                <div className="text-muted" style={{ fontSize: '0.82rem', marginTop: 2 }}>
                  {toast.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
