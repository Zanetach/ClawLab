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
  online:  '#10b981',
  offline: '#6b7280',
  warning: '#d97706',
  error:   '#ef4444',
  busy:    '#3b82f6',
};

// Equalizer bar config: base height, peak height, duration, delay
const EQ_BARS = [
  { base: 38, dur: 1.1, delay: 0.0,  color: '#10b981' },
  { base: 22, dur: 0.8, delay: 0.25, color: '#d97706' },
  { base: 30, dur: 1.4, delay: 0.5,  color: '#06b6d4' },
];

// Activity bar config: width fraction, animation delay
const ACT_BARS = [
  { w: 0.78, delay: 0.0  },
  { w: 0.48, delay: 0.4  },
  { w: 0.62, delay: 0.2  },
];

export function LobsterCard({ agent, index = 0 }: { agent: Agent; index?: number }) {
  const dotColor = statusHex[agent.status] ?? '#6b7280';
  const SW = 110;
  const SH = 30;
  const sparkPath = generateSparkline(agent.id, SW, SH);
  const areaPath = `${sparkPath} L ${SW} ${SH} L 0 ${SH} Z`;
  const gradId = `sg-${agent.id.replace(/\W/g, '')}`;

  return (
    <Link href={`/agents/${agent.id}`} className="block group">
      <div
        className="relative rounded-[20px] overflow-hidden hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(160deg, #0d1018 0%, #090c12 60%, #0b0d15 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
          animation: `cardEntrance 0.5s ease both`,
          animationDelay: `${index * 0.07}s`,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 48px rgba(0,0,0,0.7)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = '';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
        }}
      >
        {/* ── Top row: name + token chart ── */}
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">

          {/* Status dot + name */}
          <div className="flex items-center gap-2 min-w-0 pt-0.5">
            <span className="relative flex-shrink-0">
              <span className="block w-2 h-2 rounded-full" style={{ background: dotColor }} />
              {agent.status === 'online' && (
                <span
                  className="absolute inset-0 rounded-full animate-ping opacity-50"
                  style={{ background: dotColor }}
                />
              )}
            </span>
            <span className="text-[13px] font-semibold text-zinc-200 truncate tracking-wide">
              {agent.name}
            </span>
          </div>

          {/* Token chart panel */}
          <div
            className="flex-shrink-0 rounded-xl px-2.5 pt-1.5 pb-1"
            style={{
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(6,182,212,0.18)',
              minWidth: 128,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-cyan-700">
                Tokens
              </span>
              <span className="text-[11px] font-bold font-mono tabular-nums text-yellow-400">
                {formatTokens(agent.tokenUsage)}
              </span>
            </div>

            {/* Sparkline — draws on mount */}
            <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`} className="block w-full">
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#${gradId})`} />
              <path
                d={sparkPath}
                stroke="#06b6d4"
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

        {/* ── Workstation scene ── */}
        <div
          className="relative mx-3 mb-2 rounded-2xl overflow-hidden"
          style={{ height: 196, background: '#070911' }}
        >
          {/* Ambient radial bg */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 90% 70% at 50% 80%, rgba(25,8,4,0.9) 0%, transparent 65%)',
            }}
          />

          {/* Scan beam — moves top→bottom on loop */}
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.35), transparent)',
              animation: `scanBeam 4s linear infinite`,
              animationDelay: `${index * 0.3}s`,
            }}
          />

          {/* Left: activity bars (animated width pulse) */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
            {ACT_BARS.map((bar, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(6,182,212,0.55)' }}
                />
                <div
                  className="h-[3px] rounded-full"
                  style={{
                    width: bar.w * 44,
                    background: 'rgba(6,182,212,0.32)',
                    transformOrigin: 'left center',
                    animation: `actBarPulse 2.2s ease-in-out infinite`,
                    animationDelay: `${bar.delay}s`,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Right: equalizer bars */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex gap-1.5 items-end">
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

          {/* Desk / shelf */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-xl"
            style={{
              width: '58%',
              height: 46,
              background: 'linear-gradient(180deg, #161b27 0%, #0c1018 100%)',
              borderTop: '1px solid rgba(255,255,255,0.055)',
            }}
          />

          {/* Red glow — pulses */}
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: 26,
              left: '50%',
              width: 130,
              height: 44,
              background: 'radial-gradient(ellipse, rgba(220,38,38,0.6) 0%, transparent 70%)',
              animation: `lobsterGlow 2.8s ease-in-out infinite`,
              animationDelay: `${index * 0.15}s`,
            }}
          />

          {/* Lobster — floating */}
          <div
            className="absolute z-10 select-none leading-none"
            style={{
              bottom: 20,
              left: '50%',
              fontSize: 66,
              filter: 'drop-shadow(0 4px 18px rgba(200,30,10,0.75))',
              animation: `lobsterFloat 3.2s ease-in-out infinite`,
              animationDelay: `${index * 0.2}s`,
            }}
          >
            🦞
          </div>

          {/* Mini monitor */}
          <div
            className="absolute z-[5] rounded-lg"
            style={{
              bottom: 52,
              left: '22%',
              transform: 'translateX(-50%)',
              width: 54,
              height: 36,
              background: '#0a0d16',
              border: '1px solid rgba(6,182,212,0.2)',
              padding: '7px 8px',
            }}
          >
            {[0.72, 0.44].map((w, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  height: 2,
                  width: `${w * 100}%`,
                  background: 'rgba(6,182,212,0.38)',
                  marginBottom: i === 0 ? 5 : 0,
                  transformOrigin: 'left center',
                  animation: `actBarPulse 3s ease-in-out infinite`,
                  animationDelay: `${i * 0.6}s`,
                }}
              />
            ))}
          </div>

          {/* Decorative dots */}
          <div className="absolute" style={{ bottom: 68, left: '38%' }}>
            <span className="block w-2 h-2 rounded-full" style={{ background: '#ef4444', opacity: 0.6 }} />
          </div>
          <div className="absolute" style={{ bottom: 72, left: '55%' }}>
            <span className="block w-1.5 h-1.5 rounded-full" style={{ background: '#d97706', opacity: 0.55 }} />
          </div>
        </div>

        {/* ── Bottom dots ── */}
        <div className="flex justify-center gap-2 pb-4">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
        </div>
      </div>
    </Link>
  );
}
