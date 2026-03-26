'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { AgentDetailEditor } from '@/components/agents/AgentDetailEditor';
import { IndustrialButton } from '@/components/ui/IndustrialButton';
import { StatusDot } from '@/components/ui/StatusDot';
import { getAgent, getAvailableModels, getEditableAgentConfig } from '@/lib/gateway';
import type { Agent, AvailableModel, EditableAgentConfig } from '@/lib/types';

export function AgentDetailClient({ agentId }: { agentId: string }) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [editableConfig, setEditableConfig] = useState<EditableAgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setMissing(false);

      try {
        const [nextAgent, nextModels, nextConfig] = await Promise.all([
          getAgent(agentId),
          getAvailableModels(),
          getEditableAgentConfig(agentId),
        ]);

        if (cancelled) {
          return;
        }

        if (!nextAgent || !nextConfig) {
          setMissing(true);
          return;
        }

        setAgent(nextAgent);
        setModels(nextModels);
        setEditableConfig(nextConfig);
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : '加载 Agent 详情失败。');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const usagePct = useMemo(() => {
    if (!agent || agent.maxTokens <= 0) {
      return 0;
    }

    return Math.round((agent.tokenUsage / agent.maxTokens) * 100);
  }, [agent]);

  if (missing) {
    notFound();
  }

  const title = agent?.name ?? agentId;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-3 text-sm text-zinc-500">
            <span>Agents</span>
            <span className="text-zinc-700">/</span>
            <span className="text-cyan-300">{agentId}</span>
          </div>
          <h1 className="font-display text-4xl leading-none text-zinc-50">{title}</h1>
          <p className="mt-2 text-sm text-zinc-400">
            直接修改 workspace、bot 和模型配置，保存后立即生效。
          </p>
        </div>

        <Link href="/agents">
          <IndustrialButton variant="ghost" size="sm">
            返回列表
          </IndustrialButton>
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-[20px] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          <div>{error}</div>
          <div className="mt-3">
            <IndustrialButton variant="ghost" size="sm" onClick={() => router.refresh()}>
              重试
            </IndustrialButton>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Status" loading={loading}>
          {agent ? (
            <div className="flex items-center gap-2">
              <StatusDot status={agent.status} size="sm" />
              <span className="text-sm uppercase text-zinc-100">{agent.status}</span>
            </div>
          ) : null}
        </MetricCard>
        <MetricCard label="Model" value={agent?.model} mono loading={loading} />
        <MetricCard label="Workspace" value={agent?.workspace || 'Not configured'} mono loading={loading} />
        <MetricCard
          label="Token Usage"
          value={agent ? `${agent.tokenUsage.toLocaleString()} / ${agent.maxTokens.toLocaleString()} (${usagePct}%)` : undefined}
          mono
          loading={loading}
        />
      </div>

      {agent && editableConfig ? (
        <AgentDetailEditor agent={agent} models={models} initialConfig={editableConfig} />
      ) : (
        <div className="glass-panel rounded-[24px] border border-white/8 p-5">
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  mono = false,
  loading = false,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</div>
      {loading ? (
        <div className="mt-3 h-6 w-32 animate-pulse rounded bg-white/8" />
      ) : children ? (
        <div className="mt-2">{children}</div>
      ) : (
        <div className={`mt-2 text-sm text-zinc-100 ${mono ? 'font-mono break-all whitespace-pre-wrap' : ''}`}>{value}</div>
      )}
    </div>
  );
}
