'use client';

import { startTransition, useRef, useState } from 'react';
import { StatusBar } from '@/components/dashboard/StatusBar';
import { GaugeCard } from '@/components/dashboard/GaugeCard';
import { LobsterCard } from '@/components/dashboard/LobsterCard';
import { DashboardSnapshot, normalizeGatewayStatus } from '@/lib/gateway-core';
import { getDashboardSnapshot, getDashboardSummary } from '@/lib/gateway';
import { useVisibleInterval } from '@/lib/use-visible-interval';
import type { Agent, DashboardSummary, GatewayConnectionConfig, TokenHistoryPoint } from '@/lib/types';

interface DashboardClientProps {
  initialSnapshot: DashboardSnapshot;
  activeConnection: GatewayConnectionConfig;
}

interface AgentAccent {
  textColor: string;
  barFrom: string;
  barTo: string;
  badgeBorder: string;
  badgeBackground: string;
  badgeText: string;
  line: string;
  glow: string;
}

function buildAgentAccent(agent: Agent, index: number): AgentAccent {
  const seed = Array.from(agent.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const hue = Math.round((seed * 37 + index * 137.508) % 360);
  const start = `hsl(${hue} 92% 72%)`;
  const end = `hsl(${(hue + 24) % 360} 88% 58%)`;

  return {
    textColor: start,
    barFrom: start,
    barTo: end,
    badgeBorder: `hsla(${hue} 92% 72% / 0.22)`,
    badgeBackground: `hsla(${hue} 92% 60% / 0.14)`,
    badgeText: `hsl(${hue} 100% 84%)`,
    line: start,
    glow: `hsla(${hue} 92% 70% / 0.2)`,
  };
}

export function DashboardClient({ initialSnapshot, activeConnection }: DashboardClientProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const summaryRefreshRef = useRef(false);
  const snapshotRefreshRef = useRef(false);

  async function refreshSummary() {
    if (summaryRefreshRef.current) {
      return;
    }

    summaryRefreshRef.current = true;

    try {
      const nextSummary = await getDashboardSummary();

      startTransition(() => {
        setSnapshot((currentSnapshot) => mergeSnapshotSummary(currentSnapshot, nextSummary));
      });
    } catch (error) {
      console.error('Failed to refresh dashboard summary:', error);
    } finally {
      summaryRefreshRef.current = false;
    }
  }

  async function refreshSnapshot() {
    if (snapshotRefreshRef.current) {
      return;
    }

    snapshotRefreshRef.current = true;

    try {
      const nextSnapshot = await getDashboardSnapshot();

      startTransition(() => {
        setSnapshot((currentSnapshot) => {
          if (currentSnapshot.generatedAt === nextSnapshot.generatedAt) {
            return currentSnapshot;
          }

          return nextSnapshot;
        });
      });
    } catch (error) {
      console.error('Failed to refresh dashboard snapshot:', error);
    } finally {
      snapshotRefreshRef.current = false;
    }
  }

  useVisibleInterval(refreshSummary, {
    intervalMs: 5_000,
    runImmediately: true,
  });

  useVisibleInterval(refreshSnapshot, {
    intervalMs: 20_000,
  });

  const { gatewayStatus, agents, history } = snapshot;
  const gatewayStatusLabel = (gatewayStatus.status ?? 'offline').toUpperCase();
  const onlineAgents = agents.filter((agent) => agent.status === 'online').length;
  const totalTokens = gatewayStatus.totalTokens;
  const stats = snapshot.stats;
  const observedTotalSeries = history.map((point) =>
    agents.reduce((sum, agent) => sum + (point.values[agent.id] ?? 0), 0)
  );
  const activitySeries = observedTotalSeries.some((value) => value > 0)
    ? buildActivitySeries(observedTotalSeries)
    : [];
  const hasMeaningfulActivity = hasMeaningfulSeriesVariation(activitySeries);
  const totalSeries = hasMeaningfulActivity
    ? activitySeries
    : buildFallbackTotalSeries(totalTokens, agents.length);
  const totalTrendMode: 'observed' | 'projected' = hasMeaningfulActivity ? 'observed' : 'projected';

  return (
    <div className="min-h-screen">
      <StatusBar gatewayStatus={gatewayStatus} connection={activeConnection} stats={stats} />

      <div className="p-6">
        <div className="mb-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <GaugeCard
              title="Total Tokens"
              value={totalTokens}
              maxValue={agents.reduce((sum, agent) => sum + agent.maxTokens, 0) || 1}
              color="amber"
              delta={`${stats.tokenConsumption}%`}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path d="M12 3v18M7 8.5c0-1.7 1.6-3 3.5-3h3c1.9 0 3.5 1.3 3.5 3s-1.6 3-3.5 3h-3c-1.9 0-3.5 1.3-3.5 3s1.6 3 3.5 3h3c1.9 0 3.5-1.3 3.5-3" />
                </svg>
              }
            />
            <GaugeCard
              title="Total Agents"
              value={stats.agentCount}
              maxValue={Math.max(stats.agentCount, 1)}
              color="emerald"
              delta={`${gatewayStatus.connectedAgents} active`}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3 19c0-3 3-5 6-5s6 2 6 5" />
                  <path d="M17 11a3 3 0 1 0 0-6" />
                  <path d="M21 19c0-2.5-1.8-4.2-4.2-4.8" />
                </svg>
              }
            />
            <GaugeCard
              title="Online Agents"
              value={onlineAgents}
              maxValue={Math.max(stats.agentCount, 1)}
              color="blue"
              delta={`${stats.activeAlerts} alerts`}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path d="m4 12 4 4 4-8 4 5 4-9" />
                </svg>
              }
            />
            <GaugeCard
              title="Total Bots"
              value={stats.botCount}
              maxValue={Math.max(stats.botCount, 1)}
              color="red"
              delta={gatewayStatusLabel}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <rect x="3" y="8" width="18" height="12" rx="2" />
                  <circle cx="8" cy="14" r="2" />
                  <circle cx="16" cy="14" r="2" />
                  <path d="M12 2v4" />
                </svg>
              }
            />
          </div>
        </div>

        <div className="mb-6 pt-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="uppercase-title text-text-muted">Agent Units</h2>
            <span className="glass-badge rounded-full px-3 py-1 text-xs text-zinc-300">
              {onlineAgents} / {agents.length} Online
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {agents.map((agent, index) => (
              <LobsterCard key={agent.id} agent={agent} index={index} />
            ))}
          </div>
        </div>

        <section className="overflow-hidden rounded-[24px] border border-cyan-300/10 bg-[linear-gradient(180deg,rgba(10,15,28,0.96)_0%,rgba(8,12,22,0.98)_100%)] shadow-[0_0_0_1px_rgba(34,211,238,0.04),0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="border-b border-cyan-300/8 px-6 py-4">
            <div className="text-sm font-semibold tracking-[0.08em] text-zinc-100">Agent Analysis</div>
            <div className="mt-1 text-xs text-zinc-500">Realtime token activity and workload trends by agent</div>
          </div>

          <div className="px-6 pb-6 pt-4">
            <div className="mb-6 rounded-[18px] border border-cyan-300/8 bg-[linear-gradient(180deg,rgba(5,12,22,0.82)_0%,rgba(4,8,16,0.95)_100%)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.22em] text-cyan-300/70">Total Token Activity</div>
                <div className="rounded-full border border-cyan-300/12 bg-cyan-400/6 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300/72">
                  {totalTrendMode === 'observed'
                    ? 'Observed Window'
                    : snapshot.telemetryMode === 'estimated'
                      ? 'Estimated Window'
                      : 'Projected Window'}
                </div>
              </div>
              <OverviewTrend series={totalSeries} telemetryMode={snapshot.telemetryMode} trendMode={totalTrendMode} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
              {agents.map((agent, index) => (
                <AgentMonitorCard
                  key={agent.id}
                  agent={agent}
                  history={history}
                  accent={buildAgentAccent(agent, index)}
                  generatedAt={snapshot.generatedAt}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function mergeSnapshotSummary(snapshot: DashboardSnapshot, summary: DashboardSummary): DashboardSnapshot {
  const normalizedGatewayStatus = normalizeGatewayStatus(summary.gatewayStatus, snapshot.agents);
  const normalizedStats = {
    agentCount: summary.stats?.agentCount ?? snapshot.stats.agentCount,
    botCount: summary.stats?.botCount ?? snapshot.stats.botCount,
    tokenConsumption: summary.stats?.tokenConsumption ?? snapshot.stats.tokenConsumption,
    activeAlerts: summary.stats?.activeAlerts ?? snapshot.stats.activeAlerts,
  };
  const normalizedAlerts = Array.isArray(summary.alerts) ? summary.alerts : snapshot.alerts;
  const normalizedGeneratedAt = summary.generatedAt || snapshot.generatedAt;

  if (
    snapshot.gatewayStatus.status === normalizedGatewayStatus.status &&
    snapshot.gatewayStatus.version === normalizedGatewayStatus.version &&
    snapshot.gatewayStatus.uptime === normalizedGatewayStatus.uptime &&
    snapshot.gatewayStatus.connectedAgents === normalizedGatewayStatus.connectedAgents &&
    snapshot.gatewayStatus.totalBots === normalizedGatewayStatus.totalBots &&
    snapshot.gatewayStatus.totalTokens === normalizedGatewayStatus.totalTokens &&
    snapshot.stats.agentCount === normalizedStats.agentCount &&
    snapshot.stats.botCount === normalizedStats.botCount &&
    snapshot.stats.tokenConsumption === normalizedStats.tokenConsumption &&
    snapshot.stats.activeAlerts === normalizedStats.activeAlerts &&
    snapshot.alerts.length === normalizedAlerts.length
  ) {
    return snapshot;
  }

  return {
    ...snapshot,
    gatewayStatus: normalizedGatewayStatus,
    stats: normalizedStats,
    alerts: normalizedAlerts,
    generatedAt: normalizedGeneratedAt,
  };
}

function OverviewTrend({
  series,
  telemetryMode,
  trendMode,
}: {
  series: number[];
  telemetryMode: DashboardSnapshot['telemetryMode'];
  trendMode: 'observed' | 'projected';
}) {
  const hasTelemetry = series.some((value) => value > 0);
  const sourceSeries = buildOverviewSeries(series);
  const plottedPoints = buildOverviewPlotPoints(sourceSeries)
  const points = plottedPoints.map(({ x, y }) => `${x},${y}`).join(' ');

  return (
    <div className="relative h-[160px] overflow-hidden rounded-[14px] border border-cyan-300/6 bg-[linear-gradient(180deg,rgba(2,9,18,0.9)_0%,rgba(5,10,18,0.95)_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(34,211,238,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[size:20px_20px]" />
      <div className="absolute inset-x-0 bottom-0 h-[58%] bg-[linear-gradient(180deg,rgba(34,211,238,0.16),rgba(34,211,238,0.02))]" style={{ clipPath: `polygon(${points},100% 100%,0 100%)` }} />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <polyline
          fill="none"
          stroke="rgba(34,211,238,0.18)"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        <polyline
          fill="none"
          stroke="url(#overview-line)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {plottedPoints.map(({ x, y }, index) => (
          <circle
            key={`overview-point-${index}`}
            cx={x}
            cy={y}
            r="1.3"
            fill="#67e8f9"
            opacity="0.95"
          />
        ))}
        <defs>
          <linearGradient id="overview-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="45%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
        </defs>
      </svg>
      {trendMode === 'projected'
        ? (
            <div className="absolute right-4 top-4 rounded-full border border-fuchsia-300/14 bg-fuchsia-400/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-fuchsia-200/80">
              Projected
            </div>
          )
        : telemetryMode === 'estimated'
          ? (
              <div className="absolute right-4 top-4 rounded-full border border-amber-300/14 bg-amber-400/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-200/80">
                Estimated
              </div>
            )
          : null}
      {!hasTelemetry && trendMode !== 'projected' && (
        <div className="absolute left-4 top-4 text-[11px] text-zinc-500">
          Live telemetry unavailable. Showing projected trend.
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex justify-between px-4 pb-2 text-[10px] font-mono text-cyan-400/65">
        <span>00:00</span>
        <span>04:00</span>
        <span>08:00</span>
        <span>12:00</span>
        <span>16:00</span>
        <span>20:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}

function buildOverviewPlotPoints(series: number[]): Array<{ x: number; y: number }> {
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const baseline = Math.max(max, min, 1);
  const rawSpan = max - min;
  const padding = rawSpan === 0
    ? Math.max(1, baseline * 0.04)
    : Math.max(rawSpan * 0.35, baseline * 0.01);
  const renderMin = min - padding;
  const renderMax = max + padding;
  const span = Math.max(renderMax - renderMin, 1);

  return series
    .map((value, index) => {
      const x = (index / Math.max(series.length - 1, 1)) * 100;
      const y = 82 - ((value - renderMin) / span) * 58;
      return { x, y };
    });
}

function AgentMonitorCard({
  agent,
  history,
  accent,
  generatedAt,
}: {
  agent: Agent;
  history: TokenHistoryPoint[];
  accent: AgentAccent;
  generatedAt: string;
}) {
  const series = history.map((point) => point.values[agent.id] ?? 0);
  const bars = buildBars(agent, series);
  const trend = buildTrendPath(series);
  const status = getAgentBadge(agent);
  const tokenUsageValue = formatCompactTokens(agent.tokenUsage);
  const capacityValue = `${Math.min(100, Math.round((agent.tokenUsage / Math.max(agent.maxTokens, 1)) * 100))}%`;
  const activityValue = formatLastActive(agent.lastActive, generatedAt);

  return (
    <div className="rounded-[14px] border border-cyan-300/10 bg-[linear-gradient(180deg,rgba(6,10,18,0.96)_0%,rgba(4,8,14,0.98)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[22px] font-semibold tracking-tight text-zinc-100">{agent.name}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">{agent.role}</div>
        </div>
        <span
          className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{
            borderColor: accent.badgeBorder,
            backgroundColor: accent.badgeBackground,
            color: accent.badgeText,
          }}
        >
          {status}
        </span>
      </div>

      <div className="relative mb-5 h-[88px] overflow-hidden rounded-[10px] border border-cyan-300/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.01)_0%,rgba(255,255,255,0.03)_100%)] px-2 pb-2 pt-3">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:12px_12px]" />
        <div
          className="absolute inset-x-2 top-2 h-10 rounded-full blur-xl"
          style={{ background: `radial-gradient(circle, ${accent.glow} 0%, transparent 70%)` }}
        />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-x-2 top-2 h-10">
          <path
            d={trend}
            fill="none"
            stroke={accent.line}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 0,
              animation: 'sparkDraw 1.1s ease both',
            }}
          />
        </svg>
        <div className="relative flex h-full items-end gap-1.5">
          {bars.map((height, index) => (
            <div key={`${agent.id}-bar-${index}`} className="flex-1">
              <div
                className="w-full rounded-t-[3px]"
                style={{
                  backgroundImage: `linear-gradient(to top, ${accent.barTo}, ${accent.barFrom})`,
                  boxShadow: `0 0 14px ${accent.glow}`,
                  height: `${height}%`,
                  minHeight: '10px',
                  transformOrigin: 'bottom',
                  animation: `eqBar ${1 + (index % 3) * 0.22}s ease-in-out infinite`,
                  animationDelay: `${index * 0.08}s`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric value={tokenUsageValue} label="TOKENS" tone={accent.textColor} />
        <Metric value={capacityValue} label="CAPACITY" tone={accent.textColor} />
        <Metric value={activityValue} label="ACTIVE" tone={accent.textColor} />
      </div>
    </div>
  );
}

function Metric({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div>
      <div className="text-[18px] font-semibold" style={{ color: tone }}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</div>
    </div>
  );
}

function getAgentBadge(agent: Agent): string {
  if (agent.status === 'warning' || agent.status === 'busy') {
    return 'WORKING';
  }

  if (agent.status === 'error') {
    return 'ERROR';
  }

  return 'RUNNING';
}

function buildBars(agent: Agent, series: number[]): number[] {
  const seed = `${agent.id}-${agent.tokenUsage}-${series.join('.')}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33 + seed.charCodeAt(index)) & 0xffff;
  }

  return Array.from({ length: 11 }, (_, index) => {
    const sample = series[Math.max(0, series.length - 11 + index)] ?? series[series.length - 1] ?? agent.tokenUsage;
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    const variance = 18 + (hash % 56);
    const trendLift = sample > 0 ? Math.min(22, sample / Math.max(agent.maxTokens, 1) * 1000) : 0;
    return Math.max(14, Math.min(88, variance + trendLift));
  });
}

function buildTrendPath(series: number[]): string {
  const fallback = series.length > 1 ? series : [1, 2, 3, 2, 4, 3, 5, 4];
  const max = Math.max(...fallback, 1);
  const min = Math.min(...fallback, 0);
  const span = Math.max(max - min, 1);

  return fallback
    .map((value, index) => {
      const x = (index / Math.max(fallback.length - 1, 1)) * 100;
      const y = 86 - ((value - min) / span) * 62;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function buildFallbackTotalSeries(totalTokens: number, agentCount: number): number[] {
  const baseline = totalTokens > 0
    ? Math.max(240, Math.round(totalTokens * 0.08))
    : Math.max(240, agentCount * 320);

  if (baseline <= 0) {
    return [220, 260, 240, 280, 300, 320, 340];
  }

  const ratios = [0.52, 0.78, 0.44, 0.92, 0.58, 0.86, 0.62];
  return ratios.map((ratio) => Math.max(1, Math.round(baseline * ratio)));
}

function buildOverviewSeries(series: number[]): number[] {
  if (series.length > 1) {
    return series;
  }

  const baseline = series[0] ?? 0;
  if (baseline <= 0) {
    return [2200, 2600, 2400, 2800, 3000, 3200, 3400];
  }

  const ratios = [0.82, 0.88, 0.91, 0.95, 0.97, 0.99, 1];
  return ratios.map((ratio) => Math.max(1, Math.round(baseline * ratio)));
}

function buildActivitySeries(series: number[]): number[] {
  if (series.length <= 1) {
    return buildOverviewSeries(series);
  }

  const deltas = series.map((value, index) => {
    if (index === 0) {
      return 0;
    }

    return Math.max(0, value - series[index - 1]);
  });

  if (deltas.some((value) => value > 0)) {
    return deltas;
  }

  return buildOverviewSeries(series);
}

function hasMeaningfulSeriesVariation(series: number[]): boolean {
  if (series.length <= 1) {
    return false;
  }

  const max = Math.max(...series);
  const min = Math.min(...series);
  const baseline = Math.max(max, min, 1);
  return max - min >= Math.max(8, baseline * 0.12);
}


function formatCompactTokens(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return `${value}`;
}

function formatLastActive(value: string, referenceTime: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return 'N/A';
  }

  const referenceTimestamp = Date.parse(referenceTime);
  const diffMs = (Number.isNaN(referenceTimestamp) ? timestamp : referenceTimestamp) - timestamp;
  if (diffMs < 60_000) {
    return 'NOW';
  }

  if (diffMs < 3_600_000) {
    return `${Math.floor(diffMs / 60_000)}M`;
  }

  if (diffMs < 86_400_000) {
    return `${Math.floor(diffMs / 3_600_000)}H`;
  }

  return `${Math.floor(diffMs / 86_400_000)}D`;
}
