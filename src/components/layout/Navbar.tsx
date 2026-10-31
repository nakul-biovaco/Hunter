import React from 'react';
import { Settings } from 'lucide-react';
import { useHunter } from '../../context/HunterContext';

export const Navbar: React.FC = () => {
  const { isSupabaseOnline, setActivePage } = useHunter();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-app-border px-5 py-3 pt-safe shadow-sm">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent-green flex items-center justify-center shadow-sm">
            <span className="text-[11px] font-black text-white tracking-tight">HF</span>
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-slate-900 tracking-tight leading-none">Hunter Fund</h1>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">RE Hunter 350 • 2027</p>
          </div>
        </div>

        {/* Right: Sync + Settings */}
        <div className="flex items-center gap-2">
          {/* Sync status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 border border-slate-200">
            <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseOnline ? 'bg-emerald-600' : 'bg-amber-500'}`} />
            <span className="text-[10px] font-semibold text-slate-700">
              {isSupabaseOnline ? 'Synced' : 'Local'}
            </span>
          </div>

          <button
            onClick={() => setActivePage('settings')}
            className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-90 transition-transform tap-highlight"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
