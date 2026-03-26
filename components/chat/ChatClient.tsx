'use client';

import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { IndustrialButton } from '@/components/ui/IndustrialButton';
import { getChatAgents, getChatSession, getChatSessions, sendChatMessage, stopChatMessage } from '@/lib/gateway';
import type { Agent, ChatMessage, ChatRunStatus, ChatSessionDetail, ChatSessionSummary } from '@/lib/types';
import { useVisibleInterval } from '@/lib/use-visible-interval';

interface SessionView extends ChatSessionSummary {
  isDraft?: boolean;
}

interface ChatClientProps {
  initialAgents: Agent[];
  initialSessions: ChatSessionSummary[];
}

type StreamState = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'offline';

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function createDraftSession(agentId: string | null): SessionView {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    agentId: agentId || '',
    title: `${agentId || 'unassigned'} / New Conversation`,
    preview: 'Start a new conversation',
    updatedAt: now,
    messageCount: 0,
    kind: 'direct',
    totalTokens: null,
    isDraft: true,
  };
}

function mergeSessions(source: SessionView[], drafts: SessionView[]): SessionView[] {
  const byId = new Map<string, SessionView>();

  [...source, ...drafts].forEach((session) => {
    const previous = byId.get(session.id);
    if (!previous || session.updatedAt >= previous.updatedAt) {
      byId.set(session.id, session);
    }
  });

  return [...byId.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function getAgentVisual(agent: Agent | undefined, index: number) {
  if (!agent) {
    return {
      ringStyle: undefined,
      dotStyle: undefined,
    };
  }

  const hue = Math.round(
    (Array.from(agent.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) + index * 41) % 360
  );

  return {
    ringStyle: {
      borderColor: `hsla(${hue} 88% 72% / 0.22)`,
      background: `linear-gradient(180deg, hsla(${hue} 72% 58% / 0.14), rgba(255,255,255,0.04))`,
      boxShadow: `0 0 0 1px hsla(${hue} 88% 72% / 0.08), inset 0 1px 0 hsla(${hue} 100% 96% / 0.04)`,
    },
    dotStyle: {
      background: `linear-gradient(135deg, hsl(${hue} 92% 76%), hsl(${(hue + 24) % 360} 84% 58%))`,
      boxShadow: `0 0 16px hsla(${hue} 92% 68% / 0.35)`,
    },
  };
}

function renderInline(text: string): Array<{ type: 'text' | 'code'; content: string }> {
  const parts = text.split(/(`[^`]+`)/g).filter(Boolean);
  return parts.map((part) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return { type: 'code', content: part.slice(1, -1) };
    }

    return { type: 'text', content: part };
  });
}

function RichMessage({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        const trimmed = block.trim();

        if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
          const lines = trimmed.split('\n');
          const language = lines[0].replace(/^```/, '').trim();
          const code = lines.slice(1, -1).join('\n');

          return (
            <div key={blockIndex} className="overflow-hidden rounded-2xl border border-white/8 bg-[#0b1020]/90">
              <div className="border-b border-white/8 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/35">
                {language || 'code'}
              </div>
              <pre className="overflow-x-auto px-3 py-3 text-xs leading-6 text-cyan-100">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        if (trimmed.startsWith('>')) {
          const quoteLines = trimmed.split('\n').map((line) => line.replace(/^>\s?/, ''));
          return (
            <blockquote key={blockIndex} className="border-l-2 border-cyan-300/35 pl-4 text-zinc-300/90">
              {quoteLines.map((line, lineIndex) => (
                <p key={lineIndex}>{line}</p>
              ))}
            </blockquote>
          );
        }

        if (trimmed.split('\n').every((line) => /^[-*]\s+/.test(line.trim()))) {
          return (
            <ul key={blockIndex} className="space-y-2 pl-5 text-zinc-100">
              {trimmed.split('\n').map((line, lineIndex) => (
                <li key={lineIndex} className="list-disc">
                  {renderInline(line.replace(/^[-*]\s+/, '')).map((part, partIndex) => (
                    part.type === 'code'
                      ? <code key={partIndex} className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[0.92em] text-cyan-100">{part.content}</code>
                      : <span key={partIndex}>{part.content}</span>
                  ))}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={blockIndex} className="whitespace-pre-wrap">
            {trimmed.split('\n').map((line, lineIndex) => (
              <span key={lineIndex}>
                {renderInline(line).map((part, partIndex) => (
                  part.type === 'code'
                    ? <code key={partIndex} className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[0.92em] text-cyan-100">{part.content}</code>
                    : <span key={partIndex}>{part.content}</span>
                ))}
                {lineIndex < trimmed.split('\n').length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function ChatClient({ initialAgents, initialSessions }: ChatClientProps) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [sessions, setSessions] = useState<SessionView[]>(initialSessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessions[0]?.id ?? null);
  const [detailsBySessionId, setDetailsBySessionId] = useState<Record<string, ChatSessionDetail>>({});
  const [draft, setDraft] = useState('');
  const [sessionQuery, setSessionQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState<'all' | string>('all');
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [submittingSessionId, setSubmittingSessionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(initialAgents.length === 0 && initialSessions.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [waitingSince, setWaitingSince] = useState<string | null>(null);
  const [runStatusBySessionId, setRunStatusBySessionId] = useState<Record<string, ChatRunStatus>>({});
  const [renderedContentByMessageId, setRenderedContentByMessageId] = useState<Record<string, string>>({});
  const [animatedMessageId, setAnimatedMessageId] = useState<string | null>(null);
  const [streamState, setStreamState] = useState<StreamState>('idle');
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const renderedContentRef = useRef<Record<string, string>>({});
  const streamRef = useRef<EventSource | null>(null);

  const orderedSessions = useMemo(() => {
    const normalizedQuery = sessionQuery.trim().toLowerCase();

    return [...sessions]
      .filter((session) => (agentFilter === 'all' ? true : session.agentId === agentFilter))
      .filter((session) => {
        if (!normalizedQuery) {
          return true;
        }

        return [session.title, session.preview, session.agentId]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [agentFilter, sessionQuery, sessions]);
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? orderedSessions[0] ?? null;
  const selectedAgent = agents.find((agent) => agent.id === selectedSession?.agentId);
  const selectedDetail = selectedSession ? detailsBySessionId[selectedSession.id] : undefined;
  const selectedMessages = useMemo(() => selectedDetail?.messages ?? [], [selectedDetail]);
  const canReassignAgent = !selectedSession || selectedSession.isDraft || selectedSession.messageCount === 0;
  const selectedRunStatus = selectedSession ? runStatusBySessionId[selectedSession.id] : undefined;
  const activeProcessingSessionId = submittingSessionId ?? pendingSessionId;

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const [nextAgents, nextSessions] = await Promise.all([
          getChatAgents(),
          getChatSessions(),
        ]);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setAgents(nextAgents);
          setSessions((current) => mergeSessions(nextSessions, current.filter((item) => item.isDraft)));
          setSelectedSessionId((current) => current || nextSessions[0]?.id || null);
        });
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : '初始化聊天数据失败。');
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedSession && orderedSessions[0]) {
      setSelectedSessionId(orderedSessions[0].id);
    }
  }, [orderedSessions, selectedSession]);

  useEffect(() => {
    renderedContentRef.current = renderedContentByMessageId;
  }, [renderedContentByMessageId]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({
      block: 'end',
      behavior: activeProcessingSessionId ? 'smooth' : 'auto',
    });
  }, [activeProcessingSessionId, animatedMessageId, selectedMessages, selectedSessionId]);

  useEffect(() => {
    if (activeProcessingSessionId && !waitingSince) {
      setWaitingSince(new Date().toISOString());
      return;
    }

    if (!activeProcessingSessionId && waitingSince) {
      setWaitingSince(null);
    }
  }, [activeProcessingSessionId, waitingSince]);

  useEffect(() => {
    if (selectedMessages.length === 0) {
      return;
    }

    const lastMessage = selectedMessages[selectedMessages.length - 1];

    setRenderedContentByMessageId((current) => {
      const next = { ...current };

      selectedMessages.forEach((message) => {
        const existing = next[message.id];
        const shouldAnimate = message.id === lastMessage.id && message.role === 'assistant';

        if (!existing) {
          next[message.id] = shouldAnimate ? '' : message.content;
          return;
        }

        if (!shouldAnimate || existing.length >= message.content.length) {
          next[message.id] = existing.length >= message.content.length
            ? existing
            : message.content;
        }
      });

      return next;
    });

    if (lastMessage.role === 'assistant') {
      const currentRendered = renderedContentRef.current[lastMessage.id] ?? '';
      if (currentRendered.length < lastMessage.content.length) {
        setAnimatedMessageId(lastMessage.id);
      }
    } else {
      setAnimatedMessageId(null);
    }
  }, [selectedMessages]);

  useEffect(() => {
    if (!animatedMessageId) {
      return;
    }

    const message = selectedMessages.find((item) => item.id === animatedMessageId);
    if (!message) {
      setAnimatedMessageId(null);
      return;
    }

    const interval = window.setInterval(() => {
      let finished = false;

      setRenderedContentByMessageId((current) => {
        const existing = current[animatedMessageId] ?? '';
        if (existing.length >= message.content.length) {
          finished = true;
          return current;
        }

        const remaining = message.content.length - existing.length;
        const chunkSize = Math.max(1, Math.ceil(remaining / 12));

        return {
          ...current,
          [animatedMessageId]: message.content.slice(0, existing.length + chunkSize),
        };
      });

      if (finished) {
        window.clearInterval(interval);
        setAnimatedMessageId((current) => current === message.id ? null : current);
      }
    }, 28);

    return () => {
      window.clearInterval(interval);
    };
  }, [animatedMessageId, selectedMessages]);

  useEffect(() => {
    if (!selectedSession || selectedSession.isDraft || detailsBySessionId[selectedSession.id] || loadingSessionId === selectedSession.id) {
      return;
    }

    let cancelled = false;
    setLoadingSessionId(selectedSession.id);
    setError(null);

    void getChatSession(selectedSession.id, selectedSession.agentId)
      .then((detail) => {
        if (cancelled) {
          return;
        }

        setDetailsBySessionId((current) => ({
          ...current,
          [detail.id]: detail,
        }));
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : '加载会话失败。');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSessionId((current) => (current === selectedSession.id ? null : current));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [detailsBySessionId, loadingSessionId, selectedSession]);

  useEffect(() => {
    streamRef.current?.close();
    streamRef.current = null;
    setLastHeartbeatAt(null);

    if (!selectedSession || selectedSession.isDraft) {
      setStreamState('idle');
      return;
    }

    setStreamState('connecting');
    const stream = new EventSource(
      `/api/chat/stream?sessionId=${encodeURIComponent(selectedSession.id)}&agentId=${encodeURIComponent(selectedSession.agentId)}`
    );

    stream.onopen = () => {
      setStreamState('live');
    };

    stream.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          at?: string;
        };

        if (payload.type === 'connected') {
          setStreamState('live');
          setLastHeartbeatAt(payload.at ?? new Date().toISOString());
        }
      } catch (nextError) {
        console.error('Failed to parse chat stream message:', nextError);
      }
    };

    stream.addEventListener('heartbeat', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { at?: string };
        setLastHeartbeatAt(payload.at ?? new Date().toISOString());
        setStreamState('live');
      } catch (nextError) {
        console.error('Failed to parse heartbeat event:', nextError);
      }
    });

    stream.addEventListener('snapshot', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          status?: ChatRunStatus;
          detail?: ChatSessionDetail | null;
        };

        if (payload.status) {
          const nextStatus = payload.status;

          setRunStatusBySessionId((current) => ({
            ...current,
            [selectedSession.id]: nextStatus,
          }));

          if (nextStatus.state === 'running') {
            setSubmittingSessionId((current) => (current === selectedSession.id ? null : current));
            setPendingSessionId(selectedSession.id);
          } else {
            if (submittingSessionId !== selectedSession.id) {
              setPendingSessionId((current) => (current === selectedSession.id ? null : current));
            }
          }

          if (nextStatus.state === 'failed' && nextStatus.error) {
            setSubmittingSessionId((current) => (current === selectedSession.id ? null : current));
            setError(nextStatus.error);
          }
        }

        if (payload.detail) {
          const detail = payload.detail;

          startTransition(() => {
            setDetailsBySessionId((current) => ({
              ...current,
              [detail.id]: detail,
            }));
            setSessions((current) =>
              mergeSessions(
                current.map((session) =>
                  session.id === detail.id ? { ...detail, isDraft: false } : session
                ),
                []
              )
            );
          });
        }
      } catch (nextError) {
        console.error('Failed to parse chat stream event:', nextError);
      }
    });

    stream.onerror = () => {
      setStreamState((current) => current === 'live' ? 'reconnecting' : 'offline');
    };

    streamRef.current = stream;

    return () => {
      stream.close();
      setStreamState('idle');
      if (streamRef.current === stream) {
        streamRef.current = null;
      }
    };
  }, [selectedSession, submittingSessionId]);

  async function refreshSessions() {
    setRefreshing(true);
    try {
      const nextSessions = await getChatSessions();

      startTransition(() => {
        setSessions((current) => mergeSessions(nextSessions, current.filter((item) => item.isDraft)));
      });
    } catch (nextError) {
      console.error('Failed to refresh chat sessions:', nextError);
    } finally {
      setRefreshing(false);
    }
  }

  useVisibleInterval(refreshSessions, {
    enabled: !activeProcessingSessionId,
    intervalMs: 15_000,
    runImmediately: false,
  });

  function createSession(agentId = agents[0]?.id ?? null) {
    const session = createDraftSession(agentId);
    if (agentId) {
      session.title = `${agentId} / New Conversation`;
    }

    setSessions((current) => mergeSessions(current, [session]));
    setSelectedSessionId(session.id);
    setDraft('');
    setError(null);
  }

  function updateDraftAgent(agentId: string) {
    if (!canReassignAgent) {
      return;
    }

    if (!selectedSession) {
      createSession(agentId);
      return;
    }

    setSessions((current) =>
      current.map((session) =>
        session.id === selectedSession.id
          ? {
              ...session,
              agentId,
              title: `${agentId} / New Conversation`,
              updatedAt: new Date().toISOString(),
            }
          : session
      )
    );
  }

  async function handleSubmit() {
    const content = draft.trim();
    if (!content || !selectedSession?.agentId) {
      return;
    }

    const optimisticMessage: ChatMessage = {
      id: `pending-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    const optimisticSummary: SessionView = {
      ...selectedSession,
      title: selectedSession.messageCount === 0
        ? `${selectedSession.agentId} / ${content.slice(0, 24)}`
        : selectedSession.title,
      preview: content,
      updatedAt: optimisticMessage.createdAt,
      messageCount: selectedSession.messageCount + 1,
      isDraft: false,
    };

    setSubmittingSessionId(selectedSession.id);
    setPendingSessionId(selectedSession.id);
    setError(null);
    setDraft('');

    startTransition(() => {
      setSessions((current) =>
        mergeSessions(
          current.map((session) =>
            session.id === selectedSession.id
              ? optimisticSummary
              : session
          ),
          []
        )
      );
      setDetailsBySessionId((current) => ({
        ...current,
        [selectedSession.id]: {
          id: selectedSession.id,
          agentId: selectedSession.agentId,
          title: optimisticSummary.title,
          preview: optimisticSummary.preview,
          updatedAt: optimisticSummary.updatedAt,
          messageCount: optimisticSummary.messageCount,
          kind: optimisticSummary.kind,
          model: optimisticSummary.model,
          totalTokens: optimisticSummary.totalTokens,
          messages: [...(current[selectedSession.id]?.messages ?? []), optimisticMessage],
        },
      }));
    });

    try {
      const runStatus = await sendChatMessage({
        agentId: selectedSession.agentId,
        sessionId: selectedSession.id,
        message: content,
      });

      startTransition(() => {
        setRunStatusBySessionId((current) => ({
          ...current,
          [runStatus.sessionId]: runStatus,
        }));
        setSelectedSessionId(runStatus.sessionId);
      });
      setSubmittingSessionId(null);
      setPendingSessionId(runStatus.state === 'running' ? runStatus.sessionId : null);
    } catch (nextError) {
      setDraft(content);
      setError(nextError instanceof Error ? nextError.message : '发送消息失败。');
      setSubmittingSessionId(null);
      setPendingSessionId(null);
      setDetailsBySessionId((current) => {
        const existing = current[selectedSession.id];
        if (!existing) {
          return current;
        }

        return {
          ...current,
          [selectedSession.id]: {
            ...existing,
            messages: existing.messages.filter((message) => message.id !== optimisticMessage.id),
          },
        };
      });
    }
  }

  async function handleStop() {
    if (!pendingSessionId) {
      return;
    }

    try {
      const status = await stopChatMessage(pendingSessionId);
      setRunStatusBySessionId((current) => ({
        ...current,
        [pendingSessionId]: status,
      }));
      setSubmittingSessionId((current) => (current === pendingSessionId ? null : current));
      setPendingSessionId(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '停止生成失败。');
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
            <span className="glass-badge rounded-full px-3 py-1">ClawLab</span>
            <span>Chat</span>
            <span className="rounded-full border border-cyan-300/10 bg-cyan-400/6 px-3 py-1 text-cyan-200/70">
              OpenClaw Live
            </span>
          </div>
          <h1 className="font-display text-4xl leading-none text-zinc-50">Agent Chat Console</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            基于真实 OpenClaw session，按 agent 拆分线程并直接对话。
          </p>
        </div>

        <IndustrialButton variant="primary" size="lg" onClick={() => createSession()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 h-4 w-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Thread
        </IndustrialButton>
      </div>

      <div className="grid min-h-[calc(100vh-12.5rem)] grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        <section className="glass-panel flex min-h-[720px] flex-col rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(7,12,24,0.94)_0%,rgba(12,18,34,0.9)_100%)]">
          <div className="border-b border-white/8 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-white/42">Conversations</div>
                <div className="mt-1 text-sm text-zinc-300">{orderedSessions.length} active threads</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void refreshSessions()}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/72 transition hover:bg-white/8 hover:text-white"
                  aria-label="Refresh conversations"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}>
                    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                    <path d="M21 3v6h-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => createSession()}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/72 transition hover:bg-white/8 hover:text-white"
                  aria-label="Create conversation"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  value={sessionQuery}
                  onChange={(event) => setSessionQuery(event.target.value)}
                  placeholder="Search threads..."
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/28"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <FilterChip
                  active={agentFilter === 'all'}
                  label="All"
                  onClick={() => setAgentFilter('all')}
                />
                {agents.map((agent) => (
                  <FilterChip
                    key={agent.id}
                    active={agentFilter === agent.id}
                    label={agent.name}
                    onClick={() => setAgentFilter(agent.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {orderedSessions.map((session, index) => {
              const agent = agents.find((item) => item.id === session.agentId);
              const visual = getAgentVisual(agent, index);
              const isActive = session.id === selectedSession?.id;

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => {
                    setSelectedSessionId(session.id);
                    setError(null);
                  }}
                  className={`w-full rounded-[24px] border p-4 text-left transition ${
                    isActive
                      ? 'border-cyan-300/24 bg-[linear-gradient(180deg,rgba(59,130,246,0.14),rgba(13,19,37,0.94))] shadow-[0_20px_40px_rgba(2,6,23,0.24)]'
                      : 'border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]'
                  }`}
                  style={isActive ? visual.ringStyle : undefined}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-100">{session.title}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/34">
                        {agent?.name ?? (session.agentId || 'unassigned')}
                      </div>
                    </div>
                    <div className="mt-1 h-2.5 w-2.5 rounded-full" style={visual.dotStyle} />
                  </div>
                  <div className="line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-zinc-400">{session.preview}</div>
                  <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/28">
                    <span>{session.isDraft ? 'draft' : session.kind}</span>
                    <span>{formatTime(session.updatedAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="glass-panel flex min-h-[720px] flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(6,10,20,0.97)_0%,rgba(9,14,26,0.96)_100%)]">
          <div className="border-b border-white/8 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/40">Current Session</div>
                <div className="mt-1 text-2xl font-semibold text-zinc-50">{selectedSession?.title ?? 'Conversation'}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300">
                <span className={`h-2 w-2 rounded-full ${activeProcessingSessionId === selectedSession?.id ? 'bg-amber-400 pulse-dot' : 'bg-emerald-400 pulse-dot'}`} />
                {submittingSessionId === selectedSession?.id
                  ? 'Queued to agent'
                  : pendingSessionId === selectedSession?.id
                    ? 'Agent replying'
                  : loadingSessionId === selectedSession?.id
                    ? 'Loading history'
                    : selectedRunStatus?.state === 'failed'
                      ? 'Last run failed'
                      : selectedRunStatus?.state === 'stopped'
                        ? 'Stopped'
                        : 'Ready'}
                {selectedSession?.model && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white/46">
                    {selectedSession.model}
                  </span>
                )}
                <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${
                  streamState === 'live'
                    ? 'border-emerald-300/16 bg-emerald-400/10 text-emerald-100'
                    : streamState === 'reconnecting'
                      ? 'border-amber-300/16 bg-amber-400/10 text-amber-100'
                      : 'border-white/10 bg-white/[0.04] text-white/46'
                }`}>
                  Stream {streamState}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            {bootstrapping && !selectedSession && (
              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-300">
                Loading agents and sessions...
              </div>
            )}

            {streamState === 'reconnecting' && (
              <div className="rounded-[20px] border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                SSE connection lost, attempting to reconnect...
              </div>
            )}

            {activeProcessingSessionId === selectedSession?.id && waitingSince && (
              <div className="rounded-[20px] border border-cyan-300/16 bg-cyan-400/8 px-4 py-3 text-sm text-cyan-50">
                <div>
                  {submittingSessionId === selectedSession?.id
                    ? `Message sent. Waiting for ${selectedAgent?.name ?? selectedSession?.agentId ?? 'agent'} to accept the run. Started at ${formatTime(waitingSince)}.`
                    : `Agent is working. Started at ${formatTime(waitingSince)}.`}
                </div>
                {selectedRunStatus?.output && (
                  <pre className="mt-3 overflow-x-auto rounded-xl border border-white/8 bg-[#0b1020]/70 px-3 py-2 text-xs leading-5 text-cyan-100 whitespace-pre-wrap">
                    {selectedRunStatus.output}
                  </pre>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-[20px] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}

            {selectedSession?.isDraft && selectedMessages.length === 0 && (
              <div className="rounded-[22px] border border-cyan-300/14 bg-cyan-400/8 px-4 py-3 text-sm text-cyan-50">
                这是一个新 thread。选择 agent 后发送第一条消息，OpenClaw 会创建真实 session。
              </div>
            )}

            {!selectedSession?.isDraft && loadingSessionId === selectedSession?.id && selectedMessages.length === 0 ? (
              <div className="text-sm text-zinc-400">Loading transcript...</div>
            ) : (
              selectedMessages.map((message: ChatMessage) => {
                const isUser = message.role === 'user';
                const isSystem = message.role === 'system';

                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-[0_18px_36px_rgba(2,6,23,0.18)] ${
                        isUser
                          ? 'border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(59,130,246,0.12))] text-cyan-50'
                          : isSystem
                            ? 'border border-amber-300/14 bg-amber-300/8 text-amber-100'
                            : 'border border-white/8 bg-white/[0.045] text-zinc-100'
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/40">
                        <span>{message.role}</span>
                        <span>{formatTime(message.createdAt)}</span>
                      </div>
                      <div>
                        <RichMessage
                          content={message.role === 'assistant'
                            ? (renderedContentByMessageId[message.id] ?? message.content)
                            : message.content}
                        />
                        {animatedMessageId === message.id && (
                          <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[2px] bg-cyan-200/80 align-middle pulse-dot" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {activeProcessingSessionId === selectedSession?.id && (
              <div className="flex justify-start">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.045] px-4 py-3 text-zinc-300">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-300 pulse-dot" />
                    <span className="h-2 w-2 rounded-full bg-pink-300 pulse-dot [animation-delay:0.18s]" />
                    <span className="h-2 w-2 rounded-full bg-violet-300 pulse-dot [animation-delay:0.32s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          <div className="border-t border-white/8 px-5 py-4">
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {agents.map((agent, index) => {
                const visual = getAgentVisual(agent, index);
                const isSelected = selectedSession?.agentId === agent.id;

                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => updateDraftAgent(agent.id)}
                    disabled={!canReassignAgent}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition ${
                      isSelected
                        ? 'text-white'
                        : 'border-white/8 bg-white/[0.03] text-white/52 hover:text-white/84'
                    } ${!canReassignAgent ? 'cursor-not-allowed opacity-60' : ''}`}
                    style={isSelected ? visual.ringStyle : undefined}
                  >
                    {agent.name}
                  </button>
                );
              })}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSubmit();
                  }
                }}
                placeholder="给当前 agent 发送真实消息，OpenClaw 会继续这个 session..."
                className="min-h-[120px] w-full resize-none bg-transparent px-2 py-2 text-sm text-zinc-100 outline-none placeholder:text-white/28"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-zinc-500">
                  当前 agent: <span className="text-cyan-200">{selectedAgent?.name ?? '未选择'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {activeProcessingSessionId === selectedSession?.id && (
                    <IndustrialButton variant="danger" size="md" onClick={handleStop}>
                      Stop
                    </IndustrialButton>
                  )}
                  <IndustrialButton variant="ghost" size="md" onClick={() => setDraft('')}>
                    Clear
                  </IndustrialButton>
                  <IndustrialButton
                    variant="primary"
                    size="md"
                    onClick={handleSubmit}
                    disabled={!draft.trim() || !selectedSession?.agentId || activeProcessingSessionId === selectedSession?.id}
                  >
                    Send Message
                  </IndustrialButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="glass-panel flex min-h-[720px] flex-col rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,13,24,0.95)_0%,rgba(11,16,29,0.9)_100%)] p-5">
          <div className="mb-5">
            <div className="text-xs uppercase tracking-[0.22em] text-white/40">Routing</div>
            <div className="mt-2 text-lg font-semibold text-zinc-50">Thread Controls</div>
          </div>

          <div className="space-y-3">
            <InfoCard
              label="Bound Agent"
              value={selectedAgent?.name ?? 'Not selected'}
              helper={selectedAgent ? `${selectedAgent.role} · ${selectedAgent.model}` : 'Choose an agent before the first message'}
            />
            <InfoCard
              label="Messages"
              value={String(selectedSession?.messageCount ?? 0).padStart(2, '0')}
              helper="Transcript lines from the real session store"
            />
            <InfoCard
              label="Tokens"
              value={selectedSession?.totalTokens != null ? selectedSession.totalTokens.toLocaleString('zh-CN') : 'N/A'}
              helper="Latest token count reported by the session index"
            />
            <InfoCard
              label="Session ID"
              value={selectedSession?.id ?? 'Pending'}
              helper={selectedSession?.isDraft ? 'Draft id, promoted on first send' : 'OpenClaw session id'}
            />
            <InfoCard
              label="Run State"
              value={selectedRunStatus?.state ?? 'idle'}
              helper={selectedRunStatus?.error || 'Current local run status for the active session'}
            />
            <InfoCard
              label="Stream"
              value={streamState}
              helper={lastHeartbeatAt ? `Last heartbeat ${formatTime(lastHeartbeatAt)}` : 'Waiting for heartbeat'}
            />
          </div>

          <div className="mt-6 rounded-[24px] border border-cyan-300/10 bg-cyan-400/6 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/72">Recommended Flow</div>
            <div className="mt-3 space-y-3 text-sm text-zinc-300">
              <p>1. 新开一个 thread，先绑定 agent。</p>
              <p>2. 第一条消息发出后，这个 thread 会变成真实 OpenClaw session。</p>
              <p>3. 想换 agent 时，再开新 thread，不要混用上下文。</p>
            </div>
          </div>

          <div className="mt-auto rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35">State</div>
            <div className="mt-2 text-sm text-zinc-300">
              左侧列表和消息区现在直接读取 OpenClaw 的真实 sessions 文件，发送消息会调用 `openclaw agent`.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function InfoCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/34">{label}</div>
      <div className="mt-2 break-words text-sm font-semibold text-zinc-100">{value}</div>
      <div className="mt-1 text-xs leading-5 text-zinc-500">{helper}</div>
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.16em] transition ${
        active
          ? 'border-cyan-300/18 bg-cyan-400/10 text-cyan-100'
          : 'border-white/8 bg-white/[0.03] text-white/48 hover:text-white/82'
      }`}
    >
      {label}
    </button>
  );
}
