# 🏍️ HUNTER FUND — Royal Enfield Hunter 350 Purchase Planner (2027)

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20RLS-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Installable-blueviolet)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

A mobile-first personal savings management web application designed to track daily contributions and plan financially for purchasing a **Royal Enfield Hunter 350 (Mid Variant — Graphite Grey)** by **10 January 2027**.

Built with an automotive fintech dashboard aesthetic, offline-first LocalStorage persistence, optional Supabase cloud synchronization with Row Level Security (RLS), and Service Worker background push notifications.

---

## 📸 Overview & Features

### 1. 📊 Executive Dashboard & 10 Financial Metrics
- **Current Balance**: Calculated from ₹0 opening balance and the complete ledger.
- **Target Goal**: Configurable ₹1,30,000 (Down Payment or Total Cash requirement).
- **Remaining Amount**: Live calculation of amount left to save.
- **Progress Gauge**: Real-time completion percentage.
- **Countdown**: Calendar days remaining to 10 January 2027.
- **Dynamic Daily & Weekly Goals**: Automatically adjusts required daily/weekly savings based on remaining balance and calendar days.
- **Cash Flow**: Inflow (deposits) vs outflow (expenditures).
- **Pace Projection**: Projected completion date based on historical contribution velocity.

### 2. ⚡ Daily Savings Cadence & 1-Tap Quick Logging
- Track today's planned target vs actual savings.
- Real-time daily surplus or deficit calculation.
- 1-Tap quick deposit pills: `+₹100`, `+₹200`, `+₹500`, `+₹1,000`, `+₹2,000`.
- Native mobile bottom-sheet for custom deposits and expenses with categories & memos.

### 3. 🏆 Milestone Waypoints
- Automatic tracking across ₹10k, ₹25k, ₹50k, ₹75k, ₹1L, ₹1.15L, and ₹1.30L.
- Celebration confetti trigger upon reaching milestones.

### 4. 📅 Interactive Savings Calendar
- Monthly calendar with color-coded status:
  - 🟢 **Green**: Daily target achieved
  - 🟡 **Yellow**: Partial savings
  - 🔴 **Red**: Missed / zero savings
  - ⚪ **Grey**: Future date
- Date detail modal with full ledger history for each date.

### 5. 📈 Analytics & Financial Intelligence (Recharts)
- Cumulative savings growth vs ₹1,30,000 target curve.
- Monthly deposits vs withdrawals bar comparison.
- Daily net savings trend line.
- Time range filters: `7D`, `30D`, `This Month`, `Last Month`, `All Time`.

### 6. 🛵 Purchase Planner & Genuine Accessories (GMA)
- On-road cost calculator: Ex-Showroom, RTO, Insurance, Extended Warranty, RSA, and Other charges.
- Royal Enfield genuine accessory catalog with mandatory engine protection vs optional styling accessories.

### 7. 🏢 Showroom Quotation Comparison
- Compare written quotes across multiple Royal Enfield dealerships.
- Preferred dealer selection, booking amounts, and perk notes.

### 8. 🧮 Loan & EMI Calculator
- Reducing-balance interest calculations.
- Adjustable principal, interest rate (% p.a.), and preset tenures (12, 24, 36, 48 months).
- 12-month amortization table breakdown.

### 9. 📋 15-Point Delivery & Purchase Checklist
- Step-by-step progress from dealership finalization, booking, PDI (Pre-Delivery Inspection) to delivery handover.

### 10. 🔔 Background Push Notifications & PWA
- Progressive Web App (PWA) with service worker and offline caching.
- Native "Add to Home Screen" prompt for Android and iOS Safari.
- Background push notification reminders even when browser tab is minimized.

---

## 🔒 Security & Privacy Architecture

- **Zero Secret Exposure**: `.env` and local credentials are strictly `.gitignore`'d.
- **Row Level Security (RLS)**: Every PostgreSQL table in Supabase enforces user isolation via `auth.uid() = user_id`.
- **Offline-First Resilience**: All operations persist in `localStorage` first, ensuring zero data loss if network connection drops.
- **Input Validation**: Positive amounts only, preventing negative transaction entries or division-by-zero errors.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 6](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL + RLS) |
| **PWA & Notifications** | Service Worker + Web Notifications API |

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/nakul-biovaco/Hunter.git
cd Hunter
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_PROJECT_ID="your-project-id"
```
*(Note: If Supabase credentials are not configured, the app seamlessly runs in Local Storage mode).*

### 4. Database Setup (Optional Cloud Sync)
1. In your [Supabase Dashboard](https://supabase.com), navigate to **SQL Editor**.
2. Run the SQL script from `supabase/schema.sql`.
3. All tables and RLS security policies will be established automatically.

### 5. Run the development server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Production Build
```bash
npm run build
npm run preview
```

---

## 📦 Deployment to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and import the repository.
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Deploy! The included `vercel.json` provides client-side SPA routing.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
