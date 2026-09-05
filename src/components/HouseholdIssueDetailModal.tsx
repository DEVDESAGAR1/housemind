import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  AlertTriangle,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  DollarSign,
  Phone,
  Clock,
  CheckCircle2,
  Edit2,
  Trash2,
  Send,
  Loader2,
  FileText,
  UserCheck,
  ArrowRight,
  Sparkles,
  Link2,
  Unlink2,
  ListChecks,
  CheckSquare,
  Square,
  RefreshCw,
  Info,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Layers,
  History,
} from 'lucide-react';
import {
  HouseholdIssue,
  HouseholdIssueStatus,
  HomeAsset,
  Property,
  Room,
  Warranty,
  IssueIntelligenceReport,
  ResolutionChecklistItem,
  PossibleRelatedIssue,
} from '../types';
import { api } from '../lib/api';
import { formatCurrency } from '../config/locationCurrencyConfig';

interface HouseholdIssueDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: HouseholdIssue | null;
  assets: HomeAsset[];
  properties: Property[];
  rooms?: Room[];
  warranties: Warranty[];
  currency?: string;
  onEdit: (issue: HouseholdIssue) => void;
  onDelete: (issue: HouseholdIssue) => void;
  onRefresh: () => Promise<void>;
  addToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

const STATUS_FLOW_NEXT_MAP: Record<HouseholdIssueStatus, { label: string; status: HouseholdIssueStatus; color: string }[]> = {
  reported: [
    { label: 'Triage Issue', status: 'triaged', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
    { label: 'Schedule Repair', status: 'scheduled', color: 'bg-sky-600 hover:bg-sky-700 text-white' },
    { label: 'Start Work', status: 'in_progress', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
    { label: 'Cancel', status: 'cancelled', color: 'bg-slate-200 hover:bg-slate-300 text-slate-700' },
  ],
  triaged: [
    { label: 'Schedule Vendor', status: 'scheduled', color: 'bg-sky-600 hover:bg-sky-700 text-white' },
    { label: 'Start Work', status: 'in_progress', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
    { label: 'Order Parts', status: 'waiting_parts', color: 'bg-purple-600 hover:bg-purple-700 text-white' },
    { label: 'Cancel', status: 'cancelled', color: 'bg-slate-200 hover:bg-slate-300 text-slate-700' },
  ],
  scheduled: [
    { label: 'Begin Work', status: 'in_progress', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
    { label: 'Back to Triage', status: 'triaged', color: 'bg-slate-200 hover:bg-slate-300 text-slate-700' },
    { label: 'Cancel', status: 'cancelled', color: 'bg-slate-200 hover:bg-slate-300 text-slate-700' },
  ],
  in_progress: [
    { label: 'Mark Resolved', status: 'resolved', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    { label: 'Waiting on Parts', status: 'waiting_parts', color: 'bg-purple-600 hover:bg-purple-700 text-white' },
    { label: 'Reschedule', status: 'scheduled', color: 'bg-sky-600 hover:bg-sky-700 text-white' },
  ],
  waiting_parts: [
    { label: 'Resume Work', status: 'in_progress', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
    { label: 'Mark Resolved', status: 'resolved', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  ],
  resolved: [
    { label: 'Verify Fix', status: 'verified', color: 'bg-teal-600 hover:bg-teal-700 text-white' },
    { label: 'Close Ticket', status: 'closed', color: 'bg-slate-700 hover:bg-slate-800 text-white' },
    { label: 'Reopen', status: 'in_progress', color: 'bg-rose-100 hover:bg-rose-200 text-rose-800' },
  ],
  verified: [
    { label: 'Close Ticket', status: 'closed', color: 'bg-slate-700 hover:bg-slate-800 text-white' },
    { label: 'Reopen', status: 'in_progress', color: 'bg-rose-100 hover:bg-rose-200 text-rose-800' },
  ],
  closed: [
    { label: 'Reopen Ticket', status: 'reported', color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200' },
  ],
  cancelled: [
    { label: 'Reopen Ticket', status: 'reported', color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200' },
  ],
};

export function HouseholdIssueDetailModal({
  isOpen,
  onClose,
  issue,
  assets,
  properties,
  rooms = [],
  warranties,
  currency = 'USD',
  onEdit,
  onDelete,
  onRefresh,
  addToast,
}: HouseholdIssueDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'intelligence' | 'resolution' | 'timeline'>('details');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<HouseholdIssueStatus | null>(null);
  const [transitionNote, setTransitionNote] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [actualCostInput, setActualCostInput] = useState('');

  // Intelligence state
  const [intelligence, setIntelligence] = useState<IssueIntelligenceReport | null>(null);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);
  const [isLinkingIssue, setIsLinkingIssue] = useState<string | null>(null);

  // Resolution Checklist state
  const [checklist, setChecklist] = useState<ResolutionChecklistItem[]>([]);
  const [isUpdatingChecklist, setIsUpdatingChecklist] = useState(false);

  // Root cause editor
  const [rootCauseInput, setRootCauseInput] = useState('');
  const [isSavingRootCause, setIsSavingRootCause] = useState(false);

  // Add activity note
  const [newActivityNote, setNewActivityNote] = useState('');
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  // Load intelligence
  const loadIntelligence = useCallback(async (issueId: string) => {
    setIsLoadingIntelligence(true);
    setIntelligenceError(null);
    try {
      const data = await api.getIssueIntelligence(issueId);
      setIntelligence(data);
      if (data.checklist) {
        setChecklist(data.checklist);
      }
    } catch (err: any) {
      setIntelligenceError(err.message || 'Could not load issue intelligence.');
    } finally {
      setIsLoadingIntelligence(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && issue) {
      loadIntelligence(issue.id);
      setRootCauseInput(issue.rootCause || '');
      setChecklist(issue.resolutionChecklist || []);
    } else {
      setIntelligence(null);
      setIntelligenceError(null);
    }
  }, [isOpen, issue?.id, loadIntelligence]);

  if (!isOpen || !issue) return null;

  const linkedAsset = issue.assetId ? assets.find((a) => a.id === issue.assetId) : null;
  const linkedProperty = issue.propertyId ? properties.find((p) => p.id === issue.propertyId) : null;
  const linkedRoom = issue.roomId ? rooms.find((r) => r.id === issue.roomId) : null;
  const linkedWarranty = issue.warrantyId
    ? warranties.find((w) => w.id === issue.warrantyId)
    : linkedAsset
    ? warranties.find((w) => w.assetId === linkedAsset.id && w.status === 'active')
    : null;

  const nextActions = STATUS_FLOW_NEXT_MAP[issue.status] || [];

  const handleOpenTransition = (targetStatus: HouseholdIssueStatus) => {
    setPendingStatus(targetStatus);
    setTransitionNote('');
    setResolutionText(issue.resolution || '');
    setActualCostInput(issue.actualCost ? String(issue.actualCost) : '');
  };

  const handleConfirmTransition = async () => {
    if (!pendingStatus) return;
    setIsTransitioning(true);
    try {
      await api.transitionIssueStatus(issue.id, pendingStatus, {
        note: transitionNote.trim() || undefined,
        resolution:
          pendingStatus === 'resolved' || pendingStatus === 'verified' || pendingStatus === 'closed'
            ? resolutionText.trim() || undefined
            : undefined,
        actualCost: actualCostInput ? parseFloat(actualCostInput) : undefined,
      });

      addToast('success', 'Status Updated', `Issue transitioned to ${pendingStatus.replace('_', ' ')}.`);
      setPendingStatus(null);
      await onRefresh();
      await loadIntelligence(issue.id);
    } catch (err: any) {
      addToast('error', 'Transition Failed', err.message || 'Could not update status.');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleAddManualActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityNote.trim()) return;

    setIsAddingActivity(true);
    try {
      await api.addIssueActivity(issue.id, 'User Note', newActivityNote.trim());
      addToast('success', 'Activity Logged', 'Note added to ticket history.');
      setNewActivityNote('');
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Failed to Add Note', err.message);
    } finally {
      setIsAddingActivity(false);
    }
  };

  // Toggle checklist item
  const handleToggleChecklistItem = async (item: ResolutionChecklistItem) => {
    const updated = checklist.map((c) =>
      c.id === item.id
        ? {
            ...c,
            completed: !c.completed,
            completedAt: !c.completed ? new Date().toISOString() : undefined,
          }
        : c
    );
    setChecklist(updated);
    setIsUpdatingChecklist(true);
    try {
      await api.updateIssueChecklist(issue.id, updated);
      addToast('success', 'Checklist Updated', `Step "${item.label}" updated.`);
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Checklist Update Failed', err.message);
      // revert
      setChecklist(checklist);
    } finally {
      setIsUpdatingChecklist(false);
    }
  };

  // Link related issue
  const handleLinkRelatedIssue = async (targetIssue: PossibleRelatedIssue) => {
    setIsLinkingIssue(targetIssue.id);
    try {
      await api.linkRelatedIssues(issue.id, targetIssue.id, targetIssue.relationReason);
      addToast('success', 'Issues Linked', `Linked with ticket "${targetIssue.title}".`);
      await onRefresh();
      await loadIntelligence(issue.id);
    } catch (err: any) {
      addToast('error', 'Linking Failed', err.message);
    } finally {
      setIsLinkingIssue(null);
    }
  };

  // Unlink related issue
  const handleUnlinkRelatedIssue = async (targetIssueId: string) => {
    setIsLinkingIssue(targetIssueId);
    try {
      await api.unlinkRelatedIssue(issue.id, targetIssueId);
      addToast('success', 'Issue Unlinked', 'Removed relationship link.');
      await onRefresh();
      await loadIntelligence(issue.id);
    } catch (err: any) {
      addToast('error', 'Unlink Failed', err.message);
    } finally {
      setIsLinkingIssue(null);
    }
  };

  // Save Root Cause
  const handleSaveRootCause = async () => {
    setIsSavingRootCause(true);
    try {
      await api.updateIssueRootCause(issue.id, rootCauseInput.trim());
      addToast('success', 'Root Cause Saved', 'Root cause diagnostic updated.');
      await onRefresh();
      await loadIntelligence(issue.id);
    } catch (err: any) {
      addToast('error', 'Save Failed', err.message);
    } finally {
      setIsSavingRootCause(false);
    }
  };

  // Checklist completion count
  const completedChecklistCount = checklist.filter((c) => c.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                issue.severity === 'critical'
                  ? 'bg-rose-100 text-rose-800'
                  : issue.severity === 'high'
                  ? 'bg-orange-100 text-orange-800'
                  : issue.severity === 'medium'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {issue.severity}
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 line-clamp-1">{issue.title}</h2>
              <p className="text-xs text-slate-500">
                Ticket #{issue.id.slice(-6).toUpperCase()} • Reported{' '}
                {new Date(issue.reportedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEdit(issue)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Edit ticket"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(issue)}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
              title="Delete ticket"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Safety Warning Banner */}
        {issue.safetyWarning && (
          <div className="px-6 py-3 bg-rose-50 border-b border-rose-100 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 leading-relaxed font-medium">
              <span className="font-bold uppercase tracking-wider block text-rose-800 text-[10px]">
                Safety Hazard Precaution
              </span>
              {issue.safetyWarning}
            </div>
          </div>
        )}

        {/* Status Transition Action Bar */}
        <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Current Status:</span>
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${
                issue.status === 'resolved' || issue.status === 'verified' || issue.status === 'closed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : issue.status === 'in_progress'
                  ? 'bg-amber-100 text-amber-800'
                  : issue.status === 'scheduled'
                  ? 'bg-sky-100 text-sky-800'
                  : issue.status === 'waiting_parts'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-slate-200 text-slate-800'
              }`}
            >
              {issue.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {nextActions.map((action) => (
              <button
                key={action.status}
                type="button"
                onClick={() => handleOpenTransition(action.status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer ${action.color}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Transition Sub-form Dialog */}
        {pendingStatus && (
          <div className="px-6 py-4 bg-indigo-50/60 border-b border-indigo-100 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <ArrowRight className="w-4 h-4 text-indigo-600" />
                <span>Transitioning to: {pendingStatus.replace('_', ' ').toUpperCase()}</span>
              </div>
              <button
                onClick={() => setPendingStatus(null)}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {pendingStatus === 'resolved' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Resolution Notes (What fixed the issue?)
                  </label>
                  <textarea
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="e.g. Replaced faulty heating element and cleared drain pipe. Tested heat cycle."
                    rows={2}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Actual Repair Cost ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={actualCostInput}
                    onChange={(e) => setActualCostInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white text-slate-800"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Activity Note / Reason (Optional)
              </label>
              <input
                type="text"
                value={transitionNote}
                onChange={(e) => setTransitionNote(e.target.value)}
                placeholder="e.g. Technician arrived on site, diagnosed burner issue."
                className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingStatus(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTransition}
                disabled={isTransitioning}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
              >
                {isTransitioning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Confirm Status Update</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-100 flex items-center gap-4 bg-white">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Ticket Overview
          </button>
          <button
            onClick={() => setActiveTab('intelligence')}
            className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'intelligence'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Issue Intelligence</span>
            {intelligence?.recurringSignal?.isRecurring && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                Recurring
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('resolution')}
            className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'resolution'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5 text-emerald-500" />
            <span>Resolution & Steps</span>
            {checklist.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                {completedChecklistCount}/{checklist.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Activity History</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
              {issue.activityHistory?.length || 0}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DETAILS / OVERVIEW */}
          {activeTab === 'details' && (
            <>
              {/* Description */}
              {issue.description && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Description & Symptoms
                  </h4>
                  <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                    {issue.description}
                  </p>
                </div>
              )}

              {/* Resolution Box */}
              {issue.resolution && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Resolution Summary</span>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                    {issue.resolution}
                  </p>
                  {issue.resolvedAt && (
                    <p className="text-[10px] text-emerald-600">
                      Resolved on {new Date(issue.resolvedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Linked Household Asset & Warranty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Wrench className="w-4 h-4 text-indigo-600" />
                    <span>Linked Asset</span>
                  </div>
                  {linkedAsset ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{linkedAsset.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {linkedAsset.brand ? `${linkedAsset.brand} • ` : ''}
                        {linkedAsset.roomLocation || linkedRoom?.name || 'General Area'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No specific asset linked</p>
                  )}
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Warranty Status</span>
                  </div>
                  {linkedWarranty ? (
                    <div>
                      <p className="text-xs font-semibold text-emerald-800">
                        {linkedWarranty.warrantyProvider || linkedWarranty.providerName || linkedWarranty.title}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {linkedWarranty.policyNumber ? `Policy: ${linkedWarranty.policyNumber} • ` : ''}
                        {linkedWarranty.status.toUpperCase()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No active warranty detected</p>
                  )}
                </div>
              </div>

              {/* Location & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Property & Area</span>
                  <p className="text-xs font-semibold text-slate-800">
                    {linkedProperty?.name || 'Primary Residence'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {linkedRoom?.name || 'Whole House'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Due Date</span>
                  <p className="text-xs font-semibold text-slate-800">
                    {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : 'None set'}
                  </p>
                  <p className="text-[11px] text-slate-500">Target completion</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scheduled Date</span>
                  <p className="text-xs font-semibold text-slate-800">
                    {issue.scheduledDate ? new Date(issue.scheduledDate).toLocaleDateString() : 'Not scheduled'}
                  </p>
                  <p className="text-[11px] text-slate-500">Service appointment</p>
                </div>
              </div>

              {/* Service Provider & Cost Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <UserCheck className="w-4 h-4 text-sky-600" />
                    <span>Contractor / Technician</span>
                  </div>
                  {issue.serviceProvider ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{issue.serviceProvider}</p>
                      {issue.serviceProviderContact && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{issue.serviceProviderContact}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No contractor assigned</p>
                  )}
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Costs & Financials</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-slate-500">Estimated:</span>
                    <span className="font-semibold text-slate-800">
                      {issue.estimatedCost ? formatCurrency(issue.estimatedCost, currency) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Actual:</span>
                    <span className="font-bold text-slate-900">
                      {issue.actualCost ? formatCurrency(issue.actualCost, currency) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {issue.notes && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Internal Notes
                  </h4>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {issue.notes}
                  </p>
                </div>
              )}
            </>
          )}

          {/* TAB 2: ISSUE INTELLIGENCE */}
          {activeTab === 'intelligence' && (
            <div className="space-y-6">
              {isLoadingIntelligence ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <p className="text-xs">Analyzing issue context, warranty status, and history...</p>
                </div>
              ) : intelligenceError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Could not load intelligence</span>
                  </div>
                  <p>{intelligenceError}</p>
                  <button
                    onClick={() => loadIntelligence(issue.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-200 text-rose-700 font-semibold rounded-lg hover:bg-rose-100/50 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry Analysis</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Why It Matters */}
                  <div className="p-4 bg-gradient-to-br from-indigo-50/60 to-purple-50/60 border border-indigo-100 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Why This Issue Matters</span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      {intelligence?.whyItMatters ||
                        `This ${issue.severity} severity issue requires attention to prevent household disruptions.`}
                    </p>
                  </div>

                  {/* Recurrence Pattern Signals */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <History className="w-4 h-4 text-amber-600" />
                        <span>Recurrence & Failure History</span>
                      </div>
                      {intelligence?.recurringSignal?.isRecurring ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {intelligence.recurringSignal.repeatedIssueCount} Related Occurrences
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">
                          Single Incident
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {intelligence?.recurringSignal?.summary ||
                        'No recurring failure patterns detected for this asset.'}
                    </p>
                    {intelligence?.recurringSignal?.previousResolutions &&
                      intelligence.recurringSignal.previousResolutions.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-600 block">
                            Previous Resolutions:
                          </span>
                          {intelligence.recurringSignal.previousResolutions.map((prev, idx) => (
                            <div
                              key={idx}
                              className="text-[11px] text-slate-600 flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200"
                            >
                              <span>{new Date(prev.date).toLocaleDateString()}</span>
                              <span className="font-medium text-slate-800 line-clamp-1 max-w-[200px]">
                                {prev.resolution || 'Resolved'}
                              </span>
                              {prev.cost ? (
                                <span className="text-emerald-700 font-semibold">
                                  {formatCurrency(prev.cost, currency)}
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  {/* Warranty & Maintenance Intelligence Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Warranty Intelligence */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Warranty Intelligence</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            intelligence?.warrantyIntelligence?.status === 'covered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : intelligence?.warrantyIntelligence?.status === 'possibly_covered'
                              ? 'bg-sky-100 text-sky-800'
                              : intelligence?.warrantyIntelligence?.status === 'expired'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {intelligence?.warrantyIntelligence?.statusLabel || 'No Warranty'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {intelligence?.warrantyIntelligence?.explanation ||
                          'No warranty records associated with this asset.'}
                      </p>
                      {intelligence?.warrantyIntelligence?.provider && (
                        <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                          <span className="font-medium">Provider: {intelligence.warrantyIntelligence.provider}</span>
                          {intelligence.warrantyIntelligence.endDate && (
                            <span className="text-slate-500">
                              Exp: {new Date(intelligence.warrantyIntelligence.endDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Maintenance Intelligence */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Wrench className="w-4 h-4 text-indigo-600" />
                        <span>Maintenance Intelligence</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {intelligence?.maintenanceIntelligence?.preventiveOpportunity ||
                          'Routine maintenance is up to date for this component.'}
                      </p>
                      {intelligence?.maintenanceIntelligence?.recentMaintenance &&
                        intelligence.maintenanceIntelligence.recentMaintenance.length > 0 && (
                          <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-100 space-y-1">
                            <span className="font-semibold block text-slate-800">Recent Service:</span>
                            {intelligence.maintenanceIntelligence.recentMaintenance.slice(0, 2).map((m) => (
                              <div key={m.id} className="text-slate-600 flex justify-between">
                                <span>{m.title}</span>
                                {m.completedDate && (
                                  <span>{new Date(m.completedDate).toLocaleDateString()}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Related / Duplicate Issues Detection */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span>Possible Related & Duplicate Issues</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {intelligence?.relatedIssues?.length || 0} candidate(s)
                      </span>
                    </div>

                    {intelligence?.relatedIssues && intelligence.relatedIssues.length > 0 ? (
                      <div className="space-y-2">
                        {intelligence.relatedIssues.map((rel) => {
                          const isAlreadyLinked =
                            rel.isLinked || issue.relatedIssueIds?.includes(rel.id);
                          return (
                            <div
                              key={rel.id}
                              className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{rel.title}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 capitalize">
                                    {rel.status}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                                    {Math.round(rel.similarityScore * 100)}% match
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600">{rel.relationReason}</p>
                                <p className="text-[10px] text-slate-400">
                                  Reported: {new Date(rel.reportedAt).toLocaleDateString()}
                                  {rel.assetName ? ` • ${rel.assetName}` : ''}
                                </p>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {isAlreadyLinked ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUnlinkRelatedIssue(rel.id)}
                                    disabled={isLinkingIssue === rel.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition cursor-pointer"
                                  >
                                    {isLinkingIssue === rel.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Unlink2 className="w-3 h-3" />
                                    )}
                                    <span>Unlink</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleLinkRelatedIssue(rel)}
                                    disabled={isLinkingIssue === rel.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold rounded-lg border border-indigo-200 transition cursor-pointer"
                                  >
                                    {isLinkingIssue === rel.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Link2 className="w-3 h-3" />
                                    )}
                                    <span>Link Issue</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2">
                        No duplicate or related open/historical issues found for this household.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: RESOLUTION & RECOMMENDED NEXT STEPS */}
          {activeTab === 'resolution' && (
            <div className="space-y-6">
              {/* Recommended Next Steps */}
              {intelligence?.recommendedNextSteps && intelligence.recommendedNextSteps.length > 0 && (
                <div className="p-4 bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-100 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Recommended Next Steps</span>
                  </div>
                  <div className="space-y-2">
                    {intelligence.recommendedNextSteps.map((step) => (
                      <div
                        key={step.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold flex items-center justify-center">
                              {step.order}
                            </span>
                            <span className="font-bold text-slate-900">{step.title}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              step.priority === 'urgent'
                                ? 'bg-rose-100 text-rose-800'
                                : step.priority === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {step.priority}
                          </span>
                        </div>
                        <p className="text-slate-600 pl-7 text-[11px] leading-relaxed">
                          {step.guidance}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Checklist */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <ListChecks className="w-4 h-4 text-emerald-600" />
                    <span>Resolution Checklist</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-800">
                    {completedChecklistCount} of {checklist.length} Complete
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 transition-all duration-300"
                    style={{
                      width: `${checklist.length ? (completedChecklistCount / checklist.length) * 100 : 0}%`,
                    }}
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => !isUpdatingChecklist && handleToggleChecklistItem(item)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs cursor-pointer transition select-none ${
                        item.completed
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {item.completed ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className={item.completed ? 'line-through text-slate-500' : 'font-medium'}>
                          {item.label}
                        </span>
                      </div>
                      {item.autoDerived && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          Auto
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Root Cause Analysis */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Root Cause Diagnostic</span>
                  <button
                    type="button"
                    onClick={handleSaveRootCause}
                    disabled={isSavingRootCause || rootCauseInput === (issue.rootCause || '')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 cursor-pointer"
                  >
                    {isSavingRootCause ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <textarea
                  value={rootCauseInput}
                  onChange={(e) => setRootCauseInput(e.target.value)}
                  placeholder="Record root cause once diagnosed (e.g. Worn compressor capacitor causing irregular cooling cycles)."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Structured Resolution Summary (When resolved or available) */}
              {intelligence?.resolutionSummary && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Structured Resolution Summary</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500 block">What Happened:</span>
                      <span className="text-slate-800 font-medium">
                        {intelligence.resolutionSummary.whatHappened}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Action Taken:</span>
                      <span className="text-slate-800 font-medium">
                        {intelligence.resolutionSummary.actionTaken}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Warranty Involvement:</span>
                      <span className="text-slate-800 font-medium">
                        {intelligence.resolutionSummary.warrantyInvolvement}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Recommended Prevention:</span>
                      <span className="text-slate-800 font-medium">
                        {intelligence.resolutionSummary.recommendedPrevention}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TIMELINE & ACTIVITY HISTORY */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {/* Add Note Input */}
              <form onSubmit={handleAddManualActivity} className="flex gap-2">
                <input
                  type="text"
                  value={newActivityNote}
                  onChange={(e) => setNewActivityNote(e.target.value)}
                  placeholder="Add a progress note, technician quote, or update..."
                  className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isAddingActivity || !newActivityNote.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  {isAddingActivity ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Post</span>
                </button>
              </form>

              {/* Activity Log List */}
              <div className="space-y-3 pt-2">
                {issue.activityHistory && issue.activityHistory.length > 0 ? (
                  issue.activityHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold text-slate-700">{item.action}</span>
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      {item.note && (
                        <p className="text-slate-800 leading-relaxed font-medium">{item.note}</p>
                      )}
                      {item.toStatus && (
                        <div className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                          <span>Status changed</span>
                          {item.fromStatus && <span>from {item.fromStatus}</span>}
                          <span>to {item.toStatus}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    No activity recorded yet for this ticket.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Last modified: {new Date(issue.updatedAt).toLocaleString()}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

