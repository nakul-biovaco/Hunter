import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { formatINR, formatDate } from '../../lib/formatters';
import { Transaction } from '../../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transaction: Transaction | null;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  isDeleting = false,
}) => {
  if (!transaction) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Transaction"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <p className="text-xs leading-relaxed">
            Permanently remove this transaction? Balances and daily goals will be recalculated immediately.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs space-y-2">
          <div className="flex justify-between text-slate-500">
            <span>Type</span>
            <span className="font-semibold uppercase text-slate-800">
              {transaction.transaction_type}
            </span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Amount</span>
            <span className="font-mono font-bold text-slate-900">
              {formatINR(transaction.amount)}
            </span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Category</span>
            <span className="text-slate-800">{transaction.category}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Date</span>
            <span className="text-slate-800">{formatDate(transaction.transaction_date, 'short')}</span>
          </div>
          {transaction.note && (
            <div className="flex justify-between text-slate-500">
              <span>Note</span>
              <span className="text-slate-700 truncate max-w-[180px]">{transaction.note}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isDeleting} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={onConfirm}
            isLoading={isDeleting}
            className="flex-1"
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
};
