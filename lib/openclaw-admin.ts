import 'server-only';

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  AccessMode,
  Agent,
  AgentSyncStatus,
  AgentBootConfig,
  BotConfigurationMode,
  EditableAgentConfig,
  AvailableModel,
  BootProvider,
  CreateAgentInput,
  PersonaDraft,
  UpdateAgentInput,
} from './types';
import { getCliAgents } from './openclaw-cli';

const execFileAsync = promisify(execFile);

type JsonRecord = Record<string, unknown>;

type OpenClawAgentEntry = {
  id: string;
  default?: boolean;
  workspace: string;
  model?: string | { primary?: string };
  tools?: JsonRecord;
  subagents?: {
    allowAgents?: string[];
    model?: string | { primary?: string };
    thinking?: string;
  };
};

type OpenClawBinding = {
  type?: string;
  agentId: string;
  match: {
    channel: BootProvider | string;
    accountId?: string;
  };
};

type TelegramAccountConfig = {
  botToken?: string;
  dmPolicy?: 'open' | 'allowlist' | 'pairing';
  allowFrom?: Array<string | number>;
  defaultTo?: string;
  groupAllowFrom?: Array<string | number>;
  groupPolicy?: 'open' | 'allowlist' | 'disabled';
  streaming?: string;
};

type FeishuAccountConfig = {
  appId?: string;
  appSecret?: string;
  botName?: string;
};

type ChannelProvider = Extract<BootProvider, 'telegram' | 'feishu'>;

type OpenClawConfig = {
  agents?: {
    defaults?: JsonRecord;
    list?: OpenClawAgentEntry[];
  };
  bindings?: OpenClawBinding[];
  channels?: {
    telegram?: {
      enabled?: boolean;
      dmPolicy?: string;
      groupPolicy?: string;
      streaming?: string;
      defaultAccount?: string;
      accounts?: Record<string, TelegramAccountConfig>;
    };
    feishu?: {
      enabled?: boolean;
      groups?: Record<string, JsonRecord>;
      defaultAccount?: string;
      accounts?: Record<string, FeishuAccountConfig>;
    };
  };
};

export type AgentBindingMeta = {
  provider: BootProvider;
  accountId: string;
  label: string;
  accessMode: AccessMode;
  labels: string[];
};

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

function getOpenClawConfigPath(): string {
  const configured = process.env.OPENCLAW_CONFIG_PATH?.trim();
  return configured || path.join(/* turbopackIgnore: true */ os.homedir(), '.openclaw', 'openclaw.json');
}

function getWorkspaceRoot(): string {
  const configured = process.env.OPENCLAW_WORKSPACE_ROOT?.trim();
  return configured || path.join(/* turbopackIgnore: true */ os.homedir(), 'Documents', 'clawspace');
}

async function runOpenClawJson(args: string[]): Promise<JsonRecord | unknown[] | null> {
  const { stdout, stderr } = await execFileAsync('openclaw', args, {
    timeout: 12_000,
    maxBuffer: 1024 * 1024,
    env: {
      ...process.env,
      OPENCLAW_NO_PLUGINS: process.env.OPENCLAW_NO_PLUGINS || '1',
    },
  });

  return extractJsonPayload(stdout) ?? extractJsonPayload(stderr);
}

async function readOpenClawConfig(): Promise<OpenClawConfig> {
  const configPath = getOpenClawConfigPath();
  const raw = await fs.readFile(/* turbopackIgnore: true */ configPath, 'utf8');
  return JSON.parse(raw) as OpenClawConfig;
}

