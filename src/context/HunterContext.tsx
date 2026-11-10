import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Transaction,
  SavingsGoal,
  ChecklistItem,
  DealerQuote,
  AccessoryItem,
  LoanPlan,
  CalculationMetrics,
  MilestoneStatus,
  ActivePage,
} from '../types';
import {
  APP_CONFIG,
  DEFAULT_CHECKLIST,
  DEFAULT_ACCESSORIES,
  DEFAULT_DEALER_QUOTES,
  DEFAULT_MILESTONES,
} from '../lib/constants';
import { calculateMetrics, calculateLoan } from '../lib/calculations';
import { supabase, isSupabaseConfigured, testSupabaseConnection } from '../lib/supabase';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  scheduleBackgroundNotification,
  sendMilestoneNotification,
  sendDailyReminderNotification,
  sendHourlyDepositReminder,
  scheduleBackgroundHourlyTest,
  syncHourlyReminderWithServiceWorker,
  speakDynamicAlert,
} from '../lib/notifications';
import { getTodayString } from '../lib/formatters';
import { Capacitor } from '@capacitor/core';
import { isNativePlatform, registerNativeNotificationActions } from '../lib/native-notifications';

interface HunterContextType {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  goal: SavingsGoal;
  updateGoal: (updates: Partial<SavingsGoal>) => Promise<void>;
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'created_at'>) => Promise<Transaction>;
  editTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  metrics: CalculationMetrics;
  milestones: MilestoneStatus[];
  checklist: ChecklistItem[];
  updateChecklistItem: (id: string, updates: Partial<ChecklistItem>) => Promise<void>;
  addChecklistItem: (item: Omit<ChecklistItem, 'id' | 'created_at'>) => Promise<void>;
  deleteChecklistItem: (id: string) => Promise<void>;
  dealerQuotes: DealerQuote[];
  addDealerQuote: (quote: Omit<DealerQuote, 'id' | 'created_at'>) => Promise<void>;
  updateDealerQuote: (id: string, updates: Partial<DealerQuote>) => Promise<void>;
  deleteDealerQuote: (id: string) => Promise<void>;
  setPreferredQuote: (id: string) => Promise<void>;
  accessories: AccessoryItem[];
  toggleAccessory: (id: string) => void;
  loanPlan: LoanPlan;
  updateLoanPlan: (updates: Partial<LoanPlan>) => Promise<void>;
  loanCalculation: ReturnType<typeof calculateLoan>;
  isSupabaseOnline: boolean;
  supabaseStatusMessage: string;
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
  exportTransactionsCSV: () => Promise<void>;
  exportReportCSV: () => Promise<void>;
  triggerCelebration: () => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  reminderTime: string;
  setReminderTime: (time: string) => void;
  hourlyRemindersEnabled: boolean;
  setHourlyRemindersEnabled: (enabled: boolean) => void;
  quietHoursEnabled: boolean;
  setQuietHoursEnabled: (enabled: boolean) => void;
  testNotification: () => Promise<any>;
  scheduleBackgroundTest: (delaySeconds?: number) => Promise<any>;
  testHourlyReminder: () => Promise<any>;
  scheduleBackgroundHourlyTest: (delaySeconds?: number) => Promise<any>;
  voiceLanguage: 'english' | 'hinglish' | 'hindi' | 'marathi';
  setVoiceLanguage: (lang: 'english' | 'hinglish' | 'hindi' | 'marathi') => void;
}

const HunterContext = createContext<HunterContextType | undefined>(undefined);

const STORAGE_KEYS = {
  GOAL: 'hunter_fund_goal_v1',
  TRANSACTIONS: 'hunter_fund_transactions_v1',
  CHECKLIST: 'hunter_fund_checklist_v1',
  QUOTES: 'hunter_fund_quotes_v1',
  ACCESSORIES: 'hunter_fund_accessories_v1',
  LOAN: 'hunter_fund_loan_v1',
};

// Initial default state
const initialGoal: SavingsGoal = {
  id: 'hunter-goal-primary',
  goal_name: APP_CONFIG.bikeModel,
  target_amount: APP_CONFIG.defaultTargetAmount,
  target_date: APP_CONFIG.defaultTargetDate,
  goal_type: 'down_payment',
  opening_balance: APP_CONFIG.defaultOpeningBalance,
  bike_model: APP_CONFIG.bikeModel,
  bike_variant: APP_CONFIG.defaultVariant,
  bike_colour: APP_CONFIG.defaultColour,
  created_at: new Date().toISOString(),
};

