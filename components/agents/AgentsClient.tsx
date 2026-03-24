'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IndustrialButton } from '@/components/ui/IndustrialButton';
import { AgentTable } from '@/components/agents/AgentTable';
import { Agent, AgentSyncStatus } from '@/lib/types';
import { getAgents, getAgentSyncStatus } from '@/lib/gateway';
import { useVisibleInterval } from '@/lib/use-visible-interval';

interface AgentsClientProps {
  initialAgents: Agent[];
  createdAgentId?: string | null;
  initialSyncStatus?: AgentSyncStatus | null;
  initialLoading?: boolean;
}

export function AgentsClient({
  initialAgents,
  createdAgentId = null,
  initialSyncStatus = null,
  initialLoading = false,
}: AgentsClientProps) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);
  const [loading, setLoading] = useState(initialLoading);
  const [syncStatus, setSyncStatus] = useState<AgentSyncStatus | null>(initialSyncStatus);

  async function refreshAgents() {
    setLoading(true);

    try {
      const nextAgents = await getAgents();
      setAgents(nextAgents);
    } catch (error) {
      console.error('Failed to refresh agents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function refreshSyncStatus() {
    if (!createdAgentId) {
      return;
    }

    try {
      const nextStatus = await getAgentSyncStatus(createdAgentId);
      setSyncStatus(nextStatus);
    } catch (error) {
      console.error('Failed to refresh sync status:', error);
    }
  }

  useVisibleInterval(refreshAgents, {
    intervalMs: 10_000,
    runImmediately: initialAgents.length === 0,
  });

  useVisibleInterval(() => {
    if (createdAgentId && !syncStatus?.synced) {
      void refreshSyncStatus();
    }
  }, {
    intervalMs: 3_000,
    runImmediately: !!createdAgentId && !initialSyncStatus,
  });

  useEffect(() => {
    if (createdAgentId && syncStatus?.synced) {
      const timeout = window.setTimeout(() => {
        router.replace('/agents');
      }, 3000);

      return () => {
        window.clearTimeout(timeout);
      };
    }
  }, [createdAgentId, router, syncStatus?.synced]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
            <span className="glass-badge rounded-full px-3 py-1">ClawLab</span>
            <span>Agents</span>
          </div>
          <h1 className="font-display text-4xl leading-none text-zinc-50">Agent Management</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Configure and monitor all OpenClaw agents
          </p>
        </div>
        <Link href="/agents/new">
          <IndustrialButton variant="primary" size="lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 mr-2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Agent
          </IndustrialButton>
        </Link>
      </div>

      {createdAgentId && syncStatus && (
        <div className={syncStatus.synced
          ? 'mb-6 rounded-[22px] border border-cyan-300/30 bg-cyan-400/10 p-4 text-sm text-cyan-100'
          : 'mb-6 rounded-[22px] border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100'}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">
                {syncStatus.synced ? '新 Agent 已同步到 Gateway' : '新 Agent 已创建，正在等待 Gateway 热加载'}
              </div>
              <div className="mt-1 text-xs text-current/80">{syncStatus.message}</div>
            </div>
            <div className="text-right text-[11px] uppercase tracking-[0.2em] text-current/70">
              {syncStatus.synced ? 'Hot Synced' : 'Pending Sync'}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Agents" value={agents.length} />
        <StatCard label="Online" value={agents.filter((agent) => agent.status === 'online').length} color="emerald" />
        <StatCard label="Warning" value={agents.filter((agent) => agent.status === 'warning').length} color="amber" />
        <StatCard label="Offline" value={agents.filter((agent) => agent.status === 'offline').length} color="zinc" />
      </div>

      {loading && agents.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500">Loading agents...</div>
        </div>
      ) : (
        <AgentTable agents={agents} />
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'amber' }: { label: string; value: number; color?: 'amber' | 'emerald' | 'zinc' }) {
  const colorClasses = {
    amber: 'text-pink-300',
    emerald: 'text-cyan-300',
    zinc: 'text-zinc-300',
  };

  return (
    <div className="glass-panel rounded-[24px] p-4">
      <div className="mb-1 text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-2xl font-bold font-mono ${colorClasses[color]}`}>{value}</div>
    </div>
  );
}
