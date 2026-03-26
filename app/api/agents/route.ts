import { revalidatePath, revalidateTag } from 'next/cache';
import { createPersonaDraft } from '@/lib/agent-drafts';
import { createAgentRecord, getAgentSyncStatus, getAvailableModels, getConfiguredAgentEntries, getConfiguredAgentEntry, getEditableAgentConfig, updateAgentRecord } from '@/lib/openclaw-admin';
import { getServerAgents, getServerGatewayStatus, invalidateGatewayCacheEntries } from '@/lib/gateway-server';
import type { Agent, CreateAgentInput, UpdateAgentInput } from '@/lib/types';

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

  if (searchParams.get('method') === 'detail') {
    const agentId = searchParams.get('agentId')?.trim();
    if (!agentId) {
      return Response.json({ error: 'agentId is required.' }, { status: 400 });
    }

    const detail = await getEditableAgentConfig(agentId);
    if (!detail) {
      return Response.json({ error: 'Agent not found.' }, { status: 404 });
    }

    return Response.json(detail);
  }

  if (searchParams.get('method') === 'agent') {
    const agentId = searchParams.get('agentId')?.trim();
    if (!agentId) {
      return Response.json({ error: 'agentId is required.' }, { status: 400 });
    }

    const configuredAgent = await getConfiguredAgentEntry(agentId);
    if (!configuredAgent) {
      return Response.json({ error: 'Agent not found.' }, { status: 404 });
    }

    const lightweightAgent: Agent = {
      id: configuredAgent.id,
      name: configuredAgent.id,
      role: 'custom',
      model: typeof configuredAgent.model === 'string' ? configuredAgent.model : configuredAgent.model?.primary || 'unknown',
      workspace: configuredAgent.workspace,
      status: 'online',
      tokenUsage: 0,
      maxTokens: 0,
      createdAt: new Date(0).toISOString(),
      lastActive: new Date(0).toISOString(),
    };

    return Response.json(lightweightAgent);
  }

  if (searchParams.get('method') === 'chat') {
    const configuredAgents = await getConfiguredAgentEntries().catch(() => []);
    const lightweightAgents: Agent[] = configuredAgents.map((agent) => ({
      id: agent.id,
      name: agent.id,
      role: 'custom',
      model: typeof agent.model === 'string' ? agent.model : agent.model?.primary || 'unknown',
      workspace: agent.workspace,
      status: 'online',
      tokenUsage: 0,
      maxTokens: 0,
      createdAt: new Date(0).toISOString(),
      lastActive: new Date(0).toISOString(),
    }));

    return Response.json(lightweightAgents);
  }

  const agents = await getServerAgents();
  return Response.json(agents);
}

export async function POST(request: Request) {
  const body = await request.json() as Partial<CreateAgentInput>;
  const boot = body.boot ?? {};

  if (!body.name?.trim()) {
    return Response.json({ error: 'Role name is required.' }, { status: 400 });
  }

  if (!body.model?.trim()) {
    return Response.json({ error: 'Model is required.' }, { status: 400 });
  }

  const botConfigurationMode = body.botConfigurationMode || 'now';
  if (botConfigurationMode === 'now') {
    if (!boot?.provider) {
      return Response.json({ error: 'Boot provider is required.' }, { status: 400 });
    }

    if (boot.provider === 'telegram' && !boot.telegramToken?.trim()) {
      return Response.json({ error: 'Telegram token is required.' }, { status: 400 });
    }

    if (boot.provider === 'feishu' && (!boot.feishuAppId?.trim() || !boot.feishuAppSecret?.trim())) {
      return Response.json({ error: 'Feishu App ID and App Secret are required.' }, { status: 400 });
    }
  }

  const normalized: CreateAgentInput = {
    agentId: body.agentId?.trim() || undefined,
    workspacePath: body.workspacePath?.trim() || undefined,
    name: body.name.trim(),
    role: body.role || 'custom',
    model: body.model.trim(),
    persona: body.persona || createPersonaDraft(body.name.trim(), body.model.trim(), boot),
    botConfigurationMode,
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
    revalidatePath(`/agents/${agent.id}`);
    return Response.json(agent, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create agent.';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = await request.json() as Partial<UpdateAgentInput> & { agentId?: string };
  const agentId = body.agentId?.trim();
  const boot = body.boot ?? {};

  if (!agentId) {
    return Response.json({ error: 'agentId is required.' }, { status: 400 });
  }

  if (!body.model?.trim()) {
    return Response.json({ error: 'Model is required.' }, { status: 400 });
  }

  const existing = await getEditableAgentConfig(agentId);
  if (!existing) {
    return Response.json({ error: 'Agent not found.' }, { status: 404 });
  }

  const botConfigurationMode = body.botConfigurationMode || 'now';
  if (botConfigurationMode === 'now') {
    if (!boot.provider) {
      return Response.json({ error: 'Boot provider is required.' }, { status: 400 });
    }

    if (boot.provider === 'telegram') {
      const keepingExistingToken =
        existing.botConfigurationMode === 'now' &&
        existing.boot.provider === 'telegram' &&
        existing.boot.accountId === (boot.accountId?.trim() || agentId) &&
        existing.boot.hasToken &&
        !boot.telegramToken?.trim();

      if (!keepingExistingToken && !boot.telegramToken?.trim()) {
        return Response.json({ error: 'Telegram token is required.' }, { status: 400 });
      }
    }

    if (boot.provider === 'feishu') {
      const keepingExistingSecret =
        existing.botConfigurationMode === 'now' &&
        existing.boot.provider === 'feishu' &&
        existing.boot.accountId === (boot.accountId?.trim() || agentId) &&
        existing.boot.hasAppSecret &&
        !boot.feishuAppSecret?.trim();

      if (!boot.feishuAppId?.trim()) {
        return Response.json({ error: 'Feishu App ID is required.' }, { status: 400 });
      }

      if (!keepingExistingSecret && !boot.feishuAppSecret?.trim()) {
        return Response.json({ error: 'Feishu App Secret is required.' }, { status: 400 });
      }
    }
  }

  const normalized: UpdateAgentInput = {
    workspacePath: body.workspacePath?.trim() || undefined,
    model: body.model.trim(),
    botConfigurationMode,
    boot: {
      ...boot,
      accountId: boot.accountId?.trim(),
      accessMode: boot.accessMode,
      allowMembers: (boot.allowMembers || []).map((item) => item.trim()).filter(Boolean),
      telegramToken: boot.telegramToken?.trim(),
      feishuAppId: boot.feishuAppId?.trim(),
      feishuAppSecret: boot.feishuAppSecret?.trim(),
    },
  };

  try {
    await updateAgentRecord(agentId, normalized);
    invalidateGatewayCacheEntries();
    revalidateTag('gateway', 'max');
    revalidateTag('gateway-agents', 'max');
    revalidateTag('gateway-status', 'max');
    revalidatePath('/agents');
    revalidatePath('/');
    revalidatePath(`/agents/${agentId}`);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update agent.';
    return Response.json({ error: message }, { status: 500 });
  }
}
