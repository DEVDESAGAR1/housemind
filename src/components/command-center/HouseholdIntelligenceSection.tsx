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
  History,
  Info,
} from 'lucide-react';
import { CrossDomainInsight, CrossDomainInsightType, CrossDomainInsightPriority } from '../../types';

interface HouseholdIntelligenceSectionProps {
  insights: CrossDomainInsight[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onDismissInsight?: (id: string, fingerprint?: string) => void;
  onOpenTimeline?: () => void;
  onNavigate: (tab: string) => void;
  currencyCode?: string;
  locale?: string;
}

export function HouseholdIntelligenceSection({
  insights,
  isLoading = false,
  onDismissInsight,
  onOpenTimeline,
  onNavigate,
}: HouseholdIntelligenceSectionProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [expandedInsightIds, setExpandedInsightIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedInsightIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeInsights = insights.filter((i) => !i.isDismissed);

  const filteredInsights = activeInsights.filter((i) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'critical') return i.priority === 'critical';
    return i.type === selectedFilter;
  });

  const getPriorityBadge = (priority: CrossDomainInsightPriority) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            CRITICAL
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Clock className="w-3 h-3 text-rose-300" />
            OVERDUE
          </span>
        );
      case 'due_today':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-300" />
            ACTION TODAY
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
            <Info className="w-3 h-3 text-yellow-300" />
            WARNING
          </span>
        );
      case 'due_soon':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Info className="w-3 h-3 text-blue-300" />
            OPPORTUNITY
          </span>
        );
    }
  };

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'assets':
        return <Layers className="w-3 h-3" />;
      case 'warranties':
        return <ShieldCheck className="w-3 h-3" />;
      case 'maintenance':
      case 'issues':
        return <Wrench className="w-3 h-3" />;
      case 'finance':
        return <DollarSign className="w-3 h-3" />;
      case 'documents':
        return <FileText className="w-3 h-3" />;
      default:
        return <Layers className="w-3 h-3" />;
    }
  };

  const filterOptions = [
    { id: 'all', label: `All Insights (${activeInsights.length})` },
    { id: 'critical', label: `Critical (${activeInsights.filter((i) => i.priority === 'critical').length})` },
    { id: 'opportunity', label: 'Opportunities' },
    { id: 'recurrence', label: 'Recurring' },
    { id: 'deadline', label: 'Deadlines' },
    { id: 'cost', label: 'Cost Signals' },
    { id: 'missing_info', label: 'Missing Info' },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6 relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Cross-Domain Household Intelligence
            </h2>
            {activeInsights.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {activeInsights.length} active
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Correlated signals linking equipment failures, active warranties, overdue maintenance, and financial obligations.
          </p>
        </div>

        {/* Timeline Action Button */}
        {onOpenTimeline && (
          <button
            id="open-operational-timeline-btn"
            onClick={onOpenTimeline}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition shadow-xs cursor-pointer shrink-0"
          >
            <History className="w-4 h-4 text-indigo-400" />
            <span>Operational Timeline</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {filterOptions.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
              selectedFilter === f.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Insights Grid / Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-slate-800/50 rounded-2xl border border-slate-800" />
          ))}
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-white">All Household Systems Running Smoothly</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No active cross-domain issues, warranty risks, or maintenance anomalies detected for this filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInsights.map((insight) => {
            const isExpanded = expandedInsightIds.has(insight.id);
            return (
              <div
                key={insight.id}
                className="bg-slate-800/70 hover:bg-slate-800/90 border border-slate-700/70 hover:border-slate-600 rounded-2xl p-5 transition flex flex-col justify-between space-y-4 relative"
              >
                {/* Top Row: Priority & Domain Badges & Dismiss */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {getPriorityBadge(insight.priority)}

                    {insight.relatedDomains && insight.relatedDomains.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {insight.relatedDomains.map((dom) => (
                          <span
                            key={dom}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-700/80 text-slate-300 border border-slate-600/50 capitalize"
                          >
                            {getDomainIcon(dom)}
                            {dom}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {onDismissInsight && (
                    <button
                      onClick={() => onDismissInsight(insight.id, insight.deduplicationKey)}
                      title="Acknowledge / Dismiss"
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Main Content */}
                <div className="space-y-1.5">
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {insight.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {insight.explanation}
                  </p>
                </div>

                {/* Evidence Facts (Collapsible) */}
                {insight.deterministicEvidence?.facts && insight.deterministicEvidence.facts.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-slate-700/60">
                    <button
                      onClick={() => toggleExpand(insight.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200 transition font-medium cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Grounded Evidence' : 'View Grounded Evidence'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <ul className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                        {insight.deterministicEvidence.facts.map((fact, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-indigo-400 mt-0.5">•</span>
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Footer Action */}
                {insight.recommendedAction && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        if (insight.recommendedAction?.targetRoute) {
                          onNavigate(insight.recommendedAction.targetRoute);
                        }
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer"
                    >
                      <span>{insight.recommendedAction.title}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
