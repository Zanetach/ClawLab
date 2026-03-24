import { revalidatePath, revalidateTag } from 'next/cache';
import { createPersonaDraft } from '@/lib/agent-drafts';
import { createAgentRecord, getAgentSyncStatus, getAvailableModels } from '@/lib/openclaw-admin';
import { getServerAgents, getServerGatewayStatus, invalidateGatewayCacheEntries } from '@/lib/gateway-server';
import type { CreateAgentInput } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get('method') === 'status') {
    const gatewayStatus = await getServerGatewayStatus();
    return Response.json(gatewayStatus);
  }

  if (searchParams.get('method') === 'models') {
    const models = await getAvailableModels();
    return Response.json(models);
  }

  if (searchParams.get('method') === 'sync') {
    const agentId = searchParams.get('agentId')?.trim();
    if (!agentId) {
      return Response.json({ error: 'agentId is required.' }, { status: 400 });
    }

    const syncStatus = await getAgentSyncStatus(agentId);
    return Response.json(syncStatus);
  }

  const agents = await getServerAgents();
  return Response.json(agents);
}

export async function POST(request: Request) {
  const body = await request.json() as Partial<CreateAgentInput>;
  const boot = body.boot;

  if (!body.name?.trim()) {
    return Response.json({ error: 'Role name is required.' }, { status: 400 });
  }

  if (!body.model?.trim()) {
    return Response.json({ error: 'Model is required.' }, { status: 400 });
  }

  if (!boot?.provider) {
    return Response.json({ error: 'Boot provider is required.' }, { status: 400 });
  }

  if (boot.provider === 'telegram' && !boot.telegramToken?.trim()) {
    return Response.json({ error: 'Telegram token is required.' }, { status: 400 });
  }

  if (boot.provider === 'feishu' && (!boot.feishuAppId?.trim() || !boot.feishuAppSecret?.trim())) {
    return Response.json({ error: 'Feishu App ID and App Secret are required.' }, { status: 400 });
  }

  const normalized: CreateAgentInput = {
    name: body.name.trim(),
    role: body.role || 'custom',
    model: body.model.trim(),
    persona: body.persona || createPersonaDraft(body.name.trim(), body.model.trim(), boot),
    boot: {
      ...boot,
      accountId: boot.accountId?.trim(),
      allowMembers: (boot.allowMembers || []).map((item) => item.trim()).filter(Boolean),
      telegramToken: boot.telegramToken?.trim(),
      feishuAppId: boot.feishuAppId?.trim(),
      feishuAppSecret: boot.feishuAppSecret?.trim(),
    },
  };

  try {
    const agent = await createAgentRecord(normalized);
    invalidateGatewayCacheEntries();
    revalidateTag('gateway', 'max');
    revalidateTag('gateway-agents', 'max');
    revalidateTag('gateway-status', 'max');
    revalidatePath('/agents');
    revalidatePath('/');
    return Response.json(agent, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create agent.';
    return Response.json({ error: message }, { status: 500 });
  }
}
