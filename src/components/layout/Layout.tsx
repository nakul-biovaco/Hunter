import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useHunter } from '../../context/HunterContext';
import { DashboardView } from '../dashboard/DashboardView';
import { TransactionsView } from '../transactions/TransactionsView';
import { SavingsCalendarView } from '../calendar/SavingsCalendarView';
import { AnalyticsView } from '../analytics/AnalyticsView';
import { PurchasePlannerView } from '../purchase/PurchasePlannerView';
import { DealerComparisonView } from '../purchase/DealerComparisonView';
import { LoanCalculatorView } from '../loan/LoanCalculatorView';
import { PurchaseChecklistView } from '../checklist/PurchaseChecklistView';
import { SettingsView } from '../settings/SettingsView';
import { TransactionFormModal } from '../transactions/TransactionFormModal';
import { AddToHomeScreenPrompt } from '../common/AddToHomeScreenPrompt';
import { InAppNotificationBanner } from '../common/InAppNotificationBanner';

export const Layout: React.FC = () => {
  const { activePage, isQuickAddOpen, setIsQuickAddOpen } = useHunter();

  const renderActiveView = () => {
    switch (activePage) {
      case 'dashboard':       return <DashboardView />;
      case 'add-transaction': return <TransactionsView />;
      case 'transactions':    return <TransactionsView />;
      case 'calendar':        return <SavingsCalendarView />;
      case 'analytics':       return <AnalyticsView />;
      case 'purchase-planner': return <PurchasePlannerView />;
      case 'dealer-comparison': return <DealerComparisonView />;
      case 'loan-calculator': return <LoanCalculatorView />;
      case 'checklist':       return <PurchaseChecklistView />;
      case 'settings':        return <SettingsView />;
      default:                return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-app-bg text-slate-900 flex flex-col font-sans">
      {/* Top Navbar - mobile */}
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 max-w-full overflow-x-hidden">
          {/* Mobile: constrained width with padding, bottom nav clearance */}
          <div className="px-4 py-4 pb-32 lg:pb-8 lg:px-8 lg:py-8 max-w-lg mx-auto lg:max-w-none">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Quick Add Modal */}
      <TransactionFormModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />

      {/* PWA Install Prompt */}
      <AddToHomeScreenPrompt />

      {/* In-App Notification Toast */}
      <InAppNotificationBanner />
    </div>
  );
};
