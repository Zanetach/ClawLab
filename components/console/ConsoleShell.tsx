'use client';

import { ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ConsoleHeader } from './ConsoleHeader';
import { ConsoleSidebar } from './ConsoleSidebar';
import { SystemAlertsWidget } from '@/components/dashboard/SystemAlertsWidget';
import { GatewayStatus } from '@/lib/types';
import { getGatewayStatus } from '@/lib/gateway';
import { useVisibleInterval } from '@/lib/use-visible-interval';

interface ConsoleShellProps {
  children: ReactNode;
}

export function ConsoleShell({ children }: ConsoleShellProps) {
  const pathname = usePathname();
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const pollEnabled = pathname !== '/onboarding';
  const statusIntervalMs = pathname === '/' ? 15_000 : 30_000;

  useVisibleInterval(async () => {
    try {
      setGatewayStatus(await getGatewayStatus());
    } catch (error) {
      console.error('Failed to refresh gateway status:', error);
    }
  }, {
    enabled: pollEnabled,
    intervalMs: statusIntervalMs,
    runImmediately: true,
  });

  return (
    <div className="glass-shell min-h-screen flex flex-col bg-bg-primary">
      <div className="ambient-orb top-[-140px] left-[-100px] h-80 w-80 bg-violet-500/30" />
      <div className="ambient-orb right-[-80px] top-20 h-72 w-72 bg-pink-500/20" />
      <div className="ambient-orb bottom-[-120px] left-1/3 h-96 w-96 bg-blue-500/16" />
      <div className="mist-layer" />
      <ConsoleHeader gatewayStatus={gatewayStatus || undefined} />
      <div className="relative z-10 flex flex-1 gap-3 px-3 pb-3 pt-2">
        <ConsoleSidebar />
        <main className="flex-1 overflow-auto rounded-[24px]">
          {children}
        </main>
      </div>
      <SystemAlertsWidget />
    </div>
  );
}