// Initial recorded transaction of ₹52,000 on 31 October 2026
const initialTransactions: Transaction[] = [
  {
    id: 'tx-seed-001',
    goal_id: 'hunter-goal-primary',
    amount: APP_CONFIG.initialRecordedDeposit,
    transaction_type: 'deposit',
    category: 'Daily Savings',
    transaction_date: APP_CONFIG.initialTransactionDate,
    note: APP_CONFIG.initialTransactionNote,
    created_at: new Date('2026-10-31T00:00:00Z').toISOString(),
  },
];

const initialLoanPlan: LoanPlan = {
  id: 'loan-primary',
  principal: 84220,
  annual_interest_rate: 7.7,
  tenure_months: 36,
  processing_fee: 1500,
  emi: 2629,
  total_interest: 10424,
  total_repayment: 94644,
  total_cost_of_purchase: 96144,
  lender_name: 'Two-Wheeler Easy Finance',
  notes: 'Example plan for balance payment after ₹1,30,000 down payment',
  created_at: new Date().toISOString(),
};

export const HunterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSupabaseOnline, setIsSupabaseOnline] = useState(false);
  const [supabaseStatusMessage, setSupabaseStatusMessage] = useState('Checking connection...');

  // 1. Goal state
  const [goal, setGoal] = useState<SavingsGoal>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GOAL);
      return saved ? JSON.parse(saved) : initialGoal;
    } catch {
      return initialGoal;
    }
  });

  // 2. Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If initial seed was dated today, migrate to yesterday so today starts clean with ₹0 actual savings
          return parsed.map((t: Transaction) => {
            if (t.id === 'tx-seed-001' && t.transaction_date === '2026-10-31') {
              return { ...t, transaction_date: '2026-10-30', note: 'Previous savings balance' };
            }
            return t;
          });
        }
      }
      return initialTransactions;
    } catch {
      return initialTransactions;
    }
  });

  // 3. Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CHECKLIST);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_CHECKLIST.map((item, idx) => ({
        ...item,
        id: `check-${idx + 1}`,
        created_at: new Date().toISOString(),
      }));
    } catch {
      return DEFAULT_CHECKLIST.map((item, idx) => ({
        ...item,
        id: `check-${idx + 1}`,
        created_at: new Date().toISOString(),
      }));
    }
  });

  // 4. Dealer Quotes
  const [dealerQuotes, setDealerQuotes] = useState<DealerQuote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.QUOTES);
      return saved ? JSON.parse(saved) : DEFAULT_DEALER_QUOTES;
    } catch {
      return DEFAULT_DEALER_QUOTES;
    }
  });

  // 5. Accessories
  const [accessories, setAccessories] = useState<AccessoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACCESSORIES);
      return saved ? JSON.parse(saved) : DEFAULT_ACCESSORIES;
    } catch {
      return DEFAULT_ACCESSORIES;
    }
  });

  // 6. Loan Plan
  const [loanPlan, setLoanPlan] = useState<LoanPlan>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOAN);
      return saved ? JSON.parse(saved) : initialLoanPlan;
    } catch {
      return initialLoanPlan;
    }
  });

  // Notifications State
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('hunter_fund_notifications');
    if (Capacitor.isNativePlatform()) {
      return saved !== 'false';
    }
    return saved === 'true';
  });

  const [reminderTime, setReminderTimeState] = useState<string>(() => {
    return localStorage.getItem('hunter_fund_reminder_time') || '20:00';
  });

  const [hourlyRemindersEnabled, setHourlyRemindersEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('hunter_fund_hourly_reminders');
    return saved !== null ? saved === 'true' : true;
  });

  const [quietHoursEnabled, setQuietHoursEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('hunter_fund_quiet_hours');
    return saved !== null ? saved === 'true' : true;
  });

  const [voiceLanguage, setVoiceLanguageState] = useState<'english' | 'hinglish' | 'hindi' | 'marathi'>(() => {
    return ((localStorage.getItem('hunter_fund_voice_lang') as any) || 'hinglish');
  });

  const setVoiceLanguage = useCallback((lang: 'english' | 'hinglish' | 'hindi' | 'marathi') => {
    setVoiceLanguageState(lang);
    localStorage.setItem('hunter_fund_voice_lang', lang);
  }, []);

  const setHourlyRemindersEnabled = useCallback((enabled: boolean) => {
    setHourlyRemindersEnabledState(enabled);
    localStorage.setItem('hunter_fund_hourly_reminders', enabled ? 'true' : 'false');
  }, []);

  const setQuietHoursEnabled = useCallback((enabled: boolean) => {
    setQuietHoursEnabledState(enabled);
    localStorage.setItem('hunter_fund_quiet_hours', enabled ? 'true' : 'false');
  }, []);

  const setNotificationsEnabled = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      const perm = await requestNotificationPermission();
      if (perm === 'granted') {
        setNotificationsEnabledState(true);
        localStorage.setItem('hunter_fund_notifications', 'true');
        await sendTestNotification();
        return true;
      } else {
        setNotificationsEnabledState(false);
        localStorage.setItem('hunter_fund_notifications', 'false');
        return false;
      }
    } else {
      setNotificationsEnabledState(false);
      localStorage.setItem('hunter_fund_notifications', 'false');
      return false;
    }
  }, []);

  const setReminderTime = useCallback((time: string) => {
    setReminderTimeState(time);
    localStorage.setItem('hunter_fund_reminder_time', time);
  }, []);

  const testNotification = useCallback(async () => {
    return sendTestNotification();
  }, []);

  const scheduleBackgroundTest = useCallback(async (delaySeconds: number = 6) => {
    return scheduleBackgroundNotification(delaySeconds);
  }, []);

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GOAL, JSON.stringify(goal));
  }, [goal]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(checklist));
  }, [checklist]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(dealerQuotes));
  }, [dealerQuotes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACCESSORIES, JSON.stringify(accessories));
  }, [accessories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOAN, JSON.stringify(loanPlan));
  }, [loanPlan]);

  // Test Supabase connection on load
  useEffect(() => {
    let mounted = true;
    async function checkSupabase() {
      if (!isSupabaseConfigured) {
        if (mounted) {
          setIsSupabaseOnline(false);
          setSupabaseStatusMessage('Demo Mode (Local Ledger Active)');
        }
        return;
      }

      const res = await testSupabaseConnection();
      if (mounted) {
        if (res.connected && res.tablesReady) {
          setIsSupabaseOnline(true);
          setSupabaseStatusMessage('Supabase Connected');
        } else if (res.connected) {
          setIsSupabaseOnline(true);
          setSupabaseStatusMessage('Connected (Run SQL Migration to sync cloud)');
        } else {
          setIsSupabaseOnline(false);
          setSupabaseStatusMessage(res.error || 'Cloud sync offline');
        }
      }
    }
    checkSupabase();
    return () => {
      mounted = false;
    };
  }, []);

  // Recalculate metrics
  const metrics = useMemo(() => {
    return calculateMetrics(goal, transactions);
  }, [goal, transactions]);

  const testHourlyReminder = useCallback(async () => {
    const needed = Math.max(0, metrics.todayPlannedSavings - metrics.todayActualSavings);
    const neededAmount = needed > 0 ? needed : metrics.todayPlannedSavings;
    
    // 1. First trigger notification with loud 1.8s alarm chime
    const result = await sendHourlyDepositReminder({
      neededToday: neededAmount,
      todayPlannedSavings: metrics.todayPlannedSavings,
      todayActualSavings: metrics.todayActualSavings,
      remainingAmount: metrics.remainingAmount,
      currentBalance: metrics.currentBalance,
      targetAmount: metrics.targetAmount,
      daysRemaining: metrics.daysRemaining,
      bikeModel: goal.bike_model,
      language: voiceLanguage,
    });

    // 2. Speak dynamic alert in natural Indian voice right after the chime
    setTimeout(() => {
      speakDynamicAlert({
        neededToday: neededAmount,
        todayPlannedSavings: metrics.todayPlannedSavings,
        todayActualSavings: metrics.todayActualSavings,
        remainingAmount: metrics.remainingAmount,
        currentBalance: metrics.currentBalance,
        targetAmount: metrics.targetAmount,
        daysRemaining: metrics.daysRemaining,
        bikeModel: goal.bike_model,
        language: voiceLanguage,
      }).catch(() => {});
    }, 1200);

    return result;
  }, [metrics, goal.bike_model, voiceLanguage]);

  const scheduleBackgroundHourlyTestCallback = useCallback(async (delaySeconds: number = 10) => {
    const needed = Math.max(0, metrics.todayPlannedSavings - metrics.todayActualSavings);
    return scheduleBackgroundHourlyTest({
      delaySeconds,
      neededToday: needed > 0 ? needed : metrics.todayPlannedSavings,
      todayPlannedSavings: metrics.todayPlannedSavings,
      todayActualSavings: metrics.todayActualSavings,
      remainingAmount: metrics.remainingAmount,
      currentBalance: metrics.currentBalance,
      targetAmount: metrics.targetAmount,
      daysRemaining: metrics.daysRemaining,
      bikeModel: goal.bike_model,
      language: voiceLanguage,
    });
  }, [metrics, goal.bike_model, voiceLanguage]);

  // Loan calculation
  const loanCalculation = useMemo(() => {
    return calculateLoan(
      loanPlan.principal,
      loanPlan.annual_interest_rate,
      loanPlan.tenure_months,
      loanPlan.processing_fee
    );
  }, [loanPlan]);

  // Sync Hourly Reminder configuration with Service Worker
  useEffect(() => {
    const neededToday = Math.max(0, metrics.todayPlannedSavings - metrics.todayActualSavings);
    syncHourlyReminderWithServiceWorker({
      enabled: notificationsEnabled && hourlyRemindersEnabled,
      todayPlannedSavings: metrics.todayPlannedSavings,
      todayActualSavings: metrics.todayActualSavings,
      neededToday,
      todayDate: getTodayString(),
      bikeModel: goal.bike_model,
      intervalMinutes: 60,
      quietHoursEnabled,
      quietHoursStart: 23,
      quietHoursEnd: 8,
    });
  }, [
    notificationsEnabled,
    hourlyRemindersEnabled,
    quietHoursEnabled,
    metrics.todayPlannedSavings,
    metrics.todayActualSavings,
    goal.bike_model,
  ]);

  // In-page Hourly Watchdog: Checks periodically if today's deposit is pending
  useEffect(() => {
    if (!notificationsEnabled || !hourlyRemindersEnabled) return;

    const checkHourlyStatus = () => {
      const neededToday = Math.max(0, metrics.todayPlannedSavings - metrics.todayActualSavings);
      // If already saved or deposited today, do not alert
      if (neededToday <= 0) return;

      if (quietHoursEnabled) {
        const hour = new Date().getHours();
        if (hour >= 23 || hour < 8) return;
      }

      const lastAlert = Number(localStorage.getItem('hunter_fund_last_hourly_alert')) || 0;
      const now = Date.now();
      // Send reminder if >= 55 minutes have passed since last hourly alert
      if (now - lastAlert >= 55 * 60 * 1000) {
        localStorage.setItem('hunter_fund_last_hourly_alert', now.toString());
        sendHourlyDepositReminder({
          neededToday,
          todayPlannedSavings: metrics.todayPlannedSavings,
          todayActualSavings: metrics.todayActualSavings,
          remainingAmount: metrics.remainingAmount,
          currentBalance: metrics.currentBalance,
          targetAmount: metrics.targetAmount,
          daysRemaining: metrics.daysRemaining,
          bikeModel: goal.bike_model,
          language: voiceLanguage,
        });
      }
    };

    const interval = setInterval(checkHourlyStatus, 30000);
    return () => clearInterval(interval);
  }, [
    notificationsEnabled,
    hourlyRemindersEnabled,
    quietHoursEnabled,
    voiceLanguage,
    metrics.todayPlannedSavings,
    metrics.todayActualSavings,
    metrics.remainingAmount,
    metrics.currentBalance,
    metrics.targetAmount,
    metrics.daysRemaining,
    goal.bike_model,
  ]);

  // Handle Quick Deposit action from notifications and deep links
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'quick-deposit') {
        setIsQuickAddOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_QUICK_ADD') {
        setIsQuickAddOpen(true);
      }
    };

    const handleCustomOpen = () => {
      setIsQuickAddOpen(true);
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }
    window.addEventListener('hunter-open-quick-add', handleCustomOpen);

    // Register native notification tap listener on Android & request permission
    if (isNativePlatform()) {
      registerNativeNotificationActions(() => {
        setIsQuickAddOpen(true);
      });
      requestNotificationPermission().then((status) => {
        if (status === 'granted') {
          setNotificationsEnabledState(true);
          localStorage.setItem('hunter_fund_notifications', 'true');
        }
      });
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
      window.removeEventListener('hunter-open-quick-add', handleCustomOpen);
    };
  }, []);

  // Celebration helper
  const triggerCelebration = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a3e635', '#22c55e', '#ffffff', '#eab308'],
      });
    } catch {
      // safe fallback
    }
  }, []);

  // Milestones calculation
  const milestones: MilestoneStatus[] = useMemo(() => {
    const sortedTx = [...transactions].sort(
      (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    return DEFAULT_MILESTONES.map((m) => {
      const isAchieved = metrics.currentBalance >= m.amount;
      const progressPercent = Math.min(100, Math.max(0, (metrics.currentBalance / m.amount) * 100));
      const remainingToMilestone = Math.max(0, m.amount - metrics.currentBalance);

      // Find earliest date when balance crossed milestone if achieved
      let achievedDate: string | undefined;
      if (isAchieved) {
        let runningBal = Number(goal.opening_balance) || 0;
        for (const t of sortedTx) {
          if (t.transaction_type === 'deposit') {
            runningBal += Number(t.amount);
          } else if (t.transaction_type === 'withdrawal') {
            runningBal -= Number(t.amount);
          }
          if (runningBal >= m.amount) {
            achievedDate = t.transaction_date;
            break;
          }
        }
        if (!achievedDate) achievedDate = APP_CONFIG.initialTransactionDate;
      }

      return {
        ...m,
        isAchieved,
        achievedDate,
        progressPercent: Math.round(progressPercent * 10) / 10,
        remainingToMilestone,
      };
    });
  }, [metrics.currentBalance, transactions, goal.opening_balance]);

  // CRUD for Transactions
  const addTransaction = useCallback(
    async (txData: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> => {
      const amount = Number(txData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Transaction amount must be greater than zero.');
      }

      const newTx: Transaction = {
        ...txData,
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        amount: Math.round(amount * 100) / 100,
        created_at: new Date().toISOString(),
      };

      setTransactions((prev) => [newTx, ...prev]);

      // Check if this deposit pushed past a milestone
      const prevBal = metrics.currentBalance;
      const nextBal =
        txData.transaction_type === 'deposit' ? prevBal + amount : prevBal - amount;

      const crossedMilestone = DEFAULT_MILESTONES.find(
        (m) => prevBal < m.amount && nextBal >= m.amount
      );
      if (crossedMilestone) {
        triggerCelebration();
        if (notificationsEnabled) {
          sendMilestoneNotification(crossedMilestone.amount).catch(() => {});
        }
      }

      // Sync with Supabase if online
      if (supabase && isSupabaseOnline) {
        try {
          await supabase.from('transactions').insert({
            amount: newTx.amount,
            transaction_type: newTx.transaction_type,
            category: newTx.category,
            transaction_date: newTx.transaction_date,
            note: newTx.note || null,
          });
        } catch (err) {
          console.warn('Could not sync transaction to Supabase:', err);
        }
      }

      return newTx;
    },
    [metrics.currentBalance, isSupabaseOnline, triggerCelebration]
  );

  const editTransaction = useCallback(
    async (id: string, updates: Partial<Transaction>) => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
      );

      if (supabase && isSupabaseOnline) {
        try {
          await supabase.from('transactions').update(updates).eq('id', id);
        } catch (err) {
          console.warn('Could not update transaction on Supabase:', err);
        }
      }
    },
    [isSupabaseOnline]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));

      if (supabase && isSupabaseOnline) {
        try {
          await supabase.from('transactions').delete().eq('id', id);
        } catch (err) {
          console.warn('Could not delete transaction on Supabase:', err);
        }
      }
    },
    [isSupabaseOnline]
  );

  const updateGoal = useCallback(async (updates: Partial<SavingsGoal>) => {
    setGoal((prev) => ({
      ...prev,
      ...updates,
      updated_at: new Date().toISOString(),
    }));
  }, []);

  // Checklist CRUD
  const updateChecklistItem = useCallback(async (id: string, updates: Partial<ChecklistItem>) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const addChecklistItem = useCallback(
    async (item: Omit<ChecklistItem, 'id' | 'created_at'>) => {
      const newItem: ChecklistItem = {
        ...item,
        id: `check-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      setChecklist((prev) => [...prev, newItem]);
    },
    []
  );

  const deleteChecklistItem = useCallback(async (id: string) => {
    setChecklist((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // Dealer Quotes CRUD
  const addDealerQuote = useCallback(async (quote: Omit<DealerQuote, 'id' | 'created_at'>) => {
    const newQuote: DealerQuote = {
      ...quote,
      id: `quote-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setDealerQuotes((prev) => [newQuote, ...prev]);
  }, []);

  const updateDealerQuote = useCallback(async (id: string, updates: Partial<DealerQuote>) => {
    setDealerQuotes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  }, []);

  const deleteDealerQuote = useCallback(async (id: string) => {
    setDealerQuotes((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const setPreferredQuote = useCallback(async (id: string) => {
    setDealerQuotes((prev) =>
      prev.map((q) => ({
        ...q,
        is_preferred: q.id === id,
      }))
    );
  }, []);

  // Accessories
  const toggleAccessory = useCallback((id: string) => {
    setAccessories((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, selected: !acc.selected } : acc))
    );
  }, []);

  // Loan Plan
  const updateLoanPlan = useCallback(async (updates: Partial<LoanPlan>) => {
    setLoanPlan((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Export CSV functions
  const exportTransactionsCSV = useCallback(async () => {
    const headers = ['ID', 'Date', 'Type', 'Category', 'Amount (INR)', 'Note', 'Timestamp'];
    const rows = transactions.map((t) => [
      t.id,
      t.transaction_date,
      t.transaction_type.toUpperCase(),
      `"${t.category}"`,
      t.amount,
      `"${(t.note || '').replace(/"/g, '""')}"`,
      t.created_at,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        const fileName = `Hunter_Fund_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
        const result = await Filesystem.writeFile({
          path: fileName,
          data: btoa(unescape(encodeURIComponent(csvContent))),
          directory: Directory.Cache,
        });
        await Share.share({
          title: 'Hunter Fund — Transaction Ledger',
          url: result.uri,
        });
      } catch (err) {
        console.error('Native export failed:', err);
      }
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Hunter_Fund_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [transactions]);

  const exportReportCSV = useCallback(async () => {
    const reportData = [
      ['HUNTER FUND – Royal Enfield Hunter 350 Purchase Report'],
      ['Generated On', new Date().toLocaleString('en-IN')],
      [''],
      ['Target Bike', goal.bike_model],
      ['Variant', goal.bike_variant],
      ['Colour', goal.bike_colour],
      ['Target Date', goal.target_date],
      ['Goal Type', goal.goal_type === 'down_payment' ? 'Down Payment' : 'Total Cash'],
      ['Target Amount (INR)', metrics.targetAmount],
      ['Current Available Balance (INR)', metrics.currentBalance],
      ['Remaining Amount (INR)', metrics.remainingAmount],
      ['Completion Percentage', `${metrics.progressPercentage}%`],
      ['Days Remaining', metrics.daysRemaining],
      ['Daily Required Savings (INR)', metrics.dailyRequiredSavings],
      ['Weekly Required Savings (INR)', metrics.weeklyRequiredSavings],
      ['Total Deposits (INR)', metrics.totalDeposits],
      ['Total Withdrawals (INR)', metrics.totalWithdrawals],
      ['Total Transactions Logged', transactions.length],
    ];

    const csvContent = reportData.map((row) => row.join(',')).join('\n');

    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        const fileName = `Hunter_Fund_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`;
        const result = await Filesystem.writeFile({
          path: fileName,
          data: btoa(unescape(encodeURIComponent(csvContent))),
          directory: Directory.Cache,
        });
        await Share.share({
          title: 'Hunter Fund — Financial Report',
          url: result.uri,
        });
      } catch (err) {
        console.error('Native report export failed:', err);
      }
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Hunter_Fund_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [goal, metrics, transactions.length]);

  return (
    <HunterContext.Provider
      value={{
        activePage,
        setActivePage,
        goal,
        updateGoal,
        transactions,
        addTransaction,
        editTransaction,
        deleteTransaction,
        metrics,
        milestones,
        checklist,
        updateChecklistItem,
        addChecklistItem,
        deleteChecklistItem,
        dealerQuotes,
        addDealerQuote,
        updateDealerQuote,
        deleteDealerQuote,
        setPreferredQuote,
        accessories,
        toggleAccessory,
        loanPlan,
        updateLoanPlan,
        loanCalculation,
        isSupabaseOnline,
        supabaseStatusMessage,
        isQuickAddOpen,
        setIsQuickAddOpen,
        exportTransactionsCSV,
        exportReportCSV,
        triggerCelebration,
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
        scheduleBackgroundHourlyTest: scheduleBackgroundHourlyTestCallback,
        voiceLanguage,
        setVoiceLanguage,
      }}
    >
      {children}
    </HunterContext.Provider>
  );
};

export const useHunter = () => {
  const context = useContext(HunterContext);
  if (!context) {
    throw new Error('useHunter must be used within a HunterProvider');
  }
  return context;
};

