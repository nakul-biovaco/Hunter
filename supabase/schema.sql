-- ========================================================
-- HUNTER FUND: Database Schema Migration & Security Policies
-- Royal Enfield Hunter 350 Purchase Planner 2027
-- PostgreSQL / Supabase
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
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

-- 2. SAVINGS GOALS TABLE
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

-- 3. TRANSACTIONS TABLE
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

-- 4. DAILY TARGETS TABLE
CREATE TABLE IF NOT EXISTS public.daily_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.savings_goals(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    planned_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, goal_id, target_date)
);

-- 5. DEALER QUOTES TABLE
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

-- 6. LOAN PLANS TABLE
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

-- 7. PURCHASE CHECKLIST TABLE
CREATE TABLE IF NOT EXISTS public.purchase_checklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all optional & extended columns exist if tables were created previously
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

-- ========================================================
-- INDEXES FOR PERFORMANCE
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_goal ON public.transactions(goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_targets_user_date ON public.daily_targets(user_id, target_date);
CREATE INDEX IF NOT EXISTS idx_dealer_quotes_user ON public.dealer_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_plans_user ON public.loan_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_checklist_user ON public.purchase_checklist(user_id);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_checklist ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Savings Goals Policies
DROP POLICY IF EXISTS "Users can view own goals" ON public.savings_goals;
CREATE POLICY "Users can view own goals" ON public.savings_goals FOR ALL USING (auth.uid() = user_id);

-- Transactions Policies
DROP POLICY IF EXISTS "Users can view/modify own transactions" ON public.transactions;
CREATE POLICY "Users can view/modify own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);

-- Daily Targets Policies
DROP POLICY IF EXISTS "Users can view/modify own daily targets" ON public.daily_targets;
CREATE POLICY "Users can view/modify own daily targets" ON public.daily_targets FOR ALL USING (auth.uid() = user_id);

-- Dealer Quotes Policies
DROP POLICY IF EXISTS "Users can view/modify own quotes" ON public.dealer_quotes;
CREATE POLICY "Users can view/modify own quotes" ON public.dealer_quotes FOR ALL USING (auth.uid() = user_id);

-- Loan Plans Policies
DROP POLICY IF EXISTS "Users can view/modify own loan plans" ON public.loan_plans;
CREATE POLICY "Users can view/modify own loan plans" ON public.loan_plans FOR ALL USING (auth.uid() = user_id);

-- Purchase Checklist Policies
DROP POLICY IF EXISTS "Users can view/modify own checklist" ON public.purchase_checklist;
CREATE POLICY "Users can view/modify own checklist" ON public.purchase_checklist FOR ALL USING (auth.uid() = user_id);

-- ========================================================
-- AUTO-PROFILE TRIGGER ON USER SIGNUP
-- ========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

