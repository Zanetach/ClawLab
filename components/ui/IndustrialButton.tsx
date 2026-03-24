'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface IndustrialButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const IndustrialButton = forwardRef<HTMLButtonElement, IndustrialButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseClasses = 'glass-button inline-flex items-center justify-center font-semibold uppercase tracking-[0.18em] transition-all duration-200 border rounded-[16px]';

    const variantClasses = {
      primary: 'bg-[linear-gradient(135deg,rgba(60,245,255,0.18)_0%,rgba(139,92,246,0.18)_56%,rgba(255,79,159,0.14)_100%)] text-cyan-50 border-cyan-300/25 hover:brightness-110 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_28px_rgba(2,6,23,0.28),0_0_28px_rgba(60,245,255,0.16)]',
      secondary: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_100%)] text-[color:var(--text-primary)] border-white/16 hover:border-white/24',
      danger: 'bg-[linear-gradient(135deg,rgba(251,113,133,0.28)_0%,rgba(190,24,93,0.2)_100%)] text-rose-50 border-white/20 hover:brightness-110',
      ghost: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_100%)] text-[color:var(--text-secondary)] border-white/10 hover:text-[color:var(--text-primary)] hover:border-white/18',
    };

    const sizeClasses = {
      sm: 'h-9 px-3 text-[10px]',
      md: 'h-10 px-4 text-[10px]',
      lg: 'h-12 px-6 text-xs',
    };

    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:translate-y-[1px]';

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
