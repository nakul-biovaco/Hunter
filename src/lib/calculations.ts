import { Transaction, SavingsGoal, CalculationMetrics } from '../types';

/**
 * Calculates calendar days difference between today and a target date in Asia/Kolkata context.
 */
export function calculateDaysRemaining(targetDateStr: string, fromDateStr?: string): number {
  const targetDate = new Date(targetDateStr + 'T00:00:00');
  const baseDate = fromDateStr ? new Date(fromDateStr + 'T00:00:00') : new Date();

  // Reset hours to start of day for exact calendar day comparison
  const d1 = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const d2 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  const diffMs = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Main calculation engine for Hunter Fund.
 * Reactively recalculates all KPIs from the complete transaction ledger and goal parameters.
 */
export function calculateMetrics(
  goal: SavingsGoal,
  transactions: Transaction[],
  currentDateStr?: string
): CalculationMetrics {
  const today = currentDateStr || new Date().toISOString().split('T')[0];

  // 1. Calculate Ledger Totals
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let todayDeposits = 0;
  let todayWithdrawals = 0;

  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.transaction_type === 'deposit') {
      totalDeposits += amount;
      if (tx.transaction_date === today) {
        todayDeposits += amount;
      }
    } else if (tx.transaction_type === 'withdrawal') {
      totalWithdrawals += amount;
      if (tx.transaction_date === today) {
        todayWithdrawals += amount;
      }
    }
  }

  // Current balance = opening_balance + deposits - withdrawals
  const openingBalance = Number(goal.opening_balance) || 0;
  const currentBalance = openingBalance + totalDeposits - totalWithdrawals;
  const targetAmount = Number(goal.target_amount) || 0;

  // Remaining Amount
  const rawRemaining = targetAmount - currentBalance;
  const remainingAmount = Math.max(0, rawRemaining);
  const targetAchieved = currentBalance >= targetAmount && targetAmount > 0;

  // Progress percentage
  let progressPercentage = 0;
  if (targetAmount > 0) {
    progressPercentage = (currentBalance / targetAmount) * 100;
  }

  // Days Remaining
  const daysRemaining = calculateDaysRemaining(goal.target_date, today);
  const targetDatePassed = daysRemaining <= 0;

  // Daily & Weekly Required Savings
  let dailyRequiredSavings = 0;
  let weeklyRequiredSavings = 0;

  if (targetAchieved) {
    dailyRequiredSavings = 0;
    weeklyRequiredSavings = 0;
  } else if (daysRemaining > 0) {
    dailyRequiredSavings = Math.ceil(remainingAmount / daysRemaining);
    weeklyRequiredSavings = dailyRequiredSavings * 7;
  } else {
    // Target date has arrived or passed and target not achieved
    dailyRequiredSavings = remainingAmount;
    weeklyRequiredSavings = remainingAmount;
  }

  // Today's Actual Savings
  const todayActualSavings = todayDeposits - todayWithdrawals;

  // Today's Planned Savings matches the daily required savings exactly
  const todayPlannedSavings = dailyRequiredSavings;

  // Daily Surplus / Deficit relative to daily required goal
  const dailySurplusDeficit = todayActualSavings - dailyRequiredSavings;

  // Projected Target Completion Date based on average daily savings rate
  let projectedCompletionDate: string | null = null;
  let isPaceAhead = false;

  if (targetAchieved) {
    projectedCompletionDate = 'Achieved';
    isPaceAhead = true;
  } else if (transactions.length > 0) {
    // Determine active savings window
    const dates = transactions.map((t) => new Date(t.transaction_date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = new Date(today).getTime();
    const daysActive = Math.max(1, Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1);

    const netSavings = totalDeposits - totalWithdrawals;
    const avgDailyRate = netSavings > 0 ? netSavings / daysActive : 0;

    if (avgDailyRate > 0) {
      const daysToComplete = Math.ceil(remainingAmount / avgDailyRate);
      const projDate = new Date();
      projDate.setDate(projDate.getDate() + daysToComplete);
      projectedCompletionDate = projDate.toISOString().split('T')[0];

      if (daysToComplete <= daysRemaining) {
        isPaceAhead = true;
      }
    } else {
      projectedCompletionDate = 'Pending Activity';
    }
  }

  return {
    currentBalance: Math.round(currentBalance * 100) / 100,
    targetAmount: Math.round(targetAmount * 100) / 100,
    remainingAmount: Math.round(remainingAmount * 100) / 100,
    progressPercentage: Math.min(100, Math.max(0, Math.round(progressPercentage * 10) / 10)),
    daysRemaining: Math.max(0, daysRemaining),
    dailyRequiredSavings: Math.ceil(dailyRequiredSavings),
    weeklyRequiredSavings: Math.ceil(weeklyRequiredSavings),
    totalDeposits: Math.round(totalDeposits * 100) / 100,
    totalWithdrawals: Math.round(totalWithdrawals * 100) / 100,
    todayPlannedSavings,
    todayActualSavings: Math.round(todayActualSavings * 100) / 100,
    dailySurplusDeficit: Math.round(dailySurplusDeficit * 100) / 100,
    projectedCompletionDate,
    targetAchieved,
    targetDatePassed,
    isPaceAhead,
  };
}

/**
 * Reducing-balance loan calculation engine
 */
export function calculateLoan(
  principal: number,
  annualRatePct: number,
  tenureMonths: number,
  processingFee: number = 0
) {
  if (principal <= 0 || tenureMonths <= 0) {
    return {
      emi: 0,
      totalInterest: 0,
      totalRepayment: 0,
      totalCostOfPurchase: 0,
      amortizationSchedule: [],
    };
  }

  const monthlyRate = annualRatePct / (12 * 100);

  let emi = 0;
  if (monthlyRate === 0) {
    emi = principal / tenureMonths;
  } else {
    emi =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  }

  const totalRepayment = emi * tenureMonths;
  const totalInterest = totalRepayment - principal;
  const totalCostOfPurchase = totalRepayment + processingFee;

  // Monthly amortization table preview
  const amortizationSchedule = [];
  let remainingPrincipal = principal;

  for (let month = 1; month <= tenureMonths; month++) {
    const interestPayment = remainingPrincipal * monthlyRate;
    const principalPayment = emi - interestPayment;
    remainingPrincipal = Math.max(0, remainingPrincipal - principalPayment);

    amortizationSchedule.push({
      month,
      emi: Math.round(emi),
      principalPayment: Math.round(principalPayment),
      interestPayment: Math.round(interestPayment),
      remainingPrincipal: Math.round(remainingPrincipal),
    });
  }

  return {
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalRepayment: Math.round(totalRepayment),
    totalCostOfPurchase: Math.round(totalCostOfPurchase),
    amortizationSchedule,
  };
}

