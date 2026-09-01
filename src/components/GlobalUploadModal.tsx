import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
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
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  ChevronDown,
  Info,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  HouseholdDocument,
  HouseholdEntityType,
  TransactionCandidate,
  ExtractedEntityReviewData,
  HomeAsset,
  Property,
} from '../types';
import { formatCurrency } from '../config/locationCurrencyConfig';

export interface GlobalUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: HouseholdDocument[];
  assets: HomeAsset[];
  properties: Property[];
  currency?: string;
  initialDomainHint?: HouseholdEntityType;
  onDocumentProcessed: (result: {
    document: HouseholdDocument;
    entityType?: HouseholdEntityType;
    entityId?: string;
    confirmedTransactionsCount?: number;
    destinationTab?: string;
  }) => void;
  onNavigateToTab?: (tab: any) => void;
  addToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

const SUPPORTED_EXTENSIONS = ['.pdf', '.csv', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.txt'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const DOMAIN_OPTIONS: Array<{
  type: HouseholdEntityType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    type: 'transaction',
    label: 'Financial Statement / Ledger',
    description: 'Bank statements, credit card bills, payroll slips, or itemized receipts',
    icon: Landmark,
  },
  {
    type: 'asset',
    label: 'Household Asset / Equipment',
    description: 'Appliances, electronics, HVAC systems, tools, or vehicles',
    icon: Wrench,
  },
  {
    type: 'warranty',
    label: 'Warranty & Protection Plan',
    description: 'Manufacturer warranties, AppleCare, extended service contracts',
    icon: ShieldCheck,
  },
  {
    type: 'maintenance',
    label: 'Maintenance & Service Record',
    description: 'Repair invoices, tune-ups, filter replacements, inspections',
    icon: Calendar,
  },
  {
    type: 'utility',
    label: 'Utility Account & Bill',
    description: 'Electricity, water, gas, internet, solar, trash bills',
    icon: Zap,
  },
  {
    type: 'loan',
    label: 'Loan & Mortgage Statement',
    description: 'Home mortgage, auto loans, personal loans, EMI schedules',
    icon: Landmark,
  },
  {
    type: 'property',
    label: 'Property & Real Estate',
    description: 'Deeds, title deeds, closing statements, tax assessments',
    icon: Home,
  },
  {
    type: 'document',
    label: 'General Document Vault',
    description: 'Store document file securely in vault without creating entities',
    icon: FileText,
  },
];

const FINANCIAL_CATEGORIES = [
  'Salary',
  'Housing',
  'Utilities',
  'Food',
  'Transport',
  'Shopping',
  'Healthcare',
  'Education',
  'Insurance',
  'EMI / Loan',
  'Entertainment',
  'Subscription',
  'Maintenance',
  'Bank Fees',
  'Taxes',
  'Other Expense',
  'Transfer In',
  'Transfer Out',
  'Refund',
];

