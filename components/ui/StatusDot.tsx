'use client';

import { AgentStatus } from '@/lib/types';

interface StatusDotProps {
  status: AgentStatus;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const statusColors: Record<AgentStatus, string> = {
  online: 'bg-emerald-500',
  offline: 'bg-zinc-500',
  warning: 'bg-amber-600',
  error: 'bg-red-500',
  busy: 'bg-blue-500',
};

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export function StatusDot({ status, size = 'md', pulse = true }: StatusDotProps) {
  const colorClass = statusColors[status];
  const sizeClass = sizeClasses[size];

  return (
    <span className="relative inline-flex">
      <span className={`${sizeClass} rounded-full ${colorClass}`} />
      {pulse && status === 'online' && (
        <span className={`absolute inset-0 rounded-full ${colorClass} animate-ping opacity-75`} />
      )}
      {pulse && (status === 'warning' || status === 'error') && (
        <span className={`absolute inset-0 rounded-full ${colorClass} animate-pulse opacity-75`} />
      )}
    </span>
  );
}
