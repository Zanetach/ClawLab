export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { listChatSessions } = await import('@/lib/openclaw-chat');
    const sessions = await listChatSessions({ lightweight: true });
    return Response.json(sessions);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load chat sessions.';
    return Response.json({ error: message }, { status: 500 });
  }
}
