import React from 'react';
import { HeroProgressBar } from './HeroProgressBar';
import { KpiGrid } from './KpiGrid';
import { TodayCard } from './TodayCard';
import { MilestonesCard } from './MilestonesCard';
import { RecentTransactionsCard } from './RecentTransactionsCard';
import { ShoppingBag, Calculator, CheckSquare, ChevronRight } from 'lucide-react';
import { useHunter } from '../../context/HunterContext';

const ShortcutCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
  accent?: string;
}> = ({ icon, label, sub, onClick, accent = 'text-slate-600' }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 text-left active:scale-[0.98] transition-all tap-highlight w-full shadow-card hover:border-emerald-200"
  >
    <div className={`w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 ${accent}`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-slate-900 truncate">{label}</p>
      <p className="text-[11px] text-slate-500 truncate">{sub}</p>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
  </button>
);

export const DashboardView: React.FC = () => {
  const { setActivePage, checklist } = useHunter();

  const completedTasks = checklist.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Hero Balance & Progress */}
      <HeroProgressBar />

      {/* 2. Today Quick Save */}
      <TodayCard />

      {/* 3. Stats Grid */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Financial Metrics</p>
        <KpiGrid />
      </div>

      {/* 4. Milestones */}
      <MilestonesCard />

      {/* 5. Recent Transactions */}
      <RecentTransactionsCard />

      {/* 6. Quick Nav Shortcuts */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Purchase Tools</p>
        <div className="space-y-2">
          <ShortcutCard
            icon={<ShoppingBag className="w-[18px] h-[18px]" />}
            label="Purchase Planner"
            sub="On-road price & accessories breakdown"
            onClick={() => setActivePage('purchase-planner')}
            accent="text-emerald-700"
          />
          <ShortcutCard
            icon={<Calculator className="w-[18px] h-[18px]" />}
            label="Loan Calculator"
            sub="EMI calculator for bike financing"
            onClick={() => setActivePage('loan-calculator')}
            accent="text-slate-700"
          />
          <ShortcutCard
            icon={<CheckSquare className="w-[18px] h-[18px]" />}
            label="Purchase Checklist"
            sub={`${completedTasks} of ${checklist.length} delivery steps done`}
            onClick={() => setActivePage('checklist')}
            accent="text-slate-700"
          />
        </div>
      </div>
    </div>
  );
};
