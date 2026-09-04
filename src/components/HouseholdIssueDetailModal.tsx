import React, { useState } from 'react';
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
  AlertCircle,
} from 'lucide-react';
import {
  HouseholdIssue,
  HouseholdIssueStatus,
  HomeAsset,
  Property,
  Room,
  Warranty,
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
  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<HouseholdIssueStatus | null>(null);
  const [transitionNote, setTransitionNote] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [actualCostInput, setActualCostInput] = useState('');

  // Add activity note
  const [newActivityNote, setNewActivityNote] = useState('');
  const [isAddingActivity, setIsAddingActivity] = useState(false);

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
        resolution: pendingStatus === 'resolved' || pendingStatus === 'verified' || pendingStatus === 'closed'
          ? (resolutionText.trim() || undefined)
          : undefined,
        actualCost: actualCostInput ? parseFloat(actualCostInput) : undefined,
      });

      addToast('success', 'Status Updated', `Issue transitioned to ${pendingStatus.replace('_', ' ')}.`);
      setPendingStatus(null);
      await onRefresh();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
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
        <div className="px-6 border-b border-slate-100 flex items-center gap-4">
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
          {activeTab === 'details' ? (
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
          ) : (
            /* Timeline & Activity History */
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
