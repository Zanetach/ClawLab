export type AgentStatus = 'online' | 'offline' | 'warning' | 'error' | 'busy';
export type AgentRole = 'coordinator' | 'executor' | 'observer' | 'custom';

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  model: string;
  botId?: string;
  botName?: string;
  status: AgentStatus;
  tokenUsage: number;
  maxTokens: number;
  createdAt: string;
  lastActive: string;
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

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'danger';
  message: string;
  timestamp: string;
  agentId?: string;
}
