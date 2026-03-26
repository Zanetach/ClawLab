import {
  Agent,
  GatewayStatus,
  DashboardStats,
  DashboardSummary,
  Alert,
  AvailableModel,
  CreateAgentInput,
  AgentSyncStatus,
  EditableAgentConfig,
  GatewayConnectionConfig,
  GatewayConnectionState,
  UpdateAgentInput,
  ChatSessionSummary,
  ChatSessionDetail,
  ChatRunStatus,
} from './types';
import { createFallbackSnapshot, type DashboardSnapshot } from './gateway-core';

const inflightRequests = new Map<string, Promise<unknown>>();
const responseCache = new Map<string, { expiresAt: number; data: unknown }>();
const CLIENT_CACHE_TTL_MS = 1_500;

function getCachedResponse<T>(key: string): T | null {
  const cached = responseCache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }

  return cached.data as T;
}

function invalidateClientGatewayCache(): void {
  inflightRequests.clear();
  responseCache.clear();
}

async function fetchJson<T>(input: string, options?: { cacheTtlMs?: number; dedupe?: boolean }): Promise<T> {
  const cacheKey = input;
  const dedupe = options?.dedupe ?? true;
  const cacheTtlMs = options?.cacheTtlMs ?? CLIENT_CACHE_TTL_MS;
  const cached = getCachedResponse<T>(cacheKey);
  if (cached) {
    return cached;
  }

  const existingRequest = dedupe ? inflightRequests.get(cacheKey) : null;
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const request = (async () => {
    const response = await fetch(input, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json() as T;
    responseCache.set(cacheKey, {
      expiresAt: Date.now() + cacheTtlMs,
      data,
    });
    return data;
  })();

  if (dedupe) {
    inflightRequests.set(cacheKey, request);
  }

  try {
    return await request;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  try {
    return await fetchJson<DashboardSnapshot>('/api/dashboard');
  } catch (error) {
    console.error('Failed to get dashboard snapshot:', error);
    return createFallbackSnapshot();
  }
}

export async function getGatewayStatus(): Promise<GatewayStatus> {
  return fetchJson<GatewayStatus>('/api/agents?method=status');
}

export async function getAgents(): Promise<Agent[]> {
  return fetchJson<Agent[]>('/api/agents');
}

export async function getChatAgents(): Promise<Agent[]> {
  return fetchJson<Agent[]>('/api/agents?method=chat', {
    dedupe: false,
    cacheTtlMs: 0,
  });
}

export async function getAgent(id: string): Promise<Agent | null> {
  const response = await fetch(`/api/agents?method=agent&agentId=${encodeURIComponent(id)}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<Agent>;
}

export async function getAvailableModels(): Promise<AvailableModel[]> {
  return fetchJson<AvailableModel[]>('/api/agents?method=models');
}

export async function getEditableAgentConfig(agentId: string): Promise<EditableAgentConfig> {
  return fetchJson<EditableAgentConfig>(`/api/agents?method=detail&agentId=${encodeURIComponent(agentId)}`, {
    dedupe: false,
    cacheTtlMs: 0,
  });
}

export async function getAgentSyncStatus(agentId: string): Promise<AgentSyncStatus> {
  return fetchJson<AgentSyncStatus>(`/api/agents?method=sync&agentId=${encodeURIComponent(agentId)}`);
}

export async function createAgent(data: CreateAgentInput): Promise<Agent> {
  const response = await fetch('/api/agents', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.error === 'string' ? payload.error : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  const agent = await response.json() as Agent;
  invalidateClientGatewayCache();
  return agent;
}

export async function updateAgent(agentId: string, data: UpdateAgentInput): Promise<void> {
  const response = await fetch('/api/agents', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      agentId,
      ...data,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.error === 'string' ? payload.error : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  invalidateClientGatewayCache();
}

export async function getGatewayConnectionState(): Promise<GatewayConnectionState> {
  return fetchJson<GatewayConnectionState>('/api/gateway-connection');
}

export async function saveGatewayConnection(
  input:
    | { mode: 'auto' }
    | { mode: 'manual'; url: string; token?: string }
): Promise<GatewayConnectionConfig> {
  const response = await fetch('/api/gateway-connection', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.error === 'string' ? payload.error : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  const connection = await response.json() as GatewayConnectionConfig;
  invalidateClientGatewayCache();
  return connection;
}

export async function reconnectGatewayConnection(connection: GatewayConnectionConfig): Promise<GatewayConnectionConfig> {
  if (connection.mode === 'auto') {
    return saveGatewayConnection({ mode: 'auto' });
  }

  return saveGatewayConnection({
    mode: 'manual',
    url: connection.url,
    token: connection.token,
  });
}

export async function disconnectGatewayConnection(): Promise<GatewayConnectionState> {
  const response = await fetch('/api/gateway-connection', {
    method: 'DELETE',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.error === 'string' ? payload.error : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  const state = await response.json() as GatewayConnectionState;
  invalidateClientGatewayCache();
  return state;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const summary = await fetchJson<DashboardSummary>('/api/dashboard-summary');
  return summary.stats;
}

export async function getAlerts(): Promise<Alert[]> {
  const summary = await fetchJson<DashboardSummary>('/api/dashboard-summary');
  return summary.alerts;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return fetchJson<DashboardSummary>('/api/dashboard-summary');
}

export async function getChatSessions(): Promise<ChatSessionSummary[]> {
  return fetchJson<ChatSessionSummary[]>('/api/chat/sessions', {
    dedupe: false,
    cacheTtlMs: 0,
  });
}

export async function getChatSession(sessionId: string, agentId: string): Promise<ChatSessionDetail> {
  return fetchJson<ChatSessionDetail>(
    `/api/chat/sessions/${encodeURIComponent(sessionId)}?agentId=${encodeURIComponent(agentId)}`,
    {
      dedupe: false,
      cacheTtlMs: 0,
    }
  );
}

export async function sendChatMessage(input: {
  agentId: string;
  sessionId?: string;
  message: string;
}): Promise<ChatRunStatus> {
  const response = await fetch('/api/chat/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.error === 'string' ? payload.error : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  invalidateClientGatewayCache();
  return response.json() as Promise<ChatRunStatus>;
}

export async function getChatRunStatus(sessionId: string, agentId?: string): Promise<ChatRunStatus> {
  return fetchJson<ChatRunStatus>(
    `/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}${agentId ? `&agentId=${encodeURIComponent(agentId)}` : ''}`,
    {
      dedupe: false,
      cacheTtlMs: 0,
    }
  );
}

export async function stopChatMessage(sessionId: string): Promise<ChatRunStatus> {
  const response = await fetch(`/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.error === 'string' ? payload.error : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  invalidateClientGatewayCache();
  return response.json() as Promise<ChatRunStatus>;
}
