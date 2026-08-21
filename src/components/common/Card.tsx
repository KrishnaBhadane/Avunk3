import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-surface-border rounded-xl p-5 shadow-card transition-all duration-200 ${
        hoverable ? 'hover:border-slate-600 hover:bg-surface-hover cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
