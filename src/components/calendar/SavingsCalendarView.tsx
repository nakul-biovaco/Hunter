import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { formatINR, formatDate, getTodayString } from '../../lib/formatters';
import { Button } from '../common/Button';
import { DaySavingsSummary, Transaction } from '../../types';
import { TransactionFormModal } from '../transactions/TransactionFormModal';

export const SavingsCalendarView: React.FC = () => {
  const { transactions, metrics } = useHunter();
  const todayStr = getTodayString();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<DaySavingsSummary | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const jumpToToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  // Map transactions by date
  const dailyTransactionsMap = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    transactions.forEach((tx) => {
      const list = map.get(tx.transaction_date) || [];
      list.push(tx);
      map.set(tx.transaction_date, list);
    });
    return map;
  }, [transactions]);

  // Calendar cells
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (DaySavingsSummary | null)[] = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    const dailyTarget = metrics.dailyRequiredSavings || 450;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTx = dailyTransactionsMap.get(dateStr) || [];

      let deposits = 0;
      let withdrawals = 0;
      dayTx.forEach((tx) => {
        if (tx.transaction_type === 'deposit') deposits += Number(tx.amount);
        if (tx.transaction_type === 'withdrawal') withdrawals += Number(tx.amount);
      });

      const netSavings = deposits - withdrawals;

      let status: DaySavingsSummary['status'] = 'zero';

      if (dateStr > todayStr) {
        status = 'future';
      } else if (netSavings >= dailyTarget) {
        status = 'achieved';
      } else if (netSavings > 0) {
        status = 'partial';
      } else {
        status = 'deficit';
      }

      days.push({
        date: dateStr,
        plannedAmount: dailyTarget,
        deposits,
        withdrawals,
        netSavings,
        status,
        transactions: dayTx,
      });
    }

    return days;
  }, [year, month, dailyTransactionsMap, metrics.dailyRequiredSavings, todayStr]);

  const weekDayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Savings Calendar</h2>
          <p className="text-xs text-slate-500">Track your daily savings consistency</p>
        </div>
        <button
          onClick={jumpToToday}
          className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 tap-highlight shadow-sm"
        >
          Today
        </button>
      </div>

      {/* Month Navigator Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">{monthName}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-95 transition-all tap-highlight"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-95 transition-all tap-highlight"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-4 px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> Target Done
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Partial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Missed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-300" /> Upcoming
          </span>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekDayLabels.map((w, idx) => (
            <span key={idx} className="text-[11px] font-bold text-slate-400">
              {w}
            </span>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((dayItem, idx) => {
            if (!dayItem) {
              return <div key={`empty-${idx}`} className="h-12" />;
            }

            const isToday = dayItem.date === todayStr;
            const dayNum = parseInt(dayItem.date.split('-')[2], 10);

            let bgClass = 'bg-slate-50 border-slate-200/80 text-slate-700';
            let dotColor = 'bg-transparent';

            if (dayItem.status === 'achieved') {
              bgClass = 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold';
              dotColor = 'bg-emerald-600';
            } else if (dayItem.status === 'partial') {
              bgClass = 'bg-amber-50 border-amber-300 text-amber-950 font-bold';
              dotColor = 'bg-amber-500';
            } else if (dayItem.status === 'deficit') {
              bgClass = 'bg-rose-50/80 border-rose-200 text-rose-800';
              dotColor = 'bg-rose-500';
            } else if (dayItem.status === 'future') {
              bgClass = 'bg-slate-50/40 border-slate-100 text-slate-400';
              dotColor = 'bg-transparent';
            }

            return (
              <button
                key={dayItem.date}
                onClick={() => setSelectedDay(dayItem)}
                className={`h-12 rounded-2xl border flex flex-col items-center justify-center relative transition-transform active:scale-90 tap-highlight ${bgClass} ${
                  isToday ? 'ring-2 ring-emerald-600 ring-offset-1' : ''
                }`}
              >
                <span className={`text-xs font-bold font-mono ${isToday ? 'text-emerald-700' : ''}`}>
                  {dayNum}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full mt-1 ${dotColor}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Bottom Sheet */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSelectedDay(null)}
          />

          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-sheet p-5 z-10 space-y-4 animate-slide-up pb-safe">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>{formatDate(selectedDay.date, 'long')}</span>
                  {selectedDay.date === todayStr && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Today
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily summary & ledger
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Daily Target</p>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  {formatINR(selectedDay.plannedAmount)}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Net Saved</p>
                <p
                  className={`font-mono font-black text-sm mt-0.5 ${
                    selectedDay.netSavings >= selectedDay.plannedAmount
                      ? 'text-emerald-700'
                      : selectedDay.netSavings > 0
                      ? 'text-amber-700'
                      : 'text-rose-600'
                  }`}
                >
                  {selectedDay.netSavings >= 0 ? '+' : ''}
                  {formatINR(selectedDay.netSavings)}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Deposits</p>
                <p className="font-mono font-bold text-emerald-700 text-sm mt-0.5">
                  +{formatINR(selectedDay.deposits)}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Withdrawals</p>
                <p className="font-mono font-bold text-rose-600 text-sm mt-0.5">
                  -{formatINR(selectedDay.withdrawals)}
                </p>
              </div>
            </div>

            {/* Transactions on this date */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Transactions ({selectedDay.transactions.length})
              </p>
              {selectedDay.transactions.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500">
                  No deposits recorded on this date.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedDay.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.transaction_type === 'deposit'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-600'
                          }`}
                        >
                          {tx.transaction_type === 'deposit' ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{tx.category}</div>
                          {tx.note && <div className="text-[10px] text-slate-500">{tx.note}</div>}
                        </div>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs ${
                          tx.transaction_type === 'deposit' ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {tx.transaction_type === 'deposit' ? '+' : '-'}
                        {formatINR(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <Button variant="secondary" size="md" onClick={() => setSelectedDay(null)} className="flex-1">
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setIsAddOpen(true);
                  setSelectedDay(null);
                }}
                icon={<Plus className="w-4 h-4 stroke-[3]" />}
                className="flex-1"
              >
                Log for Date
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Form Modal */}
      <TransactionFormModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
};
