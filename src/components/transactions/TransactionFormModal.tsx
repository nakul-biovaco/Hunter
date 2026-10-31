import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, Tag, CheckCircle2 } from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { Transaction, TransactionType, TransactionCategory } from '../../types';
import { DEPOSIT_CATEGORIES, WITHDRAWAL_CATEGORIES } from '../../lib/constants';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { getTodayString, formatINR } from '../../lib/formatters';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTransactionData?: Transaction | null;
}

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  editTransactionData,
}) => {
  const { addTransaction, editTransaction } = useHunter();

  const [type, setType] = useState<TransactionType>('deposit');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<TransactionCategory>('Daily Savings');
  const [date, setDate] = useState<string>(getTodayString());
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const isEditing = Boolean(editTransactionData);

  useEffect(() => {
    if (editTransactionData) {
      setType(editTransactionData.transaction_type);
      setAmount(String(editTransactionData.amount));
      setCategory(editTransactionData.category);
      setDate(editTransactionData.transaction_date);
      setNote(editTransactionData.note || '');
    } else {
      setType('deposit');
      setAmount('');
      setCategory('Daily Savings');
      setDate(getTodayString());
      setNote('');
    }
    setError('');
    setSuccessMessage('');
  }, [editTransactionData, isOpen]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'deposit') {
      setCategory('Daily Savings');
    } else {
      setCategory('Bike Booking');
    }
  };

  const handleQuickAmount = (val: number) => {
    const current = Number(amount) || 0;
    setAmount(String(current + val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount greater than ₹0');
      return;
    }

    if (!date) {
      setError('Please select a valid transaction date');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editTransactionData) {
        await editTransaction(editTransactionData.id, {
          transaction_type: type,
          amount: parsedAmount,
          category,
          transaction_date: date,
          note: note.trim() || undefined,
        });
        setSuccessMessage('Updated successfully');
      } else {
        await addTransaction({
          amount: parsedAmount,
          transaction_type: type,
          category,
          transaction_date: date,
          note: note.trim() || undefined,
        });
        setSuccessMessage(`${type === 'deposit' ? 'Added' : 'Deducted'} ${formatINR(parsedAmount)}!`);
      }

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 400);
    } catch (err: any) {
      setError(err?.message || 'Failed to save transaction');
      setIsSubmitting(false);
    }
  };

  const currentCategories = type === 'deposit' ? DEPOSIT_CATEGORIES : WITHDRAWAL_CATEGORIES;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Transaction' : 'Record Transaction'}
      subtitle="Keep your Hunter 350 savings ledger updated daily"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-2xl">
          <button
            type="button"
            onClick={() => handleTypeChange('deposit')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all tap-highlight ${
              type === 'deposit'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            Deposit (+)
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('withdrawal')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all tap-highlight ${
              type === 'withdrawal'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            Withdrawal (-)
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Amount (₹)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-700 font-mono font-bold text-2xl">
              ₹
            </div>
            <input
              type="number"
              step="any"
              min="1"
              required
              autoFocus={!isEditing}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-slate-900 font-mono text-2xl font-black placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 transition-all shadow-sm"
            />
          </div>

          {/* Quick Pills */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAmount(val)}
                className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-mono font-semibold hover:border-emerald-400 hover:text-emerald-800 hover:bg-emerald-50 active:scale-95 transition-all pill-active"
              >
                +{val >= 1000 ? `₹${val/1000}k` : `₹${val}`}
              </button>
            ))}
          </div>
        </div>

        {/* Category Selector */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Category
          </label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TransactionCategory)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm font-medium focus:outline-none focus:bg-white focus:border-emerald-600 transition-all appearance-none cursor-pointer"
            >
              {currentCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
              <Tag className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Transaction Date */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Date
          </label>
          <div className="relative">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm font-medium focus:outline-none focus:bg-white focus:border-emerald-600 transition-all"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Daily stipend, Bike accessories"
            maxLength={120}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 transition-all"
          />
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {successMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="flex-1"
          >
            {isEditing ? 'Save Changes' : type === 'deposit' ? 'Add Deposit' : 'Deduct Amount'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
