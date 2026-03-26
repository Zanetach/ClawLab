export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId')?.trim();
  const { sessionId } = await context.params;

  if (!agentId) {
    return Response.json({ error: 'agentId is required.' }, { status: 400 });
  }

  try {
    const { getChatSession } = await import('@/lib/openclaw-chat');
    const session = await getChatSession(agentId, sessionId);
    if (!session) {
      return Response.json({ error: 'Session not found.' }, { status: 404 });
    }

    return Response.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load chat session.';
    return Response.json({ error: message }, { status: 500 });
  }
}
