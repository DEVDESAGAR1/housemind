import React, { useState } from 'react';
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
  Sun,
  Bot,
  HelpCircle,
  FileText,
  ExternalLink,
  DollarSign,
  ChevronRight,
  Clock,
  Home,
  CheckCircle,
} from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
  isAuthenticating: boolean;
  authError: string | null;
}

export function LandingPage({ onSignIn, isAuthenticating, authError }: LandingPageProps) {
  const [activePreviewTab, setActivePreviewTab] = useState<'brief' | 'graph' | 'copilot'>('brief');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Ambient background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-sky-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-0 w-[550px] h-[550px] bg-indigo-900/15 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[1500px] left-0 w-[550px] h-[550px] bg-emerald-900/10 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[2200px] right-0 w-[500px] h-[500px] bg-purple-900/10 blur-3xl pointer-events-none -z-10" />

      {/* ========================================================= */}
      {/* 1. NAVIGATION TOP BAR                                     */}
      {/* ========================================================= */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl text-white tracking-tight">HouseMind</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950/90 text-indigo-300 border border-indigo-800/80 shadow-xs uppercase tracking-wider">
                v2.5
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Autonomous Household Intelligence
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="top-google-signin-btn"
            onClick={onSignIn}
            disabled={isAuthenticating}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-white text-slate-950 hover:bg-slate-100 transition shadow-md shadow-white/5 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. HERO SECTION                                           */}
      {/* ========================================================= */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-16 flex flex-col items-center text-center space-y-10 relative z-10">
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-indigo-300 text-xs font-semibold backdrop-blur-md shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>The Autonomous Household Operating System</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl leading-[1.1] sm:leading-[1.12]">
          Total clarity over your home, assets, and finances.
        </h1>

        <p className="text-base sm:text-xl text-slate-300 max-w-3xl leading-relaxed font-normal">
          HouseMind unifies your physical spaces, equipment lifespans, repair-vs-replace intelligence, amortized loans, and daily cash flow with proactive Morning Briefs and grounded Gemini AI Copilot.
        </p>

        {authError && (
          <div className="w-full max-w-md p-4 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-2xl text-left shadow-lg">
            <span className="font-bold block mb-1">Authentication Notice:</span>
            {authError}
          </div>
        )}

        {/* Primary Call to Action */}
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
        <div className="pt-4 flex flex-wrap items-center justify-center gap-2.5 max-w-4xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium shadow-xs">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Morning Brief Daily Entry</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Grounded Copilot Intelligence</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium shadow-xs">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>4-Pillar Health Scoring (0–100)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium shadow-xs">
            <ReceiptText className="w-3.5 h-3.5 text-sky-400" />
            <span>Multi-Modal Document OCR</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium shadow-xs">
            <Calculator className="w-3.5 h-3.5 text-purple-400" />
            <span>What-If Decision Simulator</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-medium shadow-xs">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero-Trust Multi-Tenancy</span>
          </span>
        </div>

        {/* ========================================================= */}
        {/* 3. INTERACTIVE PRODUCT SHOWCASE                           */}
        {/* ========================================================= */}
        <div className="w-full pt-6">
          {/* Showcase Switcher Tabs */}
          <div className="flex items-center justify-center gap-2 pb-4">
            <button
              onClick={() => setActivePreviewTab('brief')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activePreviewTab === 'brief'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-400" />
              <span>🌅 Morning Brief</span>
            </button>

            <button
              onClick={() => setActivePreviewTab('graph')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activePreviewTab === 'graph'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>🧠 Cross-Domain Graph</span>
            </button>

            <button
              onClick={() => setActivePreviewTab('copilot')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activePreviewTab === 'copilot'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
              }`}
            >
              <Bot className="w-4 h-4 text-purple-400" />
              <span>💬 Grounded Copilot</span>
            </button>
          </div>

          {/* Tab 1: Morning Brief Preview */}
          {activePreviewTab === 'brief' && (
            <div className="w-full max-w-5xl mx-auto rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 p-5 sm:p-7 border border-amber-500/30 shadow-2xl shadow-amber-950/20 backdrop-blur-xl text-left space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">Good morning, Aarav</h3>
                    <p className="text-xs text-amber-300/80">Here is what matters in your household today • Gulmohar Haven</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Health: 88 / 100</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Needs Attention */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-900/50 space-y-2">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Needs Attention (1)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                    <div className="text-xs font-bold text-white">Daikin 1.5T Split AC Compressor Error U4</div>
                    <div className="text-[11px] text-amber-300">Warranty expires in 25 days • Est. ₹14,500</div>
                  </div>
                </div>

                {/* Due Today / Cash Flow */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Dues & Commitments</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs flex justify-between items-center">
                      <span className="text-slate-300">BESCOM Electricity Bill</span>
                      <span className="font-bold text-emerald-400">₹3,450</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs flex justify-between items-center">
                      <span className="text-slate-300">HDFC Home Loan EMI</span>
                      <span className="font-bold text-indigo-300">₹48,500</span>
                    </div>
                  </div>
                </div>

                {/* Top Actionable Recommendation */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-900/50 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Top Action Recommendation</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-1.5">
                    <div className="text-xs font-semibold text-emerald-200">File Daikin Warranty Claim</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Save ₹14,500 by submitting claim before policy expiration on Sep 30.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Cross-Domain Graph Preview */}
          {activePreviewTab === 'graph' && (
            <div className="w-full max-w-5xl mx-auto rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 p-5 sm:p-7 border border-indigo-500/30 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl text-left space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">Cross-Domain Household Knowledge Graph</h3>
                    <p className="text-xs text-slate-400">Unified synthesis linking properties, equipment, issues, and finances</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800 text-xs font-semibold">
                  12 Connected Entities
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Physical Domain</div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <div>• <strong>Property:</strong> Gulmohar Haven (Villa)</div>
                    <div>• <strong>Room:</strong> Master Bedroom (1st Floor)</div>
                    <div>• <strong>Asset:</strong> Daikin 1.5T 5-Star Split AC</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Operational & Risk</div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <div>• <strong>Warranty:</strong> Daikin India Care (25d left)</div>
                    <div>• <strong>Active Issue:</strong> Compressor Vibration U4</div>
                    <div>• <strong>Recurrence:</strong> 2 repeat incidents (₹19,300 spend)</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Compound Action</div>
                  <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-200">
                    <strong>Repair vs. Replace Trigger:</strong> Cumulative repair spend is 41.5% of asset purchase cost. Warranty claim saves full replacement outlay.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Grounded Copilot Preview */}
          {activePreviewTab === 'copilot' && (
            <div className="w-full max-w-5xl mx-auto rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 p-5 sm:p-7 border border-purple-500/30 shadow-2xl shadow-purple-950/20 backdrop-blur-xl text-left space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">AI Copilot Grounded Conversation</h3>
                    <p className="text-xs text-slate-400">Deterministic retrieval grounded in your exact household ledger and warranties</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800 text-xs font-semibold">
                  Zero Hallucination
                </span>
              </div>

              <div className="space-y-3">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-lg p-3 rounded-2xl bg-indigo-600 text-white text-xs font-medium">
                    What warranties are expiring soon and what actions should I take?
                  </div>
                </div>

                {/* Copilot response */}
                <div className="flex justify-start">
                  <div className="max-w-xl p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-200 space-y-3">
                    <p>
                      You have <strong>1 warranty</strong> expiring within the 30-day horizon:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      <li><strong>Daikin 1.5 Ton Inverter AC</strong>: Warranty by Daikin India Care expires on <strong>Sep 30, 2026</strong> (25 days remaining).</li>
                      <li><strong>Recommendation</strong>: File a claim for the active Compressor Error U4 issue before expiry to save ₹14,500.</li>
                    </ul>

                    {/* Grounded interactive entity chips */}
                    <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-800 text-[11px] font-semibold">
                        <Wrench className="w-3 h-3 text-indigo-400" />
                        <span>Asset: Daikin Split AC</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[11px] font-semibold">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Warranty: Daikin Care</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800 text-[11px] font-semibold">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>Issue: Compressor U4</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 4. 6-PILLAR CORE OPERATING SYSTEM GRID                    */}
        {/* ========================================================= */}
        <div className="w-full pt-16 text-left space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              A Complete Operating System for Your Home
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              Replace fragmented spreadsheets, paper warranty folders, and forgotten maintenance tasks with a single synchronized intelligence layer.
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
                Model multi-floor structures, partition rooms, track square footage, and map every physical appliance to its exact spatial location.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800/70 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Asset Lifespan & Degradation</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Track manufacturer lifespans, serial numbers, replacement dates, degradation curves, and active warranty countdowns with zero guesswork.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-800/70 text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Issue Intelligence & Repair vs. Replace</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Track recurring breakdowns, quantify cumulative repair spend against asset replacement thresholds, and link warranties directly to claims.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-sky-950/80 border border-sky-800/70 text-sky-400 flex items-center justify-center group-hover:scale-105 transition">
                <ReceiptText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Debt Center & Living Costs</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Closed-form mathematical mortgage amortization schedules, revolving credit utilization monitors, recurring utility bills, and cash flow ledgers.
              </p>
            </div>

            {/* Pillar 5 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-800/70 text-purple-400 flex items-center justify-center group-hover:scale-105 transition">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">What-If Decision Simulator</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Simulate capital expenditures (solar retrofits, HVAC replacements, renovation loans) with 0–100 affordability scoring before signing contracts.
              </p>
            </div>

            {/* Pillar 6 */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3 group">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800/70 text-rose-400 flex items-center justify-center group-hover:scale-105 transition">
                <Sun className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Morning Brief & AI Copilot</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Start each day with a concise 4-part operational briefing. Converse with a grounded AI Copilot that references your exact home records.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. HOW IT WORKS: 3 AUTONOMOUS STEPS                       */}
        {/* ========================================================= */}
        <div className="w-full pt-16 text-left space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Three Steps to Autonomous Household Clarity
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              How HouseMind converts raw paperwork, bills, and warranties into automated peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-3 relative">
              <div className="text-xs font-black text-indigo-400 tracking-wider uppercase">Step 01</div>
              <h4 className="text-base font-bold text-white">Connect & Ingest</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload tax invoices, insurance policies, or utility bills. Our multi-modal AI engine extracts entities, dates, and amounts directly into your vault.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-3 relative">
              <div className="text-xs font-black text-indigo-400 tracking-wider uppercase">Step 02</div>
              <h4 className="text-base font-bold text-white">Cross-Domain Synthesis</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                HouseMind builds a relational knowledge graph connecting equipment to warranties, issues to expenses, and computes your 4-pillar Health Score.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-3 relative">
              <div className="text-xs font-black text-indigo-400 tracking-wider uppercase">Step 03</div>
              <h4 className="text-base font-bold text-white">Proactive Execution</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Receive proactive daily Morning Briefs, calendar alerts, repair vs. replace guidance, and grounded answers from your AI Copilot.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 6. ZERO-TRUST SECURITY & PRIVACY                          */}
        {/* ========================================================= */}
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
                  Dual-layer security combining cryptographic server-side JWT verification and strict Firestore declarative per-user paths (/users/{'{uid}'}/*).
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Zero AI Model Training
                </div>
                <p className="text-xs text-slate-400">
                  Your household records and financial transactions are never retained or used to train public foundation models.
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

        {/* ========================================================= */}
        {/* 7. BOTTOM CALL TO ACTION                                  */}
        {/* ========================================================= */}
        <div className="w-full pt-16 pb-6 text-center space-y-6">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Take Command of Your Household Today
          </h3>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Join homeowners managing properties, equipment lifespans, and recurring expenses in one intelligent operating system.
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

      {/* ========================================================= */}
      {/* 8. FOOTER                                                 */}
      {/* ========================================================= */}
      <footer className="w-full border-t border-slate-800/80 py-8 px-4 sm:px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto relative z-10 gap-4">
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
