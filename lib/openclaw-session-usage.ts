import 'server-only';

import { readdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Agent } from './types';
import { cache } from './cache';

const SESSION_USAGE_CACHE_KEY = 'gateway:session-usage';
const SESSION_USAGE_TTL_MS = 3_000;

type SessionEntry = {
  updatedAt?: number;
  totalTokens?: number;
  contextTokens?: number;
  lastAccountId?: string;
  deliveryContext?: {
    accountId?: string;
  };
  origin?: {
    accountId?: string;
  };
};

type AgentSessionUsage = {
  tokenUsage: number;
  maxTokens: number;
  lastActive: string;
};

function getOpenClawStateDir(): string {
  const configured = process.env.OPENCLAW_STATE_DIR?.trim();
  return configured || path.join(os.homedir(), '.openclaw');
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getSessionsStorePath(agentId: string): string {
  return path.join(getOpenClawStateDir(), 'agents', agentId, 'sessions', 'sessions.json');
}

async function getAllSessionStorePaths(): Promise<string[]> {
  const agentsRoot = path.join(getOpenClawStateDir(), 'agents');

  try {
    const entries = await readdir(agentsRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(agentsRoot, entry.name, 'sessions', 'sessions.json'));
  } catch {
    return [];
  }
}

function resolveAccountId(entry: SessionEntry): string | null {
  return entry.lastAccountId
    || entry.deliveryContext?.accountId
    || entry.origin?.accountId
    || null;
}

function resolveObservedUsage(entries: SessionEntry[]): AgentSessionUsage | null {
  const latestObservedEntry = [...entries]
    .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
    .find((entry) => typeof entry.totalTokens === 'number' && entry.totalTokens > 0);

  if (!latestObservedEntry) {
    return null;
  }

  return {
    tokenUsage: latestObservedEntry.totalTokens ?? 0,
    maxTokens:
      typeof latestObservedEntry.contextTokens === 'number' && latestObservedEntry.contextTokens > 0
        ? latestObservedEntry.contextTokens
        : 100000,
    lastActive: new Date(latestObservedEntry.updatedAt ?? Date.now()).toISOString(),
  };
}

async function loadObservedUsage(agentIds: string[]): Promise<Map<string, AgentSessionUsage>> {
  const targetIds = new Set(agentIds);
  const usageMap = new Map<string, AgentSessionUsage>();

  const directStores = await Promise.all(
    agentIds.map(async (agentId) => [agentId, await readJsonFile<Record<string, SessionEntry>>(getSessionsStorePath(agentId))] as const)
  );

  for (const [agentId, store] of directStores) {
    if (!store) {
      continue;
    }

    const usage = resolveObservedUsage(Object.values(store));
    if (usage) {
      usageMap.set(agentId, usage);
    }
  }

  const sharedStorePaths = await getAllSessionStorePaths();
  const sharedStores = await Promise.all(
    sharedStorePaths.map(async (storePath) => readJsonFile<Record<string, SessionEntry>>(storePath))
  );

  for (const store of sharedStores) {
    if (!store) {
      continue;
    }

    const groupedEntries = new Map<string, SessionEntry[]>();

    for (const entry of Object.values(store)) {
      const accountId = resolveAccountId(entry);
      if (!accountId || !targetIds.has(accountId)) {
        continue;
      }

      const current = groupedEntries.get(accountId) ?? [];
      current.push(entry);
      groupedEntries.set(accountId, current);
    }

    for (const [accountId, entries] of groupedEntries) {
      const nextUsage = resolveObservedUsage(entries);
      const currentUsage = usageMap.get(accountId);

      if (!nextUsage) {
        continue;
      }

      if (!currentUsage || Date.parse(nextUsage.lastActive) > Date.parse(currentUsage.lastActive)) {
        usageMap.set(accountId, nextUsage);
      }
    }
  }

  return usageMap;
}

export async function getObservedSessionUsage(agentIds: string[]): Promise<Map<string, AgentSessionUsage>> {
  const uniqueAgentIds = [...new Set(agentIds.filter(Boolean))].sort();
  const suffix = uniqueAgentIds.join(',');
  const key = suffix ? `${SESSION_USAGE_CACHE_KEY}:${suffix}` : SESSION_USAGE_CACHE_KEY;
  return cache.getOrCompute(key, () => loadObservedUsage(uniqueAgentIds), SESSION_USAGE_TTL_MS);
}

export async function applyObservedSessionUsage(agents: Agent[]): Promise<Agent[]> {
  if (agents.length === 0) {
    return agents;
  }

  const observedUsage = await getObservedSessionUsage(agents.map((agent) => agent.id));
  return agents.map((agent) => {
    const usage = observedUsage.get(agent.id);
    if (!usage) {
      return agent;
    }

    return {
      ...agent,
      tokenUsage: usage.tokenUsage,
      maxTokens: usage.maxTokens,
      lastActive: usage.lastActive,
    };
  });
}
