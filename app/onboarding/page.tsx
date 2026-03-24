import { redirect } from 'next/navigation';
import { GatewayConnectionPanel } from '@/components/settings/GatewayConnectionPanel';
import { getGatewayConnectionState } from '@/lib/gateway-connection';

export default async function OnboardingPage() {
  const state = await getGatewayConnectionState({ includeRuntime: false });

  if (state.configured) {
    redirect('/');
  }

  return <GatewayConnectionPanel initialState={state} onboarding />;
}
