import { AgentsClient } from '@/components/agents/AgentsClient';
import { requireConfiguredGatewayConnection } from '@/lib/gateway-connection';
import { getServerAgents } from '@/lib/gateway-server';
import { getAgentSyncStatus } from '@/lib/openclaw-admin';

export default async function AgentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string }>;
}) {
  await requireConfiguredGatewayConnection();
  const params = searchParams ? await searchParams : undefined;
  const createdAgentId = params?.created?.trim();
  const [initialAgents, initialSyncStatus] = await Promise.all([
    getServerAgents(),
    createdAgentId ? getAgentSyncStatus(createdAgentId) : Promise.resolve(null),
  ]);

  return (
    <AgentsClient
      initialAgents={initialAgents}
      createdAgentId={createdAgentId || null}
      initialSyncStatus={initialSyncStatus}
    />
  );
}
