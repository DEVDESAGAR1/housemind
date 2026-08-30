import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  Calculator,
  FileText,
  Clock,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  HouseholdInsight,
  HouseholdExpense,
  HomeAsset,
  GeminiInsightExplanation,
  InsightStatus,
} from '../types';

interface InvestigationModalProps {
  insight: HouseholdInsight | null;
  expenses: HouseholdExpense[];
  assets: HomeAsset[];
  onClose: () => void;
  onUpdateStatus: (id: string, status: InsightStatus) => Promise<void>;
  onExplainInsight: (id: string) => Promise<GeminiInsightExplanation>;
  onNavigateToEntity?: (type: 'expense' | 'asset', id?: string) => void;
}

export const InvestigationModal: React.FC<InvestigationModalProps> = ({
  insight,
  expenses,
  assets,
  onClose,
  onUpdateStatus,
  onExplainInsight,
  onNavigateToEntity,
}) => {
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<GeminiInsightExplanation | null>(
    insight?.geminiExplanation || null
  );
  const [statusUpdating, setStatusUpdating] = useState(false);

  if (!insight) return null;

  const handleGenerateExplanation = async () => {
    try {
      setIsExplaining(true);
      const res = await onExplainInsight(insight.id);
      setExplanation(res);
    } catch (err: any) {
      console.error('Failed to generate Gemini explanation:', err);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleStatusChange = async (newStatus: InsightStatus) => {
    try {
      setStatusUpdating(true);
      await onUpdateStatus(insight.id, newStatus);
    } finally {
      setStatusUpdating(false);
    }
  };

  // Find associated entity
  const relatedExpense =
    insight.relatedEntityType === 'expense' && insight.relatedEntityIds?.[0]
      ? expenses.find((e) => e.id === insight.relatedEntityIds[0])
      : null;

  const relatedAsset =
    insight.relatedEntityType === 'asset' && insight.relatedEntityIds?.[0]
      ? assets.find((a) => a.id === insight.relatedEntityIds[0])
      : null;

  // Severity styling
  const severityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            CRITICAL SEVERITY
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            HIGH PRIORITY
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            MEDIUM PRIORITY
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            INFORMATIONAL
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="investigation-modal"
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/60">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {severityBadge(insight.severity)}
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {insight.type.replace(/_/g, ' ')}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                  insight.status === 'resolved'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : insight.status === 'dismissed'
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                }`}
              >
                Status: {insight.status.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">{insight.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
            title="Close investigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Section 1 & 2: What Happened & Detection Rule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                1. What Happened
              </span>
              <p className="text-slate-800 text-xs sm:text-sm leading-relaxed">{insight.description}</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                2. Why It Was Detected
              </span>
              <p className="text-slate-800 text-xs sm:text-sm leading-relaxed">{insight.whyDetected}</p>
            </div>
          </div>

          {/* Section 3: Evidence (Facts & Calculations) */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Deterministic Evidence Breakdown</h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                100% Deterministic Match
              </span>
            </div>

            {/* Verified Facts */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Verified Database Facts:
              </span>
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 space-y-1">
                {insight.evidence.facts.map((fact, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="text-slate-400 select-none">•</span>
                    <span>{fact}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Explicit Arithmetic Calculation */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Mathematical Calculation:
              </span>
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-xs font-mono text-indigo-950 font-medium break-all">
                {insight.evidence.calculation}
              </div>
            </div>
          </div>

          {/* Section 4: Relevant Household Records */}
          {(relatedExpense || relatedAsset) && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Linked Household Record
              </span>

              {relatedExpense && (
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{relatedExpense.title}</h4>
                    <p className="text-xs text-slate-500">
                      Category: {relatedExpense.category} • {relatedExpense.frequency}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">
                      ${relatedExpense.amount}
                    </p>
                    {onNavigateToEntity && (
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToEntity('expense', relatedExpense.id);
                        }}
                        className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-0.5 cursor-pointer"
                      >
                        <span>View Expense</span>
                        <ChevronRight className="w-3 h-3 ml-0.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {relatedAsset && (
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{relatedAsset.name}</h4>
                    <p className="text-xs text-slate-500">
                      Brand: {relatedAsset.brand || 'N/A'} • Status: {relatedAsset.currentStatus}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600">
                      Warranty: {relatedAsset.warrantyExpiryDate || 'None'}
                    </p>
                    {onNavigateToEntity && (
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToEntity('asset', relatedAsset.id);
                        }}
                        className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-0.5 cursor-pointer"
                      >
                        <span>View Asset</span>
                        <ChevronRight className="w-3 h-3 ml-0.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 5: Gemini AI Explanation */}
          <div className="border border-indigo-200/90 rounded-2xl p-5 bg-linear-to-br from-indigo-50/40 via-white to-slate-50 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100/80 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-bold text-indigo-950 text-sm">Gemini AI Explanation</h3>
                  <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
                    AI INTERPRETATION (Not a verified fact)
                  </span>
                </div>
              </div>

              {!explanation && (
                <button
                  id="btn-generate-explanation"
                  onClick={handleGenerateExplanation}
                  disabled={isExplaining}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs transition cursor-pointer"
                >
                  {isExplaining ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Analyzing finding...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Explain Finding</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {explanation ? (
              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <h4 className="font-bold text-slate-900 mb-1 text-xs uppercase tracking-wider">
                    Summary
                  </h4>
                  <p className="text-slate-700 leading-relaxed">{explanation.summary}</p>
                </div>

                <div className="bg-white border border-indigo-100 rounded-xl p-3.5 space-y-1">
                  <h4 className="font-bold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                    Household Interpretation
                  </h4>
                  <p className="text-slate-700 text-xs leading-relaxed">
                    {explanation.interpretation}
                  </p>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-1">
                  <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Recommended Next Steps
                  </h4>
                  <div className="text-emerald-900 text-xs leading-relaxed whitespace-pre-line">
                    {explanation.recommendedAction}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Generated: {new Date(explanation.generatedAt).toLocaleString()}</span>
                  <button
                    onClick={handleGenerateExplanation}
                    disabled={isExplaining}
                    className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isExplaining ? 'animate-spin' : ''}`} />
                    <span>Re-evaluate</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 px-2">
                <p className="text-xs text-slate-500">
                  Click <strong>"Explain Finding"</strong> to receive an objective, AI-interpreted
                  assessment and recommended next steps.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {insight.status !== 'resolved' ? (
              <button
                id="btn-resolve-insight"
                onClick={() => handleStatusChange('resolved')}
                disabled={statusUpdating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Resolved</span>
              </button>
            ) : (
              <button
                onClick={() => handleStatusChange('new')}
                disabled={statusUpdating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <span>Re-open Finding</span>
              </button>
            )}

            {insight.status !== 'dismissed' && (
              <button
                id="btn-dismiss-insight"
                onClick={() => handleStatusChange('dismissed')}
                disabled={statusUpdating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition cursor-pointer"
              >
                <span>Dismiss Alert</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
