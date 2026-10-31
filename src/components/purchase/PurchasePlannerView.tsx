import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { formatINR, formatPercent } from '../../lib/formatters';
import { Button } from '../common/Button';

export const PurchasePlannerView: React.FC = () => {
  const { goal, metrics, accessories, toggleAccessory, setActivePage } = useHunter();

  const [exShowroom, setExShowroom] = useState<number>(169656);
  const [rto, setRto] = useState<number>(21500);
  const [insurance, setInsurance] = useState<number>(11450);
  const [warranty, setWarranty] = useState<number>(3200);
  const [rsa, setRsa] = useState<number>(1499);
  const [otherCharges, setOtherCharges] = useState<number>(1800);

  const selectedAccessories = useMemo(() => {
    return accessories.filter((a) => a.selected);
  }, [accessories]);

  const accessoriesTotal = useMemo(() => {
    return selectedAccessories.reduce((sum, a) => sum + a.price, 0);
  }, [selectedAccessories]);

  const totalOnRoadPrice = useMemo(() => {
    return (
      (Number(exShowroom) || 0) +
      (Number(rto) || 0) +
      (Number(insurance) || 0) +
      (Number(warranty) || 0) +
      (Number(rsa) || 0) +
      (Number(otherCharges) || 0) +
      accessoriesTotal
    );
  }, [exShowroom, rto, insurance, warranty, rsa, otherCharges, accessoriesTotal]);

  const fundingGap = Math.max(0, totalOnRoadPrice - metrics.currentBalance);
  const downPaymentProgress = Math.min(100, (metrics.currentBalance / goal.target_amount) * 100);

  return (
    <div className="space-y-4 pb-12 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Purchase Planner</h2>
          <p className="text-xs text-slate-500">Hunter 350 on-road price & accessories</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setActivePage('dealer-comparison')}
          icon={<Building2 className="w-3.5 h-3.5" />}
        >
          Dealers
        </Button>
      </div>

      {/* Main On-Road Hero Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Estimated On-Road Price</p>
        <div className="text-3xl font-black font-mono text-slate-900 mt-1">
          {formatINR(totalOnRoadPrice)}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Includes Ex-Showroom, RTO, Insurance & {selectedAccessories.length} accessories
        </p>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-[10px] text-slate-500">Hunter Fund Balance</p>
            <p className="text-xs font-bold font-mono text-emerald-700 mt-0.5">{formatINR(metrics.currentBalance)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Remaining Balance Gap</p>
            <p className="text-xs font-bold font-mono text-amber-700 mt-0.5">{formatINR(fundingGap)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-500">Down Payment Progress</span>
            <span className="font-mono font-bold text-emerald-700">{formatPercent(downPaymentProgress)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${downPaymentProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Editable Cost Parameters */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-3 shadow-card">
        <h3 className="text-sm font-bold text-slate-900">Price Components</h3>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Ex-Showroom Price (₹)
          </label>
          <input
            type="number"
            value={exShowroom}
            onChange={(e) => setExShowroom(Number(e.target.value) || 0)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 transition-all shadow-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              RTO & Tax (₹)
            </label>
            <input
              type="number"
              value={rto}
              onChange={(e) => setRto(Number(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Insurance (₹)
            </label>
            <input
              type="number"
              value={insurance}
              onChange={(e) => setInsurance(Number(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Warranty
            </label>
            <input
              type="number"
              value={warranty}
              onChange={(e) => setWarranty(Number(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              RSA
            </label>
            <input
              type="number"
              value={rsa}
              onChange={(e) => setRsa(Number(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Other
            </label>
            <input
              type="number"
              value={otherCharges}
              onChange={(e) => setOtherCharges(Number(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Official Accessories Checklist */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-3 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Genuine Accessories</h3>
          <span className="text-xs font-mono font-bold text-emerald-700">{formatINR(accessoriesTotal)}</span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {accessories.map((acc) => (
            <div
              key={acc.id}
              onClick={() => toggleAccessory(acc.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between tap-highlight ${
                acc.selected
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    acc.selected
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {acc.selected && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">{acc.name}</p>
                  <span className="text-[10px] text-slate-500">{acc.isMandatory ? 'Recommended Protection' : 'Optional'}</span>
                </div>
              </div>
              <span className="font-mono font-bold text-xs text-emerald-700">
                {formatINR(acc.price)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
