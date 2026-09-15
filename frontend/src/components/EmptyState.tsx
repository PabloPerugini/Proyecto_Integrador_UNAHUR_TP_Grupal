import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, text, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`}>
      {icon && <div className="mb-3 d-flex justify-content-center text-brand">{icon}</div>}
      <h4 className="mb-2">{title}</h4>
      {text && <p className="text-muted mb-4">{text}</p>}
      {action}
    </div>
  );
}