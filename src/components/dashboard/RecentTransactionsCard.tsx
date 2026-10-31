import React from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Plus } from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { formatINR, formatDate } from '../../lib/formatters';

export const RecentTransactionsCard: React.FC = () => {
  const { transactions, setActivePage, setIsQuickAddOpen } = useHunter();

  const recent = transactions.slice(0, 5);

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
        <button
          onClick={() => setActivePage('transactions')}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 tap-highlight"
        >
          See All <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {recent.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-500 mb-3">No transactions yet</p>
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            Add First Deposit
          </button>
        </div>
      ) : (
        <div className="space-y-0.5">
          {recent.map((tx, i) => {
            const isDeposit = tx.transaction_type === 'deposit';
            return (
              <div
                key={tx.id}
                className={`flex items-center gap-3 py-3 ${i < recent.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isDeposit
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-rose-50 text-rose-600 border border-rose-100'
                }`}>
                  {isDeposit ? (
                    <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{tx.category}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {formatDate(tx.transaction_date, 'short')}
                    {tx.note ? ` · ${tx.note}` : ''}
                  </p>
                </div>

                {/* Amount */}
                <span className={`font-mono font-bold text-sm shrink-0 ${isDeposit ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {isDeposit ? '+' : '-'}{formatINR(tx.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {transactions.length} total entries
          </span>
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-100 tap-highlight"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            Add
          </button>
        </div>
      )}
    </div>
  );
};
