'use client';

import { useEffect, useState } from 'react';
import { StatusDot } from '@/components/ui/StatusDot';
import { GatewayStatus } from '@/lib/types';

interface ConsoleHeaderProps {
  gatewayStatus?: GatewayStatus;
}

export function ConsoleHeader({ gatewayStatus }: ConsoleHeaderProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const status = gatewayStatus?.status || 'online';

  return (
    <header className="h-16 bg-bg-secondary border-b border-zinc-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-amber-600 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-5 h-5 text-black"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">STRATA<span className="text-amber-600">OS</span></span>
        </div>
        <div className="h-6 w-px bg-zinc-700" />
        <span className="text-xs text-zinc-500 uppercase tracking-widest">ClawLab</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <StatusDot status={status === 'online' ? 'online' : status === 'degraded' ? 'warning' : 'offline'} size="md" />
          <div className="flex flex-col">
            <span className="text-xs text-zinc-400 uppercase">Gateway</span>
            <span className="text-sm font-mono text-emerald-500">{status.toUpperCase()}</span>
          </div>
        </div>

        <div className="h-8 w-px bg-zinc-700" />

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs text-zinc-500 uppercase">System Time</span>
            <span className="text-sm font-mono text-amber-500">{time}</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        </div>
      </div>
    </header>
  );
}
