import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'lime' | 'emerald' | 'amber' | 'red' | 'graphite' | 'cyan';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'graphite',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const variantStyles = {
    lime: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    red: 'bg-rose-50 text-rose-800 border-rose-200',
    cyan: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    graphite: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const dotColors = {
    lime: 'bg-emerald-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-600',
    red: 'bg-rose-600',
    cyan: 'bg-cyan-600',
    graphite: 'bg-slate-500',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md font-medium tracking-wide',
    md: 'text-xs px-2.5 py-1 rounded-lg font-medium tracking-wide',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
