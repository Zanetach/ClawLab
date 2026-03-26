import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getLocalStatePath } from './local-state-path';
import type { Agent, TelemetryMode, TokenHistoryPoint } from './types';

interface TelemetryStore {
  history: TokenHistoryPoint[];
}

const MAX_POINTS = 24;
const STORE_PATH = getLocalStatePath('dashboard-telemetry.json');

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function readStore(): Promise<TelemetryStore> {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<TelemetryStore>;
    return {
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { history: [] };
  }
}

async function writeStore(store: TelemetryStore): Promise<void> {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function buildEstimatedValues(
  agents: Agent[],
  history: TokenHistoryPoint[],
  timestamp: string,
  totalTokens: number
): Record<string, number> {
  const lastPoint = history[history.length - 1];
  const step = history.length + 1;

  const rawEntries = agents.map((agent, index) => {
    const seed = Array.from(agent.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) + index * 97;
    const previous = lastPoint?.values[agent.id] ?? (1200 + (seed % 2600));
    const statusFactor = agent.status === 'warning' || agent.status === 'busy'
      ? 1.15
      : agent.status === 'offline' || agent.status === 'error'
        ? 0.88
        : 1.04;
    const wave = Math.sin((step + seed) / 3.2) * 140 + Math.cos((step + seed) / 4.6) * 90;
    const jitter = ((seed * (step + 11)) % 160) - 80;
    const value = clamp(Math.round(previous * statusFactor + wave + jitter), 240, 64000);
    return [agent.id, value] as const;
  });

  if (totalTokens > 0) {
    const sum = rawEntries.reduce((acc, [, value]) => acc + value, 0) || 1;
    return Object.fromEntries(
      rawEntries.map(([agentId, value]) => [agentId, Math.max(0, Math.round((value / sum) * totalTokens))])
    );
  }

  return Object.fromEntries(rawEntries);
}

export async function hydrateTelemetryHistory(input: {
  agents: Agent[];
  generatedAt: string;
  totalTokens: number;
}): Promise<{ history: TokenHistoryPoint[]; telemetryMode: TelemetryMode }> {
  const store = await readStore();
  const observed = input.agents.some((agent) => agent.tokenUsage > 0);
  const lastPoint = store.history[store.history.length - 1];

  const nextValues = observed
    ? Object.fromEntries(input.agents.map((agent) => [agent.id, agent.tokenUsage]))
    : buildEstimatedValues(input.agents, store.history, input.generatedAt, input.totalTokens);

  const nextPoint: TokenHistoryPoint = {
    timestamp: input.generatedAt,
    values: nextValues,
  };

  const sameTimestamp = lastPoint?.timestamp === input.generatedAt;
  const nextHistory = sameTimestamp
    ? [...store.history.slice(0, -1), nextPoint]
    : [...store.history, nextPoint].slice(-MAX_POINTS);

  await writeStore({ history: nextHistory });

  return {
    history: nextHistory,
    telemetryMode: observed ? 'observed' : 'estimated',
  };
}
