import { revalidatePath, revalidateTag } from 'next/cache';
import {
  clearGatewayConnection,
  detectLocalGatewayConnection,
  getGatewayConnectionState,
  saveGatewayConnection,
} from '@/lib/gateway-connection';
import { invalidateGatewayCacheEntries } from '@/lib/gateway-server';
import { probeGatewayConnection } from '@/lib/openclaw-cli';
import type { GatewayConnectionConfig } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizeUrl(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isGatewayUrl(value: string): boolean {
  return /^wss?:\/\/.+/i.test(value);
}

export async function GET() {
  const state = await getGatewayConnectionState();
  return Response.json(state);
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const mode = typeof payload?.mode === 'string' ? payload.mode : '';

  let connection: GatewayConnectionConfig | null = null;

  if (mode === 'auto') {
    connection = await detectLocalGatewayConnection();
    if (!connection) {
      return Response.json({ error: '未检测到本地 OpenClaw Gateway。' }, { status: 400 });
    }
  } else if (mode === 'manual') {
    const url = sanitizeUrl(payload?.url);
    const token = sanitizeToken(payload?.token);

    if (!isGatewayUrl(url)) {
      return Response.json({ error: 'Gateway URL 必须以 ws:// 或 wss:// 开头。' }, { status: 400 });
    }

    connection = {
      mode: 'manual',
      url,
      token: token || undefined,
      label: 'Manual Gateway',
      source: 'manual',
    };
  } else {
    return Response.json({ error: '无效的连接模式。' }, { status: 400 });
  }

  const reachable = await probeGatewayConnection(connection);
  if (!reachable) {
    return Response.json({ error: '无法连接到 Gateway，请检查 URL、Token 或网络连通性。' }, { status: 400 });
  }

  await saveGatewayConnection(connection);
  invalidateGatewayCacheEntries();
  revalidateTag('gateway', 'max');
  revalidateTag('gateway-agents', 'max');
  revalidateTag('gateway-status', 'max');
  revalidatePath('/');
  revalidatePath('/agents');
  revalidatePath('/settings');
  revalidatePath('/onboarding');

  return Response.json(connection);
}

export async function DELETE() {
  await clearGatewayConnection();
  invalidateGatewayCacheEntries();
  revalidateTag('gateway', 'max');
  revalidateTag('gateway-agents', 'max');
  revalidateTag('gateway-status', 'max');
  revalidatePath('/');
  revalidatePath('/agents');
  revalidatePath('/settings');
  revalidatePath('/onboarding');

  const state = await getGatewayConnectionState();
  return Response.json(state);
}
