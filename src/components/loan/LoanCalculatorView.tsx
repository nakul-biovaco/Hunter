import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { formatINR } from '../../lib/formatters';

const PRESET_TENURES = [12, 24, 36, 48];

export const LoanCalculatorView: React.FC = () => {
  const { loanPlan, updateLoanPlan, loanCalculation } = useHunter();

  const [principal, setPrincipal] = useState(loanPlan.principal);
  const [rate, setRate] = useState(loanPlan.annual_interest_rate);
  const [tenure, setTenure] = useState(loanPlan.tenure_months);
  const [processingFee, setProcessingFee] = useState(loanPlan.processing_fee);

  const handleUpdate = (updates: {
    principal?: number;
    annual_interest_rate?: number;
    tenure_months?: number;
    processing_fee?: number;
  }) => {
    const newPrincipal = updates.principal ?? principal;
    const newRate = updates.annual_interest_rate ?? rate;
    const newTenure = updates.tenure_months ?? tenure;
    const newFee = updates.processing_fee ?? processingFee;

    if (updates.principal !== undefined) setPrincipal(newPrincipal);
    if (updates.annual_interest_rate !== undefined) setRate(newRate);
    if (updates.tenure_months !== undefined) setTenure(newTenure);
    if (updates.processing_fee !== undefined) setProcessingFee(newFee);

    updateLoanPlan({
      principal: newPrincipal,
      annual_interest_rate: newRate,
      tenure_months: newTenure,
      processing_fee: newFee,
    });
  };

  const handleResetExample = () => {
    handleUpdate({
      principal: 84220,
      annual_interest_rate: 7.7,
      tenure_months: 36,
      processing_fee: 1500,
    });
  };

  const { emi, totalInterest, totalRepayment, totalCostOfPurchase, amortizationSchedule } =
    loanCalculation;

  return (
    <div className="space-y-4 pb-12 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Bike Loan Calculator</h2>
          <p className="text-xs text-slate-500">Calculate EMI & finance for remaining amount</p>
        </div>
        <button
          onClick={handleResetExample}
          title="Reset"
          className="w-9 h-9 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 active:scale-95 transition-all tap-highlight shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Main EMI Hero Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Monthly EMI</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl font-black font-mono text-emerald-700">
            {formatINR(emi)}
          </span>
          <span className="text-xs text-slate-500">/month</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          For {tenure} months at {rate}% annual interest
        </p>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-[10px] text-slate-500">Interest</p>
            <p className="text-xs font-bold font-mono text-amber-700 mt-0.5">{formatINR(totalInterest)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Total Loan</p>
            <p className="text-xs font-bold font-mono text-slate-900 mt-0.5">{formatINR(totalRepayment)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Total Cost</p>
            <p className="text-xs font-bold font-mono text-emerald-700 mt-0.5">{formatINR(totalCostOfPurchase)}</p>
          </div>
        </div>
      </div>

      {/* Loan Inputs Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-card">
        <h3 className="text-sm font-bold text-slate-900">Loan Parameters</h3>

        {/* Principal */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Principal Amount (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-emerald-700 font-bold">
              ₹
            </span>
            <input
              type="number"
              value={principal}
              onChange={(e) => handleUpdate({ principal: Number(e.target.value) || 0 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-4 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Interest Rate */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Annual Interest Rate (% p.a.)
          </label>
          <input
            type="number"
            step="0.1"
            value={rate}
            onChange={(e) =>
              handleUpdate({ annual_interest_rate: parseFloat(e.target.value) || 0 })
            }
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 transition-all shadow-sm"
          />
        </div>

        {/* Tenure Pills */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Tenure ({tenure} Months / {(tenure / 12).toFixed(1)} Yrs)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_TENURES.map((months) => (
              <button
                key={months}
                type="button"
                onClick={() => handleUpdate({ tenure_months: months })}
                className={`py-2.5 rounded-2xl text-xs font-mono font-bold transition-all tap-highlight ${
                  tenure === months
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {months} Mo
              </button>
            ))}
          </div>
        </div>

        {/* Processing Fee */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Processing Fee / Documentation (₹)
          </label>
          <input
            type="number"
            value={processingFee}
            onChange={(e) => handleUpdate({ processing_fee: Number(e.target.value) || 0 })}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Amortization Schedule Preview */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-3 shadow-card">
        <h3 className="text-sm font-bold text-slate-900">Monthly Repayment Schedule</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {amortizationSchedule.slice(0, 12).map((row) => (
            <div
              key={row.month}
              className="flex items-center justify-between py-2 border-b border-slate-100 text-xs font-mono"
            >
              <span className="text-slate-600">Month {row.month}</span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-700 font-bold">P: {formatINR(row.principalPayment)}</span>
                <span className="text-amber-700 font-bold">I: {formatINR(row.interestPayment)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
