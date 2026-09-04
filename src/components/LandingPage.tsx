import React from 'react';
import {
  ShieldCheck,
  Sparkles,
  Building2,
  ReceiptText,
  Wrench,
  Lock,
  ArrowRight,
  TrendingUp,
  Calendar,
  Layers,
  Cpu,
  Calculator,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Activity,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
  isAuthenticating: boolean;
  authError: string | null;
}

export function LandingPage({ onSignIn, isAuthenticating, authError }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Ambient background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-indigo-600/20 via-sky-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-0 w-[500px] h-[500px] bg-indigo-900/15 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[1400px] left-0 w-[500px] h-[500px] bg-emerald-900/10 blur-3xl pointer-events-none -z-10" />

      {/* 1. Navigation Top Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-xl text-white tracking-tight">HouseMind</span>
            <span className="hidden sm:inline-block ml-2.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 shadow-xs">
              Cloud Run AI
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="top-google-signin-btn"
            onClick={onSignIn}
            disabled={isAuthenticating}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-white text-slate-950 hover:bg-slate-100 transition shadow-md shadow-white/5 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="w-full max-w-6xl mx-auto px-6 pt-10 pb-16 flex flex-col items-center text-center space-y-10 relative z-10">
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-indigo-300 text-xs font-semibold backdrop-blur-md shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>The Autonomous Household Operating System</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl leading-[1.1] sm:leading-[1.12]">
          Master your home finances, assets, and recurring expenses.
        </h1>

        <p className="text-base sm:text-xl text-slate-300 max-w-3xl leading-relaxed font-normal">
          HouseMind unifies your physical properties, appliance lifespans, preventative maintenance, amortized mortgages, and cash flow with grounded Gemini 3.7 AI intelligence.
        </p>

        {authError && (
          <div className="w-full max-w-md p-4 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-2xl text-left shadow-lg">
            <span className="font-bold block mb-1">Authentication Notice:</span>
            {authError}
          </div>
        )}

        {/* CTA Area */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <button
            id="hero-google-signin-btn"
            onClick={onSignIn}
            disabled={isAuthenticating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-xl shadow-indigo-600/30 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isAuthenticating ? 'Authenticating...' : 'Continue with Google'}</span>
            <ArrowRight className="w-4 h-4 text-indigo-200 ml-1" />
          </button>
        </div>

        {/* Capability Ticker Strip */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-3 max-w-4xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero-Trust Multi-Tenancy</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium shadow-xs">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Gemini 3.7 Flash Intelligence</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium shadow-xs">
            <ReceiptText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Smart Document OCR</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium shadow-xs">
            <Calculator className="w-3.5 h-3.5 text-sky-400" />
            <span>What-If Decision Simulator</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <span>RFC 5545 iCal Sync</span>
          </span>
        </div>

        {/* 3. Interactive Perspective Command Center Preview Mockup */}
        <div className="w-full pt-8">
          <div className="w-full max-w-5xl mx-auto rounded-3xl bg-gradient-to-b from-slate-800/90 to-slate-900/90 p-4 sm:p-6 border border-slate-700/80 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl text-left space-y-5">
            {/* Mock Window Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-700/70 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs font-bold text-slate-300">
                  Maplewood Haven • Single Family Residence
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Health Score: 89/100 (Good)
                </span>
              </div>
            </div>

            {/* Mock Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Needs Attention */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Needs Attention (1)
                  </span>
                  <span className="text-[10px] text-slate-400">Due Soon</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-sm font-semibold text-white">Trane HVAC HEPA Filter Flush</div>
                  <div className="text-xs text-slate-400 mt-0.5">Est. Cost: $45 • 4 days remaining</div>
                </div>
              </div>

              {/* Card 2: Upcoming Schedule */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Next 14 Days
                  </span>
                  <span className="text-[10px] text-slate-400">2 Items</span>
                </div>
                <div className="space-y-1.5">
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs flex justify-between items-center">
                    <span className="text-slate-200">Pacific Electric & Gas</span>
                    <span className="font-bold text-emerald-400">$142.50</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs flex justify-between items-center">
                    <span className="text-slate-200">First National Mortgage</span>
                    <span className="font-bold text-indigo-300">$1,632.00</span>
                  </div>
                </div>
              </div>

              {/* Card 3: What-If Simulation Preview */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    What-If Decision Model
                  </span>
                  <span className="text-[10px] text-slate-400">AI Evaluated</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-sm font-semibold text-white">Solar Array 12-mo 0% EMI</div>
                  <div className="text-xs text-emerald-400 mt-0.5">Affordability: 94/100 (Safe) • Saves $140/mo</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. 6-Pillar Core Feature Grid */}
        <div className="w-full pt-16 text-left space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              A Complete Operating System for Your Home
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              Replace fragmented spreadsheets, paper warranty folders, and forgotten maintenance tasks with a single, synchronized intelligence layer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {/* Pillar 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-800/70 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Property & Space Allocation</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Model multi-floor architecture, partition structural rooms, track square footage, and link equipment directly to physical locations.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800/70 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Equipment & Lifespan Vault</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Track manufacturer lifespans, serial numbers, replacement dates, and active warranty policy countdowns with zero guesswork.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-800/70 text-purple-400 flex items-center justify-center group-hover:scale-105 transition">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Preventative Maintenance</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Automated seasonal service reminders, service contractor contact logs, task recurrence intervals, and estimated maintenance cost budgets.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-sky-950/80 border border-sky-800/70 text-sky-400 flex items-center justify-center group-hover:scale-105 transition">
                <ReceiptText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Debt Amortization & Ledger</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Closed-form mathematical mortgage amortization schedules, revolving credit utilization monitors, and auto-categorized cash flow burn.
              </p>
            </div>

            {/* Pillar 5 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-800/70 text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">What-If Decision Simulator</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Simulate major purchases (HVAC replacements, solar retrofits, remodeling loans) with algorithmic 0–100 affordability scoring before signing contracts.
              </p>
            </div>

            {/* Pillar 6 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800/70 text-rose-400 flex items-center justify-center group-hover:scale-105 transition">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Grounded AI Copilot & OCR</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Upload PDFs, CSVs, or receipt scans. Gemini 3.7 extracts providers, amounts, and dates into structured records with 12-turn conversational memory.
              </p>
            </div>
          </div>
        </div>

        {/* 5. How It Works: 3-Step Process Flow */}
        <div className="w-full pt-16 text-left space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Three Steps to Complete Household Clarity
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              How HouseMind converts raw paperwork and bills into automated peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-3 relative">
              <div className="text-xs font-black text-indigo-400 tracking-wider uppercase">Step 01</div>
              <h4 className="text-base font-bold text-white">Connect & Ingest</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload bank CSV statements, scan appliance receipts, or register your home specs via our multi-modal AI intake engine.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-3 relative">
              <div className="text-xs font-black text-indigo-400 tracking-wider uppercase">Step 02</div>
              <h4 className="text-base font-bold text-white">Autonomous Modeling</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                HouseMind computes your 4-pillar Household Health Score, amortizes loan balances, and maps equipment degradation curves.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-3 relative">
              <div className="text-xs font-black text-indigo-400 tracking-wider uppercase">Step 03</div>
              <h4 className="text-base font-bold text-white">Proactive Peace of Mind</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Receive calendar alerts, ask questions to your grounded Copilot, and test purchase scenarios before committing funds.
              </p>
            </div>
          </div>
        </div>

        {/* 6. Zero-Trust Security & Privacy Architecture */}
        <div className="w-full pt-16">
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/60 border border-slate-800 text-left space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Zero-Trust Multitenancy & Data Governance</h3>
                <p className="text-xs text-slate-400">Strict enterprise security boundaries protecting your home records.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
              <div className="space-y-1.5">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Per-User Data Isolation
                </div>
                <p className="text-xs text-slate-400">
                  Dual-layer security combining cryptographic server-side JWT verification and Firestore declarative rules (/users/{'{uid}'}/*).
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Zero AI Model Training
                </div>
                <p className="text-xs text-slate-400">
                  Your household records and financial transactions are never retained or used to train third-party foundation models.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  100% Data Portability
                </div>
                <p className="text-xs text-slate-400">
                  Export complete JSON household archives or CSV ledgers at any time via the Privacy Center with single-click ease.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Bottom High-Conversion Hero Call To Action */}
        <div className="w-full pt-16 pb-6 text-center space-y-6">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Take Command of Your Household Today
          </h3>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Join homeowners managing properties, equipment lifespans, and recurring expenses in one intelligent command center.
          </p>
          <div className="pt-2">
            <button
              onClick={onSignIn}
              disabled={isAuthenticating}
              className="inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-xl shadow-indigo-600/30 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              <span>Get Started with Google</span>
              <ArrowRight className="w-4 h-4 text-indigo-200" />
            </button>
          </div>
        </div>
      </main>

      {/* 8. Footer */}
      <footer className="w-full border-t border-slate-800/80 py-8 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto relative z-10 gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Production-grade security deployed on Google Cloud Run</span>
        </div>
        <div className="text-slate-500">
          HouseMind &copy; {new Date().getFullYear()} — Built for Cloud Run AI Challenge
        </div>
      </footer>
    </div>
  );
}
