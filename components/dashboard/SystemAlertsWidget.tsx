'use client';

import { useEffect, useState } from 'react';

interface ResourceStats {
  cpu: number;
  memory: number;
  network: number;
}

function StatIcon({ label, value, icon, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5" title={`${label}: ${value}%`}>
      <div className={`w-7 h-7 rounded flex items-center justify-center border ${color}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-mono font-bold leading-none ${
        value > 80 ? 'text-red-400' : value > 60 ? 'text-amber-400' : 'text-emerald-400'
      }`}>
        {value}%
      </span>
    </div>
  );
}

export function SystemAlertsWidget() {
  const [stats, setStats] = useState<ResourceStats>({ cpu: 34, memory: 67, network: 12 });

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() * 6 - 3))),
        memory: Math.max(10, Math.min(95, prev.memory + (Math.random() * 4 - 2))),
        network: Math.max(1, Math.min(90, prev.network + (Math.random() * 10 - 5))),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-5 left-5 z-50 flex items-end gap-2">
      <StatIcon
        label="CPU"
        value={Math.round(stats.cpu)}
        color={stats.cpu > 80 ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <rect x="9" y="9" width="6" height="6" />
            <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
          </svg>
        }
      />
      <StatIcon
        label="Memory"
        value={Math.round(stats.memory)}
        color={stats.memory > 80 ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M6 6V4M10 6V4M14 6V4M18 6V4M6 18v2M10 18v2M14 18v2M18 18v2" />
            <path d="M6 10h.01M10 10h.01M14 10h.01M6 14h4M12 14h2" />
          </svg>
        }
      />
      <StatIcon
        label="Network"
        value={Math.round(stats.network)}
        color={stats.network > 80 ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        }
      />
    </div>
  );
}
