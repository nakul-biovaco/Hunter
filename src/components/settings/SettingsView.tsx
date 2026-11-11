import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  Download,
  Database,
  Save,
  CheckCircle2,
  Copy,
  Bike,
  Bell,
  BellRing,
  Moon,
  Zap,
  Smartphone,
  Clock,
  Volume2,
  ShieldCheck,
  AlertTriangle,
  BatteryCharging,
} from 'lucide-react';
import { useHunter } from '../../context/HunterContext';
import { Button } from '../common/Button';
import { GoalType } from '../../types';
import { formatINR } from '../../lib/formatters';

export const SettingsView: React.FC = () => {
  const {
    goal,
    updateGoal,
    metrics,
    exportTransactionsCSV,
    exportReportCSV,
    isSupabaseOnline,
    supabaseStatusMessage,
    notificationsEnabled,
    setNotificationsEnabled,
    reminderTime,
    setReminderTime,
    hourlyRemindersEnabled,
    setHourlyRemindersEnabled,
    quietHoursEnabled,
    setQuietHoursEnabled,
    testNotification,
    scheduleBackgroundTest,
    testHourlyReminder,
    scheduleBackgroundHourlyTest,
    voiceLanguage,
    setVoiceLanguage,
    backgroundStatus,
    refreshBackgroundStatus,
    requestBatteryUnrestricted,
    openAlarmPermissionSettings,
    openNotificationPermissionSettings,
  } = useHunter();

  const [targetAmount, setTargetAmount] = useState(String(goal.target_amount));
  const [targetDate, setTargetDate] = useState(goal.target_date);
  const [goalType, setGoalType] = useState<GoalType>(goal.goal_type);
  const [openingBalance, setOpeningBalance] = useState(String(goal.opening_balance));
  const [bikeModel, setBikeModel] = useState(goal.bike_model);
  const [bikeVariant, setBikeVariant] = useState(goal.bike_variant);
  const [bikeColour, setBikeColour] = useState(goal.bike_colour);

  const [isSaved, setIsSaved] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [notificationStatusMsg, setNotificationStatusMsg] = useState<string>('');

  const isNative = Capacitor.isNativePlatform();
  const currentPermission = isNative
    ? backgroundStatus?.notificationsEnabled === false
      ? 'denied'
      : 'granted'
    : typeof window !== 'undefined' && 'Notification' in window
    ? Notification.permission
    : 'unsupported';

  useEffect(() => {
    if (isNative) {
      refreshBackgroundStatus();
    }
  }, [isNative, refreshBackgroundStatus]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateGoal({
      target_amount: parseFloat(targetAmount) || 130000,
      target_date: targetDate,
      goal_type: goalType,
      opening_balance: parseFloat(openingBalance) || 0,
      bike_model: bikeModel,
      bike_variant: bikeVariant,
      bike_colour: bikeColour,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const copySqlToClipboard = () => {
    const sql = `-- HUNTER FUND: Database Schema Migration & Security Policies
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    currency TEXT DEFAULT 'INR',
    preferred_variant TEXT DEFAULT 'Mid',
    preferred_colour TEXT DEFAULT 'Graphite Grey',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_name TEXT NOT NULL DEFAULT 'Royal Enfield Hunter 350',
    target_amount NUMERIC(12, 2) NOT NULL DEFAULT 130000.00,
    target_date DATE NOT NULL DEFAULT '2027-01-10',
    goal_type TEXT NOT NULL DEFAULT 'down_payment' CHECK (goal_type IN ('down_payment', 'total_cash')),
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    bike_model TEXT DEFAULT 'Royal Enfield Hunter 350',
    bike_variant TEXT DEFAULT 'Mid',
    bike_colour TEXT DEFAULT 'Graphite Grey',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.savings_goals(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
    category TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.savings_goals(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    planned_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, goal_id, target_date)
);

CREATE TABLE IF NOT EXISTS public.dealer_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    dealer_name TEXT NOT NULL,
    location TEXT NOT NULL,
    ex_showroom NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    rto NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    insurance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    accessories NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    other_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    on_road_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    booking_amount NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    notes TEXT,
    is_preferred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loan_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    principal NUMERIC(12, 2) NOT NULL DEFAULT 84220.00,
    annual_interest_rate NUMERIC(5, 2) NOT NULL DEFAULT 7.70,
    tenure_months INT NOT NULL DEFAULT 36,
    processing_fee NUMERIC(12, 2) NOT NULL DEFAULT 1500.00,
    emi NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_interest NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_repayment NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    lender_name TEXT DEFAULT 'HDFC Bank Two Wheeler Loan',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_checklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.purchase_checklist ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE public.purchase_checklist ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
ALTER TABLE public.purchase_checklist ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.savings_goals ADD COLUMN IF NOT EXISTS bike_model TEXT DEFAULT 'Royal Enfield Hunter 350';
ALTER TABLE public.savings_goals ADD COLUMN IF NOT EXISTS bike_variant TEXT DEFAULT 'Mid';
ALTER TABLE public.savings_goals ADD COLUMN IF NOT EXISTS bike_colour TEXT DEFAULT 'Graphite Grey';

ALTER TABLE public.dealer_quotes ADD COLUMN IF NOT EXISTS is_preferred BOOLEAN DEFAULT FALSE;
ALTER TABLE public.dealer_quotes ADD COLUMN IF NOT EXISTS booking_amount NUMERIC(12, 2) DEFAULT 5000.00;
ALTER TABLE public.dealer_quotes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.loan_plans ADD COLUMN IF NOT EXISTS lender_name TEXT DEFAULT 'HDFC Bank Two Wheeler Loan';
ALTER TABLE public.loan_plans ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.loan_plans ADD COLUMN IF NOT EXISTS total_cost_of_purchase NUMERIC(12, 2) DEFAULT 0.00;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own goals" ON public.savings_goals;
CREATE POLICY "Users can view own goals" ON public.savings_goals FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view/modify own transactions" ON public.transactions;
CREATE POLICY "Users can view/modify own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view/modify own daily targets" ON public.daily_targets;
CREATE POLICY "Users can view/modify own daily targets" ON public.daily_targets FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view/modify own quotes" ON public.dealer_quotes;
CREATE POLICY "Users can view/modify own quotes" ON public.dealer_quotes FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view/modify own loan plans" ON public.loan_plans;
CREATE POLICY "Users can view/modify own loan plans" ON public.loan_plans FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view/modify own checklist" ON public.purchase_checklist;
CREATE POLICY "Users can view/modify own checklist" ON public.purchase_checklist FOR ALL USING (auth.uid() = user_id);
`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-4 pb-12 max-w-lg mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Settings & Goals</h2>
        <p className="text-xs text-slate-500">Configure target date, amounts, and reminders</p>
      </div>

      {/* Main Settings Form */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Purchase Goal</h3>
              <p className="text-[11px] text-slate-500">Target price & delivery deadline</p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Target Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-emerald-700 font-bold text-base">
                ₹
              </span>
              <input
                type="number"
                step="any"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-4 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 transition-all shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Target Date *
            </label>
            <input
              type="date"
              required
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 transition-all shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Goal Represents *
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setGoalType('down_payment')}
                className={`py-2 rounded-xl text-xs font-bold transition-all tap-highlight ${
                  goalType === 'down_payment'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Down Payment
              </button>
              <button
                type="button"
                onClick={() => setGoalType('total_cash')}
                className={`py-2 rounded-xl text-xs font-bold transition-all tap-highlight ${
                  goalType === 'total_cash'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Full Cash
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Model
              </label>
              <input
                type="text"
                value={bikeModel}
                onChange={(e) => setBikeModel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Variant
              </label>
              <input
                type="text"
                value={bikeVariant}
                onChange={(e) => setBikeVariant(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Colour
              </label>
              <input
                type="text"
                value={bikeColour}
                onChange={(e) => setBikeColour(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            {isSaved ? (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Saved!
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Auto-updates calculations</span>
            )}
            <Button type="submit" variant="primary" size="md" icon={<Save className="w-4 h-4" />}>
              Save Target
            </Button>
          </div>
        </form>
      </div>

      {/* Push Notifications Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Push Notifications & Reminders</h3>
              <p className="text-[11px] text-slate-500">Phone alerts with exact calculated savings</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${notificationsEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
            {notificationsEnabled ? 'Active' : 'Off'}
          </span>
        </div>

        {/* Dynamic Status Pill */}
        {(() => {
          const needed = Math.max(0, metrics.todayPlannedSavings - metrics.todayActualSavings);
          const isMet = needed <= 0 && metrics.todayPlannedSavings > 0;
          return (
            <div className={`p-3 rounded-2xl border ${
              isMet
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {isMet ? 'Target Completed for Today' : 'Deposit Pending for Today'}
                </span>
                <span className="text-xs font-black font-mono">
                  {isMet ? 'Saved' : `₹${needed.toLocaleString('en-IN')} Remaining`}
                </span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {isMet
                  ? `Today's target of ₹${metrics.todayPlannedSavings.toLocaleString('en-IN')} has been fulfilled. Hourly reminders are paused until tomorrow.`
                  : `Target: ₹${metrics.todayPlannedSavings.toLocaleString('en-IN')} needed today. Background hourly notifications remain active until your deposit is recorded.`}
              </p>
            </div>
          );
        })()}

        {/* Master Toggle & Controls */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">Push Notifications</p>
              <p className="text-[10px] text-slate-500">Device lock screen and system tray alerts</p>
            </div>
            <Button
              type="button"
              variant={notificationsEnabled ? 'danger' : 'primary'}
              size="sm"
              onClick={async () => {
                await setNotificationsEnabled(!notificationsEnabled);
              }}
              icon={<BellRing className="w-3.5 h-3.5" />}
            >
              {notificationsEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>

          {/* Hourly Reminder Toggle */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
            <div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <p className="text-xs font-bold text-slate-900">Hourly Deposit Reminders</p>
              </div>
              <p className="text-[10px] text-slate-500">Alerts repeat every hour until today's deposit is recorded</p>
            </div>
            <button
              type="button"
              onClick={() => setHourlyRemindersEnabled(!hourlyRemindersEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                hourlyRemindersEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
            </button>
          </div>

          {/* Quiet Hours Toggle */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
            <div>
              <div className="flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <p className="text-xs font-bold text-slate-900">Quiet Hours (11:00 PM – 8:00 AM)</p>
              </div>
              <p className="text-[10px] text-slate-500">Mutes overnight alerts to avoid sleep interruptions</p>
            </div>
            <button
              type="button"
              onClick={() => setQuietHoursEnabled(!quietHoursEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                quietHoursEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
            </button>
          </div>

          {/* Voice Alert Language Selector (Addressed to Leena Mundhada) */}
          <div className="pt-2.5 border-t border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                Voice & Alert Language (For Leena Mundhada)
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Loud Alarm + TTS
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Personalized speech and notification language:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {(() => {
                const neededPreview = Math.max(0, metrics.todayPlannedSavings - metrics.todayActualSavings) || metrics.todayPlannedSavings;
                const amtText = neededPreview.toLocaleString('en-IN');
                return [
                  { id: 'hinglish', label: 'Hinglish', desc: `लीना जी, आज ₹${amtText} जमा...` },
                  { id: 'hindi', label: 'Hindi (हिंदी)', desc: `नमस्ते लीना जी! आज ₹${amtText}...` },
                  { id: 'marathi', label: 'Marathi (मराठी)', desc: `नमस्कार लीना ताई! आज ₹${amtText}...` },
                  { id: 'english', label: 'English', desc: `Hello Leena! Today ₹${amtText}...` },
                ];
              })().map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setVoiceLanguage(opt.id as any)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    voiceLanguage === opt.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">{opt.label}</p>
                  <p className="text-[10px] text-slate-500 truncate">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Native Android Background Reliability Status & Samsung Guard */}
        {isNative && backgroundStatus && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <p className="text-xs font-bold text-slate-900">Background Engine Status (Killed-App Ready)</p>
              </div>
              {backgroundStatus.nextAlarmAt > 0 && notificationsEnabled && hourlyRemindersEnabled && (
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Next: {new Date(backgroundStatus.nextAlarmAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Push & Lockscreen Notifications</span>
                {backgroundStatus.notificationsEnabled ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Allowed
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={openNotificationPermissionSettings}
                    className="text-rose-700 font-bold underline"
                  >
                    Allow Now
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Exact Alarm Clock (Doze Bypass)</span>
                {backgroundStatus.canScheduleExactAlarms ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Armed
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={openAlarmPermissionSettings}
                    className="text-amber-700 font-bold underline"
                  >
                    Enable Exact Alarm
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 flex items-center gap-1">
                  <BatteryCharging className="w-3.5 h-3.5 text-slate-500" />
                  Background Battery (Unrestricted)
                </span>
                {backgroundStatus.ignoringBatteryOptimizations ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Unrestricted
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={requestBatteryUnrestricted}
                    className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-bold border border-amber-300"
                  >
                    Set Unrestricted
                  </button>
                )}
              </div>
            </div>

            {!backgroundStatus.ignoringBatteryOptimizations && (
              <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Samsung phones may sleep killed apps unless Battery is <strong>Unrestricted</strong>. Tap <strong>Set Unrestricted</strong> above for PhonePe-level background delivery.
                </span>
              </p>
            )}
          </div>
        )}

        {/* Test Buttons */}
        <div className="pt-1 space-y-2">
          <p className="text-[11px] text-slate-500">
            Verify push delivery and live calculated amount on your device:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Zap className="w-3.5 h-3.5 text-amber-600" />}
              onClick={async () => {
                const res = await testHourlyReminder();
                if (res.permission === 'denied') {
                  setNotificationStatusMsg('Notifications are blocked. Tap Allow in App Notification settings.');
                } else {
                  setNotificationStatusMsg(`Loud alarm & voice sent (Amount: ₹${(Math.max(0, metrics.todayPlannedSavings - metrics.todayActualSavings) || metrics.todayPlannedSavings).toLocaleString('en-IN')}).`);
                }
                setTimeout(() => setNotificationStatusMsg(''), 6000);
              }}
            >
              Send Test Now
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={<Smartphone className="w-3.5 h-3.5" />}
              onClick={async () => {
                const res = await scheduleBackgroundHourlyTest(10);
                if (res.permission === 'denied') {
                  setNotificationStatusMsg('Notifications are blocked. Allow notifications first.');
                } else {
                  setNotificationStatusMsg('Armed! Swipe/kill the app or lock screen — loud alarm & TTS arrives in 10s.');
                }
                setTimeout(() => setNotificationStatusMsg(''), 10000);
              }}
            >
              Kill-Test (10s)
            </Button>
          </div>
        </div>

        {notificationStatusMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium animate-fadeIn">
            {notificationStatusMsg}
          </div>
        )}

        {currentPermission === 'denied' && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {isNative ? (
              <span>
                <strong>Notifications Disabled:</strong>{' '}
                <button type="button" onClick={openNotificationPermissionSettings} className="underline font-bold">
                  Tap here to enable Notifications
                </button>{' '}
                in Android App Settings.
              </span>
            ) : (
              <span>
                <strong>Notifications Blocked:</strong> Click the lock icon 🔒 in your browser address bar and change Notifications to <strong>"Allow"</strong>.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cloud & Backup Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-3 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cloud Sync & Backups</h3>
              <p className="text-[11px] text-slate-500">{supabaseStatusMessage}</p>
            </div>
          </div>
          <span className={`w-2.5 h-2.5 rounded-full ${isSupabaseOnline ? 'bg-emerald-600' : 'bg-amber-500'}`} />
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={exportTransactionsCSV}
            icon={<Download className="w-3.5 h-3.5" />}
            className="flex-1"
          >
            Ledger CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={exportReportCSV}
            icon={<Download className="w-3.5 h-3.5" />}
            className="flex-1"
          >
            Full Report
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={copySqlToClipboard}
            icon={<Copy className="w-3.5 h-3.5" />}
          >
            {copiedSql ? 'Copied!' : 'SQL'}
          </Button>
        </div>
      </div>
    </div>
  );
};
