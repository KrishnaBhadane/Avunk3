import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon
}) => {
  const variantStyles = {
    default: 'bg-surface-hover text-slate-300 border-surface-border',
    success: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40',
    warning: 'bg-amber-950/60 text-amber-400 border-amber-800/40',
    danger: 'bg-rose-950/60 text-rose-400 border-rose-800/40',
    info: 'bg-slate-800/70 text-slate-300 border-slate-700/50',
    gold: 'bg-amber-950/40 text-amber-300 border-amber-700/50',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold tracking-wide',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-all ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
