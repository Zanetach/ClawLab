'use client';

import { GatewayStatus } from '@/lib/types';

interface ConsoleHeaderProps {
  gatewayStatus?: GatewayStatus;
}

export function ConsoleHeader(_props: ConsoleHeaderProps) {
  const statusLabel = (_props.gatewayStatus?.status ?? 'offline').toUpperCase();
  const versionLabel = _props.gatewayStatus?.version ?? 'Gateway';

  return (
    <header data-status={_props.gatewayStatus?.status ?? 'online'} className="glass-nav glass-panel relative z-10 mx-3 mt-2 flex h-14 items-center justify-between rounded-[18px] px-4 py-2">
      <div className="relative flex min-w-[280px] max-w-xl flex-1 items-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-4 h-4 w-4 text-white/35">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          aria-label="Search"
          placeholder="Search..."
          className="h-9 w-full rounded-full border-white/8 bg-[#1c2340]/70 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-white/14 focus:bg-[#1d2544]/85 focus:shadow-none"
        />
      </div>

      <div className="ml-4 flex items-center gap-4">
        <button className="glass-button relative flex h-9 w-9 items-center justify-center rounded-full border-white/10 text-white/70">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
            <path d="M10 17a2 2 0 0 0 4 0" />
          </svg>
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-pink-400" />
        </button>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-white">{versionLabel}</div>
            <div className="text-[10px] text-white/45">Gateway Control Plane</div>
          </div>
          <div className="relative flex min-w-[68px] items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(255,79,159,0.18)_0%,rgba(139,92,246,0.18)_100%)] px-3 py-2 text-[10px] font-bold text-white shadow-[0_0_18px_rgba(255,79,159,0.18)]">
            {statusLabel}
          </div>
        </div>
      </div>
    </header>
  );
}
