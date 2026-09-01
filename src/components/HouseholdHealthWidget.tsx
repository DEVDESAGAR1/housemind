import React, { useState } from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Home,
  Wrench,
  Wallet,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import {
  HouseholdHealthReport,
  HouseholdHealthCategory,
  HouseholdHealthSignal,
} from '../types';

interface HouseholdHealthWidgetProps {
  healthReport: HouseholdHealthReport | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onOpenDetailModal: () => void;
  onNavigate: (tab: any) => void;
}

export function HouseholdHealthWidget({
  healthReport,
  isLoading,
  onRefresh,
  onOpenDetailModal,
  onNavigate,
}: HouseholdHealthWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading && !healthReport) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-slate-200 rounded-md"></div>
          <div className="h-8 w-20 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!healthReport) return null;

  const score = healthReport.overallScore;
  const completeness = healthReport.completenessScore;

  // Determine theme based on score
  const getScoreTheme = (s: number, prov: boolean) => {
    if (prov && completeness < 25) {
      return {
        text: 'text-indigo-600',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        badge: 'bg-indigo-100 text-indigo-800',
        ring: 'stroke-indigo-600',
      };
    }
    if (s >= 85) {
      return {
        text: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-800',
        ring: 'stroke-emerald-600',
      };
    }
    if (s >= 70) {
      return {
        text: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        badge: 'bg-blue-100 text-blue-800',
        ring: 'stroke-blue-600',
      };
    }
    if (s >= 50) {
      return {
        text: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        badge: 'bg-amber-100 text-amber-800',
        ring: 'stroke-amber-600',
      };
    }
    return {
      text: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      badge: 'bg-rose-100 text-rose-800',
      ring: 'stroke-rose-600',
    };
  };

  const theme = getScoreTheme(score, healthReport.isProvisional);

  const getCategoryIcon = (cat: HouseholdHealthCategory) => {
    switch (cat) {
      case 'home':
        return <Home className="w-4 h-4 text-amber-600" />;
      case 'assets':
        return <Wrench className="w-4 h-4 text-blue-600" />;
      case 'finances':
        return <Wallet className="w-4 h-4 text-emerald-600" />;
      case 'documents':
        return <FileText className="w-4 h-4 text-indigo-600" />;
    }
  };

  // Critical or warning signals count
  const criticalSignals = healthReport.topSignals.filter((s) => s.status === 'critical');
  const warningSignals = healthReport.topSignals.filter((s) => s.status === 'warning');

  return (
    <div
      id="household-health-intelligence-widget"
      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-6 relative overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Household Health Intelligence</h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${theme.badge}`}
            >
              {healthReport.statusLabel}
            </span>
            {healthReport.isProvisional && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-600">
                Setup In Progress
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Deterministic multi-domain composite tracking property readiness, asset integrity, finances, and compliance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            id="btn-health-refresh"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition cursor-pointer"
            title="Recalculate Health Engine"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="btn-open-health-detail"
            onClick={onOpenDetailModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Health Deep-Dive</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Main Score & 4 Category Dimensions Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Big Score & Completeness */}
        <div className="lg:col-span-4 bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Score</span>
            <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              Deterministic 100-pt Index
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center shrink-0">
              {/* Circular Gauge */}
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-200"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  className={theme.ring}
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                  {score}
                </span>
                <span className="text-[10px] font-bold text-slate-400">/100</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className={`text-sm font-bold ${theme.text}`}>{healthReport.statusLabel}</div>
              <p className="text-[11.5px] text-slate-600 leading-snug">
                {criticalSignals.length > 0
                  ? `${criticalSignals.length} high priority item(s) require action.`
                  : warningSignals.length > 0
                  ? `${warningSignals.length} optimization notice(s) detected.`
                  : 'All monitored systems operating within optimal thresholds.'}
              </p>
            </div>
          </div>

          {/* Data Completeness Bar */}
          <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600">Data Completeness</span>
              <span className="font-bold text-slate-800">{completeness}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, completeness)}%` }}
              ></div>
            </div>
            <div className="text-[10.5px] text-slate-500 flex items-center justify-between">
              <span>{healthReport.dataCompletenessDetails.assetsCount} assets • {healthReport.dataCompletenessDetails.expensesCount} bills</span>
              <span>{healthReport.dataCompletenessDetails.propertiesCount} properties</span>
            </div>
          </div>
        </div>

        {/* Right: 4 Category Cards */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. Home & Spaces */}
          <div
            onClick={onOpenDetailModal}
            className="group p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-indigo-300 transition cursor-pointer shadow-2xs space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50">{getCategoryIcon('home')}</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    Home & Spaces
                  </h4>
                  <span className="text-[10.5px] text-slate-500">Weight: 20%</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-slate-900">
                  {healthReport.categories.home.score}
                </span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full"
                style={{ width: `${healthReport.categories.home.score}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-600 line-clamp-1">
              {healthReport.categories.home.summary}
            </p>
          </div>

          {/* 2. Assets & Equipment */}
          <div
            onClick={onOpenDetailModal}
            className="group p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-indigo-300 transition cursor-pointer shadow-2xs space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50">{getCategoryIcon('assets')}</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    Assets & Equipment
                  </h4>
                  <span className="text-[10.5px] text-slate-500">Weight: 30%</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-slate-900">
                  {healthReport.categories.assets.score}
                </span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full"
                style={{ width: `${healthReport.categories.assets.score}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-600 line-clamp-1">
              {healthReport.categories.assets.summary}
            </p>
          </div>

          {/* 3. Financial Health */}
          <div
            onClick={onOpenDetailModal}
            className="group p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-indigo-300 transition cursor-pointer shadow-2xs space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50">{getCategoryIcon('finances')}</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    Financial Health
                  </h4>
                  <span className="text-[10.5px] text-slate-500">Weight: 35%</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-slate-900">
                  {healthReport.categories.finances.score}
                </span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{ width: `${healthReport.categories.finances.score}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-600 line-clamp-1">
              {healthReport.categories.finances.summary}
            </p>
          </div>

          {/* 4. Document & Compliance */}
          <div
            onClick={onOpenDetailModal}
            className="group p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-indigo-300 transition cursor-pointer shadow-2xs space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50">{getCategoryIcon('documents')}</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    Documents & Records
                  </h4>
                  <span className="text-[10.5px] text-slate-500">Weight: 15%</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-slate-900">
                  {healthReport.categories.documents.score}
                </span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full"
                style={{ width: `${healthReport.categories.documents.score}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-600 line-clamp-1">
              {healthReport.categories.documents.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Top Priority Action Recommendations */}
      {healthReport.recommendations.length > 0 && (
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>Prioritized Improvement Levers</span>
            </span>
            <button
              onClick={onOpenDetailModal}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
            >
              View all ({healthReport.recommendations.length}) →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {healthReport.recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="p-3 bg-white rounded-xl border border-slate-200/90 flex flex-col justify-between space-y-2 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        rec.priority === 'high'
                          ? 'bg-rose-100 text-rose-800'
                          : rec.priority === 'medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-50 text-indigo-800'
                      }`}
                    >
                      {rec.priority} priority
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">{rec.category}</span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 leading-snug">{rec.title}</h5>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{rec.description}</p>
                </div>

                {rec.actionTab && (
                  <button
                    onClick={() => onNavigate(rec.actionTab)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer self-start mt-1"
                  >
                    <span>{rec.actionLabel || 'Fix Issue'}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
