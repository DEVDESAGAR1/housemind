import { useState, useEffect, FormEvent } from 'react';
import { X, Building2, Save, Globe, Database, HelpCircle } from 'lucide-react';
import { HouseholdProfile } from '../types';
import {
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
  getCountryConfig,
  getCurrencyInfo,
} from '../config/locationCurrencyConfig';
import { DataSourcesModal } from './DataSourcesModal';

interface ProfileModalProps {
  isOpen: boolean;
  profile: HouseholdProfile | null;
  onClose: () => void;
  onSave: (updated: Partial<HouseholdProfile>) => Promise<void>;
}

export function ProfileModal({ isOpen, profile, onClose, onSave }: ProfileModalProps) {
  const [homeName, setHomeName] = useState('');
  const [homeType, setHomeType] = useState<HouseholdProfile['homeType']>('single_family');
  const [country, setCountry] = useState('United States');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [locale, setLocale] = useState('en-US');
  const [currency, setCurrency] = useState('USD');
  const [currencyOverride, setCurrencyOverride] = useState(false);
  const [yearBuilt, setYearBuilt] = useState<string>('');
  const [squareFootage, setSquareFootage] = useState<string>('');
  const [primaryHeating, setPrimaryHeating] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setHomeName(profile.homeName || 'My Household');
      setHomeType(profile.homeType || 'single_family');
      setCountry(profile.country || 'United States');
      setRegion(profile.region || '');
      setCity(profile.city || '');
      setTimezone(profile.timezone || 'America/New_York');
      setLocale(profile.locale || 'en-US');
      setCurrency(profile.currency || 'USD');
      setCurrencyOverride(Boolean(profile.currencyOverride));
      setYearBuilt(profile.yearBuilt ? profile.yearBuilt.toString() : '');
      setSquareFootage(profile.squareFootage ? profile.squareFootage.toString() : '');
      setPrimaryHeating(profile.primaryHeating || '');
    }
  }, [profile, isOpen]);

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
      country: country.trim() || undefined,
      region: region.trim() || undefined,
      city: city.trim() || undefined,
      timezone: timezone.trim() || undefined,
      locale: locale.trim() || undefined,
      currency: currency.trim().toUpperCase() || 'USD',
      currencyOverride,
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

  const currentCountryConfig = getCountryConfig(country);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-base">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <span>Household Profile & Regional Settings</span>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {validationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {validationError}
                </div>
              )}

              {/* Basic Residence */}
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
                  <label htmlFor="profile-country" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Country / Jurisdiction
                  </label>
                  <select
                    id="profile-country"
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition cursor-pointer"
                  >
                    {SUPPORTED_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.name} ({c.defaultCurrency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* State / Province & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="profile-region" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    State / Province / Region
                  </label>
                  <input
                    id="profile-region"
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g. Karnataka, California, England"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label htmlFor="profile-city" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    City / Municipality
                  </label>
                  <input
                    id="profile-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bengaluru, Seattle, London"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Currency & Override */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="profile-currency" className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Household Currency
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currencyOverride}
                      onChange={(e) => setCurrencyOverride(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span>Custom Currency Override</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <select
                      id="profile-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      disabled={!currencyOverride && currency === currentCountryConfig.defaultCurrency}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition cursor-pointer disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      {Object.values(SUPPORTED_CURRENCIES).map((curr) => (
                        <option key={curr.code} value={curr.code}>
                          {curr.code} ({curr.symbol}) — {curr.name}
                        </option>
                      ))}
                    </select>
                    {!currencyOverride && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Default currency auto-aligned with {country}.
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="profile-timezone" className="block text-[11px] font-medium text-slate-600 mb-1">
                      Timezone
                    </label>
                    <input
                      id="profile-timezone"
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      placeholder="e.g. Asia/Kolkata, America/New_York"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Residence Specs */}
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

              {/* Data Sources Transparency Banner */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsDataSourcesOpen(true)}
                  className="w-full py-3 px-4 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/80 rounded-2xl flex items-center justify-between text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-2xs">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-indigo-950">HouseMind Data Sources & Transparency</div>
                      <div className="text-[11px] text-indigo-700">View user-isolated storage, record counts & AI grounding safeguards</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                    View
                  </span>
                </button>
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

      <DataSourcesModal
        isOpen={isDataSourcesOpen}
        onClose={() => setIsDataSourcesOpen(false)}
      />
    </>
  );
}

