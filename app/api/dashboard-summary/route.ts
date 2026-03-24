import { getDashboardSummary } from '@/lib/gateway-server';

export const runtime = 'nodejs';

export async function GET() {
  const summary = await getDashboardSummary();
  return Response.json(summary);
}
