import { useEffect, useState } from 'react';
import { X, ShieldCheck, Database, Lock, Globe, FileText, CheckCircle2, AlertCircle, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { HouseholdDataSourcesSummary } from '../types';
import { apiGet, api } from '../lib/api';

interface DataSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export function DataSourcesModal({ isOpen, onClose, onDataChanged }: DataSourcesModalProps) {
  const [summary, setSummary] = useState<HouseholdDataSourcesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isRemovingDemo, setIsRemovingDemo] = useState(false);
  const [showConfirmRemoveDemo, setShowConfirmRemoveDemo] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<HouseholdDataSourcesSummary>('/api/household/data-sources');
      if (res.success && res.data) {
        setSummary(res.data);
      } else {
        setError(res.error?.message || 'Failed to load data sources summary.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching data sources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchSummary();
  }, [isOpen]);

  const handleRemoveDemoData = async () => {
    try {
      setIsRemovingDemo(true);
      setError(null);
      setActionSuccess(null);
      const res = await api.removeDemoData();
      setActionSuccess(`Removed ${res.deletedCount} demo record(s). Real user records are preserved.`);
      setShowConfirmRemoveDemo(false);
      await fetchSummary();
      if (onDataChanged) {
        onDataChanged();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove demo data.');
    } finally {
      setIsRemovingDemo(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">HouseMind Data Sources & Transparency</h2>
              <p className="text-xs text-slate-500">
                Verified household records, privacy guarantees & AI grounding status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm">Compiling verified household data sources...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : summary ? (
            <>
              {/* Isolation Banner */}
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3.5">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-emerald-900">
                      Strict User-Isolated Storage
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    All household records are strictly scoped to your authenticated user account (UID: {summary.userId.slice(0, 8)}...). No cross-user access, public indexing, or shared training partitions exist.
                  </p>
                </div>
              </div>

              {/* Data Record Inventory */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Verified Household Records
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                    <div className="text-xl font-bold text-slate-900">
                      {summary.dataCounts.confirmedTransactions}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">Transactions</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                    <div className="text-xl font-bold text-slate-900">
                      {summary.dataCounts.importedDocuments}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">Uploaded Docs</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                    <div className="text-xl font-bold text-slate-900">
                      {summary.dataCounts.recurringExpenses}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">Tracked Bills</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                    <div className="text-xl font-bold text-slate-900">
                      {summary.dataCounts.registeredAssets}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">Home Assets</div>
                  </div>
                </div>
              </div>

              {/* Regional Configuration */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  Regional Settings & Currency Standards
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Country:</span>
                    <span className="font-semibold text-slate-900">{summary.householdProfile.country}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Standard Currency:</span>
                    <span className="font-semibold text-slate-900">{summary.householdProfile.currency}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Locale & Number Format:</span>
                    <span className="font-semibold text-slate-900">{summary.householdProfile.locale}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Timezone:</span>
                    <span className="font-semibold text-slate-900">{summary.householdProfile.timezone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Region / Province:</span>
                    <span className="font-semibold text-slate-900">{summary.householdProfile.region || 'Not configured'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">City:</span>
                    <span className="font-semibold text-slate-900">{summary.householdProfile.city || 'Not configured'}</span>
                  </div>
                </div>
              </div>

              {/* AI Grounding Transparency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    Grounded AI Sources
                  </h4>
                  <ul className="space-y-1.5 text-xs text-indigo-900">
                    {summary.aiContextGrounding.groundedSources.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl">
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-600" />
                    Excluded Sensitive Elements
                  </h4>
                  <ul className="space-y-1.5 text-xs text-amber-900">
                    {summary.aiContextGrounding.excludedSensitiveData.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Dataset Management & Demo Data */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Dataset Lifecycle & Demo Data
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Safely purge seeded starter records or reset household state without affecting other users.
                    </p>
                  </div>
                </div>

                {actionSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                {showConfirmRemoveDemo ? (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-900 text-xs font-semibold">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Confirm Removal of Starter / Demo Data?</span>
                    </div>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      This will delete only pre-seeded sample expenses, assets, transactions, documents, and what-if scenarios. Your custom created records will NOT be deleted.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleRemoveDemoData}
                        disabled={isRemovingDemo}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 cursor-pointer"
                      >
                        {isRemovingDemo ? 'Removing...' : 'Yes, Remove Demo Data'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmRemoveDemo(false)}
                        disabled={isRemovingDemo}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowConfirmRemoveDemo(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-medium transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
                      <span>Remove Demo Data</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
