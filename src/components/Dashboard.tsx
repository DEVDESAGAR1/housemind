import { useState } from 'react';
import {
  DollarSign,
  Wrench,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Sparkles,
  Building2,
  CheckCircle2,
  ShieldAlert,
  Info,
  RefreshCw,
  Search,
  ExternalLink,
  Upload,
  Wallet,
  SlidersHorizontal,
} from 'lucide-react';

import {
  HouseholdProfile,
  HouseholdExpense,
  HomeAsset,
  HouseholdInsight,
  InsightStatus,
  HouseholdHealthReport,
} from '../types';
import { formatCurrency, getCurrencySymbol } from '../config/locationCurrencyConfig';
import { HouseholdHealthWidget } from './HouseholdHealthWidget';
import { HouseholdHealthDetailModal } from './HouseholdHealthDetailModal';
import { api } from '../lib/api';

interface DashboardProps {
  profile: HouseholdProfile | null;
  expenses: HouseholdExpense[];
  assets: HomeAsset[];
  insights: HouseholdInsight[];
  isLoadingInsights: boolean;
  onNavigate: (tab: any) => void;
  onOpenAddExpense: () => void;
  onOpenAddAsset: () => void;
  onOpenProfile: () => void;
  onSeedDemo: () => void;
  onRefreshInsights: () => Promise<void>;
  onInvestigateInsight: (insight: HouseholdInsight) => void;
  onUpdateInsightStatus: (id: string, status: InsightStatus) => Promise<void>;
  isSeeding: boolean;
  onOpenGlobalUpload?: () => void;
  healthReport?: HouseholdHealthReport | null;
  isLoadingHealth?: boolean;
  onRefreshHealth?: () => Promise<void>;
}


