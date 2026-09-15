import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export default function PageHeader({ title, sub, action, className = '' }: PageHeaderProps) {
  return (
    <div className={`page-head ${className}`}>
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub mb-0">{sub}</p>}
      </div>
      {action}
    </div>
  );
}