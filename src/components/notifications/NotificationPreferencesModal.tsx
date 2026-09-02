import { useState, useEffect } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  Mail,
  Shield,
  Sliders,
  Sparkles,
  Zap,
  Clock,
  AlertTriangle,
  RefreshCw,
  Send,
} from 'lucide-react';
import { NotificationPreferences } from '../../types';
import { api } from '../../lib/api';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (prefs: NotificationPreferences) => void;
  addToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export function NotificationPreferencesModal({
  isOpen,
  onClose,
  onSaved,
  addToast,
}: NotificationPreferencesModalProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    api.getNotificationPreferences()
      .then((data) => setPreferences(data))
      .catch((err) => {
        console.error('Failed to load notification preferences:', err);
        addToast('error', 'Preferences Error', 'Could not retrieve notification settings.');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleCategory = (key: keyof NotificationPreferences['categories']) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      categories: {
        ...preferences.categories,
        [key]: !preferences.categories[key],
      },
    });
  };

  const handleAdvanceNoticeChange = (key: keyof NotificationPreferences['advanceNoticeDays'], val: number) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      advanceNoticeDays: {
        ...preferences.advanceNoticeDays,
        [key]: val,
      },
    });
  };

  const handleToggleChannel = (key: keyof NotificationPreferences['channels']) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      channels: {
        ...preferences.channels,
        [key]: !preferences.channels[key],
      },
    });
  };

  const handleSave = async () => {
    if (!preferences) return;
    setIsSaving(true);
    try {
      const saved = await api.updateNotificationPreferences(preferences);
      setPreferences(saved);
      if (onSaved) onSaved(saved);
      addToast('success', 'Preferences Saved', 'Your household notification rules have been updated.');
      onClose();
    } catch (err: any) {
      console.error('Failed to update preferences:', err);
      addToast('error', 'Save Failed', err.message || 'Could not save notification preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    try {
      const res = await api.testEmailDigest();
      if (res.delivered) {
        addToast('success', 'Email System Check', res.message);
      } else {
        addToast('info', 'Email Delivery Status', res.message);
      }
    } catch (err: any) {
      addToast('error', 'Email Test Error', err.message || 'Failed to trigger test.');
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-prefs-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 id="notif-prefs-title" className="text-xl font-bold text-slate-900">
                Notification Preferences
              </h2>
              <p className="text-xs text-slate-500">
                Control alert horizons, enabled event categories, and delivery channels
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            aria-label="Close preferences"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading || !preferences ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading settings...</p>
          </div>
        ) : (
          <div className="py-5 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            {/* 1. Category Alerts */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Alert Categories
              </h3>
              <div className="space-y-2.5">
                {/* Bills & Payments */}
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition cursor-pointer">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-800">Bills & Payment Deadlines</div>
                    <div className="text-xs text-slate-500">Utility bills, credit card due dates, and recurring expenses</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.categories.billsPayments}
                    onChange={() => handleToggleCategory('billsPayments')}
                    className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500"
                  />
                </label>

                {/* Maintenance */}
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition cursor-pointer">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-800">Preventative Maintenance</div>
                    <div className="text-xs text-slate-500">Scheduled HVAC filter replacements, plumbing checks, seasonal tune-ups</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.categories.maintenance}
                    onChange={() => handleToggleCategory('maintenance')}
                    className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500"
                  />
                </label>

                {/* Warranties */}
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition cursor-pointer">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-800">Warranty Expirations</div>
                    <div className="text-xs text-slate-500">Appliance and home system manufacturer coverage expirations</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.categories.warranties}
                    onChange={() => handleToggleCategory('warranties')}
                    className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500"
                  />
                </label>

                {/* Documents */}
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition cursor-pointer">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-800">Document Renewals</div>
                    <div className="text-xs text-slate-500">Insurance policies, home warranties, and lease renewal dates</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.categories.documents}
                    onChange={() => handleToggleCategory('documents')}
                    className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500"
                  />
                </label>

                {/* Household Alerts */}
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition cursor-pointer">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-800">Critical Household Signals</div>
                    <div className="text-xs text-slate-500">Urgent equipment breakdowns and critical health warnings</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.categories.householdAlerts}
                    onChange={() => handleToggleCategory('householdAlerts')}
                    className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>

            {/* 2. Advance Notice Horizons */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Advance Notice Timing (Days in Advance)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Bills & Payments</span>
                    <span className="text-xs font-bold text-indigo-600 px-2 py-0.5 rounded-md bg-indigo-50">
                      {preferences.advanceNoticeDays.bills} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={preferences.advanceNoticeDays.bills}
                    onChange={(e) => handleAdvanceNoticeChange('bills', parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Maintenance</span>
                    <span className="text-xs font-bold text-indigo-600 px-2 py-0.5 rounded-md bg-indigo-50">
                      {preferences.advanceNoticeDays.maintenance} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={preferences.advanceNoticeDays.maintenance}
                    onChange={(e) => handleAdvanceNoticeChange('maintenance', parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Warranties</span>
                    <span className="text-xs font-bold text-indigo-600 px-2 py-0.5 rounded-md bg-indigo-50">
                      {preferences.advanceNoticeDays.warranties} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min="7"
                    max="90"
                    value={preferences.advanceNoticeDays.warranties}
                    onChange={(e) => handleAdvanceNoticeChange('warranties', parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Documents</span>
                    <span className="text-xs font-bold text-indigo-600 px-2 py-0.5 rounded-md bg-indigo-50">
                      {preferences.advanceNoticeDays.documents} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min="7"
                    max="90"
                    value={preferences.advanceNoticeDays.documents}
                    onChange={(e) => handleAdvanceNoticeChange('documents', parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 3. Delivery Channels */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Delivery Channels
              </h3>
              <div className="space-y-3">
                {/* In-App */}
                <div className="p-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">In-App Notification Center</div>
                      <div className="text-xs text-slate-500">Live unread badges, banners, and operating feed</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-100 rounded-full">
                    Active
                  </span>
                </div>

                {/* Email Channel */}
                <div className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">Email Digest Delivery</div>
                        <div className="text-xs text-slate-500">Weekly executive digest & critical alert emails</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.channels.email}
                        onChange={() => handleToggleChannel('email')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {preferences.channels.email && (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-600 truncate">
                        Recipient: <strong className="text-slate-800">{preferences.emailAddress || 'User Account Email'}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleTestEmail}
                        disabled={isTestingEmail}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition shrink-0 cursor-pointer flex items-center gap-1.5"
                      >
                        {isTestingEmail ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3 text-indigo-500" />
                        )}
                        <span>Test Channel</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-2"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
}