export function GlobalUploadModal({
  isOpen,
  onClose,
  documents,
  assets,
  properties,
  currency = 'USD',
  initialDomainHint,
  onDocumentProcessed,
  onNavigateToTab,
  addToast,
}: GlobalUploadModalProps) {
  // Wizard Steps: 'select' -> 'processing' -> 'review' -> 'success'
  const [step, setStep] = useState<'select' | 'processing' | 'review' | 'success'>('select');

  // Selected File & Validation
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Duplicate Document Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isDuplicate: boolean;
    existingDoc: HouseholdDocument | null;
  } | null>(null);

  // User Domain Hint / Classification
  const [domainHint, setDomainHint] = useState<HouseholdEntityType | ''>(initialDomainHint || '');
  const [classifiedDomain, setClassifiedDomain] = useState<HouseholdEntityType>('transaction');

  // Processing state
  const [processingStatusText, setProcessingStatusText] = useState<string>('Analyzing document...');
  const [processedDoc, setProcessedDoc] = useState<HouseholdDocument | null>(null);

  // Extracted Data States
  // A) Financial Statement Candidates
  const [transactionCandidates, setTransactionCandidates] = useState<TransactionCandidate[]>([]);
  const [accountOverride, setAccountOverride] = useState<string>('');

  // B) Structured Entity Fields
  const [entityFields, setEntityFields] = useState<Record<string, any>>({});
  const [confidenceScore, setConfidenceScore] = useState<number>(0.9);
  const [sourceReferences, setSourceReferences] = useState<string[]>([]);
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);

  // Entity Linking State
  const [linkedAssetId, setLinkedAssetId] = useState<string>('');
  const [linkedPropertyId, setLinkedPropertyId] = useState<string>('');

  // Manual fallback flag
  const [isManualEntryMode, setIsManualEntryMode] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Success result
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    destinationTab: string;
    destinationLabel: string;
    details: string;
  } | null>(null);

  // Reset state when modal closes/opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedFile(null);
      setFileError(null);
      setDuplicateWarning(null);
      setDomainHint(initialDomainHint || '');
      setClassifiedDomain(initialDomainHint || 'transaction');
      setProcessedDoc(null);
      setTransactionCandidates([]);
      setAccountOverride('');
      setEntityFields({});
      setLinkedAssetId('');
      setLinkedPropertyId('');
      setIsManualEntryMode(false);
      setIsSubmitting(false);
      setSuccessInfo(null);
    }
  }, [isOpen, initialDomainHint]);

  if (!isOpen) return null;

  // File Validation & Duplicate Check
  const handleFileSelect = (file: File) => {
    setFileError(null);
    setDuplicateWarning(null);

    // Validate size
    if (file.size <= 0) {
      setFileError('The selected file is empty. Please choose a valid document.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`File size exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setFileError(`Unsupported file format "${ext}". Supported: PDF, CSV, JPG, PNG, XLSX, TXT.`);
      return;
    }

    setSelectedFile(file);

    // Check duplicate against existing local documents
    const match = documents.find(
      (d) =>
        d.fileName?.toLowerCase() === file.name.toLowerCase() &&
        d.fileSize &&
        Math.abs(d.fileSize - file.size) < 50
    );

    if (match) {
      setDuplicateWarning({
        isDuplicate: true,
        existingDoc: match,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Start Upload & AI Ingestion Pipeline
  const handleStartProcessing = async () => {
    if (!selectedFile) {
      setFileError('Please choose a file to upload.');
      return;
    }

    setStep('processing');
    setProcessingStatusText('Uploading document securely...');

    try {
      // 1. Upload to backend document analyzer
      setProcessingStatusText('Analyzing document with Gemini AI...');
      const uploadRes = await api.uploadDocument(
        selectedFile,
        domainHint ? mapDomainToDocumentType(domainHint) : undefined
      );

      const doc = uploadRes.document;
      setProcessedDoc(doc);

      // Determine classification
      let detectedDomain: HouseholdEntityType = 'transaction';

      if (domainHint) {
        detectedDomain = domainHint;
      } else {
        detectedDomain = inferDomainFromDocument(doc);
      }

      setClassifiedDomain(detectedDomain);

      // 2. Populate Review Data based on Domain
      if (detectedDomain === 'transaction') {
        setTransactionCandidates(doc.transactionCandidates || []);
        setAccountOverride(
          doc.extractedSummary?.accountIdentifier ||
            doc.extractedSummary?.institutionOrIssuer ||
            'Primary Account'
        );
        setConfidenceScore(0.92);
      } else {
        // Run structured entity extraction
        setProcessingStatusText(`Extracting structured ${detectedDomain} data...`);
        try {
          const entityRes = await api.extractEntityFromDoc(
            doc.id,
            detectedDomain,
            `File name: ${selectedFile.name}`
          );
          setEntityFields(entityRes.extractedFields || {});
          setConfidenceScore(entityRes.confidenceScore || 0.85);
          setSourceReferences(entityRes.sourceReferences || []);
          setExtractionWarnings(entityRes.warnings || []);
        } catch {
          // Fallback to basic fields from filename/summary
          setEntityFields(buildDefaultEntityFields(detectedDomain, selectedFile.name, doc));
          setConfidenceScore(0.7);
        }
      }

      setStep('review');
    } catch (err: any) {
      console.error('[GLOBAL_UPLOAD] Ingestion failed:', err);
      // Graceful fallback: Do not lose the upload; switch to manual review mode
      setIsManualEntryMode(true);
      setClassifiedDomain(domainHint || 'transaction');
      setEntityFields(buildDefaultEntityFields(domainHint || 'asset', selectedFile.name));
      setStep('review');
      addToast(
        'info',
        'Manual Review Mode',
        "AI could not parse all fields automatically. You can review and enter details manually."
      );
    }
  };

  // Reclassification Handler (User changes domain during review)
  const handleDomainChange = async (newDomain: HouseholdEntityType) => {
    setClassifiedDomain(newDomain);
    if (newDomain === 'transaction') {
      if (processedDoc?.transactionCandidates && processedDoc.transactionCandidates.length > 0) {
        setTransactionCandidates(processedDoc.transactionCandidates);
      } else {
        // Synthesize single transaction candidate
        setTransactionCandidates([
          {
            id: `cand_manual_${Date.now()}`,
            date: new Date().toISOString().slice(0, 10),
            description: selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'Expense / Receipt',
            amount: typeof entityFields.purchaseCost === 'number' ? entityFields.purchaseCost : 0,
            currency: currency,
            type: 'DEBIT',
            category: 'Other Expense',
            account: 'Primary Account',
            confidence: 0.8,
            isSalaryCandidate: false,
            fingerprint: `cand_fp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            selected: true,
          },
        ]);
      }
    } else if (newDomain === 'document') {
      // Document only mode
    } else {
      // Fetch or build entity fields for new domain
      if (processedDoc) {
        try {
          const res = await api.extractEntityFromDoc(processedDoc.id, newDomain);
          setEntityFields(res.extractedFields || {});
          setConfidenceScore(res.confidenceScore || 0.85);
        } catch {
          setEntityFields(buildDefaultEntityFields(newDomain, selectedFile?.name || '', processedDoc));
        }
      } else {
        setEntityFields(buildDefaultEntityFields(newDomain, selectedFile?.name || ''));
      }
    }
  };

  // Field change in structured entity form
  const handleEntityFieldChange = (field: string, val: any) => {
    setEntityFields((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  // Confirm and Save Data to Database
  const handleConfirmSave = async () => {
    setIsSubmitting(true);
    try {
      let destTab = 'documents';
      let destLabel = 'Documents Vault';
      let message = 'Document saved successfully.';
      let entityId: string | undefined;
      let confirmedTxCount = 0;

      if (classifiedDomain === 'transaction') {
        const selectedCandidates = transactionCandidates.filter((c) => c.selected);
        if (selectedCandidates.length === 0) {
          addToast('error', 'Select Transactions', 'Please select at least one transaction to import.');
          setIsSubmitting(false);
          return;
        }

        if (processedDoc?.id) {
          const confirmRes = await api.confirmImport(
            processedDoc.id,
            transactionCandidates,
            accountOverride
          );
          confirmedTxCount = confirmRes.confirmedCount || selectedCandidates.length;
        }
        destTab = 'finances';
        destLabel = 'Finances & Ledger';
        message = `Successfully imported ${confirmedTxCount} verified transaction${confirmedTxCount === 1 ? '' : 's'} into your ledger.`;
      } else if (classifiedDomain === 'document') {
        // Save document only
        await api.saveDocumentOnly({
          documentId: processedDoc?.id,
          fileName: selectedFile?.name,
          fileSize: selectedFile?.size,
          fileType: selectedFile?.type,
          documentType: 'other',
        });
        destTab = 'documents';
        destLabel = 'Documents Vault';
        message = 'Document saved securely in your household document vault.';
      } else {
        // Structured entity save
        const payloadToSave = {
          ...entityFields,
          ...(linkedAssetId ? { assetId: linkedAssetId } : {}),
          ...(linkedPropertyId ? { propertyId: linkedPropertyId } : {}),
        };

        const saveRes = await api.saveExtractedEntity(
          classifiedDomain,
          payloadToSave,
          processedDoc?.id
        );

        entityId = saveRes.entityId;

        const tabMap: Record<HouseholdEntityType, { tab: string; label: string }> = {
          asset: { tab: 'assets', label: 'Assets' },
          warranty: { tab: 'maintenance', label: 'Warranties & Maintenance' },
          maintenance: { tab: 'maintenance', label: 'Maintenance & Warranties' },
          utility: { tab: 'utilities', label: 'Utilities & Debts' },
          loan: { tab: 'utilities', label: 'Utilities & Debts' },
          credit_card: { tab: 'utilities', label: 'Utilities & Debts' },
          property: { tab: 'properties', label: 'Properties & Rooms' },
          room: { tab: 'properties', label: 'Properties & Rooms' },
          expense: { tab: 'expenses', label: 'Recurring Expenses' },
          transaction: { tab: 'finances', label: 'Finances' },
          document: { tab: 'documents', label: 'Documents' },
        };

        destTab = tabMap[classifiedDomain]?.tab || 'documents';
        destLabel = tabMap[classifiedDomain]?.label || 'Household Systems';
        message = `Successfully created ${classifiedDomain.replace('_', ' ')} record and linked to source document.`;
      }

      setSuccessInfo({
        message,
        destinationTab: destTab,
        destinationLabel: destLabel,
        details: selectedFile?.name || 'Document',
      });

      if (processedDoc) {
        onDocumentProcessed({
          document: processedDoc,
          entityType: classifiedDomain,
          entityId,
          confirmedTransactionsCount: confirmedTxCount,
          destinationTab: destTab,
        });
      }

      setStep('success');
      addToast('success', 'Intake Completed', message);
    } catch (err: any) {
      console.error('[GLOBAL_UPLOAD] Save error:', err);
      addToast('error', 'Save Failed', err.message || 'Could not persist extracted data to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load existing duplicate document for review
  const handleReviewExisting = () => {
    if (!duplicateWarning?.existingDoc) return;
    const doc = duplicateWarning.existingDoc;
    setProcessedDoc(doc);
    const domain = inferDomainFromDocument(doc);
    setClassifiedDomain(domain);
    if (domain === 'transaction') {
      setTransactionCandidates(doc.transactionCandidates || []);
      setAccountOverride(
        doc.extractedSummary?.accountIdentifier ||
          doc.extractedSummary?.institutionOrIssuer ||
          'Primary Account'
      );
    } else {
      setEntityFields(buildDefaultEntityFields(domain, doc.fileName, doc));
    }
    setStep('review');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Global Document Intake & AI Extraction
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-semibold">
                  Phase 2 Verified
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Upload receipts, invoices, statements, warranties, or utility bills for automatic classification and verified entry
              </p>
            </div>
          </div>

          <button
            id="close-global-upload-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center justify-between text-xs font-medium text-slate-500 overflow-x-auto gap-2">
          <div
            className={`flex items-center gap-2 ${
              step === 'select' ? 'text-indigo-600 font-bold' : 'text-emerald-600'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'select'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {step === 'select' ? '1' : '✓'}
            </div>
            <span>1. Select & Validate</span>
          </div>

          <div className="h-px w-6 bg-slate-200" />

          <div
            className={`flex items-center gap-2 ${
              step === 'processing'
                ? 'text-indigo-600 font-bold'
                : step === 'review' || step === 'success'
                ? 'text-emerald-600'
                : ''
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'processing'
                  ? 'bg-indigo-600 text-white'
                  : step === 'review' || step === 'success'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {step === 'review' || step === 'success' ? '✓' : '2'}
            </div>
            <span>2. AI Processing</span>
          </div>

          <div className="h-px w-6 bg-slate-200" />

          <div
            className={`flex items-center gap-2 ${
              step === 'review' ? 'text-indigo-600 font-bold' : step === 'success' ? 'text-emerald-600' : ''
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'review'
                  ? 'bg-indigo-600 text-white'
                  : step === 'success'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {step === 'success' ? '✓' : '3'}
            </div>
            <span>3. Review & Link</span>
          </div>

          <div className="h-px w-6 bg-slate-200" />

          <div
            className={`flex items-center gap-2 ${
              step === 'success' ? 'text-emerald-600 font-bold' : ''
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              4
            </div>
            <span>4. Saved</span>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ============================================================ */}
          {/* STEP 1: SELECT & VALIDATE FILE                               */}
          {/* ============================================================ */}
          {step === 'select' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Drag & Drop Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition cursor-pointer flex flex-col items-center justify-center gap-4 ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : selectedFile
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.jpg,.jpeg,.png,.xlsx,.xls,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-sm transition ${
                    selectedFile ? 'bg-emerald-600' : 'bg-indigo-600'
                  }`}
                >
                  {selectedFile ? <CheckCircle2 className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                </div>

                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-900">
                    {selectedFile ? selectedFile.name : 'Choose a document or drop it here'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready for extraction`
                      : 'Supports PDF, CSV, JPG, PNG, Excel statements, warranties, receipts, and invoices (Max 10MB)'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                  <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">
                    PDF Statements
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">
                    CSV / Excel
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">
                    JPG / PNG Receipts
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">
                    Warranty Docs
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {fileError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <p className="font-bold">Upload Error</p>
                    <p>{fileError}</p>
                  </div>
                </div>
              )}

              {/* Duplicate Document Detection Alert */}
              {duplicateWarning?.isDuplicate && duplicateWarning.existingDoc && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-amber-950">This document may already exist</p>
                      <p className="text-amber-800">
                        A document named <strong className="font-semibold">{duplicateWarning.existingDoc.fileName}</strong>{' '}
                        was already uploaded on{' '}
                        {new Date(
                          duplicateWarning.existingDoc.createdAt ||
                            (duplicateWarning.existingDoc as any).uploadedAt ||
                            Date.now()
                        ).toLocaleDateString()}
                        .
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60">
                    <button
                      type="button"
                      onClick={handleReviewExisting}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition cursor-pointer"
                    >
                      View Existing Document
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setDuplicateWarning(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition cursor-pointer"
                    >
                      Cancel Selection
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateWarning(null)}
                      className="px-3 py-1.5 rounded-xl text-amber-700 hover:text-amber-900 text-xs font-medium cursor-pointer"
                    >
                      Continue Anyway
                    </button>
                  </div>
                </div>
              )}

              {/* Destination Domain Hint (Optional Override) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Expected Document Domain (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Auto-detection will classify automatically if not set
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setDomainHint('')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                      domainHint === ''
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Auto-Detect</span>
                    </div>
                    <span className="text-[10px] text-slate-500 line-clamp-1">AI Classifier</span>
                  </button>

                  {DOMAIN_OPTIONS.slice(0, 7).map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = domainHint === opt.type;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => setDomainHint(opt.type)}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <Icon className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="truncate">{opt.label.split('/')[0]}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 line-clamp-1">{opt.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 2: PROCESSING & CLASSIFICATION ANIMATION                */}
          {/* ============================================================ */}
          {step === 'processing' && (
            <div className="py-16 text-center space-y-6 animate-in fade-in">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto animate-pulse shadow-sm">
                  <Loader2 className="w-10 h-10 animate-spin" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-slate-900">{processingStatusText}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  HouseMind uses multimodal AI intelligence to extract dates, amounts, vendors, serial numbers, and candidate transactions with strict verification defenses.
                </p>
              </div>

              <div className="w-64 mx-auto bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full animate-progress" />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 3: REVIEW, EDIT & DESTINATION LINKING                   */}
          {/* ============================================================ */}
          {step === 'review' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Classification Banner & Domain Reclassification */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-indigo-200">Classified Destination:</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold capitalize">
                        {classifiedDomain.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({Math.round(confidenceScore * 100)}% Confidence)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {selectedFile?.name || processedDoc?.fileName} • Review extracted fields below
                    </p>
                  </div>
                </div>

                {/* Switch Destination Domain */}
                <div className="flex items-center gap-2 shrink-0">
                  <label htmlFor="reclassify-domain-select" className="text-xs text-slate-300 font-medium hidden sm:inline">
                    Change:
                  </label>
                  <select
                    id="reclassify-domain-select"
                    value={classifiedDomain}
                    onChange={(e) => handleDomainChange(e.target.value as HouseholdEntityType)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                  >
                    {DOMAIN_OPTIONS.map((opt) => (
                      <option key={opt.type} value={opt.type}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Extraction Warnings or Ambiguities */}
              {extractionWarnings.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">Extraction Notice</p>
                    {extractionWarnings.map((w, idx) => (
                      <p key={idx}>{w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* REVIEW A: FINANCIAL STATEMENT CANDIDATES                 */}
              {/* -------------------------------------------------------- */}
              {classifiedDomain === 'transaction' && (
                <div className="space-y-4">
                  {/* Account Name & Bulk Select Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 flex-1 max-w-sm">
                      <label htmlFor="target-account-input" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        Account Name:
                      </label>
                      <input
                        id="target-account-input"
                        type="text"
                        value={accountOverride}
                        onChange={(e) => setAccountOverride(e.target.value)}
                        placeholder="e.g. Chase Sapphire (*9921)"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setTransactionCandidates((prev) => prev.map((c) => ({ ...c, selected: true })))
                        }
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 font-semibold hover:bg-slate-200/60 rounded-lg cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() =>
                          setTransactionCandidates((prev) => prev.map((c) => ({ ...c, selected: false })))
                        }
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 font-semibold hover:bg-slate-200/60 rounded-lg cursor-pointer"
                      >
                        Deselect All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTransactionCandidates((prev) => [
                            {
                              id: `cand_manual_${Date.now()}`,
                              date: new Date().toISOString().slice(0, 10),
                              description: 'New Transaction Row',
                              amount: 0,
                              currency: currency,
                              type: 'DEBIT',
                              category: 'Other Expense',
                              account: accountOverride || 'Primary Account',
                              confidence: 1.0,
                              isSalaryCandidate: false,
                              fingerprint: `cand_fp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                              selected: true,
                            },
                            ...prev,
                          ]);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-indigo-700 hover:bg-indigo-100 font-semibold rounded-lg cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Row</span>
                      </button>
                    </div>
                  </div>

                  {/* Transaction Candidates Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 font-semibold text-slate-700 z-10">
                        <tr>
                          <th className="p-3 w-10 text-center">Inc</th>
                          <th className="p-3 w-28">Date</th>
                          <th className="p-3">Description / Merchant</th>
                          <th className="p-3 w-36">Category</th>
                          <th className="p-3 w-24">Type</th>
                          <th className="p-3 w-28 text-right">Amount ({currency})</th>
                          <th className="p-3 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactionCandidates.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500">
                              No candidate rows detected. Click &quot;Add Row&quot; above to enter transactions manually.
                            </td>
                          </tr>
                        ) : (
                          transactionCandidates.map((cand) => (
                            <tr
                              key={cand.id}
                              className={`hover:bg-slate-50/80 transition ${
                                !cand.selected ? 'opacity-40 bg-slate-50/40' : ''
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={cand.selected}
                                  onChange={() => {
                                    setTransactionCandidates((prev) =>
                                      prev.map((c) => (c.id === cand.id ? { ...c, selected: !c.selected } : c))
                                    );
                                  }}
                                  className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="date"
                                  value={cand.date}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTransactionCandidates((prev) =>
                                      prev.map((c) => (c.id === cand.id ? { ...c, date: val } : c))
                                    );
                                  }}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                                />
                              </td>
                              <td className="p-3">
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={cand.description}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTransactionCandidates((prev) =>
                                        prev.map((c) => (c.id === cand.id ? { ...c, description: val } : c))
                                      );
                                    }}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                                  />
                                  {cand.isDuplicate && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold border border-amber-200">
                                      <AlertTriangle className="w-2.5 h-2.5" /> Likely Duplicate in Ledger
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <select
                                  value={cand.category}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTransactionCandidates((prev) =>
                                      prev.map((c) => (c.id === cand.id ? { ...c, category: val } : c))
                                    );
                                  }}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                                >
                                  {FINANCIAL_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-3">
                                <select
                                  value={cand.type}
                                  onChange={(e) => {
                                    const val = e.target.value as any;
                                    setTransactionCandidates((prev) =>
                                      prev.map((c) => (c.id === cand.id ? { ...c, type: val } : c))
                                    );
                                  }}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                                >
                                  <option value="DEBIT">DEBIT</option>
                                  <option value="CREDIT">CREDIT</option>
                                  <option value="TRANSFER">TRANSFER</option>
                                </select>
                              </td>
                              <td className="p-3 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={cand.amount}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setTransactionCandidates((prev) =>
                                      prev.map((c) => (c.id === cand.id ? { ...c, amount: val } : c))
                                    );
                                  }}
                                  className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-right font-bold"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTransactionCandidates((prev) => prev.filter((c) => c.id !== cand.id));
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition cursor-pointer"
                                  title="Delete Row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* REVIEW B: STRUCTURED HOUSEHOLD ENTITY FORM               */}
              {/* -------------------------------------------------------- */}
              {classifiedDomain !== 'transaction' && classifiedDomain !== 'document' && (
                <div className="space-y-5">
                  {/* Smart Entity Linking Section */}
                  {(classifiedDomain === 'warranty' || classifiedDomain === 'maintenance') && (
                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                        <Wrench className="w-4 h-4 text-indigo-600" />
                        <span>Link to Existing Household Asset:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <select
                            value={linkedAssetId}
                            onChange={(e) => setLinkedAssetId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                          >
                            <option value="">-- Standalone (No asset link) --</option>
                            {assets.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.category.replace('_', ' ')})
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            Associates this {classifiedDomain} directly to your appliance/equipment
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Smart Property Linking Section */}
                  {(classifiedDomain === 'utility' ||
                    classifiedDomain === 'loan' ||
                    classifiedDomain === 'property') &&
                    properties.length > 0 && (
                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                        <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                          <Home className="w-4 h-4 text-amber-600" />
                          <span>Link to Property:</span>
                        </div>
                        <div className="max-w-md">
                          <select
                            value={linkedPropertyId}
                            onChange={(e) => setLinkedPropertyId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                          >
                            <option value="">-- Select Property --</option>
                            {properties.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.propertyType.replace('_', ' ')})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                  {/* Dynamic Entity Field Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* ASSET FIELDS */}
                    {classifiedDomain === 'asset' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Asset Name *</label>
                          <input
                            type="text"
                            value={entityFields.name || ''}
                            onChange={(e) => handleEntityFieldChange('name', e.target.value)}
                            placeholder="e.g. Trane XV20i Heat Pump"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Category</label>
                          <select
                            value={entityFields.category || 'major_appliance'}
                            onChange={(e) => handleEntityFieldChange('category', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          >
                            <option value="major_appliance">Major Appliance</option>
                            <option value="hvac">HVAC & Heating</option>
                            <option value="plumbing">Plumbing & Water</option>
                            <option value="kitchen">Kitchen Equipment</option>
                            <option value="laundry">Laundry</option>
                            <option value="electronics">Electronics</option>
                            <option value="vehicle">Vehicle</option>
                            <option value="electrical">Electrical & Solar</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Brand / Manufacturer</label>
                          <input
                            type="text"
                            value={entityFields.brand || ''}
                            onChange={(e) => handleEntityFieldChange('brand', e.target.value)}
                            placeholder="e.g. Samsung, LG, Trane"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Model Number</label>
                          <input
                            type="text"
                            value={entityFields.modelNumber || ''}
                            onChange={(e) => handleEntityFieldChange('modelNumber', e.target.value)}
                            placeholder="e.g. RF28T5001SR"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Serial Number</label>
                          <input
                            type="text"
                            value={entityFields.serialNumber || ''}
                            onChange={(e) => handleEntityFieldChange('serialNumber', e.target.value)}
                            placeholder="e.g. SN-8829410A"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Purchase / Install Date</label>
                          <input
                            type="date"
                            value={entityFields.installDate || entityFields.purchaseDate || ''}
                            onChange={(e) => handleEntityFieldChange('installDate', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Purchase Cost ({currency})</label>
                          <input
                            type="number"
                            step="0.01"
                            value={entityFields.purchaseCost ?? ''}
                            onChange={(e) =>
                              handleEntityFieldChange('purchaseCost', parseFloat(e.target.value) || 0)
                            }
                            placeholder="0.00"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Expected Lifespan (Years)</label>
                          <input
                            type="number"
                            value={entityFields.expectedLifespanYears || 10}
                            onChange={(e) =>
                              handleEntityFieldChange('expectedLifespanYears', parseInt(e.target.value) || 10)
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                      </>
                    )}

                    {/* WARRANTY FIELDS */}
                    {classifiedDomain === 'warranty' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Warranty Provider *</label>
                          <input
                            type="text"
                            value={entityFields.warrantyProvider || entityFields.providerName || ''}
                            onChange={(e) => handleEntityFieldChange('warrantyProvider', e.target.value)}
                            placeholder="e.g. AppleCare+, Asurion, LG Care"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Policy / Serial Number</label>
                          <input
                            type="text"
                            value={entityFields.policyNumber || ''}
                            onChange={(e) => handleEntityFieldChange('policyNumber', e.target.value)}
                            placeholder="e.g. POL-8921-X9"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Start Date</label>
                          <input
                            type="date"
                            value={entityFields.startDate || ''}
                            onChange={(e) => handleEntityFieldChange('startDate', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Expiry Date *</label>
                          <input
                            type="date"
                            value={entityFields.endDate || entityFields.expiryDate || ''}
                            onChange={(e) => handleEntityFieldChange('endDate', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-emerald-800"
                          />
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-xs font-bold text-slate-700">Coverage Details</label>
                          <textarea
                            rows={2}
                            value={entityFields.coverageNotes || entityFields.coverageDetails || ''}
                            onChange={(e) => handleEntityFieldChange('coverageNotes', e.target.value)}
                            placeholder="e.g. Covers parts and labor for 5 years, accidental damage."
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                      </>
                    )}

                    {/* MAINTENANCE FIELDS */}
                    {classifiedDomain === 'maintenance' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Task Title *</label>
                          <input
                            type="text"
                            value={entityFields.title || ''}
                            onChange={(e) => handleEntityFieldChange('title', e.target.value)}
                            placeholder="e.g. HVAC Annual Tune-Up"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Service Date</label>
                          <input
                            type="date"
                            value={entityFields.serviceDate || ''}
                            onChange={(e) => handleEntityFieldChange('serviceDate', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Next Service Date</label>
                          <input
                            type="date"
                            value={entityFields.nextServiceDate || ''}
                            onChange={(e) => handleEntityFieldChange('nextServiceDate', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Service Cost ({currency})</label>
                          <input
                            type="number"
                            step="0.01"
                            value={entityFields.cost || entityFields.actualCost || ''}
                            onChange={(e) =>
                              handleEntityFieldChange('cost', parseFloat(e.target.value) || 0)
                            }
                            placeholder="0.00"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Service Provider / Contractor</label>
                          <input
                            type="text"
                            value={entityFields.serviceProvider || entityFields.serviceProviderName || ''}
                            onChange={(e) => handleEntityFieldChange('serviceProvider', e.target.value)}
                            placeholder="e.g. Apex Mechanical Services"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Contact Phone</label>
                          <input
                            type="text"
                            value={entityFields.contactPhone || ''}
                            onChange={(e) => handleEntityFieldChange('contactPhone', e.target.value)}
                            placeholder="e.g. (555) 234-5678"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                      </>
                    )}

                    {/* UTILITY FIELDS */}
                    {classifiedDomain === 'utility' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Utility Name *</label>
                          <input
                            type="text"
                            value={entityFields.name || ''}
                            onChange={(e) => handleEntityFieldChange('name', e.target.value)}
                            placeholder="e.g. City Electric & Power"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Service Type</label>
                          <select
                            value={entityFields.serviceType || entityFields.utilityType || 'electricity'}
                            onChange={(e) => handleEntityFieldChange('serviceType', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          >
                            <option value="electricity">Electricity</option>
                            <option value="water">Water & Sewer</option>
                            <option value="gas">Natural Gas</option>
                            <option value="internet">Internet / Broadband</option>
                            <option value="trash">Trash & Recycling</option>
                            <option value="solar">Solar Energy</option>
                            <option value="heating">Heating Fuel</option>
                            <option value="hoa">HOA Fee</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Provider Name</label>
                          <input
                            type="text"
                            value={entityFields.provider || entityFields.providerName || ''}
                            onChange={(e) => handleEntityFieldChange('provider', e.target.value)}
                            placeholder="e.g. Pacific Gas & Electric"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Account / Meter #</label>
                          <input
                            type="text"
                            value={entityFields.accountIdentifier || entityFields.accountNumber || ''}
                            onChange={(e) => handleEntityFieldChange('accountIdentifier', e.target.value)}
                            placeholder="e.g. ACC-4921-99"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Typical Monthly Cost ({currency})</label>
                          <input
                            type="number"
                            step="0.01"
                            value={entityFields.typicalAmount || entityFields.typicalMonthlyCost || ''}
                            onChange={(e) =>
                              handleEntityFieldChange('typicalAmount', parseFloat(e.target.value) || 0)
                            }
                            placeholder="0.00"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Monthly Due Day (1-31)</label>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={entityFields.dueDateDay || entityFields.paymentDueDay || 15}
                            onChange={(e) =>
                              handleEntityFieldChange('dueDateDay', parseInt(e.target.value) || 15)
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                      </>
                    )}

                    {/* LOAN & MORTGAGE FIELDS */}
                    {classifiedDomain === 'loan' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Loan Name *</label>
                          <input
                            type="text"
                            value={entityFields.loanName || entityFields.name || ''}
                            onChange={(e) => handleEntityFieldChange('loanName', e.target.value)}
                            placeholder="e.g. Primary Residential Mortgage"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Lender / Bank</label>
                          <input
                            type="text"
                            value={entityFields.lender || entityFields.lenderName || ''}
                            onChange={(e) => handleEntityFieldChange('lender', e.target.value)}
                            placeholder="e.g. Wells Fargo Home Mortgage"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Outstanding Balance ({currency})</label>
                          <input
                            type="number"
                            step="0.01"
                            value={entityFields.outstandingAmount || entityFields.currentBalance || ''}
                            onChange={(e) =>
                              handleEntityFieldChange('outstandingAmount', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-rose-700"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Monthly EMI Payment ({currency})</label>
                          <input
                            type="number"
                            step="0.01"
                            value={entityFields.emiAmount || entityFields.monthlyPayment || ''}
                            onChange={(e) =>
                              handleEntityFieldChange('emiAmount', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Interest Rate (% APR)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={entityFields.interestRate || entityFields.interestRatePercent || ''}
                            onChange={(e) =>
                              handleEntityFieldChange('interestRate', parseFloat(e.target.value) || 0)
                            }
                            placeholder="e.g. 5.75"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Payment Due Day (1-31)</label>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={entityFields.paymentDueDay || 1}
                            onChange={(e) =>
                              handleEntityFieldChange('paymentDueDay', parseInt(e.target.value) || 1)
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                      </>
                    )}

                    {/* PROPERTY FIELDS */}
                    {classifiedDomain === 'property' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Property Name *</label>
                          <input
                            type="text"
                            value={entityFields.name || ''}
                            onChange={(e) => handleEntityFieldChange('name', e.target.value)}
                            placeholder="e.g. Maplewood Haven"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Property Type</label>
                          <select
                            value={entityFields.propertyType || 'primary_home'}
                            onChange={(e) => handleEntityFieldChange('propertyType', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          >
                            <option value="primary_home">Primary Home</option>
                            <option value="rental_property">Rental Property</option>
                            <option value="vacation_home">Vacation Home</option>
                            <option value="plot_land">Plot / Land</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Purchase / Estimated Value ({currency})</label>
                          <input
                            type="number"
                            step="100"
                            value={entityFields.purchaseValue || entityFields.currentEstimatedValue || ''}
                            onChange={(e) =>
                              handleEntityFieldChange('purchaseValue', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Year Built</label>
                          <input
                            type="number"
                            value={entityFields.yearBuilt || 2018}
                            onChange={(e) =>
                              handleEntityFieldChange('yearBuilt', parseInt(e.target.value) || 2018)
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* REVIEW C: DOCUMENT ONLY VAULT MODE                       */}
              {/* -------------------------------------------------------- */}
              {classifiedDomain === 'document' && (
                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">Document Vault Storage</p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      This file will be securely stored and indexed in your household document vault for easy retrieval and AI Copilot reference.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 4: SUCCESS CONFIRMATION                                 */}
          {/* ============================================================ */}
          {step === 'success' && successInfo && (
            <div className="py-12 text-center space-y-6 animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-bold text-slate-900">Document Intake Complete</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{successInfo.message}</p>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 inline-block font-mono">
                  {successInfo.details}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToTab(successInfo.destinationTab);
                      onClose();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <span>View in {successInfo.destinationLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStep('select');
                    setSelectedFile(null);
                    setDuplicateWarning(null);
                  }}
                  className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition cursor-pointer"
                >
                  Upload Another Document
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div>
            {step === 'review' && (
              <button
                type="button"
                onClick={() => setStep('select')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ← Back to File Selection
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step !== 'success' && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            )}

            {step === 'select' && (
              <button
                id="start-document-intake-btn"
                type="button"
                disabled={!selectedFile}
                onClick={handleStartProcessing}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analyze & Extract</span>
              </button>
            )}

            {step === 'review' && (
              <button
                id="confirm-global-intake-btn"
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSave}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to Household...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Save to HouseMind</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Helper Utilities for Mapping and Fallback Field Generation
// ------------------------------------------------------------

function mapDomainToDocumentType(domain: HouseholdEntityType): string {
  switch (domain) {
    case 'transaction':
      return 'bank_statement';
    case 'asset':
      return 'invoice_receipt';
    case 'warranty':
      return 'warranty_doc';
    case 'maintenance':
      return 'invoice_receipt';
    case 'utility':
      return 'utility_bill';
    case 'loan':
      return 'bank_statement';
    case 'property':
      return 'other';
    default:
      return 'other';
  }
}

function inferDomainFromDocument(doc: HouseholdDocument): HouseholdEntityType {
  const t = doc.documentType || '';
  const fn = (doc.fileName || '').toLowerCase();

  if (fn.includes('warranty') || fn.includes('applecare') || t === 'warranty_doc') {
    return 'warranty';
  }
  if (fn.includes('utility') || fn.includes('electric') || fn.includes('water') || fn.includes('power') || t === 'utility_bill') {
    return 'utility';
  }
  if (fn.includes('mortgage') || fn.includes('loan') || fn.includes('emi')) {
    return 'loan';
  }
  if (fn.includes('service') || fn.includes('repair') || fn.includes('maintenance')) {
    return 'maintenance';
  }
  if (fn.includes('appliance') || fn.includes('invoice') || fn.includes('receipt') || t === 'invoice_receipt') {
    return 'asset';
  }
  if (fn.includes('deed') || fn.includes('title') || fn.includes('property')) {
    return 'property';
  }
  if (
    doc.transactionCandidates &&
    doc.transactionCandidates.length > 0 &&
    (t === 'bank_statement' || t === 'credit_card_statement' || t === 'salary_slip')
  ) {
    return 'transaction';
  }
  return 'transaction';
}

function buildDefaultEntityFields(
  type: HouseholdEntityType,
  fileName: string,
  doc?: HouseholdDocument | null
): Record<string, any> {
  const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  const today = new Date().toISOString().slice(0, 10);
  const sumAmount = doc?.extractedSummary?.netAmount || doc?.extractedSummary?.grossSalary || 0;

  switch (type) {
    case 'asset':
      return {
        name: cleanName || 'Household Asset',
        category: 'major_appliance',
        brand: '',
        modelNumber: '',
        serialNumber: '',
        installDate: today,
        purchaseCost: sumAmount || 1200,
        expectedLifespanYears: 10,
      };
    case 'warranty':
      return {
        warrantyProvider: cleanName || 'Warranty Provider',
        policyNumber: '',
        startDate: today,
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2).toISOString().slice(0, 10),
        coverageNotes: 'Manufacturer warranty coverage.',
      };
    case 'maintenance':
      return {
        title: cleanName || 'Routine Maintenance',
        serviceDate: today,
        nextServiceDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        cost: sumAmount || 150,
        serviceProvider: '',
      };
    case 'utility':
      return {
        name: cleanName || 'Utility Account',
        serviceType: 'electricity',
        provider: '',
        accountIdentifier: '',
        typicalAmount: sumAmount || 120,
        dueDateDay: 15,
      };
    case 'loan':
      return {
        loanName: cleanName || 'Home Mortgage',
        lender: '',
        principalAmount: 300000,
        outstandingAmount: 285000,
        interestRate: 6.25,
        emiAmount: 1850,
        paymentDueDay: 1,
      };
    case 'property':
      return {
        name: cleanName || 'Primary Home',
        propertyType: 'primary_home',
        purchaseValue: 450000,
        yearBuilt: 2018,
      };
    default:
      return {};
  }
}
