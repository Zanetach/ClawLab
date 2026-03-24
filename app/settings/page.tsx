import { GatewayConnectionPanel } from '@/components/settings/GatewayConnectionPanel';
import { getGatewayConnectionState } from '@/lib/gateway-connection';

export default async function SettingsPage() {
  const state = await getGatewayConnectionState({ includeRuntime: false });

  return <GatewayConnectionPanel initialState={state} initialRuntimeLoading />;
}
