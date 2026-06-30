import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: ReactNode;
}

/** Consistent empty / not-found panel: icon, a line of text, optional action. */
export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="state-panel">
      <div className="state-icon"><Icon size={22} /></div>
      <span className="text-muted">{message}</span>
      {action}
    </div>
  );
}
