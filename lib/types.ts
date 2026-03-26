export type AgentStatus = 'online' | 'offline' | 'warning' | 'error' | 'busy';
export type AgentRole = 'coordinator' | 'executor' | 'observer' | 'custom';
export type BootProvider = 'telegram' | 'feishu';
export type AccessMode = 'all' | 'custom';
export type GatewayConnectionMode = 'auto' | 'manual';
export type BotConfigurationMode = 'now' | 'later';

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  persona?: string;
  model: string;
  workspace?: string;
  botId?: string;
  botName?: string;
  status: AgentStatus;
  tokenUsage: number;
  maxTokens: number;
  createdAt: string;
  lastActive: string;
  bootProvider?: BootProvider;
  bootAccountId?: string;
  bootAccessMode?: AccessMode;
  bindingLabels?: string[];
}

export interface AvailableModel {
  id: string;
  label: string;
  description: string;
  isDefault?: boolean;
}

export interface PersonaDraft {
  identityMarkdown: string;
  bootstrapMarkdown: string;
}

export interface AgentBootConfig {
  provider?: BootProvider;
  accountId?: string;
  accessMode?: AccessMode;
  allowMembers?: string[];
  telegramToken?: string;
  feishuAppId?: string;
  feishuAppSecret?: string;
}

export interface CreateAgentInput {
  agentId?: string;
  workspacePath?: string;
  name: string;
  role: AgentRole;
  model: string;
  persona: PersonaDraft;
  boot: AgentBootConfig;
  botConfigurationMode?: BotConfigurationMode;
}

export interface UpdateAgentInput {
  workspacePath?: string;
  model: string;
  boot: AgentBootConfig;
  botConfigurationMode?: BotConfigurationMode;
}

export interface EditableAgentConfig {
  agentId: string;
  workspacePath: string;
  model: string;
  botConfigurationMode: BotConfigurationMode;
  boot: {
    provider: BootProvider;
    accountId: string;
    accessMode: AccessMode;
    allowMembers: string[];
    hasToken: boolean;
    hasAppSecret: boolean;
    feishuAppId?: string;
  };
}

export interface AgentSyncStatus {
  agentId: string;
  synced: boolean;
  checkedAt: string;
  message: string;
}

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
}

export interface ChatSessionSummary {
  id: string;
  agentId: string;
  title: string;
  preview: string;
  updatedAt: string;
  messageCount: number;
  kind: 'direct' | 'group' | 'unknown';
  model?: string;
  totalTokens?: number | null;
}

export interface ChatSessionDetail extends ChatSessionSummary {
  messages: ChatMessage[];
}

export type ChatRunState = 'idle' | 'running' | 'completed' | 'failed' | 'stopped';

export interface ChatRunStatus {
  sessionId: string;
  agentId: string;
  state: ChatRunState;
  startedAt: string | null;
  finishedAt: string | null;
  pid: number | null;
  error?: string | null;
  output?: string | null;
}

export interface GatewayStatus {
  status: 'online' | 'offline' | 'degraded';
  version: string;
  uptime: number;
  connectedAgents: number;
  totalBots: number;
  totalTokens: number;
}

export interface DashboardStats {
  agentCount: number;
  botCount: number;
  tokenConsumption: number;
  activeAlerts: number;
}

export interface DashboardSummary {
  gatewayStatus: GatewayStatus;
  stats: DashboardStats;
  alerts: Alert[];
  generatedAt: string;
}

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'danger';
  message: string;
  timestamp: string;
  agentId?: string;
}

export interface TokenHistoryPoint {
  timestamp: string;
  values: Record<string, number>;
}

export type TelemetryMode = 'observed' | 'estimated';

export interface GatewayConnectionConfig {
  mode: GatewayConnectionMode;
  url: string;
  token?: string;
  label: string;
  source: 'local' | 'manual';
  configPath?: string;
}

export interface GatewayConnectionHealth {
  status: 'connected' | 'degraded' | 'offline';
  lastCheckedAt: string | null;
  latencyMs: number | null;
  error: string | null;
}

export interface GatewayConnectionRuntime {
  endpoint: string;
  source: GatewayConnectionConfig['source'];
  version: string | null;
  connectedAgents: number;
  totalBots: number;
  totalTokens: number;
  activeAlerts: number;
  tokenConsumption: number;
}

export interface GatewayConnectionState {
  configured: boolean;
  activeConnection: GatewayConnectionConfig | null;
  detectedConnection: GatewayConnectionConfig | null;
  needsOnboarding: boolean;
  health: GatewayConnectionHealth;
  runtime: GatewayConnectionRuntime | null;
}