async function writeOpenClawConfig(config: OpenClawConfig): Promise<void> {
  const configPath = getOpenClawConfigPath();
  await fs.writeFile(/* turbopackIgnore: true */ configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function toTitleCase(value: string): string {
  return value
    .split(/[-_/]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function describeModel(modelId: string): string {
  if (modelId.includes('coding')) return 'Coding-first model for implementation-heavy agents';
  if (modelId.includes('gpt-5.4')) return 'High-capability model for complex reasoning';
  if (modelId.includes('gpt-5.3')) return 'Review-oriented model for analysis and quality checks';
  return 'Configured model available through the OpenClaw gateway';
}

export async function getAvailableModels(): Promise<AvailableModel[]> {
  try {
    const payload = await runOpenClawJson(['models', 'status', '--json']);
    if (!payload || Array.isArray(payload)) {
      return [];
    }

    const allowed = Array.isArray(payload.allowed) ? payload.allowed : [];
    const aliases = payload.aliases && typeof payload.aliases === 'object'
      ? (payload.aliases as Record<string, string>)
      : {};
    const reverseAliases = new Map<string, string>();

    for (const [label, id] of Object.entries(aliases)) {
      reverseAliases.set(id, label);
    }

    const defaultModel = typeof payload.resolvedDefault === 'string'
      ? payload.resolvedDefault
      : typeof payload.defaultModel === 'string'
        ? payload.defaultModel
        : '';

    return allowed
      .filter((item): item is string => typeof item === 'string' && item.length > 0)
      .map((id) => ({
        id,
        label: reverseAliases.get(id) || toTitleCase(id.split('/').pop() || id),
        description: describeModel(id),
        isDefault: id === defaultModel,
      }));
  } catch {
    return [
      {
        id: 'openai-codex/gpt-5.4',
        label: 'GPT-5.4',
        description: 'High-capability model for complex reasoning',
        isDefault: true,
      },
      {
        id: 'kimi/kimi-for-coding',
        label: 'Kimi for Coding',
        description: 'Coding-first model for implementation-heavy agents',
      },
      {
        id: 'kimi2/kimi-for-coding',
        label: 'Kimi for Coding (Alt)',
        description: 'Alternative coding-first model already configured in OpenClaw',
      },
    ];
  }
}

function slugifyName(input: string): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || `agent-${Date.now().toString(36)}`;
}

function normalizeAgentId(input: string): string {
  return slugifyName(input);
}

function resolveWorkspacePath(agentId: string, workspacePath?: string): string {
  const trimmed = workspacePath?.trim();
  if (!trimmed) {
    return path.join(/* turbopackIgnore: true */ getWorkspaceRoot(), agentId);
  }

  return path.isAbsolute(trimmed)
    ? trimmed
    : path.join(/* turbopackIgnore: true */ getWorkspaceRoot(), trimmed);
}

function ensureUniqueAgentId(baseId: string, config: OpenClawConfig): string {
  const existingIds = new Set((config.agents?.list || []).map((agent) => agent.id));
  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseId}-${suffix}`;
}

function normalizeAllowMembers(mode: AccessMode, input?: string[]): Array<string | number> {
  if (mode === 'all') {
    return ['*'];
  }

  return (input || [])
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const asNumber = Number(value);
      return Number.isFinite(asNumber) && `${asNumber}` === value ? asNumber : value;
    });
}

function stringifyAllowMembers(values?: Array<string | number>): string[] {
  return (values || []).map((value) => `${value}`);
}

function getAgentEntry(config: OpenClawConfig, agentId: string): OpenClawAgentEntry | undefined {
  return (config.agents?.list || []).find((agent) => agent.id === agentId);
}

function ensureCodingProfileForSubagents(entry: OpenClawAgentEntry): void {
  const tools = entry.tools && typeof entry.tools === 'object' ? { ...entry.tools } : {};
  if (typeof tools.profile !== 'string' || tools.profile.trim().length === 0) {
    tools.profile = 'coding';
  }
  entry.tools = tools;
}

function setSubagentCapability(entry: OpenClawAgentEntry, enabled: boolean): void {
  if (!enabled) {
    delete entry.subagents;
    return;
  }

  ensureCodingProfileForSubagents(entry);
  entry.subagents = {
    ...(entry.subagents || {}),
    allowAgents: ['*'],
  };
}

function getBindingsForAgent(config: OpenClawConfig, agentId: string): OpenClawBinding[] {
  return (config.bindings || []).filter((binding) => binding.agentId === agentId);
}

function removeBindingsForAgent(config: OpenClawConfig, agentId: string): OpenClawBinding[] {
  const existing = config.bindings || [];
  const removed = existing.filter((binding) => binding.agentId === agentId);
  config.bindings = existing.filter((binding) => binding.agentId !== agentId);
  return removed;
}

function accountReferencedByOtherBindings(
  config: OpenClawConfig,
  provider: ChannelProvider,
  accountId: string,
  currentAgentId: string
): boolean {
  return (config.bindings || []).some((binding) =>
    binding.agentId !== currentAgentId &&
    binding.match.channel === provider &&
    binding.match.accountId === accountId
  );
}

function cleanupUnusedAccount(
  config: OpenClawConfig,
  provider: ChannelProvider,
  accountId: string,
  currentAgentId: string
): void {
  if (!accountId || accountReferencedByOtherBindings(config, provider, accountId, currentAgentId)) {
    return;
  }

  if (provider === 'telegram') {
    delete config.channels?.telegram?.accounts?.[accountId];
    return;
  }

  delete config.channels?.feishu?.accounts?.[accountId];
}

function replaceTelegramAccount(
  config: OpenClawConfig,
  accountId: string,
  boot: AgentBootConfig,
  keepExistingToken = false
): void {
  config.channels ??= {};
  config.channels.telegram ??= {
    enabled: true,
    dmPolicy: 'pairing',
    groupPolicy: 'allowlist',
    streaming: 'partial',
    accounts: {},
  };
  config.channels.telegram.accounts ??= {};

  const allowMembers = normalizeAllowMembers(boot.accessMode || 'all', boot.allowMembers);
  const existing = config.channels.telegram.accounts[accountId];

  config.channels.telegram.accounts[accountId] = {
    ...existing,
    botToken: keepExistingToken ? existing?.botToken : boot.telegramToken,
    dmPolicy: (boot.accessMode || 'all') === 'all' ? 'open' : 'allowlist',
    allowFrom: allowMembers,
    defaultTo: existing?.defaultTo || '',
    groupAllowFrom: allowMembers,
    groupPolicy: (boot.accessMode || 'all') === 'all' ? 'open' : 'allowlist',
    streaming: existing?.streaming || 'partial',
  };
}

function replaceFeishuAccount(
  config: OpenClawConfig,
  accountId: string,
  agentName: string,
  boot: AgentBootConfig,
  keepExistingSecret = false
): void {
  config.channels ??= {};
  config.channels.feishu ??= {
    enabled: true,
    groups: {
      '*': {
        requireMention: true,
      },
    },
    accounts: {},
  };
  config.channels.feishu.accounts ??= {};

  const existing = config.channels.feishu.accounts[accountId];
  config.channels.feishu.accounts[accountId] = {
    ...existing,
    appId: boot.feishuAppId,
    appSecret: keepExistingSecret ? existing?.appSecret : boot.feishuAppSecret,
    botName: agentName,
  };
}

async function ensureWorkspaceFiles(workspace: string, persona: PersonaDraft): Promise<void> {
  await fs.mkdir(/* turbopackIgnore: true */ workspace, { recursive: true });
  await fs.writeFile(path.join(/* turbopackIgnore: true */ workspace, 'IDENTITY.md'), `${persona.identityMarkdown}\n`, 'utf8');
  await fs.writeFile(path.join(/* turbopackIgnore: true */ workspace, 'BOOTSTRAP.md'), `${persona.bootstrapMarkdown}\n`, 'utf8');
}

function upsertTelegramAccount(
  config: OpenClawConfig,
  accountId: string,
  boot: AgentBootConfig
): void {
  config.channels ??= {};
  config.channels.telegram ??= {
    enabled: true,
    dmPolicy: 'pairing',
    groupPolicy: 'allowlist',
    streaming: 'partial',
    accounts: {},
  };
  config.channels.telegram.accounts ??= {};

  const allowMembers = normalizeAllowMembers(boot.accessMode ?? 'all', boot.allowMembers);

  if (config.channels.telegram.accounts[accountId]) {
    throw new Error(`Telegram account "${accountId}" already exists.`);
  }

  config.channels.telegram.accounts[accountId] = {
    botToken: boot.telegramToken,
    dmPolicy: boot.accessMode === 'all' ? 'open' : 'allowlist',
    allowFrom: allowMembers,
    defaultTo: '',
    groupAllowFrom: allowMembers,
    groupPolicy: boot.accessMode === 'all' ? 'open' : 'allowlist',
    streaming: 'partial',
  };
}

function upsertFeishuAccount(
  config: OpenClawConfig,
  accountId: string,
  agentName: string,
  boot: AgentBootConfig
): void {
  config.channels ??= {};
  config.channels.feishu ??= {
    enabled: true,
    groups: {
      '*': {
        requireMention: true,
      },
    },
    accounts: {},
  };
  config.channels.feishu.accounts ??= {};
  if (config.channels.feishu.accounts[accountId]) {
    throw new Error(`Feishu account "${accountId}" already exists.`);
  }

  config.channels.feishu.accounts[accountId] = {
    appId: boot.feishuAppId,
    appSecret: boot.feishuAppSecret,
    botName: agentName,
  };
}

function upsertBinding(config: OpenClawConfig, agentId: string, provider: BootProvider, accountId: string): void {
  config.bindings ??= [];
  const existing = config.bindings.find((binding) =>
    binding.agentId === agentId &&
    binding.match.channel === provider &&
    binding.match.accountId === accountId
  );

  if (!existing) {
    config.bindings.push({
      agentId,
      match: {
        channel: provider,
        accountId,
      },
    });
  }
}

export async function createAgentRecord(input: CreateAgentInput): Promise<Agent> {
  const config = await readOpenClawConfig();
  config.agents ??= {};
  config.agents.list ??= [];

  const baseId = normalizeAgentId(input.agentId?.trim() || input.name);
  const agentId = ensureUniqueAgentId(baseId, config);
  const workspace = resolveWorkspacePath(agentId, input.workspacePath);
  const accountId = input.boot.accountId?.trim() || agentId;

  config.agents.list.push({
    id: agentId,
    workspace,
    model: input.model,
  });
  const createdEntry = config.agents.list[config.agents.list.length - 1];
  setSubagentCapability(createdEntry, true);

  if ((input.botConfigurationMode || 'now') === 'now' && input.boot.provider) {
    if (input.boot.provider === 'telegram') {
      upsertTelegramAccount(config, accountId, {
        ...input.boot,
        accessMode: input.boot.accessMode || 'all',
      });
    } else {
      upsertFeishuAccount(config, accountId, input.name, {
        ...input.boot,
        accessMode: input.boot.accessMode || 'custom',
      });
    }

    upsertBinding(config, agentId, input.boot.provider, accountId);
  }

  await ensureWorkspaceFiles(workspace, input.persona);
  await writeOpenClawConfig(config);

  const now = new Date().toISOString();
  return {
    id: agentId,
    name: input.name,
    role: input.role,
    persona: 'generated',
    model: input.model,
    workspace,
    botId: (input.botConfigurationMode || 'now') === 'now' ? accountId : undefined,
    botName: (input.botConfigurationMode || 'now') === 'now' && input.boot.provider
      ? `${input.boot.provider === 'telegram' ? 'Telegram' : 'Feishu'} / ${accountId}`
      : undefined,
    status: 'online',
    tokenUsage: 0,
    maxTokens: 100000,
    createdAt: now,
    lastActive: now,
    bootProvider: input.boot.provider,
    bootAccountId: (input.botConfigurationMode || 'now') === 'now' ? accountId : undefined,
    bootAccessMode: input.boot.accessMode,
  };
}

export async function getEditableAgentConfig(agentId: string): Promise<EditableAgentConfig | null> {
  const config = await readOpenClawConfig();
  const entry = getAgentEntry(config, agentId);
  if (!entry) {
    return null;
  }

  const binding = getBindingsForAgent(config, agentId).find((item) =>
    item.match.channel === 'telegram' || item.match.channel === 'feishu'
  );

  if (!binding || !binding.match.accountId || (binding.match.channel !== 'telegram' && binding.match.channel !== 'feishu')) {
    return {
      agentId,
      workspacePath: entry.workspace,
      model: typeof entry.model === 'string' ? entry.model : entry.model?.primary || '',
      botConfigurationMode: 'later',
      boot: {
        provider: 'telegram',
        accountId: '',
        accessMode: 'all',
        allowMembers: [],
        hasToken: false,
        hasAppSecret: false,
      },
    };
  }

  const provider = binding.match.channel;
  const accountId = binding.match.accountId;

  if (provider === 'telegram') {
    const telegram = config.channels?.telegram?.accounts?.[accountId];
    return {
      agentId,
      workspacePath: entry.workspace,
      model: typeof entry.model === 'string' ? entry.model : entry.model?.primary || '',
      botConfigurationMode: 'now',
      boot: {
        provider,
        accountId,
        accessMode: telegram?.groupPolicy === 'open' ? 'all' : 'custom',
        allowMembers: stringifyAllowMembers(telegram?.groupPolicy === 'open' ? [] : telegram?.groupAllowFrom || telegram?.allowFrom),
        hasToken: !!telegram?.botToken,
        hasAppSecret: false,
      },
    };
  }

  const feishu = config.channels?.feishu?.accounts?.[accountId];
  return {
    agentId,
    workspacePath: entry.workspace,
    model: typeof entry.model === 'string' ? entry.model : entry.model?.primary || '',
    botConfigurationMode: 'now',
    boot: {
      provider,
      accountId,
      accessMode: 'custom',
      allowMembers: [],
      hasToken: false,
      hasAppSecret: !!feishu?.appSecret,
      feishuAppId: feishu?.appId,
    },
  };
}

function validateBootConfig(mode: BotConfigurationMode, boot: AgentBootConfig): void {
  if (mode === 'later') {
    return;
  }

  if (!boot.provider) {
    throw new Error('Boot provider is required.');
  }
}

export async function updateAgentRecord(agentId: string, input: UpdateAgentInput): Promise<void> {
  const config = await readOpenClawConfig();
  const entry = getAgentEntry(config, agentId);
  if (!entry) {
    throw new Error(`Agent "${agentId}" not found.`);
  }

  const mode = input.botConfigurationMode || 'now';
  validateBootConfig(mode, input.boot);

  entry.workspace = resolveWorkspacePath(agentId, input.workspacePath);
  entry.model = input.model;
  setSubagentCapability(entry, true);
  await fs.mkdir(/* turbopackIgnore: true */ entry.workspace, { recursive: true });

  const removedBindings = removeBindingsForAgent(config, agentId);
  for (const binding of removedBindings) {
    const provider = binding.match.channel;
    const accountId = binding.match.accountId;
    if ((provider === 'telegram' || provider === 'feishu') && accountId) {
      cleanupUnusedAccount(config, provider, accountId, agentId);
    }
  }

  if (mode === 'later' || !input.boot.provider) {
    await writeOpenClawConfig(config);
    return;
  }

  const accountId = input.boot.accountId?.trim() || agentId;
  const previousConfig = await getEditableAgentConfig(agentId);
  const keepExistingToken =
    input.boot.provider === 'telegram' &&
    previousConfig?.botConfigurationMode === 'now' &&
    previousConfig.boot.provider === 'telegram' &&
    previousConfig.boot.accountId === accountId &&
    !input.boot.telegramToken?.trim();
  const keepExistingSecret =
    input.boot.provider === 'feishu' &&
    previousConfig?.botConfigurationMode === 'now' &&
    previousConfig.boot.provider === 'feishu' &&
    previousConfig.boot.accountId === accountId &&
    !input.boot.feishuAppSecret?.trim();

  if (input.boot.provider === 'telegram') {
    replaceTelegramAccount(
      config,
      accountId,
      {
        ...input.boot,
        accessMode: input.boot.accessMode || 'all',
      },
      keepExistingToken
    );
  } else {
    replaceFeishuAccount(
      config,
      accountId,
      agentId,
      {
        ...input.boot,
        accessMode: 'custom',
      },
      keepExistingSecret
    );
  }

  upsertBinding(config, agentId, input.boot.provider, accountId);
  await writeOpenClawConfig(config);
}

export async function getAgentBindingMeta(): Promise<Map<string, AgentBindingMeta>> {
  const config = await readOpenClawConfig();
  const bindings = config.bindings || [];
  const telegramAccounts = config.channels?.telegram?.accounts || {};
  const feishuAccounts = config.channels?.feishu?.accounts || {};
  const result = new Map<string, AgentBindingMeta>();

  for (const binding of bindings) {
    const provider = binding.match.channel;
    const accountId = binding.match.accountId;
    if ((provider !== 'telegram' && provider !== 'feishu') || !accountId) {
      continue;
    }

    const label = provider === 'telegram'
      ? `Telegram / ${accountId}`
      : feishuAccounts[accountId]?.botName
        ? `Feishu / ${accountId} (${feishuAccounts[accountId]?.botName})`
        : `Feishu / ${accountId}`;

    const botId = provider === 'telegram' && telegramAccounts[accountId]
      ? accountId
      : accountId;

    const current = result.get(binding.agentId);
    const labels = current?.labels ?? [];
    if (!labels.includes(label)) {
      labels.push(label);
    }

    const nextMeta: AgentBindingMeta = {
      provider,
      accountId: botId,
      label,
      accessMode:
        provider === 'telegram'
          ? telegramAccounts[accountId]?.groupPolicy === 'open'
            ? 'all'
            : 'custom'
          : 'custom',
      labels,
    };

    if (!current) {
      result.set(binding.agentId, nextMeta);
      continue;
    }

    if (current.provider !== 'telegram' && provider === 'telegram') {
      result.set(binding.agentId, nextMeta);
      continue;
    }

    result.set(binding.agentId, {
      ...current,
      labels,
    });
  }

  return result;
}

export async function getConfiguredAgentEntries(): Promise<Array<{
  id: string;
  workspace: string;
  model?: string | { primary?: string };
}>> {
  const config = await readOpenClawConfig();
  return (config.agents?.list || []).map((agent) => ({
    id: agent.id,
    workspace: agent.workspace,
    model: agent.model,
  }));
}

export async function getConfiguredAgentEntry(agentId: string): Promise<{
  id: string;
  workspace: string;
  model?: string | { primary?: string };
} | null> {
  const entries = await getConfiguredAgentEntries();
  return entries.find((agent) => agent.id === agentId) ?? null;
}

export async function getAgentSyncStatus(agentId: string): Promise<AgentSyncStatus> {
  const checkedAt = new Date().toISOString();

  try {
    const agents = await getCliAgents();
    const synced = agents.some((agent) => {
      return !!agent && typeof agent === 'object' && 'id' in (agent as Record<string, unknown>) && (agent as Record<string, unknown>).id === agentId;
    });

    return {
      agentId,
      synced,
      checkedAt,
      message: synced
        ? 'Gateway 已加载该 Agent，热同步已生效。'
        : '配置已写入，但 Gateway 仍未返回该 Agent。',
    };
  } catch (error) {
    const configuredAgents = await getConfiguredAgentEntries().catch(() => []);
    const existsInConfig = configuredAgents.some((agent) => agent.id === agentId);

    return {
      agentId,
      synced: false,
      checkedAt,
      message: existsInConfig
        ? 'Agent 已写入本地配置，但当前无法完成 Gateway 实时探测。'
        : error instanceof Error
          ? `同步探测失败：${error.message}`
          : '同步探测失败。',
    };
  }
}
