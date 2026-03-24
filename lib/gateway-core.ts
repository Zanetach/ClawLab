import { Agent, Alert, DashboardStats, GatewayStatus, TelemetryMode, TokenHistoryPoint } from './types';

export interface OpenClawAgent {
  id: string;
  name?: string;
  role?: Agent['role'];
  persona?: string;
  model?: string;
  workspace?: string;
  status?: 'online' | 'offline' | 'busy';
}

export interface DashboardSnapshot {
  gatewayStatus: GatewayStatus;
  agents: Agent[];
  stats: DashboardStats;
  alerts: Alert[];
  generatedAt: string;
  history: TokenHistoryPoint[];
  telemetryMode: TelemetryMode;
}

export function convertOpenClawAgent(ocAgent: OpenClawAgent, generatedAt: string): Agent {
  return {
    id: ocAgent.id,
    name: ocAgent.name || ocAgent.id,
    role: ocAgent.role || 'executor',
    persona: ocAgent.persona,
    model: ocAgent.model || 'kimi2/kimi-for-coding',
    workspace: ocAgent.workspace,
    status: ocAgent.status || 'online',
    tokenUsage: 0,
    maxTokens: 100000,
    createdAt: generatedAt,
    lastActive: generatedAt,
  };
}

export function getMockAgents(generatedAt = new Date().toISOString()): Agent[] {
  return [
    { id: 'main', name: '猪智星', role: 'coordinator', persona: 'commander', model: 'kimi2/kimi-for-coding', workspace: '/Users/zane/Documents/clawspace/main', status: 'online', tokenUsage: 25100, maxTokens: 500000, createdAt: '2026-03-01T10:00:00Z', lastActive: generatedAt },
    { id: 'sec', name: '秘书', role: 'executor', persona: 'assistant', model: 'kimi2/kimi-for-coding', workspace: '/Users/zane/Documents/clawspace/sec', status: 'online', tokenUsage: 3800, maxTokens: 500000, createdAt: '2026-03-01T10:00:00Z', lastActive: generatedAt },
    { id: 'pm', name: 'PM BOT', role: 'observer', persona: 'planner', model: 'kimi2/kimi-for-coding', workspace: '/Users/zane/Documents/clawspace/pm', status: 'online', tokenUsage: 1400, maxTokens: 500000, createdAt: '2026-03-01T10:00:00Z', lastActive: generatedAt },
    { id: 'coding', name: 'CODING', role: 'executor', persona: 'developer', model: 'kimi2/kimi-for-coding', workspace: '/Users/zane/Documents/clawspace/coding', status: 'warning', tokenUsage: 21000, maxTokens: 500000, createdAt: '2026-03-01T10:00:00Z', lastActive: generatedAt },
    { id: 'design', name: '设计', role: 'executor', persona: 'designer', model: 'kimi2/kimi-for-coding', workspace: '/Users/zane/Documents/clawspace/design', status: 'warning', tokenUsage: 24400, maxTokens: 500000, createdAt: '2026-03-01T10:00:00Z', lastActive: generatedAt },
    { id: 'market', name: '市场', role: 'executor', persona: 'marketing', model: 'kimi2/kimi-for-coding', workspace: '/Users/zane/Documents/clawspace/market', status: 'online', tokenUsage: 9900, maxTokens: 500000, createdAt: '2026-03-01T10:00:00Z', lastActive: generatedAt },
    { id: 'review', name: 'REVIEW', role: 'observer', persona: 'reviewer', model: 'kimi2/kimi-for-coding', workspace: '/Users/zane/Documents/clawspace/review', status: 'online', tokenUsage: 48000, maxTokens: 500000, createdAt: '2026-03-01T10:00:00Z', lastActive: generatedAt },
  ];
}

export function deriveDashboardStats(agents: Agent[]): DashboardStats {
  const totalMaxTokens = agents.reduce((sum, agent) => sum + agent.maxTokens, 0) || 1;
  const totalUsedTokens = agents.reduce((sum, agent) => sum + agent.tokenUsage, 0);
  const tokenConsumption = Math.round((totalUsedTokens / totalMaxTokens) * 100);

  const botCount = agents.filter((agent) =>
    agent.botId ||
    agent.role === 'executor' ||
    agent.id === 'sec' ||
    agent.id === 'coding' ||
    agent.id === 'design' ||
    agent.id === 'market'
  ).length;

  const activeAlerts = agents.filter((agent) => agent.status === 'warning' || agent.status === 'error').length;

  return {
    agentCount: agents.length,
    botCount,
    tokenConsumption,
    activeAlerts,
  };
}

