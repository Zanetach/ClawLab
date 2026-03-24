import path from 'node:path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { IndustrialButton } from '@/components/ui/IndustrialButton';
import { StatusDot } from '@/components/ui/StatusDot';
import { requireConfiguredGatewayConnection } from '@/lib/gateway-connection';
import { getServerAgents } from '@/lib/gateway-server';

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  await requireConfiguredGatewayConnection();

  const { agentId } = await params;
  const agents = await getServerAgents();
  const agent = agents.find((item) => item.id === agentId);

  if (!agent) {
    notFound();
  }

  const usagePct = agent.maxTokens > 0 ? Math.round((agent.tokenUsage / agent.maxTokens) * 100) : 0;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-3 text-sm text-zinc-500">
            <span>Agents</span>
            <span className="text-zinc-700">/</span>
            <span className="text-cyan-300">{agent.id}</span>
          </div>
          <h1 className="font-display text-4xl leading-none text-zinc-50">{agent.name}</h1>
          <p className="mt-2 text-sm text-zinc-400">
            查看 Agent 当前状态、模型配置和 Bot 绑定信息。
          </p>
        </div>

        <Link href="/agents">
          <IndustrialButton variant="ghost" size="sm">
            返回列表
          </IndustrialButton>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Status">
          <div className="flex items-center gap-2">
            <StatusDot status={agent.status} size="sm" />
            <span className="text-sm uppercase text-zinc-100">{agent.status}</span>
          </div>
        </MetricCard>
        <MetricCard label="Model" value={agent.model} mono />
        <MetricCard label="Role" value={agent.role} />
        <MetricCard label="Token Usage" value={`${agent.tokenUsage.toLocaleString()} / ${agent.maxTokens.toLocaleString()} (${usagePct}%)`} mono />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <section className="glass-panel rounded-[24px] p-5">
          <div className="mb-4 text-xs uppercase tracking-[0.2em] text-zinc-500">Runtime</div>
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard label="Agent ID" value={agent.id} mono />
            <MetricCard label="Name" value={agent.name} />
            <MetricCard
              label="Workspace"
              value={agent.workspace ? `${agent.workspace}\n${path.basename(agent.workspace)}` : 'Not configured'}
              mono
            />
            <MetricCard label="Created At" value={formatDateTime(agent.createdAt)} />
            <MetricCard label="Last Active" value={formatDateTime(agent.lastActive)} />
          </div>
        </section>

        <section className="glass-panel rounded-[24px] p-5">
          <div className="mb-4 text-xs uppercase tracking-[0.2em] text-zinc-500">Binding</div>
          <div className="space-y-4">
            <MetricCard label="Provider" value={agent.bootProvider || 'Not configured'} />
            <MetricCard label="Bot Account" value={agent.bootAccountId || agent.botId || 'Not configured'} mono />
            <MetricCard label="Access" value={agent.bootAccessMode || 'Not configured'} />
            <MetricCard
              label="Labels"
              value={agent.bindingLabels?.length ? agent.bindingLabels.join(', ') : agent.botName || 'Not configured'}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  mono = false,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</div>
      {children ? (
        <div className="mt-2">{children}</div>
      ) : (
        <div className={`mt-2 text-sm text-zinc-100 ${mono ? 'font-mono break-all whitespace-pre-wrap' : ''}`}>{value}</div>
      )}
    </div>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}
