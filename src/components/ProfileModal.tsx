import React, { useState, useEffect, FormEvent } from 'react';
import {
  X,
  Building2,
  Save,
  Globe,
  Database,
  ShieldCheck,
  Bell,
  HardDrive,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Lock,
  Sparkles,
  Sliders,
  Mail,
  UploadCloud,
  FileText,
  CreditCard,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Send,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import {
  HouseholdProfile,
  PrivacyCenterSummary,
  HouseholdDataSourcesSummary,
  NotificationPreferences,
} from '../types';
import {
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
  getCountryConfig,
  getCurrencyInfo,
} from '../config/locationCurrencyConfig';
import { apiGet, api } from '../lib/api';

interface ProfileModalProps {
  isOpen: boolean;
  profile: HouseholdProfile | null;
  onClose: () => void;
  onSave: (updated: Partial<HouseholdProfile>) => Promise<void>;
  onDataChanged?: () => void;
  addToast?: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

type ProfileTab = 'residence' | 'account' | 'inventory' | 'notifications' | 'integrations' | 'privacy';

export function ProfileModal({
  isOpen,
  profile,
  onClose,
  onSave,
  onDataChanged,
  addToast,
}: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('residence');

  // Residence & Specs Form State
  const [homeName, setHomeName] = useState('');
  const [homeType, setHomeType] = useState<HouseholdProfile['homeType']>('single_family');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('United States');
  const [yearBuilt, setYearBuilt] = useState<string>('');
  const [squareFootage, setSquareFootage] = useState<string>('');
  const [occupantsCount, setOccupantsCount] = useState<string>('2');
  const [primaryHeating, setPrimaryHeating] = useState('');
  const [primaryCooling, setPrimaryCooling] = useState('');
  const [notes, setNotes] = useState('');

  // Account & Regional Form State
  const [timezone, setTimezone] = useState('America/New_York');
  const [locale, setLocale] = useState('en-US');
  const [currency, setCurrency] = useState('USD');
  const [currencyOverride, setCurrencyOverride] = useState(false);

  // Submissions & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  // Data Inventory & Privacy Summaries
  const [privacySummary, setPrivacySummary] = useState<PrivacyCenterSummary | null>(null);
  const [dataSourcesSummary, setDataSourcesSummary] = useState<HouseholdDataSourcesSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Notification Preferences State
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  // Export State
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Governance & Deletion Action States
  const [isRemovingDemo, setIsRemovingDemo] = useState(false);
  const [showConfirmRemoveDemo, setShowConfirmRemoveDemo] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [governanceSuccess, setGovernanceSuccess] = useState<string | null>(null);

  // Synchronize initial values from profile prop
  useEffect(() => {
    if (profile) {
      setHomeName(profile.homeName || 'My Household');
      setHomeType(profile.homeType || 'single_family');
      setStreetAddress(profile.streetAddress || '');
      setCity(profile.city || '');
      setRegion(profile.region || '');
      setPostalCode(profile.postalCode || '');
      setCountry(profile.country || 'United States');
      setYearBuilt(profile.yearBuilt ? profile.yearBuilt.toString() : '');
      setSquareFootage(profile.squareFootage ? profile.squareFootage.toString() : '');
      setOccupantsCount(profile.occupantsCount ? profile.occupantsCount.toString() : '2');
      setPrimaryHeating(profile.primaryHeating || '');
      setPrimaryCooling(profile.primaryCooling || '');
      setNotes(profile.notes || '');

      setTimezone(profile.timezone || 'America/New_York');
      setLocale(profile.locale || 'en-US');
      setCurrency(profile.currency || 'USD');
      setCurrencyOverride(Boolean(profile.currencyOverride));
    }
  }, [profile, isOpen]);

  // Fetch summaries when modal is open and specific tabs are clicked
  const fetchPrivacyAndSources = async () => {
    setSummaryLoading(true);
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
    } catch (err: any) {
      console.warn('Failed to load data summaries:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchNotificationPrefs = async () => {
    setPrefsLoading(true);
    try {
      const prefs = await api.getNotificationPreferences();
      setNotificationPrefs(prefs);
    } catch (err: any) {
      console.warn('Failed to load notification preferences:', err);
    } finally {
      setPrefsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPrivacyAndSources();
      fetchNotificationPrefs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCountryChange = (selectedCountryName: string) => {
    setCountry(selectedCountryName);
    const countryConfig = getCountryConfig(selectedCountryName);
    if (!currencyOverride) {
      setCurrency(countryConfig.defaultCurrency);
    }
    setLocale(countryConfig.defaultLocale);
    setTimezone(countryConfig.defaultTimezone);
  };

  const handleCopyUid = () => {
    const uid = profile?.userId || '';
    if (!uid) return;
    navigator.clipboard?.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleSaveResidence = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSaveSuccessMsg(null);

    if (!homeName.trim()) {
      setValidationError('Home name is required.');
      return;
    }

    const payload: Partial<HouseholdProfile> = {
      homeName: homeName.trim(),
      homeType,
      streetAddress: streetAddress.trim() || undefined,
      city: city.trim() || undefined,
      region: region.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      country: country.trim() || undefined,
      yearBuilt: yearBuilt ? parseInt(yearBuilt, 10) : undefined,
      squareFootage: squareFootage ? parseFloat(squareFootage) : undefined,
      occupantsCount: occupantsCount ? parseInt(occupantsCount, 10) : undefined,
      primaryHeating: primaryHeating.trim() || undefined,
      primaryCooling: primaryCooling.trim() || undefined,
      notes: notes.trim() || undefined,
      timezone: timezone.trim() || undefined,
      locale: locale.trim() || undefined,
      currency: currency.trim().toUpperCase() || 'USD',
      currencyOverride,
    };

    try {
      setIsSubmitting(true);
      await onSave(payload);
      setSaveSuccessMsg('Residence specs and regional parameters updated successfully.');
      if (addToast) addToast('success', 'Profile Saved', 'Household details updated.');
    } catch (err: any) {
      setValidationError(err.message || 'Failed to update household profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Notification Preferences Update
  const handleToggleChannel = async (channel: 'inApp' | 'email', value: boolean) => {
    if (!notificationPrefs) return;
    const updated: NotificationPreferences = {
      ...notificationPrefs,
      channels: {
        ...notificationPrefs.channels,
        [channel]: value,
      },
    };
    setNotificationPrefs(updated);
    try {
      setIsSavingPrefs(true);
      const res = await api.updateNotificationPreferences(updated);
      setNotificationPrefs(res);
      if (addToast) addToast('info', 'Preferences Saved', 'Notification channels synchronized.');
    } catch (err: any) {
      console.error('Failed to save notification preferences:', err);
      if (addToast) addToast('error', 'Update Failed', err.message || 'Could not save notification setting.');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleUpdateNoticeDays = async (domain: 'bills' | 'maintenance' | 'warranties', days: number) => {
    if (!notificationPrefs) return;
    const updated: NotificationPreferences = {
      ...notificationPrefs,
      advanceNoticeDays: {
        ...notificationPrefs.advanceNoticeDays,
        [domain]: days,
      },
    };
    setNotificationPrefs(updated);
    try {
      setIsSavingPrefs(true);
      const res = await api.updateNotificationPreferences(updated);
      setNotificationPrefs(res);
      if (addToast) addToast('info', 'Preferences Saved', 'Advance notice window updated.');
    } catch (err: any) {
      console.error('Failed to save notification preferences:', err);
      if (addToast) addToast('error', 'Update Failed', err.message || 'Could not save notice window.');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleTestEmailDigest = async () => {
    try {
      setIsTestingEmail(true);
      const res = await api.testEmailDigest();
      if (addToast) {
        addToast('success', 'Email Test Triggered', res.message || 'Queued upcoming household digest email.');
      }
    } catch (err: any) {
      if (addToast) {
        addToast('error', 'Test Failed', err.message || 'Failed to trigger test email digest.');
      }
    } finally {
      setIsTestingEmail(false);
    }
  };

  // One-Click Vault Export (JSON)
  const handleExportJson = async () => {
    try {
      setIsExportingJson(true);
      const exportData = await api.exportHouseholdData();
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `housemind-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (addToast) addToast('success', 'Vault Export Complete', 'Household JSON archive downloaded.');
    } catch (err: any) {
      if (addToast) addToast('error', 'Export Failed', err.message || 'Could not generate JSON export.');
    } finally {
      setIsExportingJson(false);
    }
  };

  // One-Click Financial Ledger Export (CSV)
  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);
      const exportData = await api.exportHouseholdData();
      const expenses = exportData?.expenses || [];
      const loans = exportData?.loans || [];
      const creditCards = exportData?.creditCards || [];

      let csv = 'Type,Name/Title,Category/Provider,Amount,Frequency/Rate,Status,Due Date/Next Service,Notes\n';

      for (const e of expenses) {
        csv += `"Recurring Bill","${(e.title || '').replace(/"/g, '""')}","${e.category || ''}",${e.amount || 0},"${e.frequency || ''}","${e.status || ''}","${e.dueDate || ''}","${(e.notes || '').replace(/"/g, '""')}"\n`;
      }
      for (const l of loans) {
        csv += `"Loan EMI","${(l.name || '').replace(/"/g, '""')}","${l.lender || ''}",${l.emiAmount || 0},"Monthly (${l.interestRate || 0}%)","${l.status || ''}","${l.nextEmiDueDate || ''}","Outstanding: ${l.outstandingAmount || 0}"\n`;
      }
      for (const cc of creditCards) {
        csv += `"Credit Card","${(cc.nickname || cc.bankName || '').replace(/"/g, '""')}","${cc.bankName || ''}",${cc.outstandingAmount || 0},"Limit: ${cc.creditLimit || 0}","${cc.isAutoPay ? 'AutoPay' : 'Manual'}","${cc.nextPaymentDueDate || ''}","Last4: ${cc.last4 || ''}"\n`;
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `housemind-financial-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (addToast) addToast('success', 'CSV Ledger Exported', 'Financial table downloaded.');
    } catch (err: any) {
      if (addToast) addToast('error', 'Export Failed', err.message || 'Could not generate CSV export.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Demo Removal Action
  const handleRemoveDemoData = async () => {
    try {
      setIsRemovingDemo(true);
      setGovernanceSuccess(null);
      const res = await api.removeDemoData();
      setGovernanceSuccess(`Successfully removed ${res.deletedCount} demo record(s). All user records preserved.`);
      setShowConfirmRemoveDemo(false);
      await fetchPrivacyAndSources();
      if (onDataChanged) onDataChanged();
      if (addToast) addToast('success', 'Demo Cleared', `Removed ${res.deletedCount} sample records.`);
    } catch (err: any) {
      if (addToast) addToast('error', 'Action Failed', err.message || 'Failed to remove demo data.');
    } finally {
      setIsRemovingDemo(false);
    }
  };

  // Full Account Reset Action
  const handleResetUserData = async () => {
    if (resetConfirmInput.trim() !== 'DELETE MY DATA') {
      if (addToast) addToast('error', 'Confirmation Required', 'Type "DELETE MY DATA" exactly.');
      return;
    }

    try {
      setIsResettingData(true);
      setGovernanceSuccess(null);
      await api.resetUserData(true);
      setGovernanceSuccess('All household data for your account has been safely reset.');
      setShowConfirmReset(false);
      setResetConfirmInput('');
      await fetchPrivacyAndSources();
      if (onDataChanged) onDataChanged();
      if (addToast) addToast('info', 'Account Reset', 'Household records permanently purged.');
    } catch (err: any) {
      if (addToast) addToast('error', 'Reset Failed', err.message || 'Failed to reset household data.');
    } finally {
      setIsResettingData(false);
    }
  };

  const totalUserRecords = privacySummary?.userRecordsCount ?? 0;
  const totalDemoRecords = privacySummary?.demoRecordsCount ?? 0;
  const currentCountryConfig = getCountryConfig(country);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Household Profile & Control Hub</h2>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md uppercase tracking-wider flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  Authenticated
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage property specs, data inventory, regional standards, and privacy controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('residence')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'residence'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Residence & Specs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'account'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Account & Regional</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'inventory'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Data Vault & Export</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'notifications'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notification Rules</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'integrations'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Ingestion Sources</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Privacy & Governance</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-6 overflow-y-auto grow space-y-6">
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: RESIDENCE & SPECS */}
          {activeTab === 'residence' && (
            <form onSubmit={handleSaveResidence} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="homeName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Household / Residence Name *
                  </label>
                  <input
                    id="homeName"
                    type="text"
                    value={homeName}
                    onChange={(e) => setHomeName(e.target.value)}
                    placeholder="e.g. Maple Residence"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="homeType" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Property Archetype
                  </label>
                  <select
                    id="homeType"
                    value={homeType}
                    onChange={(e) => setHomeType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                  >
                    <option value="single_family">Single-Family Detached</option>
                    <option value="apartment">Apartment / Flat</option>
                    <option value="condo">Condominium</option>
                    <option value="townhouse">Townhouse / Rowhouse</option>
                    <option value="multi_family">Multi-Family Complex</option>
                  </select>
                </div>
              </div>

              {/* Physical Address */}
              <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Physical Property Location
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <label htmlFor="streetAddress" className="block text-[11px] font-medium text-slate-600 mb-1">
                      Street Address
                    </label>
                    <input
                      id="streetAddress"
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="e.g. 742 Evergreen Terrace"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="city" className="block text-[11px] font-medium text-slate-600 mb-1">
                      City / Municipality
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Springfield"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="region" className="block text-[11px] font-medium text-slate-600 mb-1">
                      State / Province / Region
                    </label>
                    <input
                      id="region"
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="e.g. Oregon"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="block text-[11px] font-medium text-slate-600 mb-1">
                      Postal Code / ZIP
                    </label>
                    <input
                      id="postalCode"
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 97477"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Residence Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="yearBuilt" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Year Built
                  </label>
                  <input
                    id="yearBuilt"
                    type="number"
                    min="1800"
                    max="2035"
                    value={yearBuilt}
                    onChange={(e) => setYearBuilt(e.target.value)}
                    placeholder="e.g. 2016"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                <div>
                  <label htmlFor="squareFootage" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Square Footage (sq ft)
                  </label>
                  <input
                    id="squareFootage"
                    type="number"
                    min="50"
                    value={squareFootage}
                    onChange={(e) => setSquareFootage(e.target.value)}
                    placeholder="e.g. 2850"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                <div>
                  <label htmlFor="occupantsCount" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Household Members
                  </label>
                  <input
                    id="occupantsCount"
                    type="number"
                    min="1"
                    max="50"
                    value={occupantsCount}
                    onChange={(e) => setOccupantsCount(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Climate & HVAC Systems */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="primaryHeating" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Primary Heating System
                  </label>
                  <input
                    id="primaryHeating"
                    type="text"
                    value={primaryHeating}
                    onChange={(e) => setPrimaryHeating(e.target.value)}
                    placeholder="e.g. Inverter Heat Pump / Gas Furnace"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                <div>
                  <label htmlFor="primaryCooling" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Primary Cooling System
                  </label>
                  <input
                    id="primaryCooling"
                    type="text"
                    value={primaryCooling}
                    onChange={(e) => setPrimaryCooling(e.target.value)}
                    placeholder="e.g. Central Air / Ductless Mini-Split"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Household Notes & Operational Guidelines
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Main water shutoff valve is located behind the laundry room access panel."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Residence Specs'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ACCOUNT & REGIONAL */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Authenticated Account Info */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  Authenticated Profile & Security Identity
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white border border-slate-200/80 rounded-xl">
                    <span className="text-slate-400 block text-[10px] font-medium">Display Name</span>
                    <span className="font-semibold text-slate-900 text-sm">{profile?.displayName || 'Household Member'}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200/80 rounded-xl">
                    <span className="text-slate-400 block text-[10px] font-medium">Email Address</span>
                    <span className="font-semibold text-slate-900 text-sm">{profile?.email || 'user@example.com'}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200/80 rounded-xl sm:col-span-2 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-medium">Isolated Household UID</span>
                      <span className="font-mono text-xs text-slate-800">{profile?.userId || 'account-user'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyUid}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedUid ? 'Copied!' : 'Copy UID'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Regional Standards Form */}
              <form onSubmit={handleSaveResidence} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  Localization & Currency Standard
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="account-country" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Country Jurisdiction
                    </label>
                    <select
                      id="account-country"
                      value={country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                    >
                      {SUPPORTED_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.name}>
                          {c.name} ({c.defaultCurrency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="account-currency" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Primary Currency
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currencyOverride}
                          onChange={(e) => setCurrencyOverride(e.target.checked)}
                          className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300"
                        />
                        <span>Custom Override</span>
                      </label>
                    </div>
                    <select
                      id="account-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      disabled={!currencyOverride && currency === currentCountryConfig.defaultCurrency}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 transition cursor-pointer disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      {Object.values(SUPPORTED_CURRENCIES).map((curr) => (
                        <option key={curr.code} value={curr.code}>
                          {curr.code} ({curr.symbol}) — {curr.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="account-timezone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Timezone Identifier
                    </label>
                    <input
                      id="account-timezone"
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      placeholder="e.g. America/Los_Angeles"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label htmlFor="account-locale" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Locale & Date Formatting
                    </label>
                    <input
                      id="account-locale"
                      type="text"
                      value={locale}
                      onChange={(e) => setLocale(e.target.value)}
                      placeholder="e.g. en-US, en-GB, fr-FR"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmitting ? 'Saving...' : 'Save Regional Settings'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: DATA INVENTORY & PORTABILITY */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Header Overview */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Household Domain Inventory
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live snapshot of records stored across all 13 household intelligence domains
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-lg border border-indigo-100">
                    {totalUserRecords} User Created
                  </span>
                  {totalDemoRecords > 0 && (
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-semibold rounded-lg border border-amber-100">
                      {totalDemoRecords} Seeded Demo
                    </span>
                  )}
                </div>
              </div>

              {/* Grid of Domain Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                  <div className="text-xl font-bold text-slate-900">
                    {privacySummary?.recordsByType?.transactions?.total ?? dataSourcesSummary?.dataCounts?.confirmedTransactions ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium mt-0.5">Transactions</div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                  <div className="text-xl font-bold text-slate-900">
                    {privacySummary?.recordsByType?.documents?.total ?? dataSourcesSummary?.dataCounts?.importedDocuments ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium mt-0.5">Documents & Vault</div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                  <div className="text-xl font-bold text-slate-900">
                    {privacySummary?.recordsByType?.expenses?.total ?? dataSourcesSummary?.dataCounts?.recurringExpenses ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium mt-0.5">Tracked Bills</div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                  <div className="text-xl font-bold text-slate-900">
                    {privacySummary?.recordsByType?.assets?.total ?? dataSourcesSummary?.dataCounts?.registeredAssets ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium mt-0.5">Home Assets</div>
                </div>
              </div>

              {/* One-Click Portability & Data Export */}
              <div className="p-5 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                      <Download className="w-4 h-4 text-indigo-600" />
                      One-Click Data Portability & Archive Export
                    </h4>
                    <p className="text-xs text-indigo-800/80 mt-1 leading-relaxed">
                      Download your entire household database or structured financial ledgers at any time. Zero vendor lock-in.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 bg-white border border-indigo-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Complete JSON Vault</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Full schema snapshot with all properties, assets, debts & docs</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportJson}
                      disabled={isExportingJson}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition shadow-2xs cursor-pointer disabled:opacity-50 shrink-0 ml-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isExportingJson ? 'Exporting...' : 'Export JSON'}</span>
                    </button>
                  </div>

                  <div className="p-3.5 bg-white border border-indigo-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Financial Ledger (CSV)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Spreadsheet of all expenses, loan EMIs, cards & commitments</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      disabled={isExportingCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition shadow-2xs cursor-pointer disabled:opacity-50 shrink-0 ml-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isExportingCsv ? 'Exporting...' : 'Export CSV'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATION PREFERENCES */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Delivery Channels */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-600" />
                  Notification Delivery Channels
                </h4>

                <div className="space-y-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">In-App Alerts & Banner Reminders</div>
                      <div className="text-[11px] text-slate-500">Surface upcoming obligations inside the Command Center & Bell tray</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(notificationPrefs?.channels?.inApp ?? true)}
                      onChange={(e) => handleToggleChannel('inApp', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Weekly Email Digest & Urgent Alerts</div>
                      <div className="text-[11px] text-slate-500">Send proactive digest of upcoming bills and critical maintenance to:</div>
                      <div className="text-xs font-medium text-slate-800 mt-1 font-mono">{profile?.email || 'user@example.com'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleTestEmailDigest}
                        disabled={isTestingEmail}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition cursor-pointer"
                      >
                        <Send className="w-3 h-3 text-indigo-600" />
                        <span>{isTestingEmail ? 'Sending...' : 'Test Email'}</span>
                      </button>
                      <input
                        type="checkbox"
                        checked={Boolean(notificationPrefs?.channels?.email ?? true)}
                        onChange={(e) => handleToggleChannel('email', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Advance Lead Times */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Advance Notice Windows
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Bills & Debts Notice
                    </label>
                    <select
                      value={notificationPrefs?.advanceNoticeDays?.bills ?? 7}
                      onChange={(e) => handleUpdateNoticeDays('bills', parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 cursor-pointer"
                    >
                      <option value={3}>3 Days Before</option>
                      <option value={7}>7 Days Before (Default)</option>
                      <option value={14}>14 Days Before</option>
                      <option value={30}>30 Days Before</option>
                    </select>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Maintenance Notice
                    </label>
                    <select
                      value={notificationPrefs?.advanceNoticeDays?.maintenance ?? 14}
                      onChange={(e) => handleUpdateNoticeDays('maintenance', parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 cursor-pointer"
                    >
                      <option value={7}>7 Days Before</option>
                      <option value={14}>14 Days Before (Default)</option>
                      <option value={30}>30 Days Before</option>
                      <option value={60}>60 Days Before</option>
                    </select>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Warranty Expiration Notice
                    </label>
                    <select
                      value={notificationPrefs?.advanceNoticeDays?.warranties ?? 30}
                      onChange={(e) => handleUpdateNoticeDays('warranties', parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 cursor-pointer"
                    >
                      <option value={14}>14 Days Before</option>
                      <option value={30}>30 Days Before (Default)</option>
                      <option value={60}>60 Days Before</option>
                      <option value={90}>90 Days Before</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: INGESTION SOURCES & INTEGRATIONS */}
          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-indigo-600" />
                  Active Ingestion Channels & External Integrations
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  All external data ingested into HouseMind is sanitized and strictly isolated to your user account.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white border border-slate-200 rounded-lg text-indigo-600">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Document AI OCR & Multimodal Intake</div>
                      <div className="text-[11px] text-slate-500">Extracts structured bills, warranties, receipts, and manual specs</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    Active
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Manual Entry & Custom Entity Creator</div>
                      <div className="text-[11px] text-slate-500">Direct user additions for properties, rooms, expenses, and loans</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    Active
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Google Drive Document Sync</div>
                      <div className="text-[11px] text-slate-500">Scan household folder for appliance warranties and repair bills</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    Ready
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Gmail Utility Bill Intake</div>
                      <div className="text-[11px] text-slate-500">Read-only search for electronic utility statements & payment receipts</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    Ready
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PRIVACY & DATA GOVERNANCE */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              {/* Multi-Tenant Isolation Guarantee */}
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3.5">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-emerald-900">
                      Strict Multi-Tenant User Isolation
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    All household data is strictly bounded to UID <code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono text-emerald-900">{profile?.userId ? profile.userId.slice(0, 10) : 'account'}...</code>. No other user or household can read, query, or infer your private records.
                  </p>
                </div>
              </div>

              {/* AI Privacy & Minimization Boundary */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    Controlled AI Grounding & Privacy Minimization
                  </h4>
                </div>
                <p className="text-xs text-indigo-900 leading-relaxed">
                  HouseMind never feeds raw databases to LLMs. Only minimal aggregated totals and specific equipment questions are packaged into temporary prompt context.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-white border border-indigo-100 rounded-xl space-y-1.5">
                    <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Minimal Relevant Grounding
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1">
                      <li>• Aggregated monthly expense & debt totals</li>
                      <li>• Appliance model names & warranty dates</li>
                      <li>• Simulated scenario parameters</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-white border border-rose-100 rounded-xl space-y-1.5">
                    <div className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                      Strictly Redacted from AI
                    </div>
                    <ul className="text-[11px] text-slate-600 space-y-1">
                      <li>• Card PANs, CVVs & bank account numbers</li>
                      <li>• Passwords, social security & personal IDs</li>
                      <li>• Raw document image binaries</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Data Governance & Deletion Controls */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Data Governance & Deletion Controls
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    You have total ownership over your data. Delete sample starter records or perform a complete wipe.
                  </p>
                </div>

                {governanceSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{governanceSuccess}</span>
                  </div>
                )}

                {/* Demo Data Removal */}
                {showConfirmRemoveDemo ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Confirm Removal of Demo / Seed Data?</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      This will remove only pre-seeded sample expenses, assets, transactions, documents, and scenarios ({totalDemoRecords} items). All your custom entries ({totalUserRecords} items) remain preserved.
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
                      <span>Confirm Full Household Data Reset</span>
                    </div>
                    <p className="text-[11px] text-rose-800 leading-relaxed">
                      Warning: This will permanently purge ALL transactions, bills, properties, assets, warranties, documents, and scenarios for your account. This action cannot be undone.
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
                        className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-rose-950 focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleResetUserData}
                        disabled={isResettingData || resetConfirmInput.trim() !== 'DELETE MY DATA'}
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
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>End-to-End Encrypted (TLS 1.3 / AES-256)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
