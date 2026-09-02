import { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  Database,
  Lock,
  Globe,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  AlertTriangle,
  Layers,
  HardDrive,
  Mail,
  UploadCloud,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { PrivacyCenterSummary, HouseholdDataSourcesSummary } from '../types';
import { apiGet, api } from '../lib/api';

interface DataSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export function DataSourcesModal({ isOpen, onClose, onDataChanged }: DataSourcesModalProps) {
  const [privacySummary, setPrivacySummary] = useState<PrivacyCenterSummary | null>(null);
  const [dataSourcesSummary, setDataSourcesSummary] = useState<HouseholdDataSourcesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Demo removal state
  const [isRemovingDemo, setIsRemovingDemo] = useState(false);
  const [showConfirmRemoveDemo, setShowConfirmRemoveDemo] = useState(false);

  // Full reset state
  const [isResettingData, setIsResettingData] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const [privacyRes, sourcesRes] = await Promise.all([
        apiGet<PrivacyCenterSummary>('/api/household/privacy-center'),
        apiGet<HouseholdDataSourcesSummary>('/api/household/data-sources'),
      ]);

      if (privacyRes.success && privacyRes.data) {
        setPrivacySummary(privacyRes.data);
      }
      if (sourcesRes.success && sourcesRes.data) {
        setDataSourcesSummary(sourcesRes.data);
      }
      if (!privacyRes.success && !sourcesRes.success) {
        setError(privacyRes.error?.message || sourcesRes.error?.message || 'Failed to load privacy center summary.');
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

  const handleResetUserData = async () => {
    if (resetConfirmInput !== 'DELETE MY DATA') {
      setError('Please type "DELETE MY DATA" exactly to confirm full household reset.');
      return;
    }

    try {
      setIsResettingData(true);
      setError(null);
      setActionSuccess(null);
      await api.resetUserData(true);
      setActionSuccess('All household data for your account has been safely reset.');
      setShowConfirmReset(false);
      setResetConfirmInput('');
      await fetchSummary();
      if (onDataChanged) {
        onDataChanged();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset household data.');
    } finally {
      setIsResettingData(false);
    }
  };

  if (!isOpen) return null;

  const totalUserRecords = privacySummary?.userRecordsCount ?? 0;
  const totalDemoRecords = privacySummary?.demoRecordsCount ?? 0;
  const totalAllRecords = privacySummary?.totalRecords ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Privacy Center & Data Transparency</h2>
              <p className="text-xs text-slate-500">
                Data isolation guarantees, ingestion sources & controlled AI boundaries
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
              <p className="text-sm">Compiling verified household data sources & privacy metrics...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
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
                    All household records are strictly scoped to your authenticated user account (UID: {privacySummary?.userId ? privacySummary.userId.slice(0, 8) : (dataSourcesSummary?.userId ? dataSourcesSummary.userId.slice(0, 8) : 'account')}...). Cross-tenant access is blocked at both Firestore rules and backend API layers.
                  </p>
                </div>
              </div>

              {/* Data Record Inventory */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Household Record Inventory
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded-md">
                      {totalUserRecords} User Created
                    </span>
                    {totalDemoRecords > 0 && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-semibold rounded-md">
                        {totalDemoRecords} Seeded Demo
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                    <div className="text-xl font-bold text-slate-900">
                      {privacySummary?.recordsByType?.transactions?.total ?? dataSourcesSummary?.dataCounts?.confirmedTransactions ?? 0}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">Transactions</div>
                    {privacySummary?.recordsByType?.transactions && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {privacySummary.recordsByType.transactions.user} user / {privacySummary.recordsByType.transactions.demo} demo
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                    <div className="text-xl font-bold text-slate-900">
                      {privacySummary?.recordsByType?.documents?.total ?? dataSourcesSummary?.dataCounts?.importedDocuments ?? 0}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">Documents</div>
                    {privacySummary?.recordsByType?.documents && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {privacySummary.recordsByType.documents.user} user / {privacySummary.recordsByType.documents.demo} demo
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                    <div className="text-xl font-bold text-slate-900">
                      {privacySummary?.recordsByType?.expenses?.total ?? dataSourcesSummary?.dataCounts?.recurringExpenses ?? 0}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">Tracked Bills</div>
                    {privacySummary?.recordsByType?.expenses && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {privacySummary.recordsByType.expenses.user} user / {privacySummary.recordsByType.expenses.demo} demo
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                    <div className="text-xl font-bold text-slate-900">
                      {privacySummary?.recordsByType?.assets?.total ?? dataSourcesSummary?.dataCounts?.registeredAssets ?? 0}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">Home Assets</div>
                    {privacySummary?.recordsByType?.assets && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {privacySummary.recordsByType.assets.user} user / {privacySummary.recordsByType.assets.demo} demo
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Ingestion Sources */}
              {privacySummary?.sources && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    Data Sources & Ingestion Channels
                  </h3>
                  <div className="space-y-2">
                    {privacySummary.sources.map((src) => (
                      <div
                        key={src.id}
                        className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 mt-0.5">
                            {src.sourceType === 'manual_upload' && <UploadCloud className="w-4 h-4" />}
                            {src.sourceType === 'manual_entry' && <FileText className="w-4 h-4" />}
                            {src.sourceType === 'google_drive' && <HardDrive className="w-4 h-4" />}
                            {src.sourceType === 'gmail' && <Mail className="w-4 h-4" />}
                            {src.sourceType === 'demo_seed' && <Database className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{src.name}</div>
                            <div className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{src.description}</div>
                            {src.scope && (
                              <div className="text-[10px] text-slate-400 font-mono mt-1">Scope: {src.scope}</div>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-[10px] font-bold rounded-md whitespace-nowrap shrink-0 ${
                            src.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : src.status === 'ready'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {src.statusLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regional Configuration */}
              {dataSourcesSummary?.householdProfile && (
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    Regional Standards & Currency
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Country:</span>
                      <span className="font-semibold text-slate-900">{dataSourcesSummary.householdProfile.country}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Currency Standard:</span>
                      <span className="font-semibold text-slate-900">{dataSourcesSummary.householdProfile.currency}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Locale & Number Format:</span>
                      <span className="font-semibold text-slate-900">{dataSourcesSummary.householdProfile.locale}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Timezone:</span>
                      <span className="font-semibold text-slate-900">{dataSourcesSummary.householdProfile.timezone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Region / State:</span>
                      <span className="font-semibold text-slate-900">{dataSourcesSummary.householdProfile.region || 'Not configured'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">City:</span>
                      <span className="font-semibold text-slate-900">{dataSourcesSummary.householdProfile.city || 'Not configured'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Privacy & Minimization Boundary */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    Controlled AI Processing & Context Minimization
                  </h4>
                </div>
                <p className="text-xs text-indigo-900 leading-relaxed">
                  HouseMind never sends your complete database to Gemini. Only query-specific, aggregated financial figures and confirmed equipment statuses are included in prompts.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-white border border-indigo-100 rounded-xl space-y-1.5">
                    <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Minimum Relevant Context
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1">
                      <li>• Category spending totals & monthly recurring sums</li>
                      <li>• Appliance warranty dates & maintenance flags</li>
                      <li>• Explicitly simulated what-if scenario variables</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-white border border-rose-100 rounded-xl space-y-1.5">
                    <div className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                      Strictly Redacted from AI
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1">
                      <li>• Unmasked account numbers, card PANs & CVVs</li>
                      <li>• Personal credentials & government identifiers</li>
                      <li>• Raw document binaries & other users' data</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Data Control & Deletion Actions */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Data Governance & Deletion Controls
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    You have absolute control over your household data. Delete starter demo records or perform a complete account data wipe.
                  </p>
                </div>

                {actionSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                {/* Demo Data Removal */}
                {showConfirmRemoveDemo ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Confirm Removal of Starter / Demo Data?</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      This will delete only pre-seeded sample expenses, assets, transactions, documents, and what-if scenarios ({totalDemoRecords} records). All your custom created records ({totalUserRecords} records) will remain untouched.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleRemoveDemoData}
                        disabled={isRemovingDemo}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 cursor-pointer"
                      >
                        {isRemovingDemo ? 'Removing...' : 'Yes, Delete Demo Data'}
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
                ) : showConfirmReset ? (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-900 text-xs font-semibold">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Confirm Complete Household Data Reset</span>
                    </div>
                    <p className="text-[11px] text-rose-800 leading-relaxed">
                      Warning: This will permanently delete ALL transactions, expenses, home assets, documents, and scenarios for your account. This action cannot be undone.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] font-semibold text-rose-900">
                        Type <code className="bg-rose-100 px-1 py-0.5 rounded text-rose-950 font-mono">DELETE MY DATA</code> to confirm:
                      </label>
                      <input
                        type="text"
                        value={resetConfirmInput}
                        onChange={(e) => setResetConfirmInput(e.target.value)}
                        placeholder="DELETE MY DATA"
                        className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleResetUserData}
                        disabled={isResettingData || resetConfirmInput !== 'DELETE MY DATA'}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 cursor-pointer"
                      >
                        {isResettingData ? 'Resetting...' : 'Permanently Delete All Data'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowConfirmReset(false);
                          setResetConfirmInput('');
                        }}
                        disabled={isResettingData}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {totalDemoRecords > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowConfirmRemoveDemo(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-200 rounded-xl text-xs font-medium transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-amber-500" />
                        <span>Remove Demo Data ({totalDemoRecords} items)</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirmReset(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-medium transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Reset All Household Data</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted in Transit & at Rest (TLS 1.3 / AES-256)</span>
          </div>
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

