'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IndustrialButton } from '@/components/ui/IndustrialButton';
import { AgentTable } from '@/components/agents/AgentTable';
import { Agent } from '@/lib/types';
import { getAgents } from '@/lib/gateway';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const data = await getAgents();
        setAgents(data);
      } catch (error) {
        console.error('Failed to load agents:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAgents();
  }, []);

  const handleDelete = (agent: Agent) => {
    if (confirm(`Are you sure you want to delete agent "${agent.name}"?`)) {
      setAgents(agents.filter(a => a.id !== agent.id));
    }
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Agent Management</h1>
          <p className="text-sm text-zinc-500 mt-1">
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

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Agents" value={agents.length} />
        <StatCard label="Online" value={agents.filter(a => a.status === 'online').length} color="emerald" />
        <StatCard label="Warning" value={agents.filter(a => a.status === 'warning').length} color="amber" />
        <StatCard label="Offline" value={agents.filter(a => a.status === 'offline').length} color="zinc" />
      </div>

      {/* Agents Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500">Loading agents...</div>
        </div>
      ) : (
        <AgentTable agents={agents} onDelete={handleDelete} />
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'amber' }: { label: string; value: number; color?: 'amber' | 'emerald' | 'zinc' }) {
  const colorClasses = {
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
    zinc: 'text-zinc-500',
  };

  return (
    <div className="bg-bg-card border border-zinc-800 rounded p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono ${colorClasses[color]}`}>{value}</div>
    </div>
  );
}
