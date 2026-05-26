import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: string; // maps to .badge-<variant> in index.css
  children: ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span className={`badge ${variant ? `badge-${variant}` : ''} ${className}`}>
      {children}
    </span>
  );
}
