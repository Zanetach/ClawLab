import { getDashboardSnapshot } from '@/lib/gateway-server';

export const runtime = 'nodejs';

export async function GET() {
  const snapshot = await getDashboardSnapshot();
  return Response.json(snapshot);
}
