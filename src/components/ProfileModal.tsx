import { useState, useEffect, FormEvent } from 'react';
import { X, Building2, Save } from 'lucide-react';
import { HouseholdProfile } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  profile: HouseholdProfile | null;
  onClose: () => void;
  onSave: (updated: Partial<HouseholdProfile>) => Promise<void>;
}

export function ProfileModal({ isOpen, profile, onClose, onSave }: ProfileModalProps) {
  const [homeName, setHomeName] = useState('');
  const [homeType, setHomeType] = useState<HouseholdProfile['homeType']>('single_family');
  const [yearBuilt, setYearBuilt] = useState<string>('');
  const [squareFootage, setSquareFootage] = useState<string>('');
  const [currency, setCurrency] = useState('USD');
  const [primaryHeating, setPrimaryHeating] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setHomeName(profile.homeName || 'My Household');
      setHomeType(profile.homeType || 'single_family');
      setYearBuilt(profile.yearBuilt ? profile.yearBuilt.toString() : '');
      setSquareFootage(profile.squareFootage ? profile.squareFootage.toString() : '');
      setCurrency(profile.currency || 'USD');
      setPrimaryHeating(profile.primaryHeating || '');
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!homeName.trim()) {
      setValidationError('Home name is required.');
      return;
    }

    const payload: Partial<HouseholdProfile> = {
      homeName: homeName.trim(),
      homeType,
      currency: currency.trim().toUpperCase() || 'USD',
      primaryHeating: primaryHeating.trim() || undefined,
      yearBuilt: yearBuilt ? parseInt(yearBuilt, 10) : undefined,
      squareFootage: squareFootage ? parseFloat(squareFootage) : undefined,
    };

    try {
      setIsSubmitting(true);
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to update household profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-base">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>Household Profile Settings</span>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {validationError}
              </div>
            )}

            <div>
              <label htmlFor="profile-homeName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Household / Residence Name *
              </label>
              <input
                id="profile-homeName"
                type="text"
                value={homeName}
                onChange={(e) => setHomeName(e.target.value)}
                placeholder="e.g. Maple Residence"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-homeType" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Property Type
                </label>
                <select
                  id="profile-homeType"
                  value={homeType}
                  onChange={(e) => setHomeType(e.target.value as HouseholdProfile['homeType'])}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="single_family">Single Family Home</option>
                  <option value="apartment">Apartment</option>
                  <option value="condo">Condominium</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="multi_family">Multi-Family</option>
                </select>
              </div>

              <div>
                <label htmlFor="profile-currency" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Currency (ISO Code)
                </label>
                <select
                  id="profile-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-yearBuilt" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Year Built
                </label>
                <input
                  id="profile-yearBuilt"
                  type="number"
                  min="1800"
                  max="2035"
                  value={yearBuilt}
                  onChange={(e) => setYearBuilt(e.target.value)}
                  placeholder="e.g. 2018"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label htmlFor="profile-squareFootage" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Square Footage (sq ft)
                </label>
                <input
                  id="profile-squareFootage"
                  type="number"
                  min="50"
                  step="10"
                  value={squareFootage}
                  onChange={(e) => setSquareFootage(e.target.value)}
                  placeholder="e.g. 2400"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-primaryHeating" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Primary Heating / Cooling System
              </label>
              <input
                id="profile-primaryHeating"
                type="text"
                value={primaryHeating}
                onChange={(e) => setPrimaryHeating(e.target.value)}
                placeholder="e.g. Inverter Heat Pump, Natural Gas Furnace"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              id="cancel-profile-btn"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-profile-btn"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
