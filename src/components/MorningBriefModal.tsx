import { useState, useEffect, useRef } from 'react';
import {
  Sun,
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Building2,
  MessageSquare,
  Layers,
} from 'lucide-react';
import { HouseholdMorningBrief } from '../types';

interface MorningBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  brief: HouseholdMorningBrief | null;
  isLoading?: boolean;
  onNavigateTab: (tab: any, subTab?: string, entityId?: string) => void;
  onAskCopilot: (prompt: string, initialDomain?: string) => void;
  onDismissToday?: () => Promise<void>;
  currency?: string;
}

export function MorningBriefModal({
  isOpen,
  onClose,
  brief,
  isLoading = false,
  onNavigateTab,
  onAskCopilot,
  onDismissToday,
}: MorningBriefModalProps) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [dontShowTodayChecked, setDontShowTodayChecked] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, dontShowTodayChecked]);

  if (!isOpen) return null;

  const handleClose = async () => {
    if (dontShowTodayChecked && onDismissToday) {
      try {
        setIsDismissing(true);
        await onDismissToday();
      } catch (err) {
        console.error('Failed to save dismissal preference:', err);
      } finally {
        setIsDismissing(false);
      }
    }
    onClose();
  };

  const handleActionClick = (tab: string, subTab?: string, entityId?: string) => {
    handleClose();
    onNavigateTab(tab, subTab, entityId);
  };

  const handleAskCopilotClick = (prompt: string, domain?: string) => {
    handleClose();
    onAskCopilot(prompt, domain);
  };

  // Compute greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isSetupRequired = brief?.overallStatus === 'setup_required' || !brief?.healthScore;
  const attentionItems = brief?.itemsNeedingAttention?.slice(0, 3) || [];
  const meaningfulChanges = brief?.meaningfulChanges || [];
  const topAction = brief?.topAction;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="morning-brief-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
      >
        {/* 1. Modal Header */}
        <div className="relative bg-gradient-to-br from-amber-600 via-amber-500 to-indigo-700 text-white p-6 sm:p-7 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-amber-100 text-xs font-semibold tracking-wide uppercase">
                <Sun className="w-4 h-4 text-amber-200 animate-spin-slow" />
                <span>Morning Brief</span>
                <span className="opacity-60">•</span>
                <span>{todayFormatted}</span>
              </div>
              <h2 id="morning-brief-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                🌅 {isSetupRequired ? 'Welcome to HouseMind' : `${greeting}`}
              </h2>
              <p className="text-amber-100 text-xs sm:text-sm font-medium">
                {isSetupRequired
                  ? 'Your household is ready to get organized.'
                  : `Here's what matters in ${brief?.homeName || 'your household'} today.`}
              </p>
            </div>

            <button
              id="morning-brief-close-btn"
              type="button"
              onClick={handleClose}
              aria-label="Close Morning Brief"
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <Sun className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-xs font-medium">Synthesizing today's household briefing...</p>
            </div>
          ) : isSetupRequired ? (
            /* EMPTY / ONBOARDING BRIEF */
            <div className="space-y-6">
              <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2.5 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Get Started with 4 Simple Steps</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  HouseMind tracks assets, warranties, maintenance schedules, and finances across your home with unified intelligence.
                </p>

                <ol className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium pl-1">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <span><strong>Add your home:</strong> Configure property type, address, and living spaces.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <span><strong>Add important assets:</strong> Register HVAC, refrigerators, water heaters, and vehicles.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                    <span><strong>Add bills & obligations:</strong> Track electric, gas, mortgage, and recurring maintenance.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">4</span>
                    <span><strong>Upload documents:</strong> Scan warranties and user manuals for automated OCR extraction.</span>
                  </li>
                </ol>
              </div>

              <div className="flex justify-start">
                <button
                  id="morning-brief-onboarding-cta"
                  type="button"
                  onClick={() => handleActionClick('properties')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Add Your Home</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* POPULATED HOUSEHOLD BRIEF */
            <div className="space-y-6">
              {/* SECTION A: Household Health Score */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Household Health Score
                  </div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {brief?.healthScore && brief.healthScore >= 80
                      ? 'Your household systems are operating smoothly today.'
                      : brief?.healthScore && brief.healthScore >= 60
                      ? 'Your household has a few items requiring attention.'
                      : 'Immediate attention recommended on critical household items.'}
                  </div>
                </div>

                <div className="flex items-baseline gap-1 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs shrink-0">
                  <span className={`text-2xl font-black ${
                    (brief?.healthScore ?? 0) >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                    (brief?.healthScore ?? 0) >= 60 ? 'text-amber-600 dark:text-amber-400' :
                    'text-rose-600 dark:text-rose-400'
                  }`}>
                    {brief?.healthScore ?? '--'}
                  </span>
                  <span className="text-xs font-bold text-slate-400">/ 100</span>
                </div>
              </div>

              {/* SECTION B: Top Attention Items (Max 3) */}
              {attentionItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {attentionItems.length} {attentionItems.length === 1 ? 'Thing Needs' : 'Things Need'} Your Attention
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {attentionItems.map((item, idx) => {
                      const isCritical = item.urgency === 'critical';
                      const isOverdue = item.urgency === 'overdue';
                      const isDueToday = item.urgency === 'due_today';

                      return (
                        <div
                          key={item.id || idx}
                          className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isCritical
                              ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                              : isOverdue
                              ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">{idx + 1}.</span>
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {item.title}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                isCritical ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300' :
                                isOverdue ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300' :
                                isDueToday ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300' :
                                'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>
                                {item.urgency.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 pl-4">
                              {item.reason}
                            </p>
                          </div>

                          <button
                            id={`mb-action-btn-${idx}`}
                            type="button"
                            onClick={() => handleActionClick(item.actionTab || 'dashboard', item.subTab, item.entityId)}
                            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-xl transition cursor-pointer shrink-0"
                          >
                            <span>{item.actionLabel || 'View Record'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION C: What Changed (Meaningful Changes) */}
              {meaningfulChanges.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      What Changed Since Last Briefing
                    </h3>
                  </div>

                  <ul className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-700 dark:text-slate-300">
                    {meaningfulChanges.map((change, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-2">
                        <span className="text-indigo-500 font-bold">•</span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SECTION D: Top Recommended Action */}
              {topAction && (
                <div className="bg-gradient-to-br from-indigo-50 via-white to-indigo-50/30 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                        Your Top Action
                      </span>
                    </div>

                    {topAction.why && topAction.why.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowEvidence(!showEvidence)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{showEvidence ? 'Hide Why' : 'Why HouseMind Recommends This'}</span>
                        {showEvidence ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {topAction.title}
                  </h4>

                  {/* Expandable Why Evidence */}
                  {showEvidence && topAction.why && (
                    <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/40 space-y-1 text-xs text-slate-600 dark:text-slate-400 animate-in fade-in duration-150">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Grounded Evidence:</div>
                      {topAction.why.map((fact, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2">
                          <span className="text-indigo-500">•</span>
                          <span>{fact}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      id="mb-top-action-execute-btn"
                      type="button"
                      onClick={() => handleActionClick(topAction.targetTab, topAction.subTab, topAction.entityId)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <span>{topAction.actionLabel || 'Take Action'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      id="mb-ask-copilot-btn"
                      type="button"
                      onClick={() => handleAskCopilotClick(topAction.copilotPrompt, topAction.targetTab)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Ask HouseMind</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION E: Positive Signal */}
              {brief?.positiveSignal && (
                <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-3.5 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                    <strong>Positive:</strong> {brief.positiveSignal}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              id="mb-dont-show-today-checkbox"
              type="checkbox"
              checked={dontShowTodayChecked}
              onChange={(e) => setDontShowTodayChecked(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
            />
            <span>Don't show today's brief again</span>
          </label>

          <button
            id="mb-done-btn"
            type="button"
            onClick={handleClose}
            disabled={isDismissing}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            {isDismissing ? 'Saving...' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
