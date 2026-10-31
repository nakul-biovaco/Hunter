import React from 'react';
import { Bike, Calendar } from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { formatINR, formatPercent } from '../../lib/formatters';

export const HeroProgressBar: React.FC = () => {
  const { metrics, goal, milestones } = useHunter();

  const pct = Math.min(100, Math.max(0, metrics.progressPercentage));
  const nextMilestone = milestones.find((m) => !m.isAchieved);
  const isGoalAchieved = metrics.targetAchieved;

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-card">
      {/* Top Banner */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Bike className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">{goal.bike_model}</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{goal.bike_variant} · {goal.bike_colour}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
            <Calendar className="w-3 h-3 text-emerald-700" />
            <span className="text-[10px] font-semibold text-slate-700">{metrics.daysRemaining}d left</span>
          </div>
        </div>

        {/* Main Balance Display */}
        <div className="mb-1">
          <p className="text-xs text-slate-500 font-medium mb-1">Total Saved</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[38px] font-black text-slate-900 tracking-tight leading-none font-mono">
              ₹{(metrics.currentBalance).toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            of <span className="text-slate-800 font-semibold">{formatINR(metrics.targetAmount)}</span> target
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 mb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Progress</span>
            <span className="text-sm font-black text-emerald-700 font-mono">{formatPercent(pct)}</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${isGoalAchieved ? 'bg-emerald-600' : 'progress-shimmer'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {nextMilestone && (
            <div className="mt-2 flex justify-between items-center">
              <span className="text-[10px] text-slate-500">
                Next: <span className="text-emerald-700 font-bold">{formatINR(nextMilestone.amount)}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {formatINR(nextMilestone.remainingToMilestone)} more
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-3 border-t border-slate-100 divide-x divide-slate-100 bg-slate-50/60">
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Remaining</p>
          <p className="text-sm font-bold text-slate-900 font-mono">{formatINR(metrics.remainingAmount)}</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Daily Goal</p>
          <p className="text-sm font-bold text-emerald-700 font-mono">{formatINR(metrics.dailyRequiredSavings)}</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Weekly</p>
          <p className="text-sm font-bold text-slate-900 font-mono">{formatINR(metrics.weeklyRequiredSavings)}</p>
        </div>
      </div>
    </div>
  );
};
