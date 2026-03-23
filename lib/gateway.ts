import { Agent, GatewayStatus, DashboardStats, Alert, AgentRole } from './types';

const API_BASE = '/api/agents';

interface OpenClawAgent {
  id: string;
  name?: string;
  model?: string;
  status?: 'online' | 'offline' | 'busy';
}

function convertOpenClawAgent(ocAgent: OpenClawAgent): Agent {
  return {
    id: ocAgent.id,
    name: ocAgent.name || ocAgent.id,
    role: 'executor',
    model: ocAgent.model || 'kimi2/kimi-for-coding',
    status: ocAgent.status || 'online',
    tokenUsage: 0,
    maxTokens: 100000,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };
}

export async function getGatewayStatus(): Promise<GatewayStatus> {
  try {
    const response = await fetch(`${API_BASE}?method=status`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch {
    // Fallback
  }

  return {
    status: 'online',
    version: '2026.3.13',
    uptime: 0,
    connectedAgents: 0,
    totalBots: 0,
    totalTokens: 0,
  };
}

export async function getAgents(): Promise<Agent[]> {
  try {
    const response = await fetch('/api/agents');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        return data.map(convertOpenClawAgent);
      }
    }
    throw new Error('Invalid response');
  } catch (error) {
    console.error('Failed to get agents from gateway:', error);
    // Return mock data
    return getMockAgents();
  }
}

export async function getAgent(id: string): Promise<Agent | null> {
  const agents = await getAgents();
  return agents.find(a => a.id === id) || null;
}

export async function createAgent(data: {
  name: string;
  role: AgentRole;
  model: string;
  botId?: string;
}): Promise<Agent> {
  throw new Error('Not implemented via API');
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const agents = await getAgents();
    return {
      agentCount: agents.length,
      botCount: agents.filter(a => a.botId).length,
      tokenConsumption: 48,
      activeAlerts: 0,
    };
  } catch {
    return {
      agentCount: 4,
      botCount: 3,
      tokenConsumption: 48,
      activeAlerts: 2,
    };
  }
}

export async function getAlerts(): Promise<Alert[]> {
  return [];
}

function getMockAgents(): Agent[] {
  return [
    { id: 'main',    name: '猪智星', role: 'coordinator', model: 'kimi2/kimi-for-coding', status: 'online',   tokenUsage: 25100,  maxTokens: 500000, createdAt: '2026-03-01T10:00:00Z', lastActive: new Date().toISOString() },
    { id: 'sec',     name: '秘书',   role: 'executor',    model: 'kimi2/kimi-for-coding', status: 'online',   tokenUsage: 3800,   maxTokens: 500000, createdAt: '2026-03-01T10:00:00Z', lastActive: new Date().toISOString() },
    { id: 'pm',      name: 'PM BOT', role: 'observer',    model: 'kimi2/kimi-for-coding', status: 'online',   tokenUsage: 1400,   maxTokens: 500000, createdAt: '2026-03-01T10:00:00Z', lastActive: new Date().toISOString() },
    { id: 'coding',  name: 'CODING', role: 'executor',    model: 'kimi2/kimi-for-coding', status: 'warning',  tokenUsage: 21000,  maxTokens: 500000, createdAt: '2026-03-01T10:00:00Z', lastActive: new Date().toISOString() },
    { id: 'design',  name: '设计',   role: 'executor',    model: 'kimi2/kimi-for-coding', status: 'warning',  tokenUsage: 24400,  maxTokens: 500000, createdAt: '2026-03-01T10:00:00Z', lastActive: new Date().toISOString() },
    { id: 'market',  name: '市场',   role: 'executor',    model: 'kimi2/kimi-for-coding', status: 'online',   tokenUsage: 9900,   maxTokens: 500000, createdAt: '2026-03-01T10:00:00Z', lastActive: new Date().toISOString() },
    { id: 'review',  name: 'REVIEW', role: 'observer',    model: 'kimi2/kimi-for-coding', status: 'online',   tokenUsage: 48000,  maxTokens: 500000, createdAt: '2026-03-01T10:00:00Z', lastActive: new Date().toISOString() },
  ];
}
