import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
} from 'recharts';
import { Download } from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { formatINR, formatDate } from '../../lib/formatters';

type TimeFilter = '7d' | '30d' | 'current_month' | 'prev_month' | 'all';

export const AnalyticsView: React.FC = () => {
  const { transactions, metrics, goal, exportReportCSV } = useHunter();
  const [filter, setFilter] = useState<TimeFilter>('30d');

  const filteredTx = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter((t) => {
      const txDate = new Date(t.transaction_date);

      if (filter === '7d') {
        const d7 = new Date();
        d7.setDate(now.getDate() - 7);
        return txDate >= d7;
      }
      if (filter === '30d') {
        const d30 = new Date();
        d30.setDate(now.getDate() - 30);
        return txDate >= d30;
      }
      if (filter === 'current_month') {
        return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
      }
      if (filter === 'prev_month') {
        const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return (
          txDate.getFullYear() === prevMonthDate.getFullYear() &&
          txDate.getMonth() === prevMonthDate.getMonth()
        );
      }
      return true;
    });
  }, [transactions, filter]);

  const cumulativeData = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    let running = Number(goal.opening_balance) || 0;
    const map = new Map<string, number>();

    sorted.forEach((t) => {
      const amt = Number(t.amount);
      if (t.transaction_type === 'deposit') running += amt;
      else running -= amt;
      map.set(t.transaction_date, running);
    });

    const target = Number(goal.target_amount);

    return Array.from(map.entries()).map(([d, val]) => ({
      date: formatDate(d, 'short'),
      balance: val,
      target,
    }));
  }, [transactions, goal]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { deposits: number; withdrawals: number; net: number }>();

    transactions.forEach((tx) => {
      const d = new Date(tx.transaction_date);
      const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      const entry = map.get(key) || { deposits: 0, withdrawals: 0, net: 0 };
      const amt = Number(tx.amount);

      if (tx.transaction_type === 'deposit') {
        entry.deposits += amt;
        entry.net += amt;
      } else {
        entry.withdrawals += amt;
        entry.net -= amt;
      }
      map.set(key, entry);
    });

    return Array.from(map.entries()).map(([month, data]) => ({
      month,
      deposits: data.deposits,
      withdrawals: data.withdrawals,
      net: data.net,
    }));
  }, [transactions]);

  const stats = useMemo(() => {
    const deposits = transactions.filter((t) => t.transaction_type === 'deposit');
    const totalDeposited = deposits.reduce((sum, t) => sum + Number(t.amount), 0);

    let bestDay = { date: 'N/A', amount: 0 };
    const dayMap = new Map<string, number>();
    deposits.forEach((t) => {
      const sum = (dayMap.get(t.transaction_date) || 0) + Number(t.amount);
      dayMap.set(t.transaction_date, sum);
      if (sum > bestDay.amount) {
        bestDay = { date: t.transaction_date, amount: sum };
      }
    });

    const activeDays = Math.max(1, dayMap.size);
    const avgDaily = Math.round(totalDeposited / activeDays);

    return {
      totalSavings: metrics.currentBalance,
      avgDaily,
      bestDay: bestDay.amount > 0 ? `${formatINR(bestDay.amount)}` : 'N/A',
      missedSavingDays: Math.max(0, 30 - dayMap.size),
    };
  }, [transactions, metrics.currentBalance]);

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Stats & Analytics</h2>
          <p className="text-xs text-slate-500">Savings progress & historical pace</p>
        </div>
        <button
          onClick={exportReportCSV}
          title="Export CSV"
          className="w-9 h-9 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-95 transition-all tap-highlight shadow-sm"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Time filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(
          [
            { id: '7d', label: '7D' },
            { id: '30d', label: '30D' },
            { id: 'current_month', label: 'This Month' },
            { id: 'prev_month', label: 'Last Month' },
            { id: 'all', label: 'All Time' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all tap-highlight ${
              filter === item.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-card">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Net Saved</p>
          <p className="text-lg font-black font-mono text-emerald-700 mt-1">{formatINR(stats.totalSavings)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Total accumulated</p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-card">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Daily Average</p>
          <p className="text-lg font-black font-mono text-slate-900 mt-1">{formatINR(stats.avgDaily)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">On active days</p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-card">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Best Deposit</p>
          <p className="text-lg font-black font-mono text-amber-700 mt-1">{stats.bestDay}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Peak single day</p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-card">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Missed (30D)</p>
          <p className="text-lg font-black font-mono text-rose-600 mt-1">{stats.missedSavingDays} days</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Zero deposit days</p>
        </div>
      </div>

      {/* Chart 1: Cumulative Growth */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900">Savings Growth Curve</h3>
          <p className="text-[11px] text-slate-500">Climbing towards ₹1,30,000 target</p>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumulativeData}>
              <defs>
                <linearGradient id="appGreenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '16px',
                  color: '#0f172a',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [formatINR(val), 'Balance']}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#059669"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#appGreenGrad)"
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#d97706"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Monthly Comparison */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900">Monthly Deposits vs Expenses</h3>
          <p className="text-[11px] text-slate-500">Inflow compared to withdrawals</p>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '16px',
                  color: '#0f172a',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  fontSize: '12px',
                }}
                formatter={(val: any) => formatINR(val)}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
              <Bar dataKey="deposits" fill="#059669" name="Deposits" radius={[6, 6, 0, 0]} />
              <Bar dataKey="withdrawals" fill="#e11d48" name="Expenses" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
