'use client';

import { Agent } from '@/lib/types';
import Link from 'next/link';

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function generateSparkline(seed: string, w: number, h: number): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffff;
  }
  let prev = 0.25 + (hash % 25) / 100;
  const pts = 12;
  const step = w / (pts - 1);
  const points = Array.from({ length: pts }, (_, i) => {
    hash = (hash * 1103515245 + 12345) & 0xffff;
    prev = Math.max(0.08, Math.min(0.92, prev + (hash % 22 - 11) / 100));
    return { x: i * step, y: h - prev * h };
  });
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

const statusHex: Record<string, string> = {
  online: '#10b981',
  offline: '#6b7280',
  warning: '#d97706',
  error: '#ef4444',
  busy: '#3b82f6',
};

const EQ_BARS = [
  { base: 38, dur: 1.1, delay: 0.0, color: '#10b981' },
  { base: 22, dur: 0.8, delay: 0.25, color: '#d97706' },
  { base: 30, dur: 1.4, delay: 0.5, color: '#06b6d4' },
];

const ACT_BARS = [
  { w: 0.78, delay: 0.0 },
  { w: 0.48, delay: 0.4 },
  { w: 0.62, delay: 0.2 },
];

type WorkstationTheme = {
  roleLabel: string;
  accent: string;
  accentSoft: string;
  deskGlow: string;
  wallWidget: React.ReactNode;
  monitorContent: React.ReactNode;
};

