import React from 'react';
import { Plus, TrendingUp, CheckCircle } from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { formatINR, getTodayString } from '../../lib/formatters';

export const TodayCard: React.FC = () => {
  const { metrics, setIsQuickAddOpen, addTransaction } = useHunter();
  const todayStr = getTodayString();

  const hasSavedToday = metrics.todayActualSavings > 0;
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
            {hasSavedToday && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle className="w-3 h-3 text-emerald-700" />
                Saved!
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Daily contribution goal</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 mb-0.5">Need Today</p>
          <p className="text-xl font-black font-mono text-slate-900">{formatINR(metrics.todayPlannedSavings)}</p>
        </div>
      </div>

      {/* Today's saved status */}
      {hasSavedToday && (
        <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl mb-4 ${
          isSurplus ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-4 h-4 ${isSurplus ? 'text-emerald-700' : 'text-amber-700'}`} />
            <span className="text-xs font-semibold text-slate-900">Saved: {formatINR(metrics.todayActualSavings)}</span>
          </div>
          <span className={`text-xs font-bold font-mono ${isSurplus ? 'text-emerald-700' : 'text-amber-700'}`}>
            {metrics.dailySurplusDeficit >= 0 ? '+' : ''}{formatINR(metrics.dailySurplusDeficit)}
          </span>
        </div>
      )}

      {/* Quick Pills */}
      <div>
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-2.5">Quick Deposit</p>
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
