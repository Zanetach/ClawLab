'use client';

import { useEffect, useState } from 'react';
import { StatusBar } from '@/components/dashboard/StatusBar';
import { GaugeCard } from '@/components/dashboard/GaugeCard';
import { LobsterCard } from '@/components/dashboard/LobsterCard';
import { AlertPanel } from '@/components/dashboard/AlertPanel';
import { Agent, GatewayStatus, DashboardStats, Alert } from '@/lib/types';
import { getGatewayStatus, getAgents, getDashboardStats, getAlerts } from '@/lib/gateway';

export default function DashboardPage() {
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [status, agentsData, statsData, alertsData] = await Promise.all([
        getGatewayStatus(),
        getAgents(),
        getDashboardStats(),
        getAlerts(),
      ]);
      setGatewayStatus(status);
      setAgents(agentsData);
      setStats(statsData);
      setAlerts(alertsData);
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen">
      <StatusBar gatewayStatus={gatewayStatus || undefined} />

      <div className="p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-100">Command Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Real-time monitoring and control interface
          </p>
        </div>

        {/* Gauge Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <GaugeCard
            title="Active Agents"
            value={stats?.agentCount || agents.length || 0}
            maxValue={10}
            color="amber"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            }
          />
          <GaugeCard
            title="Connected Bots"
            value={stats?.botCount || 0}
            maxValue={20}
            color="emerald"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <rect x="3" y="8" width="18" height="12" rx="2" />
                <circle cx="8" cy="14" r="2" />
                <circle cx="16" cy="14" r="2" />
              </svg>
            }
          />
          <GaugeCard
            title="Token Consumption"
            value={stats?.tokenConsumption || 0}
            maxValue={100}
            unit="%"
            color={stats?.tokenConsumption && stats.tokenConsumption > 80 ? 'red' : 'blue'}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path d="M12 2v20M2 12h20" />
              </svg>
            }
          />
        </div>

        {/* Agent Cards — full width grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="uppercase-title text-text-muted">Agent Units</h2>
            <span className="text-xs text-zinc-500">
              {agents.filter(a => a.status === 'online').length} / {agents.length} Online
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {agents.map((agent, i) => (
              <LobsterCard key={agent.id} agent={agent} index={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
