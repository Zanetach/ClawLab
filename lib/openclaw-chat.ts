import 'server-only';

import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { ChatMessage, ChatMessageRole, ChatRunStatus, ChatSessionDetail, ChatSessionSummary } from './types';

const execFileAsync = promisify(execFile);

type JsonRecord = Record<string, unknown>;

type RawSessionsPayload = {
  sessions?: RawSessionSummary[];
};

type RawSessionSummary = {
  updatedAt?: number;
  sessionId?: string;
  agentId?: string;
  kind?: string;
  model?: string;
  totalTokens?: number | null;
};

type RawSessionStoreEntry = {
  sessionId?: string;
  updatedAt?: number;
  sessionFile?: string;
  kind?: string;
  model?: string;
  totalTokens?: number | null;
};

type RawTranscriptLine = {
  id?: string;
  type?: string;
  timestamp?: string;
  message?: {
    role?: string;
    timestamp?: number;
    content?: unknown;
  };
};

type ChatRunEntry = {
  sessionId: string;
  agentId: string;
  state: ChatRunStatus['state'];
  startedAt: string | null;
  finishedAt: string | null;
  pid: number | null;
  error: string | null;
  output: string | null;
  child: ChildProcess | null;
};

type SessionCacheEntry = {
  lightweight: ChatSessionSummary[];
  full: ChatSessionSummary[];
};

const OPENCLAW_PATH = process.env.OPENCLAW_BIN?.trim() || 'openclaw';

function getChatRunRegistry(): Map<string, ChatRunEntry> {
  const globalRegistry = globalThis as typeof globalThis & {
    __clawlabChatRuns?: Map<string, ChatRunEntry>;
  };

  if (!globalRegistry.__clawlabChatRuns) {
    globalRegistry.__clawlabChatRuns = new Map<string, ChatRunEntry>();
  }

  return globalRegistry.__clawlabChatRuns;
}

function getChatSessionCache(): SessionCacheEntry {
  const globalCache = globalThis as typeof globalThis & {
    __clawlabChatSessionCache?: SessionCacheEntry;
  };

  if (!globalCache.__clawlabChatSessionCache) {
    globalCache.__clawlabChatSessionCache = {
      lightweight: [],
      full: [],
    };
  }

  return globalCache.__clawlabChatSessionCache;
}

function extractJsonPayload(output: string): JsonRecord | unknown[] | null {
  const trimmed = output.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as JsonRecord | unknown[];
  } catch {
    return null;
  }
}

async function runOpenClawJson(args: string[]): Promise<JsonRecord | unknown[] | null> {
  const { stdout, stderr } = await execFileAsync(OPENCLAW_PATH, args, {
    timeout: 15_000,
    maxBuffer: 1024 * 1024 * 4,
    env: {
      ...process.env,
      OPENCLAW_NO_PLUGINS: '1',
    },
  });

  return extractJsonPayload(stdout) ?? extractJsonPayload(stderr);
}

function getOpenClawStateDir(): string {
  const configured = process.env.OPENCLAW_STATE_DIR?.trim();
  return configured || path.join(/* turbopackIgnore: true */ os.homedir(), '.openclaw');
}

function getAgentSessionStorePath(agentId: string): string {
  return path.join(/* turbopackIgnore: true */ getOpenClawStateDir(), 'agents', agentId, 'sessions', 'sessions.json');
}

