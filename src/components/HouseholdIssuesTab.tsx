import React, { useState, useMemo } from 'react';
import {
  Wrench,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  Filter,
  Calendar,
  DollarSign,
  UserCheck,
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Phone,
} from 'lucide-react';
import {
  HouseholdIssue,
  HouseholdIssueSeverity,
  HouseholdIssueStatus,
  HomeAsset,
  Property,
  Room,
  Warranty,
} from '../types';
import { formatCurrency } from '../config/locationCurrencyConfig';
import { HouseholdIssueModal } from './HouseholdIssueModal';
import { HouseholdIssueDetailModal } from './HouseholdIssueDetailModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { api } from '../lib/api';

interface HouseholdIssuesTabProps {
  issues: HouseholdIssue[];
  assets: HomeAsset[];
  properties: Property[];
  rooms?: Room[];
  warranties: Warranty[];
  currency?: string;
  onRefresh: () => Promise<void>;
  addToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  filterAssetId?: string;
  onClearAssetFilter?: () => void;
}

export function HouseholdIssuesTab({
  issues = [],
  assets = [],
  properties = [],
  rooms = [],
  warranties = [],
  currency = 'USD',
  onRefresh,
  addToast,
  filterAssetId,
  onClearAssetFilter,
}: HouseholdIssuesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'critical' | 'scheduled' | 'resolved'>('open');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string>(filterAssetId || '');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<HouseholdIssue | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailIssue, setDetailIssue] = useState<HouseholdIssue | null>(null);

  const [deletingIssue, setDeletingIssue] = useState<HouseholdIssue | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync prop filterAssetId if it changes
  React.useEffect(() => {
    if (filterAssetId !== undefined) {
      setSelectedAssetFilter(filterAssetId);
    }
  }, [filterAssetId]);

  // Metrics
  const openIssues = useMemo(
    () => (issues || []).filter((i) => i && !['resolved', 'verified', 'closed', 'cancelled'].includes(i.status)),
    [issues]
  );
  const criticalCount = useMemo(
    () => openIssues.filter((i) => i && (i.severity === 'critical' || !!i.safetyWarning)).length,
    [openIssues]
  );
  const scheduledCount = useMemo(
    () => openIssues.filter((i) => i && (i.status === 'scheduled' || i.status === 'in_progress')).length,
    [openIssues]
  );
  const resolvedCount = useMemo(
    () => (issues || []).filter((i) => i && ['resolved', 'verified', 'closed'].includes(i.status)).length,
    [issues]
  );

  // Filtered issues
  const filteredIssues = useMemo(() => {
    return (issues || []).filter((issue) => {
      if (!issue) return false;
      // Search
      const query = (searchQuery || '').trim().toLowerCase();
      if (query) {
        const titleStr = typeof issue.title === 'string' ? issue.title.toLowerCase() : '';
        const descStr = typeof issue.description === 'string' ? issue.description.toLowerCase() : '';
        const vendorStr = typeof issue.serviceProvider === 'string' ? issue.serviceProvider.toLowerCase() : '';
        const matchedAsset = (assets || []).find((a) => a && a.id === issue.assetId);
        const assetNameStr = matchedAsset && typeof matchedAsset.name === 'string' ? matchedAsset.name.toLowerCase() : '';

        const matchesTitle = titleStr.includes(query);
        const matchesDesc = descStr.includes(query);
        const matchesVendor = vendorStr.includes(query);
        const matchesAsset = assetNameStr.includes(query);

        if (!matchesTitle && !matchesDesc && !matchesVendor && !matchesAsset) return false;
      }

      // Asset
      if (selectedAssetFilter && issue.assetId !== selectedAssetFilter) {
        return false;
      }

      // Severity
      if (severityFilter !== 'all' && issue.severity !== severityFilter) {
        return false;
      }

      // Status
      if (statusFilter === 'open') {
        return !['resolved', 'verified', 'closed', 'cancelled'].includes(issue.status);
      }
      if (statusFilter === 'critical') {
        return (issue.severity === 'critical' || !!issue.safetyWarning) && !['closed', 'cancelled'].includes(issue.status);
      }
      if (statusFilter === 'scheduled') {
        return issue.status === 'scheduled' || issue.status === 'in_progress';
      }
      if (statusFilter === 'resolved') {
        return ['resolved', 'verified', 'closed'].includes(issue.status);
      }

      return true;
    });
  }, [issues, searchQuery, selectedAssetFilter, severityFilter, statusFilter, assets]);

  // Action handlers
  const handleOpenCreate = () => {
    setEditingIssue(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (issue: HouseholdIssue) => {
    setIsDetailModalOpen(false);
    setEditingIssue(issue);
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (issue: HouseholdIssue) => {
    setDetailIssue(issue);
    setIsDetailModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingIssue) return;
    setIsDeleting(true);
    try {
      await api.deleteIssue(deletingIssue.id);
      addToast('info', 'Ticket Deleted', `Removed "${deletingIssue.title}".`);
      setDeletingIssue(null);
      if (detailIssue?.id === deletingIssue.id) {
        setIsDetailModalOpen(false);
      }
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message || 'Could not delete issue.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('open')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'open'
              ? 'bg-indigo-50/80 border-indigo-200 ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Tickets</span>
            <Wrench className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{openIssues.length}</span>
            <span className="text-xs text-slate-400">pending</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('critical')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'critical'
              ? 'bg-rose-50/80 border-rose-200 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Safety & Critical</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-900">{criticalCount}</span>
            <span className="text-xs text-rose-600 font-medium">urgent</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('scheduled')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'scheduled'
              ? 'bg-sky-50/80 border-sky-200 ring-2 ring-sky-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-700">In Progress / Booked</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-sky-900">{scheduledCount}</span>
            <span className="text-xs text-sky-600 font-medium">scheduled</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('resolved')}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'resolved'
              ? 'bg-emerald-50/80 border-emerald-200 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Resolved & Closed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-900">{resolvedCount}</span>
            <span className="text-xs text-emerald-600 font-medium">completed</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filter Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex-1 flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets, contractor, symptoms..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Segment */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({issues.length})
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                statusFilter === 'open' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Open ({openIssues.length})
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                statusFilter === 'resolved' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          {/* Asset Dropdown */}
          <select
            value={selectedAssetFilter}
            onChange={(e) => {
              setSelectedAssetFilter(e.target.value);
              if (!e.target.value) onClearAssetFilter?.();
            }}
            className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Assets</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Severity Dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* New Ticket Button */}
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-indigo-600/20 transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Report New Issue</span>
        </button>
      </div>

      {/* Tickets List */}
      {filteredIssues.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Wrench className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            {issues.length === 0 ? 'No Household Issues or Tickets' : 'No Matching Tickets Found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {issues.length === 0
              ? 'Track repairs, broken appliances, contractor quotes, and household maintenance issues with smart AI hazard detection.'
              : 'Try clearing your search query or selecting a different status or asset filter.'}
          </p>
          {issues.length === 0 ? (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Report First Issue</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setSeverityFilter('all');
                setSelectedAssetFilter('');
                onClearAssetFilter?.();
              }}
              className="px-3.5 py-1.5 text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredIssues.map((issue) => {
            const asset = assets.find((a) => a.id === issue.assetId);
            const property = properties.find((p) => p.id === issue.propertyId);
            const room = rooms.find((r) => r.id === issue.roomId);
            const hasWarranty = issue.warrantyId || (asset && warranties.some((w) => w.assetId === asset.id && w.status === 'active'));

            const isOverdue =
              issue.dueDate &&
              new Date(issue.dueDate).getTime() < Date.now() &&
              !['resolved', 'verified', 'closed', 'cancelled'].includes(issue.status);

            return (
              <div
                key={issue.id}
                onClick={() => handleOpenDetail(issue)}
                className="group p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Left Section: Severity, Title, Symptoms */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      issue.severity === 'critical'
                        ? 'bg-rose-100 text-rose-700'
                        : issue.severity === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : issue.severity === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {issue.safetyWarning ? (
                      <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                    ) : (
                      <Wrench className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">
                        {issue.title}
                      </h4>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
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

                      {issue.safetyWarning && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          <span>Safety Precaution</span>
                        </span>
                      )}

                      {hasWarranty && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Warranty Covered</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      {asset && (
                        <span className="font-semibold text-slate-700">
                          {asset.name}
                        </span>
                      )}
                      {(property || room) && (
                        <span>
                          {property?.name || 'Home'}{room ? ` • ${room.name}` : ''}
                        </span>
                      )}
                      {issue.serviceProvider && (
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-slate-400" />
                          <span>{issue.serviceProvider}</span>
                        </span>
                      )}
                      {issue.dueDate && (
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-600 font-bold' : ''}`}>
                          <Calendar className="w-3 h-3" />
                          <span>
                            {isOverdue ? 'Overdue: ' : 'Due: '}
                            {new Date(issue.dueDate).toLocaleDateString()}
                          </span>
                        </span>
                      )}
                    </div>

                    {issue.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {issue.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Section: Status Badge, Cost, Actions */}
                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  {/* Cost display */}
                  {(issue.actualCost || issue.estimatedCost) && (
                    <div className="text-right hidden sm:block">
                      <span className="text-xs font-bold text-slate-900 block">
                        {formatCurrency(issue.actualCost || issue.estimatedCost || 0, currency)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {issue.actualCost ? 'actual' : 'estimated'}
                      </span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold capitalize ${
                      issue.status === 'resolved' || issue.status === 'verified' || issue.status === 'closed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : issue.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-800'
                        : issue.status === 'scheduled'
                        ? 'bg-sky-100 text-sky-800'
                        : issue.status === 'waiting_parts'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {issue.status.replace('_', ' ')}
                  </span>

                  {/* Arrow Icon */}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New/Edit Modal */}
      <HouseholdIssueModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingIssue(null);
        }}
        onSaved={onRefresh}
        editingIssue={editingIssue}
        assets={assets}
        properties={properties}
        rooms={rooms}
        warranties={warranties}
        currency={currency}
        addToast={addToast}
        initialAssetId={selectedAssetFilter || undefined}
      />

      {/* Detail & Workflow Modal */}
      <HouseholdIssueDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailIssue(null);
        }}
        issue={detailIssue}
        assets={assets}
        properties={properties}
        rooms={rooms}
        warranties={warranties}
        currency={currency}
        onEdit={handleOpenEdit}
        onDelete={(issue) => setDeletingIssue(issue)}
        onRefresh={async () => {
          await onRefresh();
          // reload detailIssue if still open
          if (detailIssue) {
            try {
              const updated = await api.getIssue(detailIssue.id);
              setDetailIssue(updated);
            } catch {
              // ignore
            }
          }
        }}
        addToast={addToast}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingIssue}
        title="Delete Household Ticket?"
        itemName={deletingIssue?.title || 'Household Ticket'}
        itemType="household ticket"
        description="This will permanently delete this ticket and all recorded activity history."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingIssue(null)}
      />
    </div>
  );
}
