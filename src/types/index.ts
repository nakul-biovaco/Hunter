// Types for Hunter Fund Savings Tracker

export type TransactionType = 'deposit' | 'withdrawal';

export type DepositCategory =
  | 'Salary'
  | 'Business Income'
  | 'Scholarship'
  | 'Personal Contribution'
  | 'Other Income'
  | 'Daily Savings';

export type WithdrawalCategory =
  | 'Personal Expense'
  | 'Bike Booking'
  | 'Bike Accessories'
  | 'Insurance'
  | 'RTO'
  | 'Emergency'
  | 'Other';

export type TransactionCategory = DepositCategory | WithdrawalCategory;

export interface Transaction {
  id: string;
  user_id?: string;
  goal_id?: string;
  amount: number;
  transaction_type: TransactionType;
  category: TransactionCategory;
  transaction_date: string; // YYYY-MM-DD
  note?: string;
  created_at: string;
  updated_at?: string;
}

export type GoalType = 'down_payment' | 'total_cash';

export interface SavingsGoal {
  id: string;
  user_id?: string;
  goal_name: string;
  target_amount: number;
  target_date: string; // YYYY-MM-DD
  goal_type: GoalType;
  opening_balance: number;
  bike_model: string;
  bike_variant: string;
  bike_colour: string;
  created_at?: string;
  updated_at?: string;
}

export interface Milestone {
  amount: number;
  label: string;
  description: string;
  iconName: string;
}

export interface MilestoneStatus extends Milestone {
  isAchieved: boolean;
  achievedDate?: string;
  progressPercent: number;
  remainingToMilestone: number;
}

export interface DaySavingsSummary {
  date: string; // YYYY-MM-DD
  plannedAmount: number;
  deposits: number;
  withdrawals: number;
  netSavings: number;
  status: 'achieved' | 'partial' | 'deficit' | 'zero' | 'future';
  transactions: Transaction[];
}

export interface AccessoryItem {
  id: string;
  name: string;
  price: number;
  isMandatory: boolean;
  selected: boolean;
  partNumber?: string;
}

export interface DealerQuote {
  id: string;
  user_id?: string;
  dealer_name: string;
  location: string;
  ex_showroom: number;
  rto: number;
  insurance: number;
  accessories: number;
  other_charges: number;
  on_road_price: number;
  booking_amount: number;
  notes?: string;
  is_preferred?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LoanPlan {
  id: string;
  user_id?: string;
  principal: number;
  annual_interest_rate: number;
  tenure_months: number;
  processing_fee: number;
  emi: number;
  total_interest: number;
  total_repayment: number;
  total_cost_of_purchase: number;
  lender_name?: string;
  notes?: string;
  created_at?: string;
}

export type ChecklistStatus = 'pending' | 'in_progress' | 'completed';

export interface ChecklistItem {
  id: string;
  user_id?: string;
  task_name: string;
  category: 'Dealership & Finance' | 'Booking & Documentation' | 'PDI & Inspection' | 'Delivery & Handover' | 'Custom';
  status: ChecklistStatus;
  due_date?: string;
  notes?: string;
  order_index?: number;
  created_at?: string;
}

export interface CalculationMetrics {
  currentBalance: number;
  targetAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  daysRemaining: number;
  dailyRequiredSavings: number;
  weeklyRequiredSavings: number;
  totalDeposits: number;
  totalWithdrawals: number;
  todayPlannedSavings: number;
  todayActualSavings: number;
  dailySurplusDeficit: number;
  projectedCompletionDate: string | null;
  targetAchieved: boolean;
  targetDatePassed: boolean;
  isPaceAhead: boolean;
}

export type ActivePage =
  | 'dashboard'
  | 'add-transaction'
  | 'transactions'
  | 'calendar'
  | 'analytics'
  | 'purchase-planner'
  | 'dealer-comparison'
  | 'loan-calculator'
  | 'checklist'
  | 'settings';

