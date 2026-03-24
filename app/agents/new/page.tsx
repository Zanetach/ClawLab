import { NewAgentClient } from '@/components/agents/NewAgentClient';
import { requireConfiguredGatewayConnection } from '@/lib/gateway-connection';

export default async function NewAgentPage() {
  await requireConfiguredGatewayConnection();

  return <NewAgentClient />;
}
