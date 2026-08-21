import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { RiskLevel } from '../../types';

interface RiskMeterProps {
  score: number; // 0 - 100
  level: RiskLevel;
  confidence: number; // 0 - 100%
  size?: 'sm' | 'md' | 'lg';
}

export const RiskMeter: React.FC<RiskMeterProps> = ({
  score,
  level,
  confidence,
}) => {
  const getColors = () => {
    if (level === 'High') {
      return {
        bg: 'bg-rose-950/40',
        border: 'border-rose-900/50',
        text: 'text-rose-400',
        meter: 'bg-rose-500',
        icon: <ShieldAlert className="w-6 h-6 text-rose-400" />
      };
    } else if (level === 'Medium') {
      return {
        bg: 'bg-amber-950/40',
        border: 'border-amber-900/50',
        text: 'text-amber-400',
        meter: 'bg-amber-500',
        icon: <AlertTriangle className="w-6 h-6 text-amber-400" />
      };
    } else {
      return {
        bg: 'bg-emerald-950/40',
        border: 'border-emerald-900/50',
        text: 'text-emerald-400',
        meter: 'bg-emerald-500',
        icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />
      };
    }
  };

  const colors = getColors();

  return (
    <div className={`rounded-xl border p-5 ${colors.bg} ${colors.border} flex flex-col md:flex-row items-center justify-between gap-6`}>
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-surface border border-surface-border shrink-0">
          {colors.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Risk Score</span>
            <span className="text-xs text-slate-500">• Confidence {confidence}%</span>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl font-extrabold tracking-tight text-white">{score}</span>
            <span className="text-xs text-slate-400">/ 100</span>
            <span className={`ml-2 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${colors.text} ${colors.border}`}>
              {level} Risk
            </span>
          </div>
        </div>
      </div>

      <div className="w-full md:w-48 flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Safety Gauge</span>
          <span>{100 - score}% Clean</span>
        </div>
        <div className="w-full h-2.5 bg-surface-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${colors.meter}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
};
