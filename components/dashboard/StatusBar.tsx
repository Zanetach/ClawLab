'use client';

import type { DashboardStats, GatewayConnectionConfig, GatewayStatus } from '@/lib/types';

interface StatusBarProps {
  gatewayStatus?: GatewayStatus;
  connection?: GatewayConnectionConfig;
  stats?: DashboardStats;
  gridPosition?: { x: number; y: number };
}

export function StatusBar({ gatewayStatus, connection, stats, gridPosition = { x: 0, y: 0 } }: StatusBarProps) {
  const connectionLabel = connection?.label || 'Gateway Link';

  return (
    <div className="glass-badge mx-6 mt-6 flex flex-wrap items-center gap-4 rounded-[20px] border-white/10 px-5 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Grid</span>
        <span className="font-mono text-sm text-cyan-300">
          {String(gridPosition.x).padStart(3, '0')}.{String(gridPosition.y).padStart(3, '0')}
        </span>
      </div>

      <div className="frost-divider h-4 w-px" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Connection</span>
        <span className="font-mono text-sm text-violet-300">{connectionLabel}</span>
      </div>

      <div className="frost-divider h-4 w-px" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Gateway</span>
        <span className={`font-mono text-sm ${
          gatewayStatus?.status === 'online' ? 'text-cyan-300' :
          gatewayStatus?.status === 'degraded' ? 'text-amber-300' : 'text-rose-400'
        }`}>
          {gatewayStatus?.version || 'Unknown'}
        </span>
      </div>

      <div className="frost-divider h-4 w-px" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Source</span>
        <span className="font-mono text-sm text-zinc-200">
          {connection?.source === 'manual' ? 'MANUAL' : 'AUTO'}
        </span>
      </div>

      <div className="frost-divider h-4 w-px" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Endpoint</span>
        <span className="max-w-[240px] truncate font-mono text-sm text-zinc-200">
          {connection?.url || 'Not configured'}
        </span>
      </div>

      <div className="frost-divider h-4 w-px" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Uptime</span>
        <span className="font-mono text-cyan-300 text-sm">
          {gatewayStatus?.uptime != null ? formatUptime(gatewayStatus.uptime) : 'N/A'}
        </span>
      </div>

      <div className="frost-divider h-4 w-px" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Load</span>
        <span className="font-mono text-sm text-cyan-300">
          {gatewayStatus?.connectedAgents ?? 0}A / {stats?.activeAlerts ?? 0} alert / {stats?.tokenConsumption ?? 0}%
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="font-mono">OPENCLAW</span>
        <span className="text-pink-400">{'//'}</span>
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
