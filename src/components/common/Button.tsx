import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm',
    secondary:
      'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold',
    danger:
      'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900',
    outline:
      'bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700',
  };

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-2 rounded-xl gap-1.5 min-h-[34px]',
    md: 'text-sm px-4 py-2.5 rounded-2xl gap-2 min-h-[42px]',
    lg: 'text-sm px-5 py-3.5 rounded-2xl gap-2 min-h-[50px]',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center transition-all duration-100 active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none tap-highlight ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
