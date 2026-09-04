import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Sparkles,
  Wrench,
  ShieldCheck,
  Building,
  Calendar,
  DollarSign,
  Phone,
  FileText,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Loader2,
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
import { api } from '../lib/api';
import { formatCurrency } from '../config/locationCurrencyConfig';

interface HouseholdIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  editingIssue: HouseholdIssue | null;
  assets: HomeAsset[];
  properties: Property[];
  rooms?: Room[];
  warranties: Warranty[];
  currency?: string;
  addToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  initialAssetId?: string;
}

const CATEGORY_OPTIONS = [
  { value: 'appliance', label: 'Appliance' },
  { value: 'plumbing', label: 'Plumbing & Fixtures' },
  { value: 'electrical', label: 'Electrical & Power' },
  { value: 'hvac', label: 'HVAC & Heating / Cooling' },
  { value: 'structural', label: 'Structural & Roofing' },
  { value: 'safety', label: 'Safety & Smoke / CO' },
  { value: 'smart_home', label: 'Smart Home & Network' },
  { value: 'yard_exterior', label: 'Yard & Exterior' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'general', label: 'General Household' },
];

export function HouseholdIssueModal({
  isOpen,
  onClose,
  onSaved,
  editingIssue,
  assets,
  properties,
  rooms = [],
  warranties,
  currency = 'USD',
  addToast,
  initialAssetId,
}: HouseholdIssueModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [intakeMode, setIntakeMode] = useState<'smart' | 'manual'>('manual');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [subcategory, setSubcategory] = useState('');
  const [severity, setSeverity] = useState<HouseholdIssueSeverity>('medium');
  const [status, setStatus] = useState<HouseholdIssueStatus>('reported');
  const [assetId, setAssetId] = useState(initialAssetId || '');
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [roomId, setRoomId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [serviceProviderContact, setServiceProviderContact] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [actualCost, setActualCost] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [resolution, setResolution] = useState('');
  const [safetyWarning, setSafetyWarning] = useState('');

  // Reset or Populate on open
  useEffect(() => {
    if (!isOpen) return;

    if (editingIssue) {
      setIntakeMode('manual');
      setTitle(editingIssue.title || '');
      setDescription(editingIssue.description || '');
      setCategory(editingIssue.category || 'general');
      setSubcategory(editingIssue.subcategory || '');
      setSeverity(editingIssue.severity || 'medium');
      setStatus(editingIssue.status || 'reported');
      setAssetId(editingIssue.assetId || '');
      setPropertyId(editingIssue.propertyId || properties[0]?.id || '');
      setRoomId(editingIssue.roomId || '');
      setDueDate(editingIssue.dueDate ? editingIssue.dueDate.slice(0, 10) : '');
      setScheduledDate(editingIssue.scheduledDate ? editingIssue.scheduledDate.slice(0, 10) : '');
      setServiceProvider(editingIssue.serviceProvider || '');
      setServiceProviderContact(editingIssue.serviceProviderContact || '');
      setEstimatedCost(editingIssue.estimatedCost !== undefined ? String(editingIssue.estimatedCost) : '');
      setActualCost(editingIssue.actualCost !== undefined ? String(editingIssue.actualCost) : '');
      setNotes(editingIssue.notes || '');
      setResolution(editingIssue.resolution || '');
      setSafetyWarning(editingIssue.safetyWarning || '');
    } else {
      setIntakeMode('manual');
      setNaturalLanguageInput('');
      setTitle('');
      setDescription('');
      setCategory('general');
      setSubcategory('');
      setSeverity('medium');
      setStatus('reported');
      setAssetId(initialAssetId || '');
      setPropertyId(properties[0]?.id || '');
      setRoomId('');
      setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
      setScheduledDate('');
      setServiceProvider('');
      setServiceProviderContact('');
      setEstimatedCost('');
      setActualCost('');
      setNotes('');
      setResolution('');
      setSafetyWarning('');
    }
  }, [isOpen, editingIssue, initialAssetId, properties]);

  // When asset is selected, automatically update property/room and check warranty
  const handleAssetChange = (selectedAssetId: string) => {
    setAssetId(selectedAssetId);
    if (!selectedAssetId) return;

    const matchedAsset = assets.find((a) => a.id === selectedAssetId);
    if (matchedAsset) {
      if (matchedAsset.propertyId) setPropertyId(matchedAsset.propertyId);
      if (matchedAsset.roomId) setRoomId(matchedAsset.roomId);

      // Auto-set category if general
      if (matchedAsset.category && (category === 'general' || !category)) {
        if (matchedAsset.category === 'kitchen' || matchedAsset.category === 'laundry') {
          setCategory('appliance');
        } else if (matchedAsset.category === 'hvac') {
          setCategory('hvac');
        } else if (matchedAsset.category === 'plumbing') {
          setCategory('plumbing');
        } else if (matchedAsset.category === 'electrical') {
          setCategory('electrical');
        }
      }
    }
  };

  // Find linked warranty for the selected asset
  const linkedWarranty = assetId
    ? warranties.find(
        (w) =>
          w.assetId === assetId ||
          (w.status === 'active' && w.assetId === assetId)
      )
    : null;

  // Handle Natural Language Extraction
  const handleRunSmartIntake = async () => {
    if (!naturalLanguageInput.trim() || naturalLanguageInput.trim().length < 3) {
      addToast('error', 'Input Required', 'Please provide a sentence or two describing what needs repair or attention.');
      return;
    }

    setIsExtracting(true);
    try {
      const candidate = await api.extractIssueCandidate(naturalLanguageInput, assetId || undefined);
      if (candidate) {
        if (candidate.title) setTitle(candidate.title);
        if (candidate.description) setDescription(candidate.description);
        if (candidate.category) setCategory(candidate.category);
        if (candidate.subcategory) setSubcategory(candidate.subcategory);
        if (candidate.severity) setSeverity(candidate.severity);
        if (candidate.assetId) setAssetId(candidate.assetId);
        if (candidate.propertyId) setPropertyId(candidate.propertyId);
        if (candidate.roomId) setRoomId(candidate.roomId);
        if (candidate.estimatedCost) setEstimatedCost(String(candidate.estimatedCost));
        if (candidate.safetyWarning) setSafetyWarning(candidate.safetyWarning);

        addToast(
          'success',
          'Issue Candidate Extracted',
          candidate.safetyWarning
            ? 'Safety hazard detected! Fields auto-populated.'
            : 'Structured details parsed from natural language.'
        );
        setIntakeMode('manual');
      }
    } catch (err: any) {
      addToast('error', 'Extraction Failed', err.message || 'Unable to parse issue description.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('error', 'Title Required', 'Please enter a summary title for the ticket.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<HouseholdIssue> = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        subcategory: subcategory.trim() || undefined,
        severity,
        status,
        assetId: assetId || undefined,
        propertyId: propertyId || undefined,
        roomId: roomId || undefined,
        dueDate: dueDate || undefined,
        scheduledDate: scheduledDate || undefined,
        serviceProvider: serviceProvider.trim() || undefined,
        serviceProviderContact: serviceProviderContact.trim() || undefined,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        actualCost: actualCost ? parseFloat(actualCost) : undefined,
        notes: notes.trim() || undefined,
        resolution: resolution.trim() || undefined,
        safetyWarning: safetyWarning.trim() || undefined,
        warrantyId: linkedWarranty?.id || undefined,
      };

      if (editingIssue) {
        await api.updateIssue(editingIssue.id, payload);
        addToast('success', 'Ticket Updated', `Updated "${title}".`);
      } else {
        await api.createIssue(payload);
        addToast('success', 'Ticket Opened', `Created ticket "${title}".`);
      }

      await onSaved();
      onClose();
    } catch (err: any) {
      addToast('error', 'Failed to Save Ticket', err.message || 'Could not save issue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingIssue ? 'Edit Household Ticket' : 'Report Household Issue / Ticket'}
              </h2>
              <p className="text-xs text-slate-500">
                {editingIssue
                  ? `Ticket #${editingIssue.id.slice(-6).toUpperCase()}`
                  : 'Universal household tracking for appliances, repairs, and contractors'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Smart AI vs Manual Toggle */}
        {!editingIssue && (
          <div className="px-6 pt-4 pb-2 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIntakeMode('manual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  intakeMode === 'manual'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                Standard Form
              </button>
              <button
                type="button"
                onClick={() => setIntakeMode('smart')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  intakeMode === 'smart'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Fast Intake</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-400 italic">
              {intakeMode === 'smart'
                ? 'Type natural language and let HouseMind auto-fill fields'
                : 'Fill out specific ticket details manually'}
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Smart AI Intake Box */}
          {intakeMode === 'smart' && !editingIssue && (
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Describe the issue in your own words:</span>
              </div>
              <textarea
                value={naturalLanguageInput}
                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                placeholder="e.g. Dishwasher is making loud grinding sounds during wash cycle and won't drain water completely. Smells slightly like burnt rubber."
                rows={3}
                className="w-full text-xs p-3 rounded-lg border border-indigo-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500">
                  Detects hazards, matches home appliances, and estimates severities.
                </p>
                <button
                  type="button"
                  onClick={handleRunSmartIntake}
                  disabled={isExtracting || !naturalLanguageInput.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Parse & Auto-Fill</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Safety Hazard Warning Alert */}
          {safetyWarning && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>SAFETY HAZARD DETECTED</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed font-medium">
                {safetyWarning}
              </p>
              <div className="pt-1 text-[11px] text-rose-600 flex items-center justify-between">
                <span>Please take protective precautions before attempting inspection.</span>
                <button
                  type="button"
                  onClick={() => setSafetyWarning('')}
                  className="text-rose-500 hover:text-rose-700 text-[10px] underline cursor-pointer"
                >
                  Dismiss Warning
                </button>
              </div>
            </div>
          )}

          {/* Active Warranty Notice */}
          {linkedWarranty && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold">Active Warranty Coverage Found:</span>{' '}
                  <span className="font-medium text-emerald-800">
                    {linkedWarranty.warrantyProvider || linkedWarranty.providerName || linkedWarranty.title}
                  </span>
                  {linkedWarranty.policyNumber && ` (Policy: ${linkedWarranty.policyNumber})`}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Claim Eligible
              </span>
            </div>
          )}

          <form id="issue-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Issue Summary / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Refrigerator leaking water under crisper drawer"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detailed Description / Symptoms
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe observations, error codes, strange noises, when it started..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Severity & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Severity Level
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as HouseholdIssueSeverity)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">Low (Cosmetic / Minor Inconvenience)</option>
                  <option value="medium">Medium (Degraded Performance / Non-urgent)</option>
                  <option value="high">High (Urgent / Complete Outage)</option>
                  <option value="critical">Critical (Immediate Hazard / Active Leak / Gas)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Current Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as HouseholdIssueStatus)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="reported">Reported (New)</option>
                  <option value="triaged">Triaged (Assessed)</option>
                  <option value="scheduled">Scheduled (Vendor Booked)</option>
                  <option value="in_progress">In Progress (Active Work)</option>
                  <option value="waiting_parts">Waiting on Parts</option>
                  <option value="resolved">Resolved</option>
                  <option value="verified">Verified</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Category & Asset Linking */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Linked Asset / Appliance
                </label>
                <select
                  value={assetId}
                  onChange={(e) => handleAssetChange(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No specific asset (General Household)</option>
                  {assets.map((ast) => (
                    <option key={ast.id} value={ast.id}>
                      {ast.name} {ast.brand ? `(${ast.brand})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Property & Room Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Property
                </label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.name || (typeof prop.address === 'string' ? prop.address : prop.address?.street) || 'Home'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Room / Area
                </label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unspecified area</option>
                  {rooms
                    .filter((r) => !propertyId || r.propertyId === propertyId)
                    .map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Due Date & Scheduled Service Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Scheduled Service Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Service Provider & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Service Provider / Contractor
                </label>
                <input
                  type="text"
                  value={serviceProvider}
                  onChange={(e) => setServiceProvider(e.target.value)}
                  placeholder="e.g. Apex Appliance Repair"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Provider Contact (Phone / Email)
                </label>
                <input
                  type="text"
                  value={serviceProviderContact}
                  onChange={(e) => setServiceProviderContact(e.target.value)}
                  placeholder="e.g. 555-019-4822"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Estimated & Actual Costs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estimated Repair Cost ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Actual Final Cost ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Resolution Notes */}
            {(status === 'resolved' || status === 'verified' || status === 'closed') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Resolution Summary
                </label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Describe the fix implemented, parts replaced, or warranty claim approval..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* General Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Internal Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Private reminders, access codes for technician, etc."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="issue-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs shadow-indigo-600/20 transition cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{editingIssue ? 'Save Changes' : 'Open Ticket'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
