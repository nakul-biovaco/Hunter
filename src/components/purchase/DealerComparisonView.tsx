import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  MapPin,
} from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { formatINR } from '../../lib/formatters';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

export const DealerComparisonView: React.FC = () => {
  const {
    dealerQuotes,
    addDealerQuote,
    deleteDealerQuote,
    setPreferredQuote,
  } = useHunter();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [dealerName, setDealerName] = useState('');
  const [location, setLocation] = useState('');
  const [exShowroom, setExShowroom] = useState('169656');
  const [rto, setRto] = useState('21500');
  const [insurance, setInsurance] = useState('11450');
  const [accessories, setAccessories] = useState('6500');
  const [otherCharges, setOtherCharges] = useState('1500');
  const [bookingAmount, setBookingAmount] = useState('5000');
  const [notes, setNotes] = useState('');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealerName || !location) return;

    const ex = parseFloat(exShowroom) || 0;
    const rt = parseFloat(rto) || 0;
    const ins = parseFloat(insurance) || 0;
    const acc = parseFloat(accessories) || 0;
    const oth = parseFloat(otherCharges) || 0;
    const onRoad = ex + rt + ins + acc + oth;

    await addDealerQuote({
      dealer_name: dealerName.trim(),
      location: location.trim(),
      ex_showroom: ex,
      rto: rt,
      insurance: ins,
      accessories: acc,
      other_charges: oth,
      on_road_price: onRoad,
      booking_amount: parseFloat(bookingAmount) || 5000,
      notes: notes.trim() || undefined,
      is_preferred: false,
    });

    setIsAddOpen(false);
    setDealerName('');
    setLocation('');
    setNotes('');
  };

  return (
    <div className="space-y-4 pb-12 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Dealer Quotations</h2>
          <p className="text-xs text-slate-500">Compare on-road quotes across showrooms</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddOpen(true)}
          icon={<Plus className="w-4 h-4 stroke-[3]" />}
        >
          Add Quote
        </Button>
      </div>

      {/* Quote Cards */}
      <div className="space-y-3">
        {dealerQuotes.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center text-slate-400 text-xs shadow-card">
            No dealer quotes added yet. Tap "Add Quote" to compare.
          </div>
        ) : (
          dealerQuotes.map((q) => (
            <div
              key={q.id}
              className={`bg-white border rounded-3xl p-5 space-y-3 transition-all shadow-card ${
                q.is_preferred
                  ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-300'
                  : 'border-slate-200/80'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{q.dealer_name}</h3>
                    {q.is_preferred && (
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Preferred
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{q.location}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-black font-mono text-emerald-700 block">
                    {formatINR(q.on_road_price)}
                  </span>
                  <span className="text-[10px] text-slate-500">On-Road</span>
                </div>
              </div>

              {q.notes && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  "{q.notes}"
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Ex-Showroom</span>
                  <span className="font-mono text-slate-900 text-xs font-semibold">{formatINR(q.ex_showroom)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">RTO + Ins</span>
                  <span className="font-mono text-slate-900 text-xs font-semibold">{formatINR(q.rto + q.insurance)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Booking</span>
                  <span className="font-mono text-slate-900 text-xs font-semibold">{formatINR(q.booking_amount)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={() => setPreferredQuote(q.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all tap-highlight ${
                    q.is_preferred
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {q.is_preferred ? '✓ Selected Dealer' : 'Select Dealer'}
                </button>

                <button
                  onClick={() => deleteDealerQuote(q.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 tap-highlight"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Dealer Quotation"
        subtitle="Compare written quote numbers from showroom"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Dealer Name *
              </label>
              <input
                type="text"
                required
                value={dealerName}
                onChange={(e) => setDealerName(e.target.value)}
                placeholder="e.g. Royal Enfield Worli"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Location *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Ex-Showroom (₹)
              </label>
              <input
                type="number"
                value={exShowroom}
                onChange={(e) => setExShowroom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 font-mono shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                RTO (₹)
              </label>
              <input
                type="number"
                value={rto}
                onChange={(e) => setRto(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 font-mono shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Insurance
              </label>
              <input
                type="number"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Accessories
              </label>
              <input
                type="number"
                value={accessories}
                onChange={(e) => setAccessories(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Booking
              </label>
              <input
                type="number"
                value={bookingAmount}
                onChange={(e) => setBookingAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Notes / Discounts / Freebies
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Free helmet, delivery in 5 days"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" size="md" onClick={() => setIsAddOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" className="flex-1">
              Save Quote
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
