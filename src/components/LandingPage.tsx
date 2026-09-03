import { ShieldCheck, Sparkles, Building2, ReceiptText, Wrench, Lock, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
  isAuthenticating: boolean;
  authError: string | null;
}

export function LandingPage({ onSignIn, isAuthenticating, authError }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">HouseMind</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800/60">
              Cloud Run AI
            </span>
          </div>
        </div>

        <button
          id="top-google-signin-btn"
          onClick={onSignIn}
          disabled={isAuthenticating}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-white text-slate-900 hover:bg-slate-100 transition shadow-sm cursor-pointer disabled:opacity-50"
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4 text-slate-500" />
        </button>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-5xl mx-auto px-6 py-12 flex flex-col items-center text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/70 text-indigo-300 text-xs font-medium backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Intelligent Household Management Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15]">
          Master your home finances, assets, and recurring expenses.
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          HouseMind unifies your household equipment, appliance lifespans, and monthly bills
          into an intelligent command center with strict per-user data isolation.
        </p>

        {authError && (
          <div className="w-full max-w-md p-4 bg-rose-950/70 border border-rose-800 text-rose-200 text-xs rounded-xl text-left">
            <span className="font-semibold block mb-0.5">Authentication Error:</span>
            {authError}
          </div>
        )}

        {/* CTA Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
          <button
            id="hero-google-signin-btn"
            onClick={onSignIn}
            disabled={isAuthenticating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 text-base font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            <span>{isAuthenticating ? 'Connecting...' : 'Continue with Google'}</span>
          </button>
        </div>

        {/* Feature Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 text-left">
          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/70 border border-indigo-800 text-indigo-400 flex items-center justify-center">
              <ReceiptText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Expense & Bill Tracking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track recurring household bills, utility statements, due dates, and auto-pay statuses with categorized monthly burn rates.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Asset & Appliance Hub</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Maintain an active inventory of home systems, HVAC, appliances, estimated lifespans, warranty countdowns, and maintenance logs.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-950/70 border border-sky-800 text-sky-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Strict Tenant Isolation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dual-layer security boundary combining server-side JWT verification and Firestore declarative rules for absolute privacy.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800 py-6 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Production-grade security on Cloud Run</span>
        </div>
        <div className="mt-2 sm:mt-0 text-slate-500">
          HouseMind &copy; {new Date().getFullYear()} — Built for Cloud Run AI Challenge
        </div>
      </footer>
    </div>
  );
}
