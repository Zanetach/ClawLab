import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { requireConfiguredGatewayConnection } from '@/lib/gateway-connection';
import { getDashboardSnapshot } from '@/lib/gateway-server';

export default async function DashboardPage() {
  const connection = await requireConfiguredGatewayConnection();
  const snapshot = await getDashboardSnapshot();

  return <DashboardClient initialSnapshot={snapshot} activeConnection={connection} />;
}
