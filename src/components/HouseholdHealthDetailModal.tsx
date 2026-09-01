import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Activity,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  Info,
  Home,
  Wrench,
  Wallet,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  HouseholdHealthReport,
  HouseholdHealthCategory,
  HouseholdHealthAiExplanation,
} from '../types';
import { api } from '../lib/api';

interface HouseholdHealthDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  healthReport: HouseholdHealthReport | null;
  onRefresh: () => Promise<void>;
  onNavigate: (tab: any) => void;
}

export function HouseholdHealthDetailModal({
  isOpen,
  onClose,
  healthReport,
  onRefresh,
  onNavigate,
}: HouseholdHealthDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'home' | 'assets' | 'finances' | 'documents' | 'completeness'>('overview');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<HouseholdHealthAiExplanation | null>(
    healthReport?.aiExplanation || null
  );
  const [expandedSignals, setExpandedSignals] = useState<Record<string, boolean>>({});

  if (!isOpen || !healthReport) return null;

  const toggleSignal = (sigId: string) => {
    setExpandedSignals((prev) => ({ ...prev, [sigId]: !prev[sigId] }));
  };

  const handleGenerateAiBriefing = async () => {
    try {
      setIsGeneratingAi(true);
      const explanation = await api.explainHouseholdHealth();
      setAiExplanation(explanation);
    } catch (err) {
      console.error('Failed to generate AI health explanation:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const currentAi = aiExplanation || healthReport.aiExplanation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Household Health Intelligence Report
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                  {healthReport.overallScore}/100 • {healthReport.statusLabel}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Deterministic mathematical scoring grounded in real property, asset, debt, and expense state.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dimension Sub-Navigation */}
        <div className="px-6 pt-3 pb-0 border-b border-slate-200 bg-slate-50 flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition cursor-pointer border-b-2 ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview & AI Briefing
          </button>
          <button
            onClick={() => setActiveTab('home')}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition cursor-pointer border-b-2 ${
              activeTab === 'home'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Home & Spaces ({healthReport.categories.home.score}%)
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition cursor-pointer border-b-2 ${
              activeTab === 'assets'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Assets & Equipment ({healthReport.categories.assets.score}%)
          </button>
          <button
            onClick={() => setActiveTab('finances')}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition cursor-pointer border-b-2 ${
              activeTab === 'finances'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Financial Health ({healthReport.categories.finances.score}%)
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition cursor-pointer border-b-2 ${
              activeTab === 'documents'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Documents & Records ({healthReport.categories.documents.score}%)
          </button>
          <button
            onClick={() => setActiveTab('completeness')}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition cursor-pointer border-b-2 ${
              activeTab === 'completeness'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Data Completeness ({healthReport.completenessScore}%)
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* TAB 1: OVERVIEW & AI BRIEFING */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in">
              {/* AI Briefing Card */}
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-indigo-700/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-700/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-300" />
                    <h4 className="text-base font-bold text-white tracking-tight">
                      AI Executive Health Briefing
                    </h4>
                  </div>
                  <button
                    onClick={handleGenerateAiBriefing}
                    disabled={isGeneratingAi}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-100 text-xs font-semibold transition cursor-pointer border border-indigo-400/40 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingAi ? 'Analyzing...' : 'Refresh AI Analysis'}</span>
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
                  {currentAi?.executiveSummary ||
                    'Evaluating deterministic household signals across properties, equipment, debts, and bills.'}
                </p>

                {/* Key Strengths & Risks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="bg-indigo-950/60 rounded-xl p-3.5 border border-indigo-800/60 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Key Household Strengths</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-200">
                      {(currentAi?.strengths || []).map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-indigo-950/60 rounded-xl p-3.5 border border-indigo-800/60 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Identified Risk Exposure</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-200">
                      {(currentAi?.topRisks || []).map((r, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-400 font-bold">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 4 Pillars Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.values(healthReport.categories).map((cat) => (
                  <div
                    key={cat.category}
                    onClick={() => setActiveTab(cat.category as any)}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition cursor-pointer shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">{cat.name}</h4>
                      <span className="text-sm font-black text-slate-900">{cat.score}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          cat.score >= 80 ? 'bg-emerald-500' : cat.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${cat.score}%` }}
                      ></div>
                    </div>
                    <p className="text-[11.5px] text-slate-600">{cat.summary}</p>
                    <div className="text-[10.5px] text-indigo-600 font-semibold flex items-center gap-1">
                      <span>Inspect {cat.signals.length} deterministic signal(s)</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Roadmap */}
              {currentAi?.prioritizedActionPlan && currentAi.prioritizedActionPlan.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      <span>Prioritized Action Plan</span>
                    </span>
                  </div>
                  <div className="space-y-2">
                    {currentAi.prioritizedActionPlan.map((action, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              action.priority === 'high'
                                ? 'bg-rose-100 text-rose-800'
                                : action.priority === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-indigo-50 text-indigo-800'
                            }`}
                          >
                            {action.priority}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{action.action}</div>
                            <div className="text-[11px] text-slate-500 capitalize">
                              Category: {action.category}
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                          {action.estimatedImpact}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2, 3, 4, 5: CATEGORY SIGNALS VIEW */}
          {(activeTab === 'home' || activeTab === 'assets' || activeTab === 'finances' || activeTab === 'documents') && (
            <div className="space-y-5 animate-in fade-in">
              {/* Category Header Card */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {healthReport.categories[activeTab].name}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {healthReport.categories[activeTab].summary}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-black text-slate-900">
                    {healthReport.categories[activeTab].score}
                    <span className="text-xs font-normal text-slate-400">/100</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Weight in Composite: {Math.round(healthReport.categories[activeTab].weight * 100)}%
                  </span>
                </div>
              </div>

              {/* Signals List */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Deterministic Signals ({healthReport.categories[activeTab].signals.length})
                </h5>

                {healthReport.categories[activeTab].signals.map((sig) => {
                  const isExpanded = !!expandedSignals[sig.id];
                  return (
                    <div
                      key={sig.id}
                      className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`p-1.5 rounded-lg mt-0.5 ${
                              sig.status === 'critical'
                                ? 'bg-rose-100 text-rose-700'
                                : sig.status === 'warning'
                                ? 'bg-amber-100 text-amber-700'
                                : sig.status === 'healthy'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {sig.status === 'critical' && <AlertTriangle className="w-4 h-4" />}
                            {sig.status === 'warning' && <AlertTriangle className="w-4 h-4" />}
                            {sig.status === 'healthy' && <CheckCircle2 className="w-4 h-4" />}
                            {sig.status === 'info' && <Info className="w-4 h-4" />}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h6 className="text-xs font-bold text-slate-900">{sig.title}</h6>
                              <span
                                className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  sig.scoreImpact > 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : sig.scoreImpact < 0
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-slate-50 text-slate-600'
                                }`}
                              >
                                {sig.scoreImpact > 0 ? `+${sig.scoreImpact} pts` : `${sig.scoreImpact} pts`}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-slate-600 mt-0.5 leading-relaxed">
                              {sig.description}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleSignal(sig.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Evidence Drawer */}
                      {isExpanded && (
                        <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-600 space-y-2 bg-slate-50/70 p-3 rounded-xl">
                          <div>
                            <span className="font-bold text-slate-800">Mathematical Evidence: </span>
                            <span>{sig.evidence}</span>
                          </div>
                          {sig.recommendation && (
                            <div>
                              <span className="font-bold text-slate-800">Recommendation: </span>
                              <span>{sig.recommendation}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Button */}
                      {sig.actionTab && (
                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={() => {
                              onClose();
                              onNavigate(sig.actionTab);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                          >
                            <span>{sig.actionLabel || 'Manage in ' + sig.actionTab}</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: DATA COMPLETENESS */}
          {activeTab === 'completeness' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-5 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-950">Data Completeness & Calibration</h4>
                    <p className="text-xs text-indigo-800/90 mt-0.5">
                      The Household Health Index calculates accuracy based on actual registered data points.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-indigo-900">
                      {healthReport.completenessScore}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full"
                    style={{ width: `${healthReport.completenessScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Data inventory counts */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10.5px] font-semibold text-slate-500">Properties</span>
                  <div className="text-lg font-bold text-slate-900">
                    {healthReport.dataCompletenessDetails.propertiesCount}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10.5px] font-semibold text-slate-500">Rooms</span>
                  <div className="text-lg font-bold text-slate-900">
                    {healthReport.dataCompletenessDetails.roomsCount}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10.5px] font-semibold text-slate-500">Assets & Appliances</span>
                  <div className="text-lg font-bold text-slate-900">
                    {healthReport.dataCompletenessDetails.assetsCount}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10.5px] font-semibold text-slate-500">Warranties</span>
                  <div className="text-lg font-bold text-slate-900">
                    {healthReport.dataCompletenessDetails.warrantiesCount}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10.5px] font-semibold text-slate-500">Recurring Bills</span>
                  <div className="text-lg font-bold text-slate-900">
                    {healthReport.dataCompletenessDetails.expensesCount}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10.5px] font-semibold text-slate-500">Digitized Documents</span>
                  <div className="text-lg font-bold text-slate-900">
                    {healthReport.dataCompletenessDetails.documentsCount}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Calculated: {new Date(healthReport.calculatedAt).toLocaleString()}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
