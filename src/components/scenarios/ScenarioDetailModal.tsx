import { useState } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Target,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Edit2,
  Trash2,
  Share2,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Scenario, ScenarioGeminiExplanation } from '../../types';
import { api } from '../../lib/api';
import { AffordabilityBadge } from './AffordabilityBadge';

interface ScenarioDetailModalProps {
  scenario: Scenario | null;
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  onEdit: (scenario: Scenario) => void;
  onDuplicate: (scenario: Scenario) => void;
  onDelete: (scenario: Scenario) => void;
  onUpdated: (scenario: Scenario) => void;
}

export function ScenarioDetailModal({
  scenario,
  isOpen,
  onClose,
  currency,
  onEdit,
  onDuplicate,
  onDelete,
  onUpdated,
}: ScenarioDetailModalProps) {
  const [isExplaining, setIsExplaining] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [geminiExplanation, setGeminiExplanation] = useState<ScenarioGeminiExplanation | null>(
    scenario?.geminiExplanation || null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !scenario) return null;

  const { baselineMetrics, projectedMetrics, affordability, inputs } = scenario;

  const handleExplainWithGemini = async () => {
    setIsExplaining(true);
    setErrorMsg(null);
    try {
      const explanation = await api.explainScenarioWithGemini(scenario.id);
      setGeminiExplanation(explanation);
      onUpdated({ ...scenario, geminiExplanation: explanation });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate Gemini explanation');
    } finally {
      setIsExplaining(false);
    }
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setErrorMsg(null);
    try {
      const updated = await api.recalculateScenario(scenario.id);
      onUpdated(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to recalculate scenario');
    } finally {
      setIsRecalculating(false);
    }
  };

  const isSurplusPositive = projectedMetrics.projectedNetSurplus >= 0;
  const isDeltaPositive = projectedMetrics.surplusDelta >= 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 line-clamp-1">{scenario.title}</h2>
                <AffordabilityBadge
                  status={affordability.status}
                  score={affordability.financialPressureScore}
                  size="sm"
                />
              </div>
              <p className="text-xs text-slate-500">
                Created on {new Date(scenario.createdAt).toLocaleDateString()} &middot; Safe Sandbox Mode
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/50 rounded-xl transition"
              title="Recalculate against latest household baseline"
            >
              <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => onDuplicate(scenario)}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/50 rounded-xl transition"
              title="Duplicate scenario"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onEdit(scenario)}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition"
              title="Edit scenario"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(scenario)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              title="Delete scenario"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/50 transition cursor-pointer ml-2 border-l border-slate-200 pl-3"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Executive Verdict Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-300 font-bold">
                  Decision Intelligence Verdict
                </span>
                <h3 className="text-xl font-extrabold text-white mt-0.5">
                  {affordability.verdictTitle}
                </h3>
                <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {affordability.verdictSummary}
                </p>
              </div>

              <div className="shrink-0 sm:text-right bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
                <span className="text-xs text-slate-300 font-medium block">Financial Stress Score</span>
                <div className="flex items-baseline gap-1 mt-0.5 justify-end">
                  <span className="text-2xl font-black font-mono text-white">
                    {affordability.financialPressureScore}
                  </span>
                  <span className="text-xs text-slate-400">/100</span>
                </div>
                <span className="text-[10px] text-indigo-200 block">
                  {affordability.financialPressureScore < 30
                    ? 'Low Stress Buffer'
                    : affordability.financialPressureScore < 65
                    ? 'Moderate Load'
                    : 'High Pressure'}
                </span>
              </div>
            </div>
          </div>

          {/* Side-by-Side Comparison Matrix */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
              Baseline vs Projected Impact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Monthly Income */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                <span className="text-xs font-semibold text-slate-500 block">Monthly Income</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">Baseline:</span>
                  <span className="text-sm font-mono text-slate-600">
                    {currency} {baselineMetrics.monthlyIncome.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between border-t border-slate-100 pt-1">
                  <span className="text-xs font-bold text-slate-700">Projected:</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    {currency} {projectedMetrics.projectedMonthlyIncome.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Monthly Expenses */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                <span className="text-xs font-semibold text-slate-500 block">Monthly Outflow</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">Baseline:</span>
                  <span className="text-sm font-mono text-slate-600">
                    {currency} {baselineMetrics.totalMonthlyExpenses.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between border-t border-slate-100 pt-1">
                  <span className="text-xs font-bold text-slate-700">Projected:</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    {currency} {projectedMetrics.projectedMonthlyExpenses.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Net Monthly Surplus */}
              <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40">
                <span className="text-xs font-semibold text-indigo-900 block">Net Monthly Surplus</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xs text-indigo-700">Baseline:</span>
                  <span className="text-sm font-mono text-slate-700">
                    {currency} {baselineMetrics.netMonthlySurplus.toLocaleString()} ({baselineMetrics.savingsRate}%)
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between border-t border-indigo-100 pt-1">
                  <span className="text-xs font-bold text-indigo-900">Projected:</span>
                  <div className="text-right">
                    <span
                      className={`text-base font-extrabold font-mono ${
                        isSurplusPositive ? 'text-indigo-900' : 'text-rose-600'
                      }`}
                    >
                      {currency} {projectedMetrics.projectedNetSurplus.toLocaleString()}
                    </span>
                    <span
                      className={`block text-[11px] font-bold ${
                        isDeltaPositive ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isDeltaPositive ? '+' : ''}
                      {currency} {projectedMetrics.surplusDelta.toLocaleString()}/mo ({projectedMetrics.projectedSavingsRate}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financing / Loan Details (if EMI or one-time purchase) */}
          {(projectedMetrics.monthlyEmiPayment || projectedMetrics.oneTimeCashImpact) && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Financing & Outlay Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {projectedMetrics.monthlyEmiPayment ? (
                  <div>
                    <span className="text-slate-500 block">Monthly EMI</span>
                    <strong className="text-sm font-mono text-slate-900">
                      {currency} {projectedMetrics.monthlyEmiPayment}/mo
                    </strong>
                    <span className="text-[10px] text-slate-400 block">
                      {inputs.tenureMonths || 12} Months tenure
                    </span>
                  </div>
                ) : null}

                {projectedMetrics.totalLoanCost ? (
                  <div>
                    <span className="text-slate-500 block">Total Financed Cost</span>
                    <strong className="text-sm font-mono text-slate-900">
                      {currency} {projectedMetrics.totalLoanCost.toLocaleString()}
                    </strong>
                    <span className="text-[10px] text-slate-400 block">
                      Interest: {currency} {(projectedMetrics.totalInterestPayable || 0).toLocaleString()}
                    </span>
                  </div>
                ) : null}

                {projectedMetrics.oneTimeCashImpact ? (
                  <div>
                    <span className="text-slate-500 block">Upfront Cash Outlay</span>
                    <strong className="text-sm font-mono text-slate-900">
                      {currency} {projectedMetrics.oneTimeCashImpact.toLocaleString()}
                    </strong>
                    <span className="text-[10px] text-slate-400 block">Down payment / Fees</span>
                  </div>
                ) : null}

                {projectedMetrics.breakevenMonths ? (
                  <div>
                    <span className="text-slate-500 block">Cash Recovery Period</span>
                    <strong className="text-sm font-mono text-emerald-700">
                      {projectedMetrics.breakevenMonths} Months
                    </strong>
                    <span className="text-[10px] text-slate-400 block">from surplus buffer</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-slate-500 block">Annual Surplus Delta</span>
                    <strong
                      className={`text-sm font-mono ${
                        projectedMetrics.annualSurplusImpact >= 0 ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {projectedMetrics.annualSurplusImpact >= 0 ? '+' : ''}
                      {currency} {projectedMetrics.annualSurplusImpact.toLocaleString()}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Affordability Diagnostics (Positive Flags vs Warnings) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Positive Indicators */}
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h5 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Positive Affordability Flags
                </h5>
              </div>
              {affordability.positiveFlags.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-emerald-950">
                  {affordability.positiveFlags.map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">&bull;</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">No positive buffers identified.</p>
              )}
            </div>

            {/* Warnings & Risk Indicators */}
            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Risk & Exposure Alerts
                </h5>
              </div>
              {affordability.warnings.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-amber-950">
                  {affordability.warnings.map((warn, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold">&bull;</span>
                      <span>{warn}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-emerald-700 font-medium">
                  Zero critical risk alerts detected for this decision.
                </p>
              )}
            </div>
          </div>

          {/* Gemini AI Strategic Intelligence Layer */}
          <div className="p-5 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Grounded Decision Intelligence (Gemini Layer)
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Objective strategic reasoning over verified mathematical metrics
                  </span>
                </div>
              </div>

              {!geminiExplanation && (
                <button
                  type="button"
                  onClick={handleExplainWithGemini}
                  disabled={isExplaining}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isExplaining ? 'Analyzing...' : 'Explain with Gemini'}</span>
                </button>
              )}
            </div>

            {geminiExplanation ? (
              <div className="space-y-3.5 text-xs">
                <div className="p-3 bg-white rounded-xl border border-indigo-100">
                  <span className="font-bold text-slate-800 block mb-1 text-[11px] uppercase tracking-wider text-indigo-700">
                    Strategic Executive Summary
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {geminiExplanation.executiveSummary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-1 text-[11px] uppercase tracking-wider text-amber-700">
                      Risk & Liquidity Analysis
                    </span>
                    <ul className="space-y-1 text-slate-600">
                      {geminiExplanation.riskAnalysis.map((r, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-amber-500 font-bold">&bull;</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-1 text-[11px] uppercase tracking-wider text-purple-700">
                      Opportunity Cost & Alternatives
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      {geminiExplanation.opportunityCost}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-indigo-900 text-white rounded-xl">
                  <span className="font-bold block mb-1 text-[11px] uppercase tracking-wider text-indigo-200">
                    Recommended Action Plan
                  </span>
                  <p className="text-indigo-50 leading-relaxed">
                    {geminiExplanation.strategicRecommendation}
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleExplainWithGemini}
                    disabled={isExplaining}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    {isExplaining ? 'Refreshing analysis...' : 'Regenerate Analysis'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Click "Explain with Gemini" to generate strategic advice, opportunity cost analysis, and execution recommendations grounded in your actual numbers.
              </p>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Simulated safely &middot; Real household transactions & bills remain untouched.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer shadow-xs"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
