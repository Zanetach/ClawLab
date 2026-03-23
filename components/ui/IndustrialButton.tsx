'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface IndustrialButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const IndustrialButton = forwardRef<HTMLButtonElement, IndustrialButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-semibold uppercase tracking-wider transition-all duration-200 border';

    const variantClasses = {
      primary: 'bg-amber-600 hover:bg-amber-500 text-black border-amber-600 hover:border-amber-500',
      secondary: 'bg-transparent hover:bg-zinc-800 text-slate-300 border-zinc-600 hover:border-zinc-500',
      danger: 'bg-red-600 hover:bg-red-500 text-white border-red-600 hover:border-red-500',
      ghost: 'bg-transparent hover:bg-zinc-800 text-slate-400 border-transparent hover:border-zinc-700',
    };

    const sizeClasses = {
      sm: 'h-8 px-3 text-xs rounded',
      md: 'h-10 px-4 text-xs rounded',
      lg: 'h-12 px-6 text-sm rounded-sm',
    };

    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]';

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IndustrialButton.displayName = 'IndustrialButton';
