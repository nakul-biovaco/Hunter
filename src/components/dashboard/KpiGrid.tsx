import React, { useState } from 'react';
import {
  Wallet, Clock, Flame, Calendar,
  Target, Percent, CalendarRange,
  ArrowDownLeft, ArrowUpRight, Sparkles,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { formatINR, formatPercent, formatDate } from '../../lib/formatters';

export const KpiGrid: React.FC = () => {
  const { metrics, goal } = useHunter();
  const [showAll, setShowAll] = useState(false);

  const primaryKpis = [
    {
      id: 'balance',
      label: 'Balance',
      value: formatINR(metrics.currentBalance),
      sub: `${formatPercent(metrics.progressPercentage)} done`,
      icon: Wallet,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border border-emerald-100',
    },
    {
      id: 'remaining',
      label: 'Remaining',
      value: formatINR(metrics.remainingAmount),
      sub: `of ${formatINR(metrics.targetAmount)}`,
      icon: Clock,
      color: 'text-slate-900',
      bg: 'bg-slate-100 border border-slate-200',
    },
    {
      id: 'daily',
      label: 'Daily Goal',
      value: formatINR(metrics.dailyRequiredSavings),
      sub: 'per day',
      icon: Flame,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border border-emerald-100',
    },
    {
      id: 'days',
      label: 'Days Left',
      value: `${metrics.daysRemaining}`,
      sub: 'until 10 Jan 2027',
      icon: Calendar,
      color: 'text-slate-900',
      bg: 'bg-slate-100 border border-slate-200',
    },
  ];

  const extraKpis = [
    {
      id: 'target',
      label: 'Target Amount',
      value: formatINR(metrics.targetAmount),
      sub: goal.goal_type === 'down_payment' ? 'Down Payment' : 'Full Cash',
      icon: Target,
      color: 'text-slate-900',
      bg: 'bg-slate-100 border border-slate-200',
    },
    {
      id: 'pct',
      label: 'Completion',
      value: formatPercent(metrics.progressPercentage),
      sub: 'of goal achieved',
      icon: Percent,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border border-emerald-100',
    },
    {
      id: 'weekly',
      label: 'Weekly Goal',
      value: formatINR(metrics.weeklyRequiredSavings),
      sub: 'per 7 days',
      icon: CalendarRange,
      color: 'text-slate-900',
      bg: 'bg-slate-100 border border-slate-200',
    },
    {
      id: 'deposits',
      label: 'Total In',
      value: formatINR(metrics.totalDeposits),
      sub: 'all deposits',
      icon: ArrowDownLeft,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border border-emerald-100',
    },
    {
      id: 'withdrawals',
      label: 'Total Out',
      value: formatINR(metrics.totalWithdrawals),
      sub: 'all deductions',
      icon: ArrowUpRight,
      color: metrics.totalWithdrawals > 0 ? 'text-rose-600' : 'text-slate-400',
      bg: metrics.totalWithdrawals > 0 ? 'bg-rose-50 border border-rose-100' : 'bg-slate-100 border border-slate-200',
    },
    {
      id: 'projected',
      label: 'Projected Date',
      value:
        metrics.projectedCompletionDate === 'Achieved'
          ? 'Achieved!'
          : metrics.projectedCompletionDate === 'Pending Activity'
          ? 'On Track'
          : formatDate(metrics.projectedCompletionDate || goal.target_date, 'short'),
      sub: metrics.isPaceAhead ? '🏁 Ahead of schedule' : 'Steady pace',
      icon: Sparkles,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border border-emerald-100',
    },
  ];

  const displayed = showAll ? [...primaryKpis, ...extraKpis] : primaryKpis;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        {displayed.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                </div>
                <span className="text-[11px] font-semibold text-slate-500">{kpi.label}</span>
              </div>
              <p className={`text-lg font-black font-mono leading-none ${kpi.color}`}>{kpi.value}</p>
              <p className="text-[10px] text-slate-500 mt-1.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setShowAll(!showAll)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors active:scale-[0.98] tap-highlight shadow-sm"
      >
        {showAll ? 'Show Fewer Metrics' : 'Show All 10 Metrics'}
        {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
