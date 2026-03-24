'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgentWizard } from '@/components/agents/AgentWizard';
import { createAgent } from '@/lib/gateway';
import type { CreateAgentInput } from '@/lib/types';

export function NewAgentClient() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (data: CreateAgentInput) => {
    setCreating(true);
    setError(null);

    try {
      const created = await createAgent(data);
      router.push(`/agents?created=${encodeURIComponent(created.id)}`);
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

      {creating ? (
        <div className="flex h-64 flex-col items-center justify-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
          <div className="text-zinc-400">Creating agent...</div>
        </div>
      ) : (
        <AgentWizard onComplete={handleComplete} onCancel={handleCancel} />
      )}
    </div>
  );
}
