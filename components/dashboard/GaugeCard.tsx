'use client';

interface GaugeCardProps {
  title: string;
  value: number;
  maxValue: number;
  unit?: string;
  color?: 'amber' | 'emerald' | 'blue' | 'red';
  icon?: React.ReactNode;
}

export function GaugeCard({
  title,
  value,
  maxValue,
  unit = '',
  color = 'amber',
  icon,
}: GaugeCardProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const strokeDasharray = 283;
  const strokeDashoffset = strokeDasharray - (percentage / 100) * strokeDasharray;

  const colorClasses = {
    amber: {
      stroke: '#d97706',
      glow: 'drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]',
      text: 'text-amber-500',
    },
    emerald: {
      stroke: '#10b981',
      glow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]',
      text: 'text-emerald-500',
    },
    blue: {
      stroke: '#3b82f6',
      glow: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]',
      text: 'text-blue-500',
    },
    red: {
      stroke: '#ef4444',
      glow: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]',
      text: 'text-red-500',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="relative bg-bg-card border border-zinc-800 rounded p-4 corner-screw">
      <div className="flex items-center justify-between mb-3">
        <span className="uppercase-title text-text-muted">{title}</span>
        {icon && <span className="text-zinc-500">{icon}</span>}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#1e293b"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={colors.stroke}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className={`transition-all duration-1000 ${colors.glow}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-mono text-lg font-bold ${colors.text}`}>
              {Math.round(percentage)}
            </span>
          </div>
        </div>

        <div className="flex flex-col">
          <span className={`font-mono text-2xl font-bold ${colors.text}`}>
            {value.toLocaleString()}
            <span className="text-sm text-zinc-500 ml-1">{unit}</span>
          </span>
          <span className="text-xs text-zinc-500 mt-1">
            of {maxValue.toLocaleString()} {unit}
          </span>
        </div>
      </div>
    </div>
  );
}