async function readSessionStore(agentId: string): Promise<Record<string, RawSessionStoreEntry>> {
  try {
    const raw = await fs.readFile(/* turbopackIgnore: true */ getAgentSessionStorePath(agentId), 'utf8');
    const parsed = JSON.parse(raw) as Record<string, RawSessionStoreEntry>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function resolveSessionStoreEntry(agentId: string, sessionId: string): Promise<RawSessionStoreEntry | null> {
  const store = await readSessionStore(agentId);
  const entries = Object.values(store);
  return entries.find((entry) => entry.sessionId === sessionId) ?? null;
}

function cleanUserText(text: string): string {
  return text
    .replace(/^Sender \(untrusted metadata\):[\s\S]*?```\n\n/, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .trim();
}

function flattenContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content.map((item) => {
    if (!item || typeof item !== 'object') {
      return '';
    }

    const record = item as JsonRecord;
    if (record.type === 'text' && typeof record.text === 'string') {
      return record.text;
    }

    if (record.type === 'toolCall') {
      const name = typeof record.name === 'string' ? record.name : 'tool';
      return `[Tool call: ${name}]`;
    }

    if (record.type === 'toolResult' && typeof record.text === 'string') {
      return record.text;
    }

    return '';
  }).filter(Boolean).join('\n\n').trim();
}

function normalizeRole(role: string | undefined): ChatMessageRole | null {
  if (role === 'user' || role === 'assistant') {
    return role;
  }

  if (role === 'toolResult' || role === 'system') {
    return 'system';
  }

  return null;
}

async function readTranscriptMessages(agentId: string, sessionId: string): Promise<ChatMessage[]> {
  const entry = await resolveSessionStoreEntry(agentId, sessionId);
  const filePath = entry?.sessionFile;

  if (!filePath) {
    return [];
  }

  const raw = await fs.readFile(/* turbopackIgnore: true */ filePath, 'utf8').catch(() => '');
  if (!raw.trim()) {
    return [];
  }

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as RawTranscriptLine;
      } catch {
        return null;
      }
    })
    .filter((line): line is RawTranscriptLine => !!line && line.type === 'message' && !!line.message)
    .map((line) => {
      const role = normalizeRole(line.message?.role);
      if (!role) {
        return null;
      }

      const content = flattenContent(line.message?.content);
      if (!content) {
        return null;
      }

      const normalizedContent = role === 'user' ? cleanUserText(content) : content.trim();
      if (!normalizedContent) {
        return null;
      }

      return {
        id: line.id || `${sessionId}-${line.timestamp || Math.random()}`,
        role,
        content: normalizedContent,
        createdAt: typeof line.message?.timestamp === 'number'
          ? new Date(line.message.timestamp).toISOString()
          : line.timestamp || new Date().toISOString(),
      } satisfies ChatMessage;
    })
    .filter((message): message is ChatMessage => !!message);
}

function buildSessionTitle(agentId: string, messages: ChatMessage[]): string {
  const firstUser = messages.find((message) => message.role === 'user');
  if (!firstUser) {
    return `${agentId} / New Conversation`;
  }

  const title = firstUser.content.replace(/\s+/g, ' ').trim().slice(0, 32);
  return `${agentId} / ${title || 'Conversation'}`;
}

function buildSessionPreview(messages: ChatMessage[]): string {
  const lastMessage = [...messages].reverse().find((message) => message.role !== 'system') ?? messages[messages.length - 1];
  return lastMessage?.content.replace(/\s+/g, ' ').trim().slice(0, 120) || 'No messages yet';
}

function normalizeKind(kind: string | undefined): ChatSessionSummary['kind'] {
  if (kind === 'direct' || kind === 'group') {
    return kind;
  }

  return 'unknown';
}

async function mapSessionSummary(item: RawSessionSummary): Promise<ChatSessionSummary | null> {
  const sessionId = typeof item.sessionId === 'string' ? item.sessionId : null;
  const agentId = typeof item.agentId === 'string' ? item.agentId : null;

  if (!sessionId || !agentId) {
    return null;
  }

  const messages = await readTranscriptMessages(agentId, sessionId);

  return {
    id: sessionId,
    agentId,
    title: buildSessionTitle(agentId, messages),
    preview: buildSessionPreview(messages),
    updatedAt: typeof item.updatedAt === 'number' ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
    messageCount: messages.length,
    kind: normalizeKind(item.kind),
    model: typeof item.model === 'string' ? item.model : undefined,
    totalTokens: typeof item.totalTokens === 'number' ? item.totalTokens : item.totalTokens ?? null,
  };
}

function mapLightSessionSummary(item: RawSessionSummary): ChatSessionSummary | null {
  const sessionId = typeof item.sessionId === 'string' ? item.sessionId : null;
  const agentId = typeof item.agentId === 'string' ? item.agentId : null;

  if (!sessionId || !agentId) {
    return null;
  }

  const kind = normalizeKind(item.kind);
  const model = typeof item.model === 'string' ? item.model : undefined;
  const tokenLabel = typeof item.totalTokens === 'number'
    ? `${item.totalTokens.toLocaleString('zh-CN')} tokens`
    : 'OpenClaw session';

  return {
    id: sessionId,
    agentId,
    title: `${agentId} / ${kind === 'group' ? 'Group' : 'Conversation'}`,
    preview: model ? `${model} · ${tokenLabel}` : tokenLabel,
    updatedAt: typeof item.updatedAt === 'number' ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
    messageCount: 0,
    kind,
    model,
    totalTokens: typeof item.totalTokens === 'number' ? item.totalTokens : item.totalTokens ?? null,
  };
}

export async function listChatSessions(options?: { lightweight?: boolean }): Promise<ChatSessionSummary[]> {
  const cache = getChatSessionCache();

  try {
    const payload = await runOpenClawJson(['sessions', '--all-agents', '--json']);
    const rawSessions = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as RawSessionsPayload).sessions
      : [];

    if (!Array.isArray(rawSessions)) {
      return options?.lightweight ? cache.lightweight : cache.full;
    }

    if (options?.lightweight) {
      const lightweight = rawSessions
        .map((item) => mapLightSessionSummary(item))
        .filter((item): item is ChatSessionSummary => !!item)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      cache.lightweight = lightweight;
      return lightweight;
    }

    const mapped = await Promise.all(rawSessions.map((item) => mapSessionSummary(item)));
    const full = mapped
      .filter((item): item is ChatSessionSummary => !!item)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    cache.full = full;
    return full;
  } catch {
    return options?.lightweight ? cache.lightweight : cache.full;
  }
}

export async function getChatSession(agentId: string, sessionId: string): Promise<ChatSessionDetail | null> {
  const entry = await resolveSessionStoreEntry(agentId, sessionId);
  const messages = await readTranscriptMessages(agentId, sessionId);

  if (!entry && messages.length === 0) {
    return null;
  }

  return {
    id: sessionId,
    agentId,
    title: buildSessionTitle(agentId, messages),
    preview: buildSessionPreview(messages),
    updatedAt: typeof entry?.updatedAt === 'number' ? new Date(entry.updatedAt).toISOString() : new Date().toISOString(),
    messageCount: messages.length,
    kind: normalizeKind(entry?.kind),
    model: typeof entry?.model === 'string' ? entry.model : undefined,
    totalTokens: typeof entry?.totalTokens === 'number' ? entry.totalTokens : entry?.totalTokens ?? null,
    messages,
  };
}

export async function sendChatMessage(input: {
  agentId: string;
  message: string;
  sessionId?: string;
}): Promise<ChatSessionDetail> {
  const sessionId = input.sessionId?.trim() || crypto.randomUUID();

  try {
    await execFileAsync(OPENCLAW_PATH, [
      'agent',
      '--agent',
      input.agentId,
      '--session-id',
      sessionId,
      '--message',
      input.message,
      '--json',
    ], {
      timeout: 10 * 60 * 1000,
      maxBuffer: 1024 * 1024 * 4,
      env: {
        ...process.env,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send chat message.';
    throw new Error(message);
  }

  const detail = await getChatSession(input.agentId, sessionId);
  if (!detail) {
    throw new Error('Session was created but transcript could not be loaded.');
  }

  return detail;
}

export function startChatMessage(input: {
  agentId: string;
  message: string;
  sessionId?: string;
}): ChatRunStatus {
  const sessionId = input.sessionId?.trim() || crypto.randomUUID();
  const registry = getChatRunRegistry();
  const existing = registry.get(sessionId);

  if (existing?.state === 'running') {
    throw new Error('This session already has a running agent response.');
  }

  const startedAt = new Date().toISOString();
  const child = spawn(
    OPENCLAW_PATH,
    [
      'agent',
      '--agent',
      input.agentId,
      '--session-id',
      sessionId,
      '--message',
      input.message,
      '--json',
    ],
    {
      env: {
        ...process.env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  const entry: ChatRunEntry = {
    sessionId,
    agentId: input.agentId,
    state: 'running',
    startedAt,
    finishedAt: null,
    pid: child.pid ?? null,
    error: null,
    output: null,
    child,
  };

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk) => {
    stdout = `${stdout}${String(chunk)}`.slice(-4000);
    const current = getChatRunRegistry().get(sessionId);
    if (current) {
      getChatRunRegistry().set(sessionId, {
        ...current,
        output: stdout.trim() || current.output,
      });
    }
  });
  child.stderr?.on('data', (chunk) => {
    stderr = `${stderr}${String(chunk)}`.slice(-4000);
    const current = getChatRunRegistry().get(sessionId);
    if (current) {
      getChatRunRegistry().set(sessionId, {
        ...current,
        output: stderr.trim() || current.output,
      });
    }
  });

  child.on('error', (error) => {
    registry.set(sessionId, {
      ...entry,
      child: null,
      state: 'failed',
      finishedAt: new Date().toISOString(),
      error: error.message,
      output: stderr.trim() || stdout.trim() || error.message,
    });
  });

  child.on('close', (code, signal) => {
    const current = registry.get(sessionId) ?? entry;
    const nextState = current.state === 'stopped'
      ? 'stopped'
      : code === 0
        ? 'completed'
        : 'failed';

    registry.set(sessionId, {
      ...current,
      child: null,
      pid: null,
      state: nextState,
      finishedAt: new Date().toISOString(),
      error: nextState === 'failed'
        ? (stderr.trim() || `openclaw agent exited with code ${code ?? 'unknown'}${signal ? ` (${signal})` : ''}`)
        : current.error,
      output: stderr.trim() || stdout.trim() || current.output,
    });
  });

  registry.set(sessionId, entry);

  return {
    sessionId,
    agentId: input.agentId,
    state: 'running',
    startedAt,
    finishedAt: null,
    pid: child.pid ?? null,
    error: null,
    output: null,
  };
}

export function getChatRunStatus(sessionId: string, agentId?: string): ChatRunStatus {
  const entry = getChatRunRegistry().get(sessionId);

  if (!entry) {
    return {
      sessionId,
      agentId: agentId || '',
      state: 'idle',
      startedAt: null,
      finishedAt: null,
      pid: null,
      error: null,
      output: null,
    };
  }

  return {
    sessionId: entry.sessionId,
    agentId: entry.agentId,
    state: entry.state,
    startedAt: entry.startedAt,
    finishedAt: entry.finishedAt,
    pid: entry.pid,
    error: entry.error,
    output: entry.output,
  };
}

export function stopChatMessage(sessionId: string): ChatRunStatus {
  const registry = getChatRunRegistry();
  const entry = registry.get(sessionId);

  if (!entry) {
    return {
      sessionId,
      agentId: '',
      state: 'idle',
      startedAt: null,
      finishedAt: null,
      pid: null,
      error: null,
      output: null,
    };
  }

  if (entry.state !== 'running' || !entry.child?.pid) {
    return getChatRunStatus(sessionId, entry.agentId);
  }

  try {
    entry.child.kill('SIGTERM');
  } catch (error) {
    entry.error = error instanceof Error ? error.message : 'Failed to stop agent response.';
    entry.state = 'failed';
    entry.finishedAt = new Date().toISOString();
  }

  registry.set(sessionId, {
    ...entry,
    state: 'stopped',
    finishedAt: new Date().toISOString(),
    pid: null,
    output: entry.output,
  });

  return getChatRunStatus(sessionId, entry.agentId);
}
