import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  Wrench,
  ShieldCheck,
  FileText,
  DollarSign,
  Layers,
  ArrowRight,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Bot,
  HelpCircle,
  MoreVertical,
  Calendar,
  Check,
  Eye,
  Info,
} from 'lucide-react';
import {
  UnifiedHouseholdAction,
  UnifiedHouseholdActionPriority,
  UnifiedHouseholdActionType,
} from '../../types';
import { WhyAmISeeingThisModal, WhyEvidencePayload } from '../WhyAmISeeingThisModal';

interface UnifiedActionCenterSectionProps {
  actions: UnifiedHouseholdAction[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onDismissAction?: (id: string, fingerprint?: string) => void;
  onSnoozeAction?: (id: string, durationDays: number, fingerprint?: string) => void;
  onCompleteAction?: (id: string, fingerprint?: string) => void;
  onNavigate: (tab: string, subTab?: string, entityId?: string) => void;
  onOpenCopilotWithPrompt?: (prompt: string) => void;
  currencyCode?: string;
  locale?: string;
}

const INITIAL_VISIBLE_COUNT = 3;

export function UnifiedActionCenterSection({
  actions,
  isLoading = false,
  onRefresh,
  onDismissAction,
  onSnoozeAction,
  onCompleteAction,
  onNavigate,
  onOpenCopilotWithPrompt,
}: UnifiedActionCenterSectionProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [expandedActionIds, setExpandedActionIds] = useState<Set<string>>(new Set());
  const [activeMenuActionId, setActiveMenuActionId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [activeWhyEvidence, setActiveWhyEvidence] = useState<WhyEvidencePayload | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedActionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeActions = actions.filter((a) => a.status === 'active');

  const filteredActions = activeActions.filter((a) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'critical') return a.priority === 'critical';
    if (selectedFilter === 'overdue') return a.priority === 'overdue';
    if (selectedFilter === 'due_today') return a.priority === 'due_today';
    if (selectedFilter === 'warning') return a.priority === 'warning';
    if (selectedFilter === 'due_soon') return a.priority === 'due_soon';
    return a.type === selectedFilter;
  });

  const visibleActions = showAll ? filteredActions : filteredActions.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = filteredActions.length - visibleActions.length;

