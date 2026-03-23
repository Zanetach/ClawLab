'use client';

import { GatewayStatus } from '@/lib/types';

interface StatusBarProps {
  gatewayStatus?: GatewayStatus;
  gridPosition?: { x: number; y: number };
}

export function StatusBar({ gatewayStatus, gridPosition = { x: 0, y: 0 } }: StatusBarProps) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-bg-secondary/50 border-b border-zinc-800">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Grid</span>
        <span className="font-mono text-amber-500 text-sm">
          {String(gridPosition.x).padStart(3, '0')}.{String(gridPosition.y).padStart(3, '0')}
        </span>
      </div>

      <div className="h-4 w-px bg-zinc-700" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Sector</span>
        <span className="font-mono text-amber-500 text-sm">ALPHA-7</span>
      </div>

      <div className="h-4 w-px bg-zinc-700" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Gateway</span>
        <span className={`font-mono text-sm ${
          gatewayStatus?.status === 'online' ? 'text-emerald-500' :
          gatewayStatus?.status === 'degraded' ? 'text-amber-500' : 'text-red-500'
        }`}>
          {gatewayStatus?.version || '1.0.0-beta'}
        </span>
      </div>

      <div className="h-4 w-px bg-zinc-700" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Uptime</span>
        <span className="font-mono text-emerald-500 text-sm">
          {gatewayStatus?.uptime ? formatUptime(gatewayStatus.uptime) : '10d 00h 00m'}
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="font-mono">STRATAOS</span>
        <span className="text-amber-600">//</span>
        <span>CLAWLAB</span>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}
