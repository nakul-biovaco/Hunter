import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  CalendarDays,
  LineChart,
  ShoppingBag,
  Building2,
  Calculator,
  CheckSquare,
  Settings,
} from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { ActivePage } from '../../types';
import { formatINR, formatPercent } from '../../lib/formatters';

interface NavItem {
  id: ActivePage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Home Dashboard', icon: LayoutDashboard },
  { id: 'add-transaction', label: 'Add Savings', icon: PlusCircle },
  { id: 'transactions', label: 'Transaction Ledger', icon: Receipt },
  { id: 'calendar', label: 'Savings Calendar', icon: CalendarDays },
  { id: 'analytics', label: 'Analytics & Reports', icon: LineChart },
  { id: 'purchase-planner', label: 'Purchase Planner', icon: ShoppingBag },
  { id: 'dealer-comparison', label: 'Dealer Quotations', icon: Building2 },
  { id: 'loan-calculator', label: 'Loan Calculator', icon: Calculator },
  { id: 'checklist', label: 'Purchase Checklist', icon: CheckSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage, metrics, transactions } = useHunter();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 bg-white p-4 min-h-[calc(100vh-60px)]">
      {/* Target Progress Mini-Card */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-semibold text-slate-700">Hunter 350 Goal</span>
          <span className="font-mono text-emerald-700 font-bold">
            {formatPercent(metrics.progressPercentage)}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 mb-3 overflow-hidden">
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, metrics.progressPercentage)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="text-[10px] text-slate-500">Saved</div>
            <div className="font-mono font-bold text-slate-900 text-xs">
              {formatINR(metrics.currentBalance)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500">Goal</div>
            <div className="font-mono font-bold text-slate-700 text-xs">
              {formatINR(metrics.targetAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all tap-highlight ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.id === 'transactions' && transactions.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {transactions.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-200 mt-3 text-xs text-slate-500">
        <div className="flex items-center justify-between">
          <span>Daily Pace:</span>
          <span className="font-mono text-emerald-700 font-bold">
            {formatINR(metrics.dailyRequiredSavings)} / day
          </span>
        </div>
      </div>
    </aside>
  );
};