export function deriveAlerts(agents: Agent[], generatedAt: string): Alert[] {
  return agents.reduce<Alert[]>((alerts, agent) => {
    if (agent.status === 'warning') {
      alerts.push({
        id: `warn-${agent.id}`,
        type: 'warning' as const,
        message: `${agent.name} requires attention`,
        timestamp: generatedAt,
        agentId: agent.id,
      });
      return alerts;
    }

    if (agent.status === 'error') {
      alerts.push({
        id: `error-${agent.id}`,
        type: 'danger' as const,
        message: `${agent.name} is unavailable`,
        timestamp: generatedAt,
        agentId: agent.id,
      });
      return alerts;
    }

    const tokenRatio = agent.maxTokens > 0 ? agent.tokenUsage / agent.maxTokens : 0;
    if (tokenRatio >= 0.85) {
      alerts.push({
        id: `tokens-${agent.id}`,
        type: 'warning' as const,
        message: `${agent.name} token usage exceeded 85%`,
        timestamp: generatedAt,
        agentId: agent.id,
      });
    }

    return alerts;
  }, []);
}

export function createGatewayStatus(agents: Agent[]): GatewayStatus {
  const activeAgents = agents.filter((agent) => agent.status !== 'offline').length;
  const totalTokens = agents.reduce((sum, agent) => sum + agent.tokenUsage, 0);
  const hasErrors = agents.some((agent) => agent.status === 'error');
  const hasWarnings = agents.some((agent) => agent.status === 'warning');

  return {
    status: hasErrors ? 'offline' : hasWarnings ? 'degraded' : 'online',
    version: '2026.3.24',
    uptime: Math.max(0, Math.floor((Date.now() - Date.parse('2026-03-01T10:00:00Z')) / 1000)),
    connectedAgents: activeAgents,
    totalBots: agents.filter((agent) => agent.role === 'executor').length,
    totalTokens,
  };
}

export function normalizeGatewayStatus(
  gatewayStatus: Partial<GatewayStatus> | null | undefined,
  agents: Agent[]
): GatewayStatus {
  const derived = createGatewayStatus(agents);
  const status =
    gatewayStatus?.status === 'online' ||
    gatewayStatus?.status === 'offline' ||
    gatewayStatus?.status === 'degraded'
      ? gatewayStatus.status
      : derived.status;

  return {
    status,
    version: gatewayStatus?.version ?? derived.version,
    uptime: gatewayStatus?.uptime ?? derived.uptime,
    connectedAgents: gatewayStatus?.connectedAgents ?? derived.connectedAgents,
    totalBots: gatewayStatus?.totalBots ?? derived.totalBots,
    totalTokens:
      typeof gatewayStatus?.totalTokens === 'number' && gatewayStatus.totalTokens > 0
        ? gatewayStatus.totalTokens
        : derived.totalTokens,
  };
}

export function createDashboardSnapshot(
  agents: Agent[],
  gatewayStatus?: Partial<GatewayStatus> | null
): DashboardSnapshot {
  const generatedAt = new Date().toISOString();
  const point = {
    timestamp: generatedAt,
    values: Object.fromEntries(agents.map((agent) => [agent.id, agent.tokenUsage])),
  };

  return {
    gatewayStatus: normalizeGatewayStatus(gatewayStatus, agents),
    agents,
    stats: deriveDashboardStats(agents),
    alerts: deriveAlerts(agents, generatedAt),
    generatedAt,
    history: [point],
    telemetryMode: agents.some((agent) => agent.tokenUsage > 0) ? 'observed' : 'estimated',
  };
}

export function createFallbackSnapshot(): DashboardSnapshot {
  const generatedAt = new Date().toISOString();
  const agents = getMockAgents(generatedAt);
  return createDashboardSnapshot(agents, createGatewayStatus(agents));
}
