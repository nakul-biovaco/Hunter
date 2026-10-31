import React, { useState } from 'react';
import {
  Home,
  Receipt,
  Plus,
  CalendarDays,
  BarChart2,
  X,
  ShoppingBag,
  Building2,
  Calculator,
  CheckSquare,
  Settings,
  Smartphone,
  Menu,
} from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { ActivePage } from '../../types';

const MORE_ITEMS = [
  { id: 'analytics' as ActivePage, label: 'Analytics & Stats', icon: BarChart2, desc: 'Savings growth & trends' },
  { id: 'purchase-planner' as ActivePage, label: 'Purchase Planner', icon: ShoppingBag, desc: 'On-road price breakdown' },
  { id: 'dealer-comparison' as ActivePage, label: 'Dealer Comparison', icon: Building2, desc: 'Compare dealer quotes' },
  { id: 'loan-calculator' as ActivePage, label: 'Loan Calculator', icon: Calculator, desc: 'EMI & repayment planner' },
  { id: 'checklist' as ActivePage, label: 'Purchase Checklist', icon: CheckSquare, desc: 'Delivery steps tracker' },
  { id: 'settings' as ActivePage, label: 'Settings', icon: Settings, desc: 'App & cloud preferences' },
];

export const BottomNav: React.FC = () => {
  const { activePage, setActivePage, setIsQuickAddOpen } = useHunter();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isMoreActive = MORE_ITEMS.some((m) => m.id === activePage);

  return (
    <>
      {/* More Tools Drawer */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsMoreOpen(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 rounded-t-3xl pb-safe animate-slide-up shadow-sheet max-h-[82vh] flex flex-col">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1.5 rounded-full bg-slate-300" />
            </div>

            <div className="px-5 pb-5 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">More Modules</h3>
                  <p className="text-xs text-slate-500">Hunter 350 purchase & financing tools</p>
                </div>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MORE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActivePage(item.id);
                        setIsMoreOpen(false);
                      }}
                      className={`flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition-all tap-highlight ${
                        isActive
                          ? 'bg-emerald-50 border border-emerald-300'
                          : 'bg-slate-50 border border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 shadow-sm border border-slate-100'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold ${isActive ? 'text-emerald-800' : 'text-slate-900'}`}>
                          {item.label}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-800">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Add to Home Screen</p>
                  <p className="text-[10px] text-slate-500">Install as PWA on Android or iPhone</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Balanced 5-Column Native Bottom Bar (Light Mode) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 pb-safe shadow-lg">
        <div className="grid grid-cols-5 items-end max-w-lg mx-auto h-[62px] px-1">
          {/* Tab 1: Home */}
          <button
            onClick={() => setActivePage('dashboard')}
            className="flex flex-col items-center justify-center h-full py-1 tap-highlight"
          >
            <div className={`relative flex items-center justify-center ${activePage === 'dashboard' ? 'text-emerald-700' : 'text-slate-400'}`}>
              <Home className="w-5 h-5" strokeWidth={activePage === 'dashboard' ? 2.5 : 1.8} />
            </div>
            <span className={`text-[10px] font-semibold mt-1 ${activePage === 'dashboard' ? 'text-emerald-700' : 'text-slate-500'}`}>
              Home
            </span>
          </button>

          {/* Tab 2: History (Ledger) */}
          <button
            onClick={() => setActivePage('transactions')}
            className="flex flex-col items-center justify-center h-full py-1 tap-highlight"
          >
            <div className={`relative flex items-center justify-center ${activePage === 'transactions' ? 'text-emerald-700' : 'text-slate-400'}`}>
              <Receipt className="w-5 h-5" strokeWidth={activePage === 'transactions' ? 2.5 : 1.8} />
            </div>
            <span className={`text-[10px] font-semibold mt-1 ${activePage === 'transactions' ? 'text-emerald-700' : 'text-slate-500'}`}>
              History
            </span>
          </button>

          {/* Tab 3: Center Action (+) - Dead Center Column 3 */}
          <div className="flex flex-col items-center justify-start h-full">
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center active:scale-90 transition-transform -translate-y-3.5 shadow-fab"
              title="Add Deposit"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>
            <span className="text-[10px] font-bold text-emerald-700 -mt-2">
              Save
            </span>
          </div>

          {/* Tab 4: Calendar */}
          <button
            onClick={() => setActivePage('calendar')}
            className="flex flex-col items-center justify-center h-full py-1 tap-highlight"
          >
            <div className={`relative flex items-center justify-center ${activePage === 'calendar' ? 'text-emerald-700' : 'text-slate-400'}`}>
              <CalendarDays className="w-5 h-5" strokeWidth={activePage === 'calendar' ? 2.5 : 1.8} />
            </div>
            <span className={`text-[10px] font-semibold mt-1 ${activePage === 'calendar' ? 'text-emerald-700' : 'text-slate-500'}`}>
              Calendar
            </span>
          </button>

          {/* Tab 5: More */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className="flex flex-col items-center justify-center h-full py-1 tap-highlight"
          >
            <div className={`relative flex items-center justify-center ${isMoreActive || isMoreOpen ? 'text-emerald-700' : 'text-slate-400'}`}>
              <Menu className="w-5 h-5" strokeWidth={isMoreActive || isMoreOpen ? 2.5 : 1.8} />
            </div>
            <span className={`text-[10px] font-semibold mt-1 ${isMoreActive || isMoreOpen ? 'text-emerald-700' : 'text-slate-500'}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
