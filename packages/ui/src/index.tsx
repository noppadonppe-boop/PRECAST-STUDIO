import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';

export function StatusBadge({ tone, children }: PropsWithChildren<{ tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }>) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}

export function Surface({ children, className = '', ariaLabel }: PropsWithChildren<{ className?: string; ariaLabel?: string }>) {
  return <section className={`surface ${className}`} aria-label={ariaLabel}>{children}</section>;
}

export function Button({ variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' }) {
  return <button {...props} className={`button button--${variant} ${props.className ?? ''}`} />;
}

export function EmptyState({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className="empty-state"><span className="empty-state__icon" aria-hidden="true">{icon}</span><strong>{title}</strong><p>{detail}</p></div>;
}

