import 'server-only';

import { unstable_cache } from 'next/cache';
import { cache } from './cache';
import {
  createDashboardSnapshot,
  createFallbackSnapshot,
  deriveAlerts,
  deriveDashboardStats,
  normalizeGatewayStatus,
  type DashboardSnapshot,
  type OpenClawAgent,
  convertOpenClawAgent,
  getMockAgents,
} from './gateway-core';
import type { Agent, DashboardSummary, GatewayStatus } from './types';
import { getCliAgents } from './openclaw-cli';
import { getAgentBindingMeta, getConfiguredAgentEntries, type AgentBindingMeta } from './openclaw-admin';
import { hydrateTelemetryHistory } from './dashboard-telemetry';
import { applyObservedSessionUsage } from './openclaw-session-usage';

const AGENTS_CACHE_KEY = 'gateway:agents';
const STATUS_CACHE_KEY = 'gateway:status';
const SNAPSHOT_CACHE_KEY = 'gateway:snapshot';

const AGENTS_TTL_MS = 3_000;
const STATUS_TTL_MS = 3_000;
const SNAPSHOT_TTL_MS = 2_000;

function getUpstreamBaseUrl(): string | null {
  const baseUrl = process.env.OPENCLAW_API_BASE?.trim();
  return baseUrl ? baseUrl.replace(/\/$/, '') : null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(1_500),
  });

  if (!response.ok) {
    throw new Error(`Upstream request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchAgentsFromUpstream(): Promise<Agent[]> {
  const baseUrl = getUpstreamBaseUrl();
  const generatedAt = new Date().toISOString();
  const bindingMeta = await getAgentBindingMeta().catch(() => new Map<string, AgentBindingMeta>());
  const configuredAgents = await getConfiguredAgentEntries().catch(() => []);
  const configuredAgentMap = new Map(configuredAgents.map((agent) => [agent.id, agent]));

  const applyConfiguredMeta = (agents: Agent[]): Agent[] =>
    agents.map((agent) => {
      const configured = configuredAgentMap.get(agent.id);
      if (!configured) {
        return agent;
      }

      return {
        ...agent,
        workspace: agent.workspace || configured.workspace,
        model: agent.model || (typeof configured.model === 'string' ? configured.model : configured.model?.primary) || agent.model,
      };
    });

  const applyBindingMeta = (agents: Agent[]): Agent[] =>
    agents.map((agent) => {
      const meta = bindingMeta.get(agent.id);
      if (!meta) {
        return agent;
      }

      return {
        ...agent,
        botId: meta.accountId,
        botName: meta.label,
        bootProvider: meta.provider,
        bootAccountId: meta.accountId,
        bootAccessMode: meta.accessMode,
        bindingLabels: meta.labels,
      };
    });

  const fromConfiguredAgents = (): Agent[] => {
    if (configuredAgents.length === 0) {
      return getMockAgents(generatedAt);
    }

    return configuredAgents.map((agent) => convertOpenClawAgent({
      id: agent.id,
      name: agent.id,
      model: typeof agent.model === 'string' ? agent.model : agent.model?.primary,
      workspace: agent.workspace,
    }, generatedAt));
  };

  if (!baseUrl) {
    try {
      const rawAgents = await getCliAgents();
      return applyObservedSessionUsage(applyBindingMeta(applyConfiguredMeta(
        rawAgents.length > 0
          ? rawAgents.map((agent) => convertOpenClawAgent(agent as OpenClawAgent, generatedAt))
          : fromConfiguredAgents()
      )));
    } catch {
      return applyObservedSessionUsage(applyBindingMeta(applyConfiguredMeta(fromConfiguredAgents())));
    }
  }

  try {
    const rawAgents = await fetchJson<OpenClawAgent[]>(`${baseUrl}/api/agents`);
    return applyObservedSessionUsage(applyBindingMeta(applyConfiguredMeta(
      Array.isArray(rawAgents)
        ? rawAgents.map((agent) => convertOpenClawAgent(agent, generatedAt))
        : fromConfiguredAgents()
    )));
  } catch {
    const rawAgents = await getCliAgents();
    return applyObservedSessionUsage(applyBindingMeta(applyConfiguredMeta(
      rawAgents.length > 0
        ? rawAgents.map((agent) => convertOpenClawAgent(agent as OpenClawAgent, generatedAt))
        : fromConfiguredAgents()
    )));
  }
}

async function fetchStatusFromUpstream(): Promise<GatewayStatus | null> {
  const baseUrl = getUpstreamBaseUrl();
  if (!baseUrl) {
    return null;
  }

  try {
    return await fetchJson<GatewayStatus>(`${baseUrl}/api/agents?method=status`);
  } catch {
    return null;
  }
}

export async function getServerAgents(): Promise<Agent[]> {
  return cache.getOrCompute(AGENTS_CACHE_KEY, getCachedAgents, AGENTS_TTL_MS);
}

export async function getServerGatewayStatus(): Promise<GatewayStatus> {
  return cache.getOrCompute(
    STATUS_CACHE_KEY,
    async () => {
      const [status, agents] = await Promise.all([
        getCachedGatewayStatus(),
        getServerAgents(),
      ]);

      return normalizeGatewayStatus(status ?? undefined, agents);
    },
    STATUS_TTL_MS
  );
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const [agents, gatewayStatusInput] = await Promise.all([
      getServerAgents(),
      getCachedGatewayStatus(),
    ]);
    const generatedAt = new Date().toISOString();
    const telemetry = await hydrateTelemetryHistory({
      agents,
      generatedAt,
      totalTokens: gatewayStatusInput?.totalTokens ?? 0,
    });
    const summaryAgents = telemetry.telemetryMode === 'estimated'
      ? agents.map((agent) => ({
          ...agent,
          tokenUsage: telemetry.history[telemetry.history.length - 1]?.values[agent.id] ?? agent.tokenUsage,
        }))
      : agents;
    const gatewayStatus = normalizeGatewayStatus(gatewayStatusInput ?? undefined, summaryAgents);

    return {
      gatewayStatus,
      stats: deriveDashboardStats(summaryAgents),
      alerts: deriveAlerts(summaryAgents, generatedAt),
      generatedAt,
    };
  } catch {
    const fallback = createFallbackSnapshot();
    return {
      gatewayStatus: fallback.gatewayStatus,
      stats: fallback.stats,
      alerts: fallback.alerts,
      generatedAt: fallback.generatedAt,
    };
  }
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  try {
    return await cache.getOrCompute(
      SNAPSHOT_CACHE_KEY,
      async () => {
        const [agents, gatewayStatus] = await Promise.all([
          getServerAgents(),
          getCachedGatewayStatus(),
        ]);

        const snapshot = createDashboardSnapshot(agents, gatewayStatus ?? undefined);
        const telemetry = await hydrateTelemetryHistory({
          agents,
          generatedAt: snapshot.generatedAt,
          totalTokens: snapshot.gatewayStatus.totalTokens,
        });
        const telemetryBackfilledSnapshot = applyTelemetryToSnapshot(snapshot, telemetry);

        return {
          ...telemetryBackfilledSnapshot,
          history: telemetry.history,
          telemetryMode: telemetry.telemetryMode,
        };
      },
      SNAPSHOT_TTL_MS
    );
  } catch {
    return createFallbackSnapshot();
  }
}

function applyTelemetryToSnapshot(
  snapshot: DashboardSnapshot,
  telemetry: { history: DashboardSnapshot['history']; telemetryMode: DashboardSnapshot['telemetryMode'] }
): DashboardSnapshot {
  if (telemetry.telemetryMode !== 'estimated') {
    return snapshot;
  }

  const latestPoint = telemetry.history[telemetry.history.length - 1];
  if (!latestPoint) {
    return snapshot;
  }

  const agents = snapshot.agents.map((agent) => ({
    ...agent,
    tokenUsage: latestPoint.values[agent.id] ?? agent.tokenUsage,
  }));
  const gatewayStatus = normalizeGatewayStatus(
    {
      ...snapshot.gatewayStatus,
      totalTokens: agents.reduce((sum, agent) => sum + agent.tokenUsage, 0),
    },
    agents
  );

  return {
    ...snapshot,
    agents,
    gatewayStatus,
    stats: deriveDashboardStats(agents),
    alerts: deriveAlerts(agents, snapshot.generatedAt),
  };
}

export function invalidateGatewayCacheEntries(): void {
  cache.invalidate(AGENTS_CACHE_KEY);
  cache.invalidate(STATUS_CACHE_KEY);
  cache.invalidate(SNAPSHOT_CACHE_KEY);
}

const getCachedAgents = unstable_cache(
  async () => fetchAgentsFromUpstream(),
  ['gateway-agents'],
  {
    revalidate: 3,
    tags: ['gateway', 'gateway-agents'],
  }
);

const getCachedGatewayStatus = unstable_cache(
  async () => fetchStatusFromUpstream(),
  ['gateway-status'],
  {
    revalidate: 3,
    tags: ['gateway', 'gateway-status'],
  }
);
