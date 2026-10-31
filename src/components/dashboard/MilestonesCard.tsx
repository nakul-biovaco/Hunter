import React from 'react';
import { Trophy, Check, Lock } from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { formatINR } from '../../lib/formatters';

export const MilestonesCard: React.FC = () => {
  const { milestones } = useHunter();

  const achievedCount = milestones.filter((m) => m.isAchieved).length;

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Milestones</h3>
            <p className="text-[10px] text-slate-500">{achievedCount} of {milestones.length} reached</p>
          </div>
        </div>
        <span className="text-xs font-black text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
          {achievedCount}/{milestones.length}
        </span>
      </div>

      {/* Milestone List */}
      <div className="space-y-2">
        {milestones.map((m, idx) => {
          const isNext = !m.isAchieved && (idx === 0 || milestones[idx - 1].isAchieved);
          const isLocked = !m.isAchieved && !isNext;

          return (
            <div
              key={m.amount}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                m.isAchieved
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : isNext
                  ? 'bg-slate-50 border-slate-300 shadow-sm'
                  : 'bg-slate-50/40 border-slate-100 opacity-50'
              }`}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                m.isAchieved
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isNext
                  ? 'bg-white border border-emerald-300 text-emerald-700 shadow-sm'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {m.isAchieved ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : isLocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-[10px] font-black">{idx + 1}</span>
                )}
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold font-mono ${m.isAchieved ? 'text-emerald-800' : isNext ? 'text-slate-900' : 'text-slate-400'}`}>
                    {formatINR(m.amount)}
                  </span>
                  {isNext && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full border border-emerald-200">
                      Next
                    </span>
                  )}
                </div>
                {isNext && (
                  <div className="mt-1.5 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300 progress-shimmer"
                      style={{ width: `${m.progressPercent}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Right */}
              <div className="text-right shrink-0">
                {m.isAchieved ? (
                  <span className="text-[10px] font-bold text-emerald-700">Done ✓</span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500">{formatINR(m.remainingToMilestone)} left</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
