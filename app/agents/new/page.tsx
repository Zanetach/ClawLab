'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IndustrialButton } from '@/components/ui/IndustrialButton';
import { AgentWizard, AgentFormData } from '@/components/agents/AgentWizard';
import { createAgent } from '@/lib/gateway';

export default function NewAgentPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (data: AgentFormData) => {
    setCreating(true);
    setError(null);

    try {
      await createAgent(data);
      router.push('/agents');
    } catch (err) {
      setError('Failed to create agent. Please try again.');
      setCreating(false);
    }
  };

  const handleCancel = () => {
    router.push('/agents');
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 text-sm text-zinc-500 mb-2">
          <span>Agents</span>
          <span className="text-zinc-700">/</span>
          <span className="text-amber-500">New Agent</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-100">Create New Agent</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Set up a new OpenClaw agent with custom configuration
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-sm">
          {error}
        </div>
      )}

      {creating ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
          <div className="text-zinc-400">Creating agent...</div>
        </div>
      ) : (
        <AgentWizard onComplete={handleComplete} onCancel={handleCancel} />
      )}
    </div>
  );
}
