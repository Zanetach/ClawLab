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
    <div className="bg-bg-card border border-zinc-800 rounded p-4 corner-screw">
      <div className="flex items-center justify-between mb-4">
        <h2 className="uppercase-title text-text-muted">System Alerts</h2>
        <span className="flex items-center gap-1.5 text-xs">
          <StatusDot status={alerts.length > 0 ? 'warning' : 'online'} size="sm" />
          <span className="text-zinc-500">{alerts.length} Active</span>
        </span>
      </div>

      <div className="space-y-2 mb-6">
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 text-sm">
            <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-emerald-500">
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
                className={`p-3 rounded border ${config.border} bg-zinc-900/50`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 leading-relaxed">{alert.message}</p>
                    <p className="text-xs text-zinc-600 mt-1 font-mono">
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
          className="block text-center text-xs text-amber-500 hover:text-amber-400 py-2 border-t border-zinc-800 -mx-4 -mb-4 mt-4"
        >
          View all {alerts.length} alerts
        </Link>
      )}

      {resourceUsage && (
        <>
          <div className="hazard-stripe h-1 rounded mb-4 opacity-20" />

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
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-zinc-500">{label}</span>
        <span className="font-mono text-amber-500">{value}%</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            value > 80 ? 'bg-red-500' : value > 60 ? 'bg-amber-500' : 'bg-emerald-500'
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
