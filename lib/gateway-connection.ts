import 'server-only';

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { redirect } from 'next/navigation';
import {
  convertOpenClawAgent,
  deriveDashboardStats,
  normalizeGatewayStatus,
  type OpenClawAgent,
} from './gateway-core';
import { getCliAgents, getCliStatus } from './openclaw-cli';
import { applyObservedSessionUsage } from './openclaw-session-usage';
import { getConfiguredAgentEntries } from './openclaw-admin';
import { getLocalStatePath } from './local-state-path';
import type {
  GatewayConnectionConfig,
  GatewayConnectionHealth,
  GatewayConnectionRuntime,
  GatewayConnectionState,
  GatewayStatus,
} from './types';

const STORE_PATH = getLocalStatePath('gateway-connection.json');

type OpenClawConfig = {
  gateway?: {
    port?: number;
    auth?: {
      mode?: string;
      token?: string;
    };
  };
};

function normalizeGatewayUrl(url: string): string {
  if (/^http:\/\//i.test(url)) {
    return url.replace(/^http:\/\//i, 'ws://');
  }

  if (/^https:\/\//i.test(url)) {
    return url.replace(/^https:\/\//i, 'wss://');
  }

  return url;
}

function normalizeGatewayConnectionConfig(config: GatewayConnectionConfig): GatewayConnectionConfig {
  return {
    ...config,
    url: normalizeGatewayUrl(config.url.trim()),
    token: config.token?.trim() || undefined,
  };
}

function getDisconnectedHealth(error: string | null = null): GatewayConnectionHealth {
  return {
    status: 'offline',
    lastCheckedAt: null,
    latencyMs: null,
    error,
  };
}

function formatProbeError(error: unknown): string {
  return error instanceof Error ? error.message : '无法获取 Gateway 运行状态。';
}

function isOpenClawAgent(value: unknown): value is OpenClawAgent {
  return !!value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string';
}

async function getGatewayRuntime(
  connection: GatewayConnectionConfig | null
): Promise<{ health: GatewayConnectionHealth; runtime: GatewayConnectionRuntime | null }> {
  if (!connection) {
    return {
      health: getDisconnectedHealth(),
      runtime: null,
    };
  }

  const checkedAt = new Date().toISOString();
  const startedAt = Date.now();
  const generatedAt = new Date().toISOString();

  try {
    const [rawAgents, rawStatus] = await Promise.all([
      getCliAgents(connection).catch(() => []),
      getCliStatus(connection),
    ]);

    const agents = rawAgents.reduce<ReturnType<typeof convertOpenClawAgent>[]>((items, agent) => {
      if (!isOpenClawAgent(agent)) {
        return items;
      }

      items.push(convertOpenClawAgent(agent, generatedAt));
      return items;
    }, []);
    const agentsWithUsage = await applyObservedSessionUsage(agents);
    const configuredAgents = connection.source === 'local' && rawAgents.length === 0
      ? await getConfiguredAgentEntries().catch(() => [])
      : [];
    const fallbackAgents = await applyObservedSessionUsage(
      configuredAgents.map((agent) => convertOpenClawAgent({
        id: agent.id,
        name: agent.id,
        model: typeof agent.model === 'string' ? agent.model : agent.model?.primary,
        workspace: agent.workspace,
      }, generatedAt))
    );
    const effectiveAgents = agentsWithUsage.length > 0 ? agentsWithUsage : fallbackAgents;
    const gatewayStatusInput = rawStatus as Partial<GatewayStatus> | null | undefined;
    const gatewayStatus = normalizeGatewayStatus(
      gatewayStatusInput,
      effectiveAgents
    );
    const stats = deriveDashboardStats(effectiveAgents);
    const usingConfiguredFallback = agentsWithUsage.length === 0 && fallbackAgents.length > 0 && !gatewayStatusInput;
    const healthStatus = usingConfiguredFallback
      ? 'offline'
      : gatewayStatus.status === 'online'
        ? 'connected'
        : gatewayStatus.status === 'degraded'
          ? 'degraded'
          : 'offline';

    return {
      health: {
        status: healthStatus,
        lastCheckedAt: checkedAt,
        latencyMs: Date.now() - startedAt,
        error: usingConfiguredFallback ? '已读取本地配置，但当前无法探测到正在运行的 Gateway。' : null,
      },
      runtime: {
        endpoint: connection.url,
        source: connection.source,
        version: gatewayStatus.version,
        connectedAgents: gatewayStatus.connectedAgents,
        totalBots: gatewayStatus.totalBots,
        totalTokens: gatewayStatus.totalTokens,
        activeAlerts: stats.activeAlerts,
        tokenConsumption: stats.tokenConsumption,
      },
    };
  } catch (error) {
    return {
      health: {
        status: 'offline',
        lastCheckedAt: checkedAt,
        latencyMs: Date.now() - startedAt,
        error: formatProbeError(error),
      },
      runtime: {
        endpoint: connection.url,
        source: connection.source,
        version: null,
        connectedAgents: 0,
        totalBots: 0,
        totalTokens: 0,
        activeAlerts: 0,
        tokenConsumption: 0,
      },
    };
  }
}

function getOpenClawConfigPath(): string {
  const configured = process.env.OPENCLAW_CONFIG_PATH?.trim();
  return configured || path.join(os.homedir(), '.openclaw', 'openclaw.json');
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function getStoredGatewayConnection(): Promise<GatewayConnectionConfig | null> {
  const stored = await readJsonFile<GatewayConnectionConfig>(STORE_PATH);
  if (!stored) {
    return null;
  }

  const normalized = normalizeGatewayConnectionConfig(stored);
  if (JSON.stringify(normalized) !== JSON.stringify(stored)) {
    await saveGatewayConnection(normalized);
  }

  return normalized;
}

export async function saveGatewayConnection(config: GatewayConnectionConfig): Promise<void> {
  const normalized = normalizeGatewayConnectionConfig(config);
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
}

export async function clearGatewayConnection(): Promise<void> {
  await rm(STORE_PATH, { force: true });
}

export async function detectLocalGatewayConnection(): Promise<GatewayConnectionConfig | null> {
  const configPath = getOpenClawConfigPath();
  const config = await readJsonFile<OpenClawConfig>(configPath);
  if (!config?.gateway?.port) {
    return null;
  }

  const url = `ws://127.0.0.1:${config.gateway.port}`;
  const token = config.gateway.auth?.token?.trim();

  return {
    mode: 'auto',
    url,
    token: token || undefined,
    label: 'Local OpenClaw Gateway',
    source: 'local',
    configPath,
  };
}

export async function getGatewayConnectionState(options?: { includeRuntime?: boolean }): Promise<GatewayConnectionState> {
  const [stored, detected] = await Promise.all([
    getStoredGatewayConnection(),
    detectLocalGatewayConnection(),
  ]);
  const activeConnection = stored || detected;
  const includeRuntime = options?.includeRuntime ?? true;
  const { health, runtime } = includeRuntime
    ? await getGatewayRuntime(activeConnection)
    : {
        health: getDisconnectedHealth(),
        runtime: null,
      };

  return {
    configured: !!stored,
    activeConnection,
    detectedConnection: detected,
    needsOnboarding: !stored,
    health,
    runtime,
  };
}

export async function requireConfiguredGatewayConnection(): Promise<GatewayConnectionConfig> {
  const state = await getGatewayConnectionState({ includeRuntime: false });
  if (!state.configured || !state.activeConnection) {
    redirect('/onboarding');
  }

  return state.activeConnection;
}