  const getPriorityBadge = (priority: UnifiedHouseholdActionPriority) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            CRITICAL
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Clock className="w-3 h-3 text-rose-300" />
            OVERDUE
          </span>
        );
      case 'due_today':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-300" />
            ACTION TODAY
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
            <Info className="w-3 h-3 text-yellow-300" />
            WARNING
          </span>
        );
      case 'due_soon':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Info className="w-3 h-3 text-blue-300" />
            UPCOMING
          </span>
        );
    }
  };

  const getTypeLabel = (type: UnifiedHouseholdActionType) => {
    switch (type) {
      case 'repair_replace':
        return 'Repair vs Replace';
      case 'safety_hazard':
        return 'Safety Hazard';
      case 'overdue_payment':
        return 'Payment';
      case 'overdue_maintenance':
        return 'Maintenance';
      case 'warranty_action':
        return 'Warranty Action';
      case 'recurrence_prevention':
        return 'Recurring Issue';
      case 'document_gap':
        return 'Document Audit';
      case 'positive_signal':
        return 'System Health';
      default:
        return 'Action Item';
    }
  };

  const getDomainIcon = (domain?: string) => {
    switch (domain) {
      case 'assets':
        return <Layers className="w-3 h-3" />;
      case 'warranties':
        return <ShieldCheck className="w-3 h-3" />;
      case 'maintenance':
      case 'issues':
        return <Wrench className="w-3 h-3" />;
      case 'finance':
      case 'expenses':
      case 'utilities':
        return <DollarSign className="w-3 h-3" />;
      case 'documents':
        return <FileText className="w-3 h-3" />;
      default:
        return <Layers className="w-3 h-3" />;
    }
  };

  const filterOptions = [
    { id: 'all', label: `All Actions (${activeActions.length})` },
    { id: 'critical', label: 'Critical' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'due_today', label: 'Action Today' },
    { id: 'repair_replace', label: 'Repair vs Replace' },
    { id: 'safety_hazard', label: 'Safety' },
    { id: 'warranty_action', label: 'Warranties' },
  ];

  const handleOpenWhyForAction = (action: UnifiedHouseholdAction) => {
    const primaryRec = action.recommendedActions?.[0];
    setActiveWhyEvidence({
      title: action.title,
      category: getTypeLabel(action.type),
      badge: { label: action.priority.toUpperCase(), variant: action.priority },
      whatDetected: action.summary,
      detectedSignals: action.evidence?.facts || [],
      severityOrPriority: action.priority,
      whyItMatters: action.whyItMatters || action.summary,
      whatToDoNext: primaryRec ? primaryRec.title : 'Review recommendations below.',
      sources: action.relatedRecords?.map((r) => ({
        title: r.title,
        domain: r.domain,
        route: r.route,
        subTab: r.subTab,
        entityId: r.entityId,
      })) || [],
      primaryAction: primaryRec
        ? {
            label: primaryRec.title,
            onExecute: () => {
              if (primaryRec.actionType === 'copilot') {
                if (onOpenCopilotWithPrompt && primaryRec.params?.initialPrompt) {
                  onOpenCopilotWithPrompt(primaryRec.params.initialPrompt);
                } else {
                  onNavigate('copilot');
                }
              } else if (primaryRec.targetTab) {
                onNavigate(primaryRec.targetTab, primaryRec.subTab, primaryRec.entityId);
              }
            },
          }
        : undefined,
    });
  };

  return (
    <div
      id="command-center-unified-actions"
      data-tour="unified-actions"
      className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6 relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-500/30">
              T2
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              What Should I Do Next?
            </span>
            {activeActions.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
                {activeActions.length} recommendations
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Unified Household Action Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Prioritized operational decisions answering <em>"What should I do next?"</em> across maintenance, safety, warranties, and finances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer disabled:opacity-50"
              title="Refresh household recommendations"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none relative z-10">
        {filterOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              setSelectedFilter(opt.id);
              setShowAll(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              selectedFilter === opt.id
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Action Recommendation Cards */}
      {filteredActions.length === 0 ? (
        <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">All Clear & Up to Date</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Zero overdue obligations, urgent safety risks, or unaddressed equipment issues in this category.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5 relative z-10">
          {visibleActions.map((action) => {
            const isExpanded = expandedActionIds.has(action.id);
            const isMenuOpen = activeMenuActionId === action.id;

            return (
              <div
                key={action.id}
                className="bg-slate-950/60 hover:bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 transition space-y-3.5 group relative"
              >
                {/* Top Row: Priority + Type + More Menu */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {getPriorityBadge(action.priority)}
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {getTypeLabel(action.type)}
                    </span>
                  </div>

                  {/* Actions Dropdown / Quick Control */}
                  <div className="flex items-center gap-1.5">
                    {/* Why? Modal Trigger */}
                    <button
                      type="button"
                      onClick={() => handleOpenWhyForAction(action)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
                      title="Why is HouseMind recommending this?"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Why?</span>
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveMenuActionId(isMenuOpen ? null : action.id)}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        title="More actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-7 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-30 py-1 text-xs space-y-0.5 animate-in fade-in">
                          {onCompleteAction && (
                            <button
                              type="button"
                              onClick={() => {
                                onCompleteAction(action.id, action.deduplicationKey);
                                setActiveMenuActionId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-emerald-300 hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Completed</span>
                            </button>
                          )}
                          {onSnoozeAction && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  onSnoozeAction(action.id, 1, action.deduplicationKey);
                                  setActiveMenuActionId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Snooze for 1 day</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onSnoozeAction(action.id, 7, action.deduplicationKey);
                                  setActiveMenuActionId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Snooze for 7 days</span>
                              </button>
                            </>
                          )}
                          {onDismissAction && (
                            <button
                              type="button"
                              onClick={() => {
                                onDismissAction(action.id, action.deduplicationKey);
                                setActiveMenuActionId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-rose-300 hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer border-t border-slate-800"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Dismiss Alert</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progressive 4-Part Structure */}
                <div className="space-y-2">
                  <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                    {action.title}
                  </h3>

                  <div className="text-xs text-slate-300 space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                    <p className="leading-relaxed">
                      <strong className="text-amber-300">What happened:</strong> {action.summary}
                    </p>
                    {action.whyItMatters && (
                      <p className="leading-relaxed text-slate-300">
                        <strong className="text-indigo-300">Why it matters:</strong> {action.whyItMatters}
                      </p>
                    )}
                  </div>
                </div>

                {/* Grounded Evidence Drawer (Expandable) */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => toggleExpand(action.id)}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium transition cursor-pointer"
                  >
                    <span>{isExpanded ? 'Hide evidence & sources' : 'View grounded evidence & sources'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-3 animate-in fade-in">
                      {/* Verified Facts */}
                      {action.evidence?.facts && action.evidence.facts.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            Verified Evidence
                          </div>
                          <ul className="space-y-1">
                            {action.evidence.facts.map((fact, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                <span>{fact}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Source Records */}
                      {action.relatedRecords && action.relatedRecords.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-slate-800">
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            Connected Records
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {action.relatedRecords.map((ref, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  if (ref.route) {
                                    onNavigate(ref.route, ref.subTab, ref.entityId);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition cursor-pointer border border-slate-700/80"
                              >
                                {getDomainIcon(ref.domain)}
                                <span>{ref.title}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2">
                    {action.recommendedActions?.map((ra) => {
                      if (ra.actionType === 'copilot') {
                        return (
                          <button
                            key={ra.id}
                            type="button"
                            onClick={() => {
                              if (onOpenCopilotWithPrompt && ra.params?.initialPrompt) {
                                onOpenCopilotWithPrompt(ra.params.initialPrompt);
                              } else {
                                onNavigate('copilot');
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded-xl text-xs font-semibold transition cursor-pointer"
                          >
                            <Bot className="w-3.5 h-3.5 text-violet-400" />
                            <span>{ra.title}</span>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={ra.id}
                          type="button"
                          onClick={() => {
                            if (ra.targetTab) {
                              onNavigate(ra.targetTab, ra.subTab, ra.entityId);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                            ra.isPrimary
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-xs'
                              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                          }`}
                        >
                          <span>{ra.title}</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-80" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Complete / Dismiss inline shortcuts */}
                  <div className="flex items-center gap-1 text-slate-400">
                    {onCompleteAction && (
                      <button
                        type="button"
                        onClick={() => onCompleteAction(action.id, action.deduplicationKey)}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/20 hover:text-emerald-300 transition cursor-pointer"
                        title="Mark Completed"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {onDismissAction && (
                      <button
                        type="button"
                        onClick={() => onDismissAction(action.id, action.deduplicationKey)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 hover:text-rose-300 transition cursor-pointer"
                        title="Dismiss Recommendation"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Expand / Collapse Actions Attention Budget */}
          {filteredActions.length > INITIAL_VISIBLE_COUNT && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                id="btn-toggle-unified-actions-budget"
                onClick={() => setShowAll(!showAll)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700"
              >
                {showAll ? (
                  <>
                    <span>Show top {INITIAL_VISIBLE_COUNT} prioritized recommendations</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>View {hiddenCount} more recommendations</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grounded Why Am I Seeing This Modal */}
      <WhyAmISeeingThisModal
        isOpen={!!activeWhyEvidence}
        onClose={() => setActiveWhyEvidence(null)}
        evidence={activeWhyEvidence}
        onNavigate={onNavigate}
      />
    </div>
  );
}
