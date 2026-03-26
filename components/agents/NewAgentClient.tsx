'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AgentWizard } from '@/components/agents/AgentWizard';
import { createAgent } from '@/lib/gateway';
import type { CreateAgentInput } from '@/lib/types';

export function NewAgentClient() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, startTransition] = useTransition();

  const handleComplete = async (data: CreateAgentInput) => {
    setCreating(true);
    setError(null);

    try {
      const created = await createAgent(data);
      startTransition(() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push(`/agents?created=${encodeURIComponent(created.id)}`);
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to create agent. Please try again.');
      setCreating(false);
    }
  };

  const handleCancel = () => {
    router.push('/agents');
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3 text-sm text-zinc-500">
          <span>Agents</span>
          <span className="text-zinc-700">/</span>
          <span className="text-cyan-300">New Agent</span>
        </div>
        <h1 className="font-display text-4xl leading-none text-zinc-50">Create New Agent</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Set up a new OpenClaw agent with custom configuration
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-[18px] border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {creating && (
        <div className="mb-6 rounded-[22px] border border-cyan-300/30 bg-cyan-400/10 p-4 text-sm text-cyan-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-medium">正在创建 Agent</div>
              <div className="mt-1 text-xs text-cyan-100/80">
                正在写入配置并返回上一页。
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">
              <div className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
              <span>{isNavigating ? 'Returning' : 'In Progress'}</span>
            </div>
          </div>
        </div>
      )}

      <AgentWizard
        onComplete={handleComplete}
        onCancel={handleCancel}
        submitting={creating || isNavigating}
      />
    </div>
  );
}
