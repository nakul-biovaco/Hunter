import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  ArrowUpDown,
  Download,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { Transaction, TransactionType } from '../../types';
import { formatINR, formatDate } from '../../lib/formatters';
import { Button } from '../common/Button';
import { TransactionFormModal } from './TransactionFormModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export const TransactionsView: React.FC = () => {
  const {
    transactions,
    deleteTransaction,
    exportTransactionsCSV,
    metrics,
  } = useHunter();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchNote = t.note?.toLowerCase().includes(q);
          const matchCategory = t.category.toLowerCase().includes(q);
          const matchAmount = String(t.amount).includes(q);
          if (!matchNote && !matchCategory && !matchAmount) return false;
        }

        if (filterType !== 'all' && t.transaction_type !== filterType) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.transaction_date).getTime();
        const timeB = new Date(b.transaction_date).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [transactions, searchQuery, filterType, sortOrder]);

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  };

  const handleDeletePrompt = (tx: Transaction) => {
    setDeletingTransaction(tx);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTransaction) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(deletingTransaction.id);
      setDeletingTransaction(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">History & Ledger</h2>
          <p className="text-xs text-slate-500">Every deposit & bike expenditure recorded</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportTransactionsCSV}
            title="Export CSV"
            className="w-9 h-9 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-95 transition-all tap-highlight shadow-sm"
          >
            <Download className="w-4 h-4" />
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingTransaction(null);
              setIsFormOpen(true);
            }}
            icon={<Plus className="w-4 h-4 stroke-[3]" />}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Summary Ribbon */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 text-center shadow-card">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Balance</p>
          <p className="text-sm font-black font-mono text-emerald-700 mt-0.5">{formatINR(metrics.currentBalance)}</p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 text-center shadow-card">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Deposits</p>
          <p className="text-sm font-black font-mono text-slate-900 mt-0.5">{formatINR(metrics.totalDeposits)}</p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 text-center shadow-card">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Withdrawals</p>
          <p className={`text-sm font-black font-mono mt-0.5 ${metrics.totalWithdrawals > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {formatINR(metrics.totalWithdrawals)}
          </p>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, category, amount..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 transition-all shadow-sm"
          />
        </div>

        {/* Filter type pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all tap-highlight ${
              filterType === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({transactions.length})
          </button>
          <button
            onClick={() => setFilterType('deposit')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all tap-highlight ${
              filterType === 'deposit'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            Deposits (+)
          </button>
          <button
            onClick={() => setFilterType('withdrawal')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all tap-highlight ${
              filterType === 'withdrawal'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            Expenses (-)
          </button>

          <button
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 shrink-0 tap-highlight shadow-sm"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>{sortOrder === 'newest' ? 'New' : 'Old'}</span>
          </button>
        </div>
      </div>

      {/* Transaction Feed */}
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center text-slate-400 text-xs shadow-card">
            No transactions found.
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isDeposit = tx.transaction_type === 'deposit';
            return (
              <div
                key={tx.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3 transition-all active:scale-[0.99] tap-highlight shadow-card"
              >
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    isDeposit
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-rose-50 text-rose-600 border border-rose-100'
                  }`}
                >
                  {isDeposit ? (
                    <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {tx.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>{formatDate(tx.transaction_date, 'short')}</span>
                    {tx.note && (
                      <>
                        <span>•</span>
                        <span className="truncate text-slate-600">{tx.note}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`font-mono font-black text-sm ${
                      isDeposit ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {isDeposit ? '+' : '-'}
                    {formatINR(tx.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(tx)}
                      className="p-1 text-slate-400 hover:text-slate-800 rounded tap-highlight"
                      title="Edit"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeletePrompt(tx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded tap-highlight"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <TransactionFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTransaction(null);
        }}
        editTransactionData={editingTransaction}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deletingTransaction)}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={handleConfirmDelete}
        transaction={deletingTransaction}
        isDeleting={isDeleting}
      />
    </div>
  );
};
