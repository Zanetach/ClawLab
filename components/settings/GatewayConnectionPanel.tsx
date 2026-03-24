'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IndustrialButton } from '@/components/ui/IndustrialButton';
import {
  disconnectGatewayConnection,
  getGatewayConnectionState as fetchGatewayConnectionState,
  reconnectGatewayConnection,
  saveGatewayConnection,
} from '@/lib/gateway';
import type { GatewayConnectionHealth, GatewayConnectionState } from '@/lib/types';

interface GatewayConnectionPanelProps {
  initialState: GatewayConnectionState;
  onboarding?: boolean;
  initialRuntimeLoading?: boolean;
}

export function GatewayConnectionPanel({
  initialState,
  onboarding = false,
  initialRuntimeLoading = false,
}: GatewayConnectionPanelProps) {
  const router = useRouter();
  const [connectionState, setConnectionState] = useState(initialState);
  const [mode, setMode] = useState<'auto' | 'manual'>(initialState.detectedConnection ? 'auto' : 'manual');
  const [manualUrl, setManualUrl] = useState(initialState.activeConnection?.source === 'manual' ? initialState.activeConnection.url : '');
  const [manualToken, setManualToken] = useState(initialState.activeConnection?.source === 'manual' ? initialState.activeConnection.token || '' : '');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(initialRuntimeLoading);
  const [reconnecting, setReconnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTriedRef = useRef(false);

  const autoSummary = useMemo(() => {
    if (!connectionState.detectedConnection) {
      return null;
    }

    return {
      url: connectionState.detectedConnection.url,
      token: connectionState.detectedConnection.token ? '已检测到 token' : '未检测到 token',
      source: connectionState.detectedConnection.configPath || '本机 OpenClaw 配置',
    };
  }, [connectionState.detectedConnection]);

  useEffect(() => {
    setConnectionState(initialState);
  }, [initialState]);

  useEffect(() => {
    if (
      onboarding ||
      !initialRuntimeLoading ||
      !initialState.configured ||
      !initialState.activeConnection ||
      connectionState.runtime
    ) {
      return;
    }

    let cancelled = false;
    setRefreshing(true);
    setError(null);

    void fetchGatewayConnectionState()
      .then((nextState) => {
        if (!cancelled) {
          setConnectionState(nextState);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Gateway 状态刷新失败。');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    connectionState.runtime,
    initialRuntimeLoading,
    initialState.activeConnection,
    initialState.configured,
    onboarding,
  ]);

  const handleRefreshStatus = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const nextState = await fetchGatewayConnectionState();
      setConnectionState(nextState);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Gateway 状态刷新失败。');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleReconnect = useCallback(async () => {
    if (!connectionState.activeConnection) {
      return;
    }

    setReconnecting(true);
    setError(null);

    try {
      await reconnectGatewayConnection(connectionState.activeConnection);
      const nextState = await fetchGatewayConnectionState();
      setConnectionState(nextState);
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Gateway 重连失败。');
    } finally {
      setReconnecting(false);
    }
  }, [connectionState.activeConnection, router]);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    setError(null);

    try {
      const nextState = await disconnectGatewayConnection();
      setConnectionState(nextState);
      router.push('/onboarding');
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Gateway 断开失败。');
    } finally {
      setDisconnecting(false);
    }
  }, [router]);

  const handleSubmit = useCallback(async (nextMode = mode) => {
    setSaving(true);
    setError(null);

    try {
      if (nextMode === 'auto') {
        await saveGatewayConnection({ mode: 'auto' });
      } else {
        await saveGatewayConnection({
          mode: 'manual',
          url: manualUrl,
          token: manualToken || undefined,
        });
      }

      const nextState = await fetchGatewayConnectionState();
      setConnectionState(nextState);
      router.push(onboarding ? '/' : '/settings');
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Gateway 连接保存失败。');
    } finally {
      setSaving(false);
    }
  }, [manualToken, manualUrl, mode, onboarding, router]);

  useEffect(() => {
    if (!onboarding || !connectionState.detectedConnection || autoTriedRef.current) {
      return;
    }

    autoTriedRef.current = true;
    const timer = window.setTimeout(() => {
      void handleSubmit('auto');
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [connectionState.detectedConnection, handleSubmit, onboarding]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="glass-panel rounded-[28px] p-6">
        <div className="mb-8">
          <div className="mb-3 inline-flex rounded-full border border-cyan-300/14 bg-cyan-400/8 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200/82">
            {onboarding ? 'Gateway Onboarding' : 'Gateway Settings'}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
            {onboarding ? '连接 OpenClaw Gateway' : 'Gateway Connection'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            首次进入平台时，系统会优先自动检测本机 OpenClaw Gateway。检测失败时，再手动填写 Gateway WebSocket URL 和 Token。
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode('auto')}
            className={mode === 'auto'
              ? 'rounded-[22px] border border-cyan-300/24 bg-cyan-400/10 p-5 text-left shadow-[0_0_0_1px_rgba(34,211,238,0.06)]'
              : 'rounded-[22px] border border-white/10 bg-white/[0.03] p-5 text-left'}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-100">自动检测</div>
              <span className="rounded-full border border-cyan-300/14 bg-cyan-400/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-200/78">
                Recommended
              </span>
            </div>
            <div className="text-sm text-zinc-400">
              自动读取本机 OpenClaw 配置，带入 Gateway WebSocket URL 和 Token。
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-[#111827]/46 p-4 text-xs text-zinc-400">
              {autoSummary ? (
                <div className="space-y-2">
                  <div><span className="text-zinc-500">URL:</span> <span className="font-mono text-zinc-200">{autoSummary.url}</span></div>
                  <div><span className="text-zinc-500">Token:</span> <span className="text-zinc-200">{autoSummary.token}</span></div>
                  <div><span className="text-zinc-500">Source:</span> <span className="text-zinc-200">{autoSummary.source}</span></div>
                </div>
              ) : (
                <div className="text-amber-200/80">当前未检测到本机 OpenClaw Gateway 配置。</div>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode('manual')}
            className={mode === 'manual'
              ? 'rounded-[22px] border border-fuchsia-300/20 bg-fuchsia-400/10 p-5 text-left shadow-[0_0_0_1px_rgba(217,70,239,0.06)]'
              : 'rounded-[22px] border border-white/10 bg-white/[0.03] p-5 text-left'}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-100">手动填写</div>
              <span className="rounded-full border border-fuchsia-300/14 bg-fuchsia-400/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-fuchsia-200/78">
                Manual
              </span>
            </div>
            <div className="text-sm text-zinc-400">
              适用于新环境、远端部署或自动检测不可用的情况，请填写 WebSocket 地址。
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <div className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-500">Gateway WebSocket URL</div>
                <input
                  value={manualUrl}
                  onChange={(event) => setManualUrl(event.target.value)}
                  placeholder="ws://127.0.0.1:18789"
                  className="w-full rounded-2xl border border-white/10 bg-[#111827]/54 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/24 focus:outline-none"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-500">Gateway Token</div>
                <input
                  value={manualToken}
                  onChange={(event) => setManualToken(event.target.value)}
                  placeholder="Optional token"
                  className="w-full rounded-2xl border border-white/10 bg-[#111827]/54 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/24 focus:outline-none"
                />
              </label>
            </div>
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-[18px] border border-red-400/28 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {!onboarding && connectionState.configured && connectionState.activeConnection && (
          <section className="mt-6 rounded-[24px] border border-emerald-300/16 bg-[linear-gradient(180deg,rgba(10,18,24,0.9)_0%,rgba(7,12,18,0.96)_100%)] p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.06)]">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-200/72">Active Connection</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${getHealthBadgeClass(connectionState.health)}`}>
                    {getHealthLabel(connectionState.health)}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {connectionState.health.lastCheckedAt ? `Last checked ${formatDateTime(connectionState.health.lastCheckedAt)}` : '尚未执行健康检查'}
                  </div>
                </div>
              </div>
              <IndustrialButton
                onClick={() => void handleRefreshStatus()}
                disabled={refreshing || reconnecting || disconnecting}
                variant="ghost"
                size="sm"
                className="min-w-[132px]"
              >
                {refreshing ? 'Refreshing...' : '刷新状态'}
              </IndustrialButton>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatusMetric label="Endpoint" value={connectionState.activeConnection.url} mono />
              <StatusMetric label="Source" value={connectionState.activeConnection.source === 'local' ? 'Auto detected' : 'Manual'} />
              <StatusMetric label="Token" value={connectionState.activeConnection.token ? 'Configured' : 'Not set'} />
              <StatusMetric label="Latency" value={connectionState.health.latencyMs != null ? `${connectionState.health.latencyMs} ms` : 'N/A'} />
              <StatusMetric label="Gateway Version" value={connectionState.runtime?.version || 'Unknown'} />
              <StatusMetric label="Connected Agents" value={String(connectionState.runtime?.connectedAgents ?? 0)} />
              <StatusMetric label="Gateway Load" value={`${connectionState.runtime?.tokenConsumption ?? 0}% used`} />
              <StatusMetric label="Active Alerts" value={String(connectionState.runtime?.activeAlerts ?? 0)} />
            </div>

            {connectionState.health.error && (
              <div className="mt-4 rounded-[18px] border border-red-400/24 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {connectionState.health.error}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <IndustrialButton
                onClick={() => void handleReconnect()}
                disabled={reconnecting || refreshing || disconnecting}
                variant="secondary"
                size="sm"
              >
                {reconnecting ? 'Reconnecting...' : '重新连接'}
              </IndustrialButton>
              <IndustrialButton
                onClick={() => void handleDisconnect()}
                disabled={disconnecting || refreshing || reconnecting}
                variant="danger"
                size="sm"
              >
                {disconnecting ? 'Disconnecting...' : '断开并重配'}
              </IndustrialButton>
            </div>
          </section>
        )}

        <div className="mt-8 flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            当前策略只有两种：自动检测，或手动填写。
          </div>
          <IndustrialButton
            onClick={() => void handleSubmit()}
            disabled={saving || (mode === 'auto' && !connectionState.detectedConnection)}
            className="min-w-[160px] justify-center"
          >
            {saving ? 'Connecting...' : onboarding ? '进入平台' : '保存连接'}
          </IndustrialButton>
        </div>
      </div>
    </div>
  );
}

function StatusMetric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</div>
      <div className={`mt-2 text-sm text-zinc-100 ${mono ? 'font-mono break-all' : ''}`}>{value}</div>
    </div>
  );
}

function getHealthLabel(health: GatewayConnectionHealth): string {
  if (health.status === 'connected') {
    return 'Connected';
  }

  if (health.status === 'degraded') {
    return 'Degraded';
  }

  return 'Offline';
}

function getHealthBadgeClass(health: GatewayConnectionHealth): string {
  if (health.status === 'connected') {
    return 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100';
  }

  if (health.status === 'degraded') {
    return 'border-amber-300/20 bg-amber-400/10 text-amber-100';
  }

  return 'border-rose-300/20 bg-rose-400/10 text-rose-100';
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
