'use client';

import { Alert } from '@/lib/types';
import { StatusDot } from '@/components/ui/StatusDot';
import Link from 'next/link';

interface AlertPanelProps {
  alerts: Alert[];
  resourceUsage?: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export function AlertPanel({ alerts, resourceUsage }: AlertPanelProps) {
  const alertTypeConfig = {
    info: { color: 'bg-blue-500', border: 'border-blue-500/30' },
    warning: { color: 'bg-amber-500', border: 'border-amber-500/30' },
    danger: { color: 'bg-red-500', border: 'border-red-500/30' },
  };

  return (
    <div className="glass-panel rounded-[24px] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="uppercase-title text-text-muted">System Alerts</h2>
        <span className="flex items-center gap-1.5 text-xs">
          <StatusDot status={alerts.length > 0 ? 'warning' : 'online'} size="sm" />
          <span className="text-zinc-500">{alerts.length} Active</span>
        </span>
      </div>

      <div className="mb-6 space-y-2">
        {alerts.length === 0 ? (
          <div className="py-6 text-center text-sm text-zinc-400">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300/15">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-cyan-300">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            All systems operational
          </div>
        ) : (
          alerts.slice(0, 4).map((alert) => {
            const config = alertTypeConfig[alert.type];
            return (
              <div
                key={alert.id}
                className={`rounded-[18px] border p-3 ${config.border} bg-white/[0.04]`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed text-zinc-200">{alert.message}</p>
                    <p className="mt-1 text-xs font-mono text-zinc-500">
                      {formatTimestamp(alert.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {alerts.length > 4 && (
        <Link
          href="/alerts"
          className="mt-4 -mx-4 -mb-4 block border-t border-white/10 py-2 text-center text-xs text-cyan-300 hover:text-pink-300"
        >
          View all {alerts.length} alerts
        </Link>
      )}

      {resourceUsage && (
        <>
          <div className="mb-4 h-px rounded bg-gradient-to-r from-transparent via-cyan-300/40 via-50% to-transparent" />

          <h3 className="uppercase-title text-text-muted mb-3">Resource Monitor</h3>

          <div className="space-y-3">
            <ResourceBar label="CPU" value={resourceUsage.cpu} />
            <ResourceBar label="Memory" value={resourceUsage.memory} />
            <ResourceBar label="Network" value={resourceUsage.network} />
          </div>
        </>
      )}
    </div>
  );
}

function ResourceBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-zinc-500">{label}</span>
        <span className="font-mono text-cyan-300">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            value > 80 ? 'bg-red-400' : value > 60 ? 'bg-pink-400' : 'bg-cyan-300'
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}
