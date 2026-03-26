import { AgentDetailClient } from '@/components/agents/AgentDetailClient';

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  return <AgentDetailClient agentId={agentId} />;
}
