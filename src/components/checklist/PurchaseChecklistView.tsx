import React, { useState } from 'react';
import {
  Plus,
  Clock,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { formatDate } from '../../lib/formatters';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ChecklistItem, ChecklistStatus } from '../../types';

export const PurchaseChecklistView: React.FC = () => {
  const { checklist, updateChecklistItem, addChecklistItem, deleteChecklistItem } = useHunter();

  const [activeFilter, setActiveFilter] = useState<'all' | ChecklistStatus>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newCategory, setNewCategory] = useState<ChecklistItem['category']>('Custom');
  const [newNotes, setNewNotes] = useState('');

  const completedCount = checklist.filter((i) => i.status === 'completed').length;
  const inProgressCount = checklist.filter((i) => i.status === 'in_progress').length;
  const pendingCount = checklist.filter((i) => i.status === 'pending').length;

  const filteredItems = checklist.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.status === activeFilter;
  });

  const handleStatusToggle = (item: ChecklistItem) => {
    let nextStatus: ChecklistStatus = 'in_progress';
    if (item.status === 'pending') nextStatus = 'in_progress';
    else if (item.status === 'in_progress') nextStatus = 'completed';
    else nextStatus = 'pending';

    updateChecklistItem(item.id, { status: nextStatus });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    await addChecklistItem({
      task_name: newTaskName.trim(),
      category: newCategory,
      status: 'pending',
      due_date: newDueDate || undefined,
      notes: newNotes.trim() || undefined,
      order_index: checklist.length + 1,
    });

    setIsAddOpen(false);
    setNewTaskName('');
    setNewDueDate('');
    setNewNotes('');
  };

  return (
    <div className="space-y-4 pb-12 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Delivery Checklist</h2>
          <p className="text-xs text-slate-500">{completedCount} of {checklist.length} steps complete</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddOpen(true)}
          icon={<Plus className="w-4 h-4 stroke-[3]" />}
        >
          Add Task
        </Button>
      </div>

      {/* Progress Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all tap-highlight ${
            activeFilter === 'all'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          All ({checklist.length})
        </button>
        <button
          onClick={() => setActiveFilter('completed')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all tap-highlight ${
            activeFilter === 'completed'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          Completed ({completedCount})
        </button>
        <button
          onClick={() => setActiveFilter('in_progress')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all tap-highlight ${
            activeFilter === 'in_progress'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          In Progress ({inProgressCount})
        </button>
        <button
          onClick={() => setActiveFilter('pending')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all tap-highlight ${
            activeFilter === 'pending'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          Pending ({pendingCount})
        </button>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {filteredItems.map((item) => {
          const isDone = item.status === 'completed';
          const isInProg = item.status === 'in_progress';

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 tap-highlight shadow-card ${
                isDone
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : isInProg
                  ? 'bg-amber-50/60 border-amber-200'
                  : 'bg-white border-slate-200/80'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleStatusToggle(item)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 transition-all ${
                  isDone
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : isInProg
                    ? 'bg-amber-100 border-amber-300 text-amber-700'
                    : 'border-slate-300 hover:border-emerald-600'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                ) : isInProg ? (
                  <Clock className="w-3.5 h-3.5" />
                ) : null}
              </button>

              {/* Task Details */}
              <div className="flex-1 min-w-0" onClick={() => handleStatusToggle(item)}>
                <p className={`text-xs font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                  {item.task_name}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                  <span>{item.category}</span>
                  {item.due_date && (
                    <>
                      <span>•</span>
                      <span>{formatDate(item.due_date, 'short')}</span>
                    </>
                  )}
                </div>
                {item.notes && (
                  <p className="text-[11px] text-slate-600 mt-1">
                    {item.notes}
                  </p>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={() => deleteChecklistItem(item.id)}
                className="text-slate-400 hover:text-rose-600 p-1 shrink-0 tap-highlight"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Purchase Task"
        subtitle="Add personal action items like accessories, helmet, insurance"
      >
        <form onSubmit={handleAddTask} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Task Description *
            </label>
            <input
              type="text"
              required
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="e.g. Purchase certified riding helmet"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 transition-all shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 cursor-pointer"
              >
                <option value="Dealership & Finance">Dealership & Finance</option>
                <option value="Booking & Documentation">Booking & Docs</option>
                <option value="PDI & Inspection">PDI & Inspection</option>
                <option value="Delivery & Handover">Delivery</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Target Date
              </label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Optional memo"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" size="md" onClick={() => setIsAddOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" className="flex-1">
              Add Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
