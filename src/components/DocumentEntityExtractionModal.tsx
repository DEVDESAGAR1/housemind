import React, { useState } from 'react';
import {
  Sparkles,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Home,
  Wrench,
  ShieldCheck,
  Calendar,
  Zap,
  Landmark,
  CreditCard,
  Layers,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  ExtractedEntityReviewData,
  HouseholdEntityType,
  HouseholdDocument,
} from '../types';

interface DocumentEntityExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: HouseholdDocument[];
  onEntitySaved: (entityType: HouseholdEntityType, savedEntity: any) => void;
  addToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  currency?: string;
  preselectedDocumentId?: string;
  preselectedEntityType?: HouseholdEntityType;
}

export function DocumentEntityExtractionModal({
  isOpen,
  onClose,
  documents,
  onEntitySaved,
  addToast,
  currency = 'USD',
  preselectedDocumentId,
  preselectedEntityType,
}: DocumentEntityExtractionModalProps) {
  const [selectedDocId, setSelectedDocId] = useState<string>(preselectedDocumentId || '');
  const [targetType, setTargetType] = useState<HouseholdEntityType | ''>(preselectedEntityType || '');
  const [userNotes, setUserNotes] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [extractedData, setExtractedData] = useState<ExtractedEntityReviewData | null>(null);
  const [editableFields, setEditableFields] = useState<Record<string, any>>({});

  if (!isOpen) return null;

  const handleStartExtraction = async () => {
    if (!selectedDocId) {
      addToast('error', 'Select Document', 'Please select a document from your vault.');
      return;
    }

    setIsExtracting(true);
    try {
      const result = await api.extractEntityFromDoc(
        selectedDocId,
        targetType ? (targetType as HouseholdEntityType) : undefined,
        userNotes
      );
      setExtractedData(result);
      setEditableFields({ ...result.extractedFields });
      addToast('success', 'Extraction Complete', `Extracted structured ${result.detectedEntityType} details.`);
    } catch (err: any) {
      console.error('Failed to extract entity:', err);
      addToast('error', 'Extraction Failed', err.message || 'Could not parse entity from document.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditableFields((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleConfirmSave = async () => {
    if (!extractedData) return;

    setIsSaving(true);
    try {
      const res = await api.saveExtractedEntity(
        extractedData.detectedEntityType,
        editableFields,
        extractedData.sourceDocumentId
      );
      addToast('success', 'Entity Saved', `Successfully created ${extractedData.detectedEntityType} record.`);
      onEntitySaved(extractedData.detectedEntityType, res.entity);
      onClose();
    } catch (err: any) {
      console.error('Failed to save entity:', err);
      addToast('error', 'Save Failed', err.message || 'Could not persist entity to database.');
    } finally {
      setIsSaving(false);
    }
  };

  const entityTypeIcons: Record<HouseholdEntityType, React.ReactNode> = {
    property: <Home className="w-4 h-4 text-amber-600" />,
    room: <Layers className="w-4 h-4 text-purple-600" />,
    asset: <Wrench className="w-4 h-4 text-blue-600" />,
    warranty: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
    maintenance: <Calendar className="w-4 h-4 text-indigo-600" />,
    utility: <Zap className="w-4 h-4 text-amber-500" />,
    loan: <Landmark className="w-4 h-4 text-rose-600" />,
    credit_card: <CreditCard className="w-4 h-4 text-violet-600" />,
    expense: <FileText className="w-4 h-4 text-cyan-600" />,
    transaction: <FileText className="w-4 h-4 text-emerald-600" />,
    document: <FileText className="w-4 h-4 text-slate-600" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">AI Document Intelligence & Entity Extractor</h2>
              <p className="text-xs text-slate-500">
                Extract structured properties, warranties, equipment, utilities, loans, or maintenance from receipts & statements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Step 1: Select Source Document & Target Entity */}
          {!extractedData && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  1. Select Source Document
                </label>
                {documents.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>No documents in your vault yet. Please upload a PDF, image, or receipt first via Document Vault.</span>
                  </div>
                ) : (
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose a document from your vault --</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.fileName} ({doc.documentType} • {new Date(doc.uploadedAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  2. Target Entity Type (Optional - AI will auto-detect if blank)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { type: 'property', label: 'Property' },
                    { type: 'asset', label: 'Asset / Appliance' },
                    { type: 'warranty', label: 'Warranty Policy' },
                    { type: 'maintenance', label: 'Maintenance Task' },
                    { type: 'utility', label: 'Utility Account' },
                    { type: 'loan', label: 'Loan / Mortgage' },
                    { type: 'credit_card', label: 'Credit Card' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setTargetType(targetType === item.type ? '' : (item.type as HouseholdEntityType))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition text-left cursor-pointer ${
                        targetType === item.type
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-semibold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {entityTypeIcons[item.type as HouseholdEntityType]}
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  3. User Notes or Context (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Purchased at Home Depot for Main Floor HVAC"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleStartExtraction}
                  disabled={!selectedDocId || isExtracting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50 shadow-xs shadow-indigo-600/20"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extracting Structured Entity with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Run AI Entity Extraction</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review & Edit Extracted Fields */}
          {extractedData && (
            <div className="space-y-5">
              {/* Confidence & Source Summary Header */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    {entityTypeIcons[extractedData.detectedEntityType]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 capitalize">
                        {extractedData.detectedEntityType.replace('_', ' ')} Record
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          extractedData.confidenceScore >= 0.8
                            ? 'bg-emerald-100 text-emerald-800'
                            : extractedData.confidenceScore >= 0.6
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {Math.round(extractedData.confidenceScore * 100)}% Confidence
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <FileText className="w-3 h-3" />
                      Source: {extractedData.sourceFileName}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExtractedData(null)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  ← Pick Different Doc
                </button>
              </div>

              {/* Warnings */}
              {extractedData.warnings && extractedData.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Extraction Notices:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    {extractedData.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dynamic Editable Fields Grid */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Review & Adjust Extracted Values
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(editableFields).map(([key, val]) => {
                    // Skip complex nested objects in basic rendering or format them
                    const isObject = typeof val === 'object' && val !== null;
                    const stringVal = isObject ? JSON.stringify(val) : String(val ?? '');

                    return (
                      <div key={key} className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                        </label>
                        <input
                          type={typeof val === 'number' ? 'number' : 'text'}
                          value={stringVal}
                          onChange={(e) => {
                            let parsedValue: any = e.target.value;
                            if (typeof val === 'number') {
                              parsedValue = Number(e.target.value);
                            } else if (isObject) {
                              try {
                                parsedValue = JSON.parse(e.target.value);
                              } catch {
                                parsedValue = e.target.value;
                              }
                            }
                            handleFieldChange(key, parsedValue);
                          }}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Source References */}
              {extractedData.sourceReferences && extractedData.sourceReferences.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
                  <span className="font-semibold block text-slate-700 mb-1">Citations & Grounded Snippets:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {extractedData.sourceReferences.map((ref, idx) => (
                      <li key={idx} className="truncate">
                        {ref}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Entity...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Save to Household</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
