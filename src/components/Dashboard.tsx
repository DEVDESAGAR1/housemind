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
  Upload,
  Wallet,
  SlidersHorizontal,
  FileText,
  CreditCard,
  Sun,
} from 'lucide-react';

import {
  HouseholdProfile,
  HouseholdExpense,
  HomeAsset,
  HouseholdInsight,
  InsightStatus,
  HouseholdHealthReport,
  Property,
  Room,
  WarrantyPolicy,
  MaintenanceTask,
  UtilityAccount,
  HouseholdLoan,
  CreditCardAccount,
  HouseholdDocument,
  HomeCommandCenterSummary,
} from '../types';
import { formatCurrency, getCurrencySymbol } from '../config/locationCurrencyConfig';
import { HouseholdHealthWidget } from './HouseholdHealthWidget';
import { HouseholdHealthDetailModal } from './HouseholdHealthDetailModal';
import { NeedsAttentionSection } from './command-center/NeedsAttentionSection';
import { UpcomingScheduleSection } from './command-center/UpcomingScheduleSection';
import { DomainSnapshotsSection } from './command-center/DomainSnapshotsSection';
import { RecentActivitySection } from './command-center/RecentActivitySection';
import { EmptyHouseholdOnboarding } from './command-center/EmptyHouseholdOnboarding';
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
  properties?: Property[];
  rooms?: Room[];
  warranties?: WarrantyPolicy[];
  tasks?: MaintenanceTask[];
  utilities?: UtilityAccount[];
  loans?: HouseholdLoan[];
  creditCards?: CreditCardAccount[];
  documents?: HouseholdDocument[];
  commandCenterSummary?: HomeCommandCenterSummary | null;
}

export function Dashboard({
  profile,
  expenses = [],
  assets = [],
  insights = [],
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
  properties = [],
  rooms = [],
  warranties = [],
  tasks = [],
  utilities = [],
  loans = [],
  creditCards = [],
  documents = [],
  commandCenterSummary,
}: DashboardProps) {
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

  const isHouseholdEmpty = properties.length === 0 && assets.length === 0 && expenses.length === 0;

  // Active date display
  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* 1. Command Center Operating Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-medium">
                <Building2 className="w-3.5 h-3.5" />
                <span>{profile?.homeName || 'My Household'}</span>
                <span className="opacity-60">•</span>
                <span className="capitalize">{profile?.homeType?.replace('_', ' ') || 'Single Family'}</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{todayFormatted}</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Household Command Center
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              Your daily operating screen for home health, pending obligations, scheduled upkeep, and financial clarity.
            </p>
          </div>

          {/* Quick Operating Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="dash-morning-brief-btn"
              onClick={() => onNavigate('copilot')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs sm:text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <Sun className="w-4 h-4 text-slate-950" />
              <span>Morning Brief</span>
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

            <button
              id="dash-view-maintenance-btn"
              onClick={() => onNavigate('maintenance')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>Log Maintenance</span>
            </button>

            <button
              id="dash-whatif-simulator-btn"
              onClick={() => onNavigate('simulator')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-violet-900/60 hover:bg-violet-800 text-violet-200 border border-violet-700/60 text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>What-If Simulator</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Empty Household Onboarding (if no records yet) */}
      {isHouseholdEmpty && (
        <EmptyHouseholdOnboarding
          onNavigate={onNavigate}
          onOpenGlobalUpload={onOpenGlobalUpload}
          onSeedDemo={onSeedDemo}
          isSeeding={isSeeding}
        />
      )}

      {/* 3. Core Question 1: "How is my household doing?" — Phase 3 Health Intelligence Engine */}
      <HouseholdHealthWidget
        healthReport={healthReport}
        isLoading={isLoadingHealth}
        onRefresh={handleRefreshHealth}
        onOpenDetailModal={() => setIsHealthDetailModalOpen(true)}
        onNavigate={onNavigate}
      />

      {/* 4. Core Question 2: "What needs my attention?" — Needs Attention & Overdue Section */}
      <NeedsAttentionSection
        expenses={expenses}
        assets={assets}
        maintenances={tasks}
        warranties={warranties}
        utilities={utilities}
        loans={loans}
        creditCards={creditCards}
        insights={insights}
        healthSignals={healthReport?.topSignals}
        currencyCode={currencyCode}
        locale={locale}
        onNavigate={onNavigate}
        onInvestigateInsight={onInvestigateInsight}
      />

      {/* 5. Domain Snapshots — 4-Pillar Overview (Home, Assets, Finances, Maintenance) */}
      <DomainSnapshotsSection
        properties={properties}
        rooms={rooms}
        assets={assets}
        maintenances={tasks}
        warranties={warranties}
        expenses={expenses}
        utilities={utilities}
        loans={loans}
        creditCards={creditCards}
        homeHealth={healthReport?.categories?.home}
        assetHealth={healthReport?.categories?.assets}
        financeHealth={healthReport?.categories?.finances}
        currencyCode={currencyCode}
        locale={locale}
        onNavigate={onNavigate}
      />

      {/* 6. Core Question 3: "What's coming next?" — Upcoming Household Schedule (Next 30 Days) */}
      <UpcomingScheduleSection
        expenses={expenses}
        maintenances={tasks}
        utilities={utilities}
        loans={loans}
        creditCards={creditCards}
        warranties={warranties}
        currencyCode={currencyCode}
        locale={locale}
        onNavigate={onNavigate}
      />

      {/* 7. Bottom Grid: Recent Activity & AI Copilot Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Activity Feed */}
        <div className="lg:col-span-2">
          <RecentActivitySection
            expenses={expenses}
            assets={assets}
            maintenances={tasks}
            documents={documents}
            properties={properties}
            onNavigate={onNavigate}
          />
        </div>

        {/* Right 1 Col: AI Copilot Quick Launcher */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xs border border-indigo-700/40 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>AI Household Copilot</span>
            </div>

            <h3 className="text-lg font-bold text-white leading-tight">
              Ask HouseMind anything about your home
            </h3>

            <p className="text-xs text-indigo-200/90 leading-relaxed">
              Query upcoming deadlines, appliance replacement timelines, mortgage interest savings, or energy-efficiency tips.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              id="dash-side-open-copilot-btn"
              onClick={() => onNavigate('copilot')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-indigo-50 text-indigo-900 text-xs sm:text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Launch AI Copilot</span>
              <ArrowUpRight className="w-4 h-4 text-indigo-600" />
            </button>

            <button
              id="dash-side-simulator-btn"
              onClick={() => onNavigate('simulator')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-800/60 hover:bg-indigo-700/60 text-indigo-100 text-xs font-semibold rounded-xl border border-indigo-600/40 transition cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Simulate Financial Scenarios</span>
            </button>
          </div>
        </div>
      </div>

      {/* 8. Household Health Detail Modal */}
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
