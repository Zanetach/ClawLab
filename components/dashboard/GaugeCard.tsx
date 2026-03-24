'use client';

import React from 'react';

interface GaugeCardProps {
  title: string;
  value: number;
  maxValue: number;
  unit?: string;
  color?: 'amber' | 'emerald' | 'blue' | 'red';
  icon?: React.ReactNode;
  delta?: string;
}

export function GaugeCard({
  title,
  value,
  maxValue,
  unit = '',
  color = 'amber',
  icon,
  delta,
}: GaugeCardProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const strokeDasharray = 283;
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;

  const colorClasses = {
    amber: {
      stroke: '#ff4f9f',
      glow: 'drop-shadow-[0_0_10px_rgba(255,79,159,0.42)]',
      text: 'text-pink-300',
      soft: 'from-violet-500/20 to-pink-500/16',
    },
    emerald: {
      stroke: '#3cf5ff',
      glow: 'drop-shadow-[0_0_10px_rgba(60,245,255,0.42)]',
      text: 'text-cyan-300',
      soft: 'from-violet-500/14 to-slate-700/20',
    },
    blue: {
      stroke: '#8b5cf6',
      glow: 'drop-shadow-[0_0_10px_rgba(139,92,246,0.42)]',
      text: 'text-violet-300',
      soft: 'from-slate-700/20 to-violet-500/16',
    },
    red: {
      stroke: '#fb7185',
      glow: 'drop-shadow-[0_0_10px_rgba(251,113,133,0.34)]',
      text: 'text-rose-200',
      soft: 'from-violet-500/18 to-pink-500/18',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`glass-panel relative overflow-hidden rounded-[18px] bg-gradient-to-br ${colors.soft} p-5`}>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/6 text-white/45">
          {icon}
        </div>
        {delta && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${value >= 0 ? 'bg-emerald-400/14 text-emerald-300' : 'bg-rose-400/14 text-rose-300'}`}>
            {delta}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-white/48">{title}</span>
          <span className="mt-2 text-[38px] font-semibold leading-none text-white">
            {value.toLocaleString()}
            {unit && <span className="ml-1 text-[24px] text-white/80">{unit}</span>}
          </span>
        </div>
        <div className="relative h-14 w-14 opacity-18">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={colors.stroke}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className={colors.glow}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
