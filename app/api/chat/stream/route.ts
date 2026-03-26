export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function serializeEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function serializeNamedEvent(name: string, payload: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId')?.trim();
  const agentId = searchParams.get('agentId')?.trim();

  if (!sessionId || !agentId) {
    return new Response('sessionId and agentId are required.', { status: 400 });
  }

  const { getChatRunStatus, getChatSession } = await import('@/lib/openclaw-chat');
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let lastPayload = '';

      const emit = async () => {
        const status = getChatRunStatus(sessionId, agentId);
        const detail = await getChatSession(agentId, sessionId).catch(() => null);
        const payload = JSON.stringify({ status, detail });

        if (payload !== lastPayload) {
          controller.enqueue(encoder.encode(serializeNamedEvent('snapshot', { status, detail })));
          lastPayload = payload;
        }
      };

      const snapshotInterval = setInterval(() => {
        void emit();
      }, 700);
      const heartbeatInterval = setInterval(() => {
        controller.enqueue(encoder.encode(serializeNamedEvent('heartbeat', {
          at: new Date().toISOString(),
          sessionId,
        })));
      }, 15_000);

      const cleanup = () => {
        if (closed) {
          return;
        }

        closed = true;
        clearInterval(snapshotInterval);
        clearInterval(heartbeatInterval);
        controller.close();
      };

      request.signal.addEventListener('abort', cleanup);
      controller.enqueue(encoder.encode('retry: 1000\n\n'));
      controller.enqueue(encoder.encode(serializeEvent({
        type: 'connected',
        sessionId,
        agentId,
        at: new Date().toISOString(),
      })));
      void emit();
    },
    cancel() {
      // No-op; cleanup happens via abort/close path above.
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
