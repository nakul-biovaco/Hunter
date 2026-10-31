import React from 'react';
import { Plus, TrendingUp, CheckCircle, Bell, BellRing, Clock } from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { formatINR, getTodayString } from '../../lib/formatters';

export const TodayCard: React.FC = () => {
  const { metrics, setIsQuickAddOpen, addTransaction, hourlyRemindersEnabled, notificationsEnabled } = useHunter();
  const todayStr = getTodayString();

  const neededToday = Math.max(0, metrics.todayPlannedSavings - metrics.todayActualSavings);
  const isTargetAchievedToday = metrics.todayActualSavings >= metrics.todayPlannedSavings && metrics.todayPlannedSavings > 0;
  const hasSavedAnyToday = metrics.todayActualSavings > 0;
  const isSurplus = metrics.dailySurplusDeficit >= 0;

  const quickPills = [100, 200, 500, 1000];

  const handleQuickAdd = async (amt: number) => {
    try {
      await addTransaction({
        amount: amt,
        transaction_type: 'deposit',
        category: 'Daily Savings',
        transaction_date: todayStr,
        note: 'Quick daily deposit',
      });
    } catch {
      // safe fallback
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900">Today's Target</p>
            {isTargetAchievedToday ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle className="w-3 h-3 text-emerald-700" />
                Target Met!
              </span>
            ) : hasSavedAnyToday ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <Clock className="w-3 h-3 text-amber-700" />
                Partial
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Pending
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Calculated daily goal</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 mb-0.5">Need Today</p>
          <p className="text-xl font-black font-mono text-slate-900">{formatINR(metrics.todayPlannedSavings)}</p>
        </div>
      </div>

      {/* Today's saved status */}
      {hasSavedAnyToday && (
        <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl mb-4 ${
          isSurplus ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-4 h-4 ${isSurplus ? 'text-emerald-700' : 'text-amber-700'}`} />
            <span className="text-xs font-semibold text-slate-900">Saved Today: {formatINR(metrics.todayActualSavings)}</span>
          </div>
          <span className={`text-xs font-bold font-mono ${isSurplus ? 'text-emerald-700' : 'text-amber-700'}`}>
            {metrics.dailySurplusDeficit >= 0 ? '+' : ''}{formatINR(metrics.dailySurplusDeficit)}
          </span>
        </div>
      )}

      {/* Hourly Reminder Active Banner */}
      {notificationsEnabled && hourlyRemindersEnabled && (
        <div className={`mb-4 px-3 py-2 rounded-2xl flex items-center justify-between text-xs ${
          isTargetAchievedToday
            ? 'bg-emerald-50/80 border border-emerald-200/80 text-emerald-800'
            : 'bg-amber-50/80 border border-amber-200/80 text-amber-800'
        }`}>
          <div className="flex items-center gap-2">
            {isTargetAchievedToday ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            ) : (
              <BellRing className="w-3.5 h-3.5 text-amber-600 animate-pulse flex-shrink-0" />
            )}
            <span className="text-[11px] font-medium">
              {isTargetAchievedToday
                ? 'Target achieved — Hourly reminder paused!'
                : `Hourly reminder: ₹${neededToday.toLocaleString('en-IN')} pending`}
            </span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/70">
            {isTargetAchievedToday ? 'Paused' : '1h Loop'}
          </span>
        </div>
      )}

      {/* Quick Pills */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Quick Deposit</p>
          {neededToday > 0 && !hasSavedAnyToday && (
            <button
              onClick={() => handleQuickAdd(metrics.todayPlannedSavings)}
              className="text-[10px] font-bold text-emerald-700 hover:underline"
            >
              Deposit Full Today ({formatINR(metrics.todayPlannedSavings)})
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {quickPills.map((val) => (
            <button
              key={val}
              onClick={() => handleQuickAdd(val)}
              className="py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold font-mono text-slate-800 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all pill-active shadow-sm"
            >
              +{val >= 1000 ? `₹${val/1000}K` : `₹${val}`}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm active:scale-[0.98] transition-all pill-active shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Add Custom Amount
        </button>
      </div>
    </div>
  );
};