export function Dashboard({
  profile,
  expenses,
  assets,
  insights,
  isLoadingInsights,
  onNavigate,
  onOpenAddExpense,
  onOpenAddAsset,
  onOpenProfile,
  onSeedDemo,
  onRefreshInsights,
  onInvestigateInsight,
  onUpdateInsightStatus,
  isSeeding,
  onOpenGlobalUpload,
  healthReport: propHealthReport,
  isLoadingHealth: propIsLoadingHealth,
  onRefreshHealth: propOnRefreshHealth,
}: DashboardProps) {
  const [insightFilter, setInsightFilter] = useState<'active' | 'critical' | 'resolved' | 'all'>('active');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHealthDetailModalOpen, setIsHealthDetailModalOpen] = useState(false);
  const [localHealthReport, setLocalHealthReport] = useState<HouseholdHealthReport | null>(null);
  const [localIsLoadingHealth, setLocalIsLoadingHealth] = useState(false);

  const currencyCode = profile?.currency || 'USD';
  const locale = profile?.locale || undefined;
  const currencySymbol = getCurrencySymbol(currencyCode);

  const healthReport = propHealthReport !== undefined ? propHealthReport : localHealthReport;
  const isLoadingHealth = propIsLoadingHealth !== undefined ? propIsLoadingHealth : localIsLoadingHealth;

  const handleRefreshHealth = async () => {
    if (propOnRefreshHealth) {
      await propOnRefreshHealth();
    } else {
      try {
        setLocalIsLoadingHealth(true);
        const report = await api.getHouseholdHealth();
        setLocalHealthReport(report);
      } catch (err) {
        console.error('Failed to refresh health report:', err);
      } finally {
        setLocalIsLoadingHealth(false);
      }
    }
  };


  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await onRefreshInsights();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered insights
  const activeInsights = insights.filter((i) => i.status === 'new' || i.status === 'viewed');
  const displayedInsights = insights.filter((i) => {
    if (insightFilter === 'active') return i.status === 'new' || i.status === 'viewed';
    if (insightFilter === 'critical') return (i.severity === 'critical' || i.severity === 'high') && i.status !== 'resolved';
    if (insightFilter === 'resolved') return i.status === 'resolved' || i.status === 'dismissed';
    return true;
  });

  // Compute normalized monthly burn rate
  const monthlyExpenseBurn = expenses.reduce((acc, exp) => {
    if (exp.frequency === 'monthly') return acc + exp.amount;
    if (exp.frequency === 'quarterly') return acc + exp.amount / 3;
    if (exp.frequency === 'annual') return acc + exp.amount / 12;
    return acc; // one-time excluded from recurring monthly baseline
  }, 0);

  // Pending expenses
  const pendingExpenses = expenses.filter((e) => e.paymentStatus === 'pending' || e.paymentStatus === 'overdue');
  const pendingAmount = pendingExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Attention assets
  const attentionAssets = assets.filter(
    (a) => a.currentStatus === 'needs_maintenance' || a.currentStatus === 'critical'
  );

  // Upcoming due dates (sorted)
  const upcomingExpenses = [...expenses]
    .filter((e) => e.dueDate)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
    .slice(0, 4);

  // Recent assets
  const recentAssets = [...assets].slice(0, 4);

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Welcome Banner / Overview */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-medium">
              <Building2 className="w-3.5 h-3.5" />
              <span>{profile?.homeName || 'My Household'}</span>
              <span className="opacity-60">•</span>
              <span className="capitalize">{profile?.homeType?.replace('_', ' ') || 'Single Family'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Household Command Center
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              Real-time intelligence on your home finances, utility schedules, and equipment health.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="dash-view-finances-btn"
              onClick={() => onNavigate('finances')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>Finances</span>
            </button>

            <button
              id="dash-whatif-simulator-btn"
              onClick={() => onNavigate('simulator')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>What-If Simulator</span>
            </button>

            <button
              id="dash-import-doc-btn"
              onClick={onOpenGlobalUpload ? onOpenGlobalUpload : () => onNavigate('documents')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>AI Document Intake</span>
            </button>

            <button
              id="dash-add-expense-btn"
              onClick={onOpenAddExpense}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Bill</span>
            </button>


            {expenses.length === 0 && assets.length === 0 && (
              <button
                id="dash-seed-data-btn"
                onClick={onSeedDemo}
                disabled={isSeeding}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSeeding ? 'Seeding...' : 'Load Starter Data'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Household Health Intelligence Engine (Phase 3) */}
      <HouseholdHealthWidget
        healthReport={healthReport}
        isLoading={isLoadingHealth}
        onRefresh={handleRefreshHealth}
        onOpenDetailModal={() => setIsHealthDetailModalOpen(true)}
        onNavigate={onNavigate}
      />

      {/* Gemini AI Copilot Spotlight */}
      <div className="bg-linear-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xs border border-indigo-700/50 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>AI Household Intelligence</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Ask HouseMind Copilot about your home
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
            Get instant answers on your recurring expenses, upcoming bill deadlines, appliance lifespans, and tailored energy-saving recommendations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <button
            id="dash-open-copilot-btn"
            onClick={() => onNavigate('copilot')}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-indigo-50 text-indigo-900 text-xs sm:text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Launch AI Copilot</span>
            <ArrowUpRight className="w-4 h-4 text-indigo-600" />
          </button>
        </div>
      </div>

      {/* Household Intelligence / Investigator Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Household Intelligence</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activeInsights.length} Active Finding{activeInsights.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Deterministic scans detecting anomalies, warranty dates, maintenance triggers, and cost shifts.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setInsightFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  insightFilter === 'active'
                    ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active ({activeInsights.length})
              </button>
              <button
                onClick={() => setInsightFilter('critical')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  insightFilter === 'critical'
                    ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                High Priority
              </button>
              <button
                onClick={() => setInsightFilter('resolved')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  insightFilter === 'resolved'
                    ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Resolved
              </button>
            </div>

            <button
              id="btn-refresh-insights"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoadingInsights}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition cursor-pointer"
              title="Rescan household data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing || isLoadingInsights ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Insight Cards Grid */}
        {isLoadingInsights ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Running deterministic household scans...
          </div>
        ) : displayedInsights.length === 0 ? (
          <div className="py-8 text-center px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-slate-800">
              {insightFilter === 'active'
                ? 'All clear — No active anomalies detected'
                : 'No findings in this category'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Household metrics and equipment statuses are within expected operating parameters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {displayedInsights.map((insight) => {
              const isResolved = insight.status === 'resolved' || insight.status === 'dismissed';
              return (
                <div
                  key={insight.id}
                  className={`group relative rounded-2xl p-4.5 border transition flex flex-col justify-between ${
                    isResolved
                      ? 'bg-slate-50/70 border-slate-200/80 opacity-75'
                      : insight.severity === 'critical'
                      ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                      : insight.severity === 'high'
                      ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                      : 'bg-white border-slate-200/90 hover:border-indigo-200'
                  } shadow-2xs hover:shadow-xs`}
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Severity & Metric Chip */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider ${
                          insight.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : insight.severity === 'high'
                            ? 'bg-amber-100 text-amber-900'
                            : insight.severity === 'medium'
                            ? 'bg-indigo-50 text-indigo-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {insight.severity === 'critical' && <ShieldAlert className="w-3 h-3" />}
                        {insight.severity === 'high' && <AlertTriangle className="w-3 h-3" />}
                        {insight.severity === 'medium' && <Info className="w-3 h-3" />}
                        {insight.severity}
                      </span>

                      {/* Calculated Metric Highlight */}
                      {insight.calculatedValues.percentChange && (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                          +{insight.calculatedValues.percentChange}% vs baseline
                        </span>
                      )}
                      {insight.calculatedValues.percentShare && (
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {insight.calculatedValues.percentShare}% of budget
                        </span>
                      )}
                      {insight.calculatedValues.daysUntilExpiry !== undefined && (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                          {insight.calculatedValues.daysUntilExpiry}d left
                        </span>
                      )}
                      {insight.calculatedValues.missingCount && (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {insight.calculatedValues.missingCount} missing specs
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                        {insight.type === 'expense_increase' && '⚠️ '}
                        {insight.type === 'large_expense' && '💰 '}
                        {insight.type === 'warranty_expiration' && '⏳ '}
                        {insight.type === 'maintenance_due' && '🔧 '}
                        {insight.type === 'missing_info' && '📋 '}
                        {insight.title}
                      </h4>
                      <p className="text-[11.5px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {insight.description}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom: Evidence Badge & Action Button */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">
                      {new Date(insight.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>

                    <button
                      id={`btn-investigate-${insight.id}`}
                      onClick={() => onInvestigateInsight(insight)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Investigate</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-300" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Monthly Burn Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Est. Monthly Expenses</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(monthlyExpenseBurn, currencyCode, locale)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Based on {expenses.length} tracked expense records
            </div>
          </div>
        </div>

        {/* Pending Bills */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Dues</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(pendingAmount, currencyCode, locale)}
            </div>
            <div className="text-[11px] text-amber-600 font-medium mt-1">
              {pendingExpenses.length} payment{pendingExpenses.length !== 1 ? 's' : ''} currently pending
            </div>
          </div>
        </div>

        {/* Total Assets */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Home Assets</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{assets.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              HVAC, appliances & exterior systems
            </div>
          </div>
        </div>

        {/* Attention Items */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Maintenance Alerts</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{attentionAssets.length}</div>
            <div className="text-[11px] text-rose-600 font-medium mt-1">
              {attentionAssets.length > 0 ? 'Equipment needs service' : 'All systems operational'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Upcoming Schedule & Maintenance Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Bills Column */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h2 className="font-semibold text-slate-900 text-sm">Upcoming Bills & Recurring Expenses</h2>
            </div>
            <button
              onClick={() => onNavigate('expenses')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingExpenses.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No upcoming dated expenses recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingExpenses.map((exp) => (
                <div key={exp.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-800">{exp.title}</div>
                    <div className="text-xs text-slate-400 capitalize">
                      {exp.category} • Due: {exp.dueDate || 'Unscheduled'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">
                      {formatCurrency(exp.amount, currencyCode, locale)}
                    </div>
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        exp.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : exp.paymentStatus === 'overdue'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {exp.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Asset Health Column */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-600" />
              <h2 className="font-semibold text-slate-900 text-sm">Key Home Assets & Equipment</h2>
            </div>
            <button
              onClick={() => onNavigate('assets')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentAssets.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No home assets or appliances registered yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentAssets.map((asset) => (
                <div key={asset.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-800">{asset.name}</div>
                    <div className="text-xs text-slate-400 capitalize">
                      {asset.category.replace('_', ' ')} {asset.brand ? `• ${asset.brand}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        asset.currentStatus === 'operational'
                          ? 'bg-emerald-50 text-emerald-700'
                          : asset.currentStatus === 'needs_maintenance'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {asset.currentStatus === 'operational' && <CheckCircle2 className="w-3 h-3" />}
                      {asset.currentStatus === 'needs_maintenance' && <AlertTriangle className="w-3 h-3" />}
                      {asset.currentStatus.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Household Health Detail Deep-Dive Modal */}
      <HouseholdHealthDetailModal
        isOpen={isHealthDetailModalOpen}
        onClose={() => setIsHealthDetailModalOpen(false)}
        healthReport={healthReport}
        onRefresh={handleRefreshHealth}
        onNavigate={onNavigate}
      />
    </div>
  );
}

