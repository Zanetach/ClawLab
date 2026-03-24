import 'server-only';

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { promisify } from 'node:util';
import { getStoredGatewayConnection } from './gateway-connection';
import type { GatewayConnectionConfig } from './types';

const execFileAsync = promisify(execFile);
const STATUS_FAILURE_COOLDOWN_MS = 15_000;
const statusFailureCooldowns = new Map<string, number>();

// Resolve openclaw CLI path; fallback to 'openclaw' if not found in common locations
function resolveOpenClawPath(): string {
  const candidates = [
    '/Users/zane/.npm-global/bin/openclaw',
    '/usr/local/bin/openclaw',
    '/opt/homebrew/bin/openclaw',
    '/usr/bin/openclaw',
    'openclaw',
  ];
  // Return first candidate that exists, or 'openclaw' as fallback
  for (const candidate of candidates) {
    if (candidate === 'openclaw') return candidate;
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      continue;
    }
  }
  return 'openclaw';
}

const OPENCLAW_PATH = resolveOpenClawPath();

type JsonRecord = Record<string, unknown>;

function extractJsonPayload(output: string): JsonRecord | unknown[] | null {
  const trimmed = output.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as JsonRecord | unknown[];
  } catch {
    // Fall through to mixed-output parsing.
  }

  const candidates = [
    { start: trimmed.indexOf('{'), end: trimmed.lastIndexOf('}') + 1 },
    { start: trimmed.indexOf('['), end: trimmed.lastIndexOf(']') + 1 },
  ].filter((range) => range.start >= 0 && range.end > range.start);

  for (const { start, end } of candidates) {
    const slice = trimmed.slice(start, end);
    try {
      return JSON.parse(slice) as JsonRecord | unknown[];
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

async function runGatewayCall<T>(
  method: string,
  params?: JsonRecord,
  connectionOverride?: GatewayConnectionConfig | null
): Promise<T> {
  const args = ['gateway', 'call', method, '--json', '--timeout', '8000'];
  const connection = connectionOverride ?? await getStoredGatewayConnection();

  if (connection?.url) {
    args.push('--url', connection.url);
  }

  if (connection?.token) {
    args.push('--token', connection.token);
  }

  if (params && Object.keys(params).length > 0) {
    args.push('--params', JSON.stringify(params));
  }

  const { stdout, stderr } = await execFileAsync(OPENCLAW_PATH, args, {
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
    env: {
      ...process.env,
      OPENCLAW_NO_PLUGINS: '1',
    },
  });

  const payload = extractJsonPayload(stdout) ?? extractJsonPayload(stderr);
  if (payload === null) {
    throw new Error(`No JSON payload returned for ${method}`);
  }

  return payload as T;
}

async function runGatewayStatus(connectionOverride?: GatewayConnectionConfig | null): Promise<JsonRecord | null> {
  const args = ['gateway', 'status', '--json', '--timeout', '5000'];
  const connection = connectionOverride ?? await getStoredGatewayConnection();

  if (connection?.url) {
    args.push('--url', connection.url);
  }

  if (connection?.token) {
    args.push('--token', connection.token);
  }

  try {
    const { stdout, stderr } = await execFileAsync(OPENCLAW_PATH, args, {
      timeout: 8_000,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        OPENCLAW_NO_PLUGINS: '1',
      },
    });

    const payload = extractJsonPayload(stdout) ?? extractJsonPayload(stderr);
    return payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as JsonRecord)
      : null;
  } catch (error) {
    console.error('[openclaw-cli] runGatewayStatus error:', error);
    return null;
  }
}

function getConnectionCacheKey(connection: GatewayConnectionConfig | null | undefined): string {
  return connection?.url || '__default__';
}

export async function getCliAgents(connectionOverride?: GatewayConnectionConfig | null): Promise<unknown[]> {
  const payload = await runGatewayCall<unknown>('agents.list', undefined, connectionOverride);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as JsonRecord;
    if (Array.isArray(record.agents)) {
      return record.agents as unknown[];
    }
    if (Array.isArray(record.items)) {
      return record.items as unknown[];
    }
    if (Array.isArray(record.data)) {
      return record.data as unknown[];
    }
  }

  return [];
}

export async function getCliStatus(connectionOverride?: GatewayConnectionConfig | null): Promise<JsonRecord | null> {
  const connection = connectionOverride ?? await getStoredGatewayConnection();
  const connectionKey = getConnectionCacheKey(connection);
  const blockedUntil = statusFailureCooldowns.get(connectionKey) ?? 0;

  if (blockedUntil > Date.now()) {
    return null;
  }

  try {
    const payload = await runGatewayCall<unknown>('status', undefined, connection);
    statusFailureCooldowns.delete(connectionKey);
    return payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as JsonRecord)
      : null;
  } catch (error) {
    statusFailureCooldowns.set(connectionKey, Date.now() + STATUS_FAILURE_COOLDOWN_MS);
    console.error('[openclaw-cli] getCliStatus error:', error);
    return null;
  }
}

export async function probeGatewayConnection(connection: GatewayConnectionConfig): Promise<boolean> {
  try {
    const payload = await runGatewayCall<unknown>('status', undefined, connection);
    statusFailureCooldowns.delete(getConnectionCacheKey(connection));
    return !!payload;
  } catch (error) {
    const gatewayStatus = await runGatewayStatus(connection);
    const rpc = gatewayStatus?.rpc;
    const port = gatewayStatus?.port;
    const portBusy = !!port && typeof port === 'object' && (port as JsonRecord).status === 'busy';
    const rpcOk = !!rpc && typeof rpc === 'object' && (rpc as JsonRecord).ok === true;

    if (rpcOk || portBusy) {
      statusFailureCooldowns.delete(getConnectionCacheKey(connection));
      return true;
    }

    statusFailureCooldowns.set(getConnectionCacheKey(connection), Date.now() + STATUS_FAILURE_COOLDOWN_MS);
    console.error('[openclaw-cli] probeGatewayConnection error:', error);
    return false;
  }
}
