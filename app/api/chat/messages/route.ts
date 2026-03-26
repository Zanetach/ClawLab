export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId')?.trim();
  const agentId = searchParams.get('agentId')?.trim();

  if (!sessionId) {
    return Response.json({ error: 'sessionId is required.' }, { status: 400 });
  }

  const { getChatRunStatus } = await import('@/lib/openclaw-chat');
  return Response.json(getChatRunStatus(sessionId, agentId));
}

export async function POST(request: Request) {
  const body = await request.json() as {
    agentId?: string;
    sessionId?: string;
    message?: string;
  };

  const agentId = body.agentId?.trim();
  const message = body.message?.trim();

  if (!agentId) {
    return Response.json({ error: 'agentId is required.' }, { status: 400 });
  }

  if (!message) {
    return Response.json({ error: 'message is required.' }, { status: 400 });
  }

  try {
    const { startChatMessage } = await import('@/lib/openclaw-chat');
    const session = startChatMessage({
      agentId,
      sessionId: body.sessionId?.trim(),
      message,
    });

    return Response.json(session, { status: 202 });
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : 'Failed to send chat message.';
    return Response.json({ error: nextMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId')?.trim();

  if (!sessionId) {
    return Response.json({ error: 'sessionId is required.' }, { status: 400 });
  }

  try {
    const { stopChatMessage } = await import('@/lib/openclaw-chat');
    return Response.json(stopChatMessage(sessionId));
  } catch (error) {
    const nextMessage = error instanceof Error ? error.message : 'Failed to stop chat message.';
    return Response.json({ error: nextMessage }, { status: 500 });
  }
}
