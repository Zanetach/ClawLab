'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { getDashboardSummary } from '@/lib/gateway';
import { useVisibleInterval } from '@/lib/use-visible-interval';
import type { DashboardSummary } from '@/lib/types';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="flex flex-col items-center gap-0.5" title={`${label}: ${value}`}>
      <div className={`glass-badge flex h-8 w-8 items-center justify-center rounded-xl border ${color}`}>
        {icon}
      </div>
      <span className="text-[10px] font-mono font-bold leading-none text-cyan-300">
        {value}
      </span>
    </div>
  );
}

export function SystemAlertsWidget() {
  const pathname = usePathname();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const enabled = pathname === '/';

  useVisibleInterval(async () => {
    try {
      setSummary(await getDashboardSummary());
    } catch (error) {
      console.error('Failed to refresh dashboard summary:', error);
    }
  }, {
    enabled,
    intervalMs: 15_000,
    runImmediately: true,
  });

  if (!enabled) {
    return null;
  }

  const connectedAgents = summary?.gatewayStatus.connectedAgents ?? 0;
  const activeAlerts = summary?.stats.activeAlerts ?? 0;
  const tokenLoad = `${summary?.stats.tokenConsumption ?? 0}%`;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex items-end gap-2">
      <StatCard
        label="Agents"
        value={String(connectedAgents)}
        color="border-white/12 bg-white/6 text-zinc-300"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <circle cx="9" cy="8" r="3" />
            <path d="M3 19c0-3 3-5 6-5s6 2 6 5" />
            <path d="M17 11a3 3 0 1 0 0-6" />
            <path d="M21 19c0-2.5-1.8-4.2-4.2-4.8" />
          </svg>
        }
      />
      <StatCard
        label="Alerts"
        value={String(activeAlerts)}
        color={activeAlerts > 0 ? 'border-red-400/40 bg-red-500/10 text-red-300' : 'border-white/12 bg-white/6 text-zinc-300'}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
          </svg>
        }
      />
      <StatCard
        label="Load"
        value={tokenLoad}
        color="border-white/12 bg-white/6 text-zinc-300"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path d="M12 3v18M7 8.5c0-1.7 1.6-3 3.5-3h3c1.9 0 3.5 1.3 3.5 3s-1.6 3-3.5 3h-3c-1.9 0-3.5 1.3-3.5 3s1.6 3 3.5 3h3c1.9 0 3.5-1.3 3.5-3" />
          </svg>
        }
      />
    </div>
  );
}