function buildRoleFingerprint(agent: Agent): string {
  return [agent.persona, agent.botName, agent.name, agent.id]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getWorkstationTheme(agent: Agent): WorkstationTheme {
  const fingerprint = buildRoleFingerprint(agent);

  if (/design|designer|设计/.test(fingerprint)) {
    return {
      roleLabel: 'Design Bay',
      accent: '#f472b6',
      accentSoft: 'rgba(244,114,182,0.28)',
      deskGlow: 'rgba(244,114,182,0.18)',
      wallWidget: (
        <div className="h-9 rounded-xl border border-pink-300/15 bg-pink-400/8 px-3 py-2">
          <div className="mb-1 h-1.5 w-8 rounded-full bg-pink-200/70" />
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-cyan-300/60" />
            <div className="h-3 w-3 rounded-full bg-violet-300/60" />
            <div className="h-3 w-3 rounded-full bg-pink-300/70" />
          </div>
        </div>
      ),
      monitorContent: (
        <>
          <div className="monitor-fade mb-1 h-[2px] w-[76%] rounded-full bg-pink-200/75" />
          <div className="mb-1 flex gap-1">
            <div className="monitor-pop h-3 w-3 rounded-sm bg-pink-300/50" />
            <div className="monitor-pop h-3 w-5 rounded-sm bg-violet-300/45" style={{ animationDelay: '0.15s' }} />
            <div className="monitor-pop h-3 w-4 rounded-sm bg-cyan-300/45" style={{ animationDelay: '0.3s' }} />
          </div>
          <div className="monitor-fade h-[2px] w-[48%] rounded-full bg-cyan-200/75" style={{ animationDelay: '0.2s' }} />
        </>
      ),
    };
  }

  if (/code|coding|developer|engineer|开发|程序/.test(fingerprint)) {
    return {
      roleLabel: 'Code Pod',
      accent: '#34d399',
      accentSoft: 'rgba(52,211,153,0.28)',
      deskGlow: 'rgba(52,211,153,0.18)',
      wallWidget: (
        <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/8 px-3 py-2">
          <div className="mb-1 h-[2px] w-8 rounded-full bg-emerald-200/70" />
          <div className="mb-1 h-[2px] w-11 rounded-full bg-emerald-200/55" />
          <div className="h-[2px] w-6 rounded-full bg-cyan-200/65" />
        </div>
      ),
      monitorContent: (
        <>
          <div className="monitor-scroll mb-1 h-[2px] w-[26%] rounded-full bg-emerald-200/80" />
          <div className="monitor-scroll mb-1 h-[2px] w-[82%] rounded-full bg-cyan-200/70" style={{ animationDelay: '0.12s' }} />
          <div className="monitor-scroll mb-1 h-[2px] w-[56%] rounded-full bg-violet-200/70" style={{ animationDelay: '0.24s' }} />
          <div className="monitor-scroll h-[2px] w-[38%] rounded-full bg-emerald-200/80" style={{ animationDelay: '0.36s' }} />
        </>
      ),
    };
  }

  if (/review|reviewer|audit|qa|审查|审核/.test(fingerprint)) {
    return {
      roleLabel: 'Review Deck',
      accent: '#22d3ee',
      accentSoft: 'rgba(34,211,238,0.26)',
      deskGlow: 'rgba(34,211,238,0.16)',
      wallWidget: (
        <div className="rounded-xl border border-cyan-300/15 bg-cyan-400/8 px-3 py-2">
          <div className="mb-1 h-[2px] w-8 rounded-full bg-cyan-200/80" />
          <div className="flex gap-1.5">
            <div className="h-4 w-4 rounded-full border border-cyan-200/60" />
            <div className="mt-1 h-[2px] w-7 rounded-full bg-cyan-200/70" />
          </div>
        </div>
      ),
      monitorContent: (
        <>
          <div className="mb-1 flex items-center gap-1">
            <div className="monitor-scan h-3 w-3 rounded-full border border-cyan-200/80" />
            <div className="monitor-fade h-[2px] flex-1 rounded-full bg-cyan-200/70" />
          </div>
          <div className="monitor-fade mb-1 h-[2px] w-[70%] rounded-full bg-cyan-200/65" style={{ animationDelay: '0.2s' }} />
          <div className="monitor-fade h-[2px] w-[42%] rounded-full bg-violet-200/60" style={{ animationDelay: '0.4s' }} />
        </>
      ),
    };
  }

  if (/market|marketing|growth|品牌|市场/.test(fingerprint)) {
    return {
      roleLabel: 'Growth Lab',
      accent: '#fb923c',
      accentSoft: 'rgba(251,146,60,0.28)',
      deskGlow: 'rgba(251,146,60,0.18)',
      wallWidget: (
        <div className="rounded-xl border border-orange-300/15 bg-orange-400/8 px-3 py-2">
          <div className="flex items-end gap-1.5">
            <div className="h-3 w-1.5 rounded-full bg-orange-300/60" />
            <div className="h-5 w-1.5 rounded-full bg-pink-300/65" />
            <div className="h-7 w-1.5 rounded-full bg-cyan-300/70" />
          </div>
        </div>
      ),
      monitorContent: (
        <>
          <div className="mb-1 flex items-end gap-1">
            <div className="monitor-rise h-2 w-1.5 rounded-full bg-orange-300/75" />
            <div className="monitor-rise h-4 w-1.5 rounded-full bg-pink-300/75" style={{ animationDelay: '0.14s' }} />
            <div className="monitor-rise h-6 w-1.5 rounded-full bg-cyan-300/75" style={{ animationDelay: '0.28s' }} />
            <div className="monitor-rise h-3 w-1.5 rounded-full bg-orange-200/70" style={{ animationDelay: '0.42s' }} />
          </div>
          <div className="monitor-fade h-[2px] w-[58%] rounded-full bg-orange-200/70" />
        </>
      ),
    };
  }

  if (/planner|pm|product|计划/.test(fingerprint)) {
    return {
      roleLabel: 'PM Hub',
      accent: '#60a5fa',
      accentSoft: 'rgba(96,165,250,0.26)',
      deskGlow: 'rgba(96,165,250,0.16)',
      wallWidget: (
        <div className="rounded-xl border border-blue-300/15 bg-blue-400/8 px-3 py-2">
          <div className="mb-1 h-[2px] w-8 rounded-full bg-blue-200/80" />
          <div className="grid grid-cols-2 gap-1">
            <div className="h-3 rounded-sm bg-blue-200/35" />
            <div className="h-3 rounded-sm bg-cyan-200/35" />
          </div>
        </div>
      ),
      monitorContent: (
        <>
          <div className="mb-1 grid grid-cols-3 gap-1">
            <div className="monitor-pop h-3 rounded-sm bg-blue-200/40" />
            <div className="monitor-pop h-3 rounded-sm bg-cyan-200/40" style={{ animationDelay: '0.15s' }} />
            <div className="monitor-pop h-3 rounded-sm bg-violet-200/40" style={{ animationDelay: '0.3s' }} />
          </div>
          <div className="monitor-fade mb-1 h-[2px] w-[68%] rounded-full bg-cyan-200/70" />
          <div className="monitor-fade h-[2px] w-[44%] rounded-full bg-blue-200/70" style={{ animationDelay: '0.2s' }} />
        </>
      ),
    };
  }

  return {
    roleLabel: 'Command Node',
    accent: '#f59e0b',
    accentSoft: 'rgba(245,158,11,0.28)',
    deskGlow: 'rgba(245,158,11,0.18)',
    wallWidget: (
      <div className="rounded-xl border border-amber-300/15 bg-amber-400/8 px-3 py-2">
        <div className="mb-1 h-[2px] w-8 rounded-full bg-amber-100/80" />
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded-full border border-amber-200/65" />
          <div className="h-[2px] w-6 rounded-full bg-amber-100/70" />
        </div>
      </div>
    ),
    monitorContent: (
      <>
        <div className="monitor-fade mb-1 h-[2px] w-[72%] rounded-full bg-amber-100/80" />
        <div className="mb-1 flex items-center gap-1">
          <div className="monitor-scan h-4 w-4 rounded-full border border-amber-200/70" />
          <div className="monitor-fade h-[2px] flex-1 rounded-full bg-orange-200/65" style={{ animationDelay: '0.15s' }} />
        </div>
        <div className="monitor-fade h-[2px] w-[40%] rounded-full bg-cyan-200/60" style={{ animationDelay: '0.3s' }} />
      </>
    ),
  };
}

function getSceneGlow(agent: Agent): string {
  const fingerprint = buildRoleFingerprint(agent);

  if (/design|designer|设计/.test(fingerprint)) return 'rgba(244,114,182,0.34)';
  if (/code|coding|developer|engineer|开发|程序/.test(fingerprint)) return 'rgba(52,211,153,0.3)';
  if (/review|reviewer|audit|qa|审查|审核/.test(fingerprint)) return 'rgba(34,211,238,0.28)';
  if (/market|marketing|growth|品牌|市场/.test(fingerprint)) return 'rgba(245,158,11,0.3)';
  if (/planner|pm|product|计划/.test(fingerprint)) return 'rgba(96,165,250,0.3)';
  return 'rgba(249,115,22,0.28)';
}

function renderRoleMark(roleLabel: string, accent: string) {
  if (/design/i.test(roleLabel)) {
    return (
      <>
        <circle cx="80" cy="95" r="17" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
        <circle cx="72" cy="90" r="4.5" fill="#22d3ee" />
        <circle cx="88" cy="90" r="4.5" fill="#f472b6" />
        <circle cx="80" cy="101" r="4.5" fill="#a78bfa" />
      </>
    );
  }

  if (/code/i.test(roleLabel)) {
    return <path d="M64 97 74 87M64 97l10 10M96 87 86 97M96 107 86 97M80 85l-4 24" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />;
  }

  if (/review/i.test(roleLabel)) {
    return (
      <>
        <circle cx="80" cy="95" r="17" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.24)" strokeWidth="2.5" />
        <path d="M71 96l6 6 13-16" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </>
    );
  }

  if (/growth/i.test(roleLabel)) {
    return (
      <>
        <path d="M64 108V92M80 108V86M96 108V78" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        <path d="M65 90c9 3 16-1 23-8l10 4" fill="none" stroke="#f472b6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </>
    );
  }

  if (/pm/i.test(roleLabel)) {
    return (
      <>
        <rect x="64" y="82" width="12" height="12" rx="3" fill="rgba(255,255,255,0.14)" stroke={accent} strokeWidth="2.5" />
        <rect x="84" y="82" width="12" height="12" rx="3" fill="rgba(255,255,255,0.14)" stroke="#22d3ee" strokeWidth="2.5" />
        <rect x="74" y="102" width="12" height="12" rx="3" fill="rgba(255,255,255,0.14)" stroke="#f472b6" strokeWidth="2.5" />
      </>
    );
  }

  return (
    <>
      <circle cx="80" cy="95" r="18" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.24)" strokeWidth="2.5" />
      <circle cx="80" cy="95" r="6" fill={accent} />
      <path d="M80 81v-8M80 109v8M66 95h-8M94 95h8" stroke="rgba(255,255,255,0.34)" strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function renderLobsterGlyph(roleLabel: string, accent: string, accentSoft: string, sizeClass: string) {
  const lobsterId = `lobster-${accent.replace('#', '')}`;
  const shellHighlightId = `${lobsterId}-shell`;
  const bellyId = `${lobsterId}-belly`;

  return (
    <svg viewBox="0 0 160 160" className={sizeClass}>
      <defs>
        <linearGradient id={lobsterId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="1" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.88" />
        </linearGradient>
        <linearGradient id={shellHighlightId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.72)" />
          <stop offset="42%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <radialGradient id={bellyId} cx="40%" cy="30%" r="78%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="145" rx="34" ry="9" fill="rgba(15,23,42,0.3)" />
      <ellipse cx="80" cy="78" rx="60" ry="56" fill={accentSoft} opacity="0.14" />
      <path d="M60 24 42 8M100 24l18-16" stroke={accent} strokeWidth="8" strokeLinecap="round" opacity="0.9" />
      <circle cx="80" cy="82" r="58" fill={`url(#${lobsterId})`} />
      <circle cx="80" cy="82" r="58" fill={`url(#${shellHighlightId})`} opacity="0.42" />
      <path d="M33 85c-8-4-15-2-19 6-1 12 3 19 13 23 6 2 10 0 16-6 6-7 7-13 3-20-4-4-8-6-13-3Z" fill={accent} opacity="0.92" />
      <path d="M127 85c8-4 15-2 19 6 1 12-3 19-13 23-6 2-10 0-16-6-6-7-7-13-3-20 4-4 8-6 13-3Z" fill={accent} opacity="0.92" />
      <circle cx="61" cy="67" r="9" fill="#171d3a" />
      <circle cx="99" cy="67" r="9" fill="#171d3a" />
      <circle cx="63.5" cy="64.5" r="3.2" fill="#22d3ee" />
      <circle cx="101.5" cy="64.5" r="3.2" fill="#22d3ee" />
      <path d="M80 55c18 0 30 10 34 24 5 18-2 35-12 48-9 12-18 18-22 18s-13-6-22-18c-10-13-17-30-12-48 4-14 16-24 34-24Z" fill={`url(#${bellyId})`} />
      {renderRoleMark(roleLabel, accent)}
      <path d="M68 139v19M92 139v19" stroke={accent} strokeWidth="9" strokeLinecap="square" />
    </svg>
  );
}

export function LobsterCard({ agent, index = 0 }: { agent: Agent; index?: number }) {
  const dotColor = statusHex[agent.status] ?? '#6b7280';
  const SW = 110;
  const SH = 30;
  const sparkPath = generateSparkline(agent.id, SW, SH);
  const areaPath = `${sparkPath} L ${SW} ${SH} L 0 ${SH} Z`;
  const gradId = `sg-${agent.id.replace(/\W/g, '')}`;
  const workstationTheme = getWorkstationTheme(agent);
  const sceneGlow = getSceneGlow(agent);
  const lobsterGlyph = renderLobsterGlyph(workstationTheme.roleLabel, workstationTheme.accent, workstationTheme.accentSoft, 'h-[158px] w-[158px]');
  const sceneBackground = `linear-gradient(180deg, rgba(8,12,27,0.96) 0%, rgba(10,14,32,0.96) 42%, rgba(12,18,39,0.98) 100%), radial-gradient(circle at 50% 100%, ${workstationTheme.accentSoft} 0%, transparent 38%)`;
  const roomGlow =
    agent.status === 'online'
      ? 'radial-gradient(circle at 50% 82%, rgba(60,245,255,0.18), transparent 34%)'
      : agent.status === 'busy'
        ? 'radial-gradient(circle at 50% 82%, rgba(139,92,246,0.18), transparent 34%)'
        : 'radial-gradient(circle at 50% 82%, rgba(255,79,159,0.14), transparent 34%)';

  return (
    <Link href={`/agents/${agent.id}`} className="block group">
      <div
        className="glass-panel relative overflow-hidden rounded-[24px] hover:scale-[1.02]"
        style={{
          transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease',
          animation: `cardEntrance 0.5s ease both`,
          animationDelay: `${index * 0.07}s`,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow =
            'inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 50px rgba(2,6,23,0.32), 0 0 28px rgba(60,245,255,0.16), 0 0 42px rgba(255,79,159,0.08)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.24)';
          (e.currentTarget as HTMLElement).style.background =
            'linear-gradient(180deg, rgba(22,28,56,0.9) 0%, rgba(14,18,39,0.82) 100%)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '';
          (e.currentTarget as HTMLElement).style.borderColor = '';
          (e.currentTarget as HTMLElement).style.background = '';
        }}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
          <div className="flex min-w-0 items-center gap-2 pt-0.5">
            <span className="relative flex-shrink-0">
              <span className="block h-2 w-2 rounded-full" style={{ background: dotColor }} />
              {agent.status === 'online' && (
                <span className="absolute inset-0 rounded-full animate-ping opacity-50" style={{ background: dotColor }} />
              )}
            </span>
            <span className="truncate text-[13px] font-semibold tracking-wide text-zinc-100">{agent.name}</span>
          </div>

          <div
            className="flex-shrink-0 rounded-xl px-2.5 pt-1.5 pb-1"
            style={{
              background: 'linear-gradient(180deg, rgba(18,24,50,0.88) 0%, rgba(13,18,38,0.78) 100%)',
              border: '1px solid rgba(255,255,255,0.12)',
              minWidth: 128,
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
            }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-cyan-200/80">Tokens</span>
              <span className="text-[11px] font-bold font-mono tabular-nums text-pink-200">{formatTokens(agent.tokenUsage)}</span>
            </div>

            <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`} className="block w-full">
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#${gradId})`} />
              <path
                d={sparkPath}
                stroke="#3cf5ff"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                style={{
                  animation: `sparkDraw 1.6s ease-out forwards`,
                  animationDelay: `${index * 0.07 + 0.3}s`,
                }}
              />
            </svg>
          </div>
        </div>

        <div className="relative mx-3 mb-2 overflow-hidden rounded-2xl" style={{ height: 228, background: sceneBackground }}>
          <div className="mist-layer opacity-55" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `${roomGlow}, radial-gradient(ellipse 90% 70% at 50% 80%, rgba(139,92,246,0.22) 0%, transparent 65%)`,
            }}
          />

          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(60,245,255,0.4), rgba(255,79,159,0.28), transparent)',
              animation: `scanBeam 4s linear infinite`,
              animationDelay: `${index * 0.3}s`,
            }}
          />

          <div className="absolute left-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
            {ACT_BARS.map((bar, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: 'rgba(60,245,255,0.55)' }} />
                <div
                  className="h-[3px] rounded-full"
                  style={{
                    width: bar.w * 44,
                    background: 'rgba(60,245,255,0.28)',
                    transformOrigin: 'left center',
                    animation: `actBarPulse 2.2s ease-in-out infinite`,
                    animationDelay: `${bar.delay}s`,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 items-end gap-1.5">
            {EQ_BARS.map((bar, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full"
                style={{
                  height: bar.base,
                  background: bar.color,
                  opacity: 0.78,
                  transformOrigin: 'bottom',
                  animation: `eqBar ${bar.dur}s ease-in-out infinite`,
                  animationDelay: `${bar.delay}s`,
                }}
              />
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 top-4 [perspective:1400px]">
            <div
              className="absolute inset-0"
              style={{
                transformStyle: 'preserve-3d',
                animation: `workstationDrift 5.8s ease-in-out infinite`,
                animationDelay: `${index * 0.18}s`,
              }}
            >
              <div className="absolute inset-x-[8%] top-[28%] h-px bg-[linear-gradient(90deg,transparent,rgba(96,165,250,0.24),rgba(244,114,182,0.2),transparent)]" />
              <div className="absolute left-[8%] top-[36%] z-10 scale-[0.92] opacity-80">{workstationTheme.wallWidget}</div>
              <div className="absolute right-[12%] top-[16%] rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/48">
                {agent.botName || workstationTheme.roleLabel}
              </div>

              <div
                className="absolute left-1/2 top-[14%] h-[24%] w-[14%] -translate-x-1/2 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${workstationTheme.accentSoft} 0%, transparent 72%)`,
                  filter: 'blur(12px)',
                }}
              />
              <div className="absolute left-1/2 top-[14%] h-[24%] w-[3px] -translate-x-1/2 rounded-full bg-white/10" />
              <div className="absolute left-[46.8%] top-[14%] h-[4%] w-[6.6%] rounded-full bg-white/12" />

              <div
                className="absolute left-[12%] right-[12%] bottom-[8%] h-[42%] rounded-[54px] border border-white/6"
                style={{
                  background: `linear-gradient(180deg, ${workstationTheme.deskGlow} 0%, rgba(15,18,34,0.16) 100%)`,
                  transform: 'rotateX(74deg)',
                  transformOrigin: 'center bottom',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              />
              <div className="absolute inset-x-[18%] bottom-[14%] h-[18%] rounded-[999px] bg-[radial-gradient(ellipse,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_72%)]" />
              <div className="absolute inset-x-[24%] bottom-[13%] flex justify-between opacity-45">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className="h-[28px] w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent)]" />
                ))}
              </div>

              <div className="absolute left-[22%] bottom-[27%] h-[13%] w-[56%] rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(22,28,46,0.84))] shadow-[0_16px_38px_rgba(2,6,23,0.28)]" />
              <div className="absolute left-[25%] bottom-[16%] h-[27%] w-[4px] rounded-full bg-white/10" />
              <div className="absolute left-[72%] bottom-[16%] h-[27%] w-[4px] rounded-full bg-white/10" />
              <div className="absolute left-[22.5%] bottom-[14.5%] h-[3px] w-[10%] rounded-full bg-white/10" />
              <div className="absolute right-[19.5%] bottom-[14.5%] h-[3px] w-[10%] rounded-full bg-white/10" />

              <div className="absolute left-[24%] bottom-[38%] h-[24%] w-[18%] scale-[0.94] opacity-90">
                <div className="absolute inset-x-[8%] top-0 h-[14%] rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(20,25,45,0.32))]" style={{ transform: 'rotateX(68deg)' }} />
                <div className="absolute left-[14%] top-[10%] h-[50%] w-[72%] rounded-t-[16px] rounded-b-[10px] border border-white/8 bg-[linear-gradient(180deg,rgba(64,71,115,0.28),rgba(27,31,56,0.16))]" style={{ transform: 'skewY(-6deg)' }} />
                <div
                  className="absolute left-[30%] top-[34%] h-[20%] w-[40%] rounded-md border p-1.5 shadow-[0_0_18px_rgba(34,211,238,0.14)]"
                  style={{
                    borderColor: `${workstationTheme.accent}33`,
                    background: `linear-gradient(180deg, ${workstationTheme.accentSoft}, rgba(13,18,38,0.88))`,
                  }}
                >
                  <div className="h-full" style={{ animation: `screenFlicker 2.6s ease-in-out infinite` }}>
                    {workstationTheme.monitorContent}
                  </div>
                </div>
                <div className="absolute left-[48%] top-[58%] h-[10%] w-[6%] -translate-x-1/2 rounded-full bg-white/12" />
                <div className="absolute left-[37%] top-[66%] h-[5%] w-[28%] rounded-full bg-white/8" />
                <div className="absolute left-[35%] top-[73%] h-[9%] w-[31%] rounded-[999px] border border-cyan-300/8 bg-[linear-gradient(180deg,rgba(34,211,238,0.06),rgba(148,163,184,0.08))]" />
              </div>

              <div className="absolute right-[23%] bottom-[30%] h-[17%] w-[7.2%] rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,28,48,0.98),rgba(8,12,24,0.96))] shadow-[0_12px_28px_rgba(2,6,23,0.3)] opacity-95">
                <div className="absolute left-[22%] top-[10%] h-[8%] w-[56%] rounded-full bg-white/8" />
                <div className="absolute left-[24%] top-[24%] h-[5%] w-[34%] rounded-full bg-cyan-300/35" />
                <div className="absolute left-[24%] top-[34%] h-[5%] w-[46%] rounded-full bg-violet-300/28" />
                <div className="absolute left-[24%] top-[44%] h-[5%] w-[28%] rounded-full bg-pink-300/28" />
                <div className="absolute bottom-[14%] left-[50%] h-[10%] w-[22%] -translate-x-1/2 rounded-full bg-cyan-300/14 blur-[2px]" />
              </div>

              <div className="absolute left-1/2 bottom-[23%] h-[7%] w-[16%] -translate-x-1/2 rounded-[999px] border border-cyan-300/10 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(148,163,184,0.06))]" />
              <div className="absolute left-1/2 bottom-[22.2%] h-[2%] w-[3.2%] -translate-x-1/2 rounded-full bg-white/10" />
              <div className="absolute left-1/2 bottom-[23.7%] flex -translate-x-1/2 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="monitor-fade block h-[2px] w-[10px] rounded-full bg-cyan-200/30"
                    style={{ animationDelay: `${i * 0.08}s` }}
                  />
                ))}
              </div>
              <div className="absolute left-1/2 bottom-[22.4%] h-[8%] w-[20%] -translate-x-1/2 rounded-[999px] bg-[radial-gradient(ellipse,rgba(34,211,238,0.16)_0%,rgba(34,211,238,0)_75%)] keyboard-glow" />

              <div
                className="absolute left-1/2 top-[43%] z-20 -translate-x-1/2 -translate-y-1/2 lobster-float"
                style={{
                  filter: `drop-shadow(0 18px 34px ${sceneGlow})`,
                  animationDelay: `${index * 0.16}s`,
                }}
              >
                {lobsterGlyph}
              </div>

              <div
                className="absolute left-1/2 top-[56%] h-[28%] w-[30%] -translate-x-1/2 rounded-[40px]"
                style={{
                  background: `radial-gradient(ellipse, ${sceneGlow} 0%, transparent 70%)`,
                  animation: `lobsterGlow 2.8s ease-in-out infinite`,
                  animationDelay: `${index * 0.15}s`,
                }}
              />

              <div className="absolute bottom-[8%] left-[52%] z-[5] h-[10%] w-[54%] -translate-x-1/2 rounded-[999px] bg-[radial-gradient(ellipse,rgba(8,15,33,0.94)_0%,rgba(8,15,33,0.14)_58%,rgba(8,15,33,0)_85%)]" />
              <div className="absolute bottom-[10%] left-[60%] h-[3px] w-[4%] rounded-full bg-amber-400/45" />
              <div className="absolute bottom-[16%] left-[34%] h-[2px] w-[5%] rounded-full bg-cyan-300/40" />
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-2 pb-4">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
        </div>
      </div>
    </Link>
  );
}
