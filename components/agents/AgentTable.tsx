'use client';

import { Agent } from '@/lib/types';
import { IndustrialTable } from '@/components/ui/IndustrialTable';
import { StatusDot } from '@/components/ui/StatusDot';
import Link from 'next/link';
import { IndustrialButton } from '@/components/ui/IndustrialButton';

interface AgentTableProps {
  agents: Agent[];
  onDelete?: (agent: Agent) => void;
}

export function AgentTable({ agents, onDelete }: AgentTableProps) {
  const columns = [
    {
      key: 'id',
      header: 'ID',
      width: '120px',
      render: (agent: Agent) => (
        <span className="font-mono text-xs text-zinc-500">{agent.id}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (agent: Agent) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-zinc-200">{agent.name}</span>
          <span className="text-xs text-zinc-500 uppercase">{agent.role}</span>
        </div>
      ),
    },
    {
      key: 'model',
      header: 'Model',
      render: (agent: Agent) => (
        <span className="font-mono text-xs text-zinc-400">{agent.model}</span>
      ),
    },
    {
      key: 'workspace',
      header: 'Workspace',
      width: '320px',
      render: (agent: Agent) => {
        if (!agent.workspace) {
          return <span className="text-zinc-600 text-xs">Not set</span>;
        }

        const workspaceName = getWorkspaceName(agent.workspace);

        return (
          <div className="space-y-1">
            <div className="font-mono text-[11px] leading-5 text-zinc-400 break-all">
              {agent.workspace}
            </div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-cyan-300/80">
              {workspaceName}
            </div>
          </div>
        );
      },
    },
    {
      key: 'bot',
      header: 'Bot Binding',
      render: (agent: Agent) => (
        agent.botName ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-mono">
            {agent.botName}
          </span>
        ) : (
          <span className="text-zinc-600 text-xs">Not bound</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (agent: Agent) => (
        <div className="flex items-center gap-2">
          <StatusDot status={agent.status} size="sm" />
          <span className={`text-xs uppercase ${
            agent.status === 'online' ? 'text-emerald-500' :
            agent.status === 'warning' ? 'text-amber-500' :
            agent.status === 'error' ? 'text-red-500' : 'text-zinc-500'
          }`}>
            {agent.status}
          </span>
        </div>
      ),
    },
    {
      key: 'tokenUsage',
      header: 'Tokens',
      width: '120px',
      render: (agent: Agent) => {
        const pct = Math.round((agent.tokenUsage / agent.maxTokens) * 100);
        return (
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs text-zinc-400">
              {agent.tokenUsage.toLocaleString()}
            </span>
            <div className="h-1 w-16 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (agent: Agent) => (
        <div className="flex items-center gap-2">
          <Link href={`/agents/${agent.id}`}>
            <IndustrialButton variant="ghost" size="sm">
              View
            </IndustrialButton>
          </Link>
          {onDelete && (
            <IndustrialButton
              variant="danger"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(agent);
              }}
            >
              Delete
            </IndustrialButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="bg-bg-card border border-zinc-800 rounded corner-screw">
      <IndustrialTable columns={columns} data={agents} />
    </div>
  );
}

function getWorkspaceName(workspace: string): string {
  const normalized = workspace.replace(/[\\/]+$/, '');
  const segments = normalized.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] || workspace;
}
