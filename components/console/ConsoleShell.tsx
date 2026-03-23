'use client';

import { ReactNode, useEffect, useState } from 'react';
import { ConsoleHeader } from './ConsoleHeader';
import { ConsoleSidebar } from './ConsoleSidebar';
import { SystemAlertsWidget } from '@/components/dashboard/SystemAlertsWidget';
import { GatewayStatus } from '@/lib/types';
import { getGatewayStatus } from '@/lib/gateway';

interface ConsoleShellProps {
  children: ReactNode;
}

export function ConsoleShell({ children }: ConsoleShellProps) {
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);

  useEffect(() => {
    getGatewayStatus().then(setGatewayStatus).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <ConsoleHeader gatewayStatus={gatewayStatus || undefined} />
      <div className="flex-1 flex">
        <ConsoleSidebar />
        <main className="flex-1 grid-texture overflow-auto">
          {children}
        </main>
      </div>
      <SystemAlertsWidget />
    </div>
  );
}
