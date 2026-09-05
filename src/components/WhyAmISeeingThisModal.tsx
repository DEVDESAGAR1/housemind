import React, { useEffect, useRef } from 'react';
import {
  HelpCircle,
  X,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  FileText,
  Wrench,
  DollarSign,
  Layers,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';

export interface WhySourceRecord {
  title: string;
  domain?: 'assets' | 'warranties' | 'maintenance' | 'expenses' | 'documents' | 'utilities' | 'loans' | 'cards' | string;
  route?: string;
  subTab?: string;
  entityId?: string;
}

export interface WhyEvidencePayload {
  title: string;
  category?: string;
  badge?: {
    label: string;
    variant?: 'critical' | 'overdue' | 'warning' | 'due_today' | 'due_soon' | 'info' | 'success';
  };
  // 1. What HouseMind detected
  whatDetected: string;
  detectedSignals?: string[];
  relevantDate?: string;
  severityOrPriority?: string;

  // 2. Why it matters
  whyItMatters: string;

  // 3. What you can do next
  whatToDoNext: string;

  // 4. Grounded sources & connected records
  sources?: WhySourceRecord[];

  // Primary action button
  primaryAction?: {
    label: string;
    onExecute: () => void;
  };
}

interface WhyAmISeeingThisModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: WhyEvidencePayload | null;
  onNavigate?: (tab: string, subTab?: string, entityId?: string) => void;
}

export function WhyAmISeeingThisModal({
  isOpen,
  onClose,
  evidence,
  onNavigate,
}: WhyAmISeeingThisModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
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
  }, [isOpen, onClose]);

  if (!isOpen || !evidence) return null;

  const getBadgeStyle = (variant?: string) => {
    switch (variant) {
      case 'critical':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'overdue':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'due_today':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'warning':
        return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
      case 'success':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'info':
      default:
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    }
  };

  const getDomainIcon = (domain?: string) => {
    switch (domain) {
      case 'assets':
        return <Layers className="w-3.5 h-3.5 text-blue-400" />;
      case 'warranties':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'maintenance':
        return <Wrench className="w-3.5 h-3.5 text-amber-400" />;
      case 'expenses':
      case 'utilities':
      case 'loans':
      case 'cards':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-400" />;
      case 'documents':
        return <FileText className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const handleSourceClick = (src: WhySourceRecord) => {
    if (src.route && onNavigate) {
      onClose();
      onNavigate(src.route, src.subTab, src.entityId);
    }
  };

  const handlePrimaryAction = () => {
    if (evidence.primaryAction?.onExecute) {
      onClose();
      evidence.primaryAction.onExecute();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="why-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100 animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                Why Am I Seeing This?
              </span>
              {evidence.badge && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border uppercase tracking-wider ${getBadgeStyle(
                    evidence.badge.variant
                  )}`}
                >
                  {evidence.badge.label}
                </span>
              )}
            </div>
            <h2 id="why-modal-title" className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {evidence.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close explainability dialog"
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-left text-xs sm:text-sm">
          {/* Section 1: What HouseMind Detected */}
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>What HouseMind Detected</span>
            </div>
            <p className="text-slate-200 leading-relaxed font-medium">
              {evidence.whatDetected}
            </p>

            {evidence.detectedSignals && evidence.detectedSignals.length > 0 && (
              <ul className="space-y-1.5 pt-2 border-t border-slate-800/80">
                {evidence.detectedSignals.map((signal, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-300 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span>{signal}</span>
                  </li>
                ))}
              </ul>
            )}

            {evidence.relevantDate && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Relevant Date / Deadline: <strong>{evidence.relevantDate}</strong></span>
              </div>
            )}
          </div>

          {/* Section 2: Why It Matters */}
          <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Why It Matters</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
              {evidence.whyItMatters}
            </p>
          </div>

          {/* Section 3: What You Can Do Next */}
          <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>What You Can Do Next</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
              {evidence.whatToDoNext}
            </p>
          </div>

          {/* Section 4: Grounded Source Records */}
          {evidence.sources && evidence.sources.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Connected Household Records
              </div>
              <div className="flex flex-wrap gap-2">
                {evidence.sources.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSourceClick(src)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer shadow-2xs"
                  >
                    {getDomainIcon(src.domain)}
                    <span>{src.title}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Close
          </button>

          {evidence.primaryAction && (
            <button
              type="button"
              id="why-modal-primary-act-btn"
              onClick={handlePrimaryAction}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <span>{evidence.primaryAction.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
