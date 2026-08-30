import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Receipt,
  Building,
  RefreshCw,
} from 'lucide-react';
import { HouseholdDocument, DocumentType, HouseholdProfile } from '../types';
import { DocumentReviewModal } from './DocumentReviewModal';

interface DocumentManagerViewProps {
  token: string;
  profile: HouseholdProfile | null;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DocumentManagerView: React.FC<DocumentManagerViewProps> = ({
  token,
  profile,
  onShowToast,
}) => {
  const [documents, setDocuments] = useState<HouseholdDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | 'auto'>('auto');
  const [reviewingDocument, setReviewingDocument] = useState<HouseholdDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currency = profile?.currency || 'USD';

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      onShowToast('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDocuments();
    }
  }, [token]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      onShowToast('File exceeds maximum size of 10MB', 'error');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      if (selectedDocType !== 'auto') {
        formData.append('documentType', selectedDocType);
      }

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to extract document');
      }

      onShowToast(
        `Document analyzed! Extracted ${data.candidatesCount} candidate transactions.`,
        'success'
      );
      await loadDocuments();

      // Automatically open review modal for newly uploaded document
      if (data.document) {
        setReviewingDocument(data.document);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      onShowToast(
        err.message ||
          "We couldn't read this statement. Please check that the file is not corrupted and try again.",
        'error'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete document');
      onShowToast('Document record deleted', 'info');
      await loadDocuments();
    } catch (err: any) {
      console.error('Delete error:', err);
      onShowToast(err.message || 'Failed to delete document', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Financial & Household Document Intelligence
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Import and analyze PDF bank statements, CSV ledgers, salary slips, and utility bills with AI-assisted candidate review.
        </p>
      </div>

      {/* Upload Drop Zone Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Upload className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-800">
              Secure Document Ingestion Pipeline
            </h2>
          </div>

          {/* Document Type Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Document Type:</span>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="auto">Auto-Detect Format</option>
              <option value="bank_statement">Bank Account Statement</option>
              <option value="credit_card_statement">Credit Card Statement</option>
              <option value="salary_slip">Salary Slip / Payslip</option>
              <option value="utility_bill">Electricity / Water / Internet Bill</option>
              <option value="invoice_receipt">Invoice / Appliance Receipt</option>
              <option value="warranty_doc">Warranty Document</option>
            </select>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50/50'
              : isUploading
              ? 'border-indigo-400 bg-indigo-50/30 cursor-wait'
              : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv,.txt,image/png,image/jpeg,image/webp,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
            {isUploading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">
              {isUploading
                ? 'Analyzing document structure & extracting candidates...'
                : 'Click to upload or drag & drop bank statements or receipts'}
            </p>
            <p className="text-xs text-slate-500">
              Supported formats: <span className="font-semibold">PDF, CSV, Images (PNG, JPG), Excel</span> (Max 10MB).
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Prompt injection protected
            </span>
            <span>•</span>
            <span>Duplicate collision prevention</span>
            <span>•</span>
            <span>Zero auto-commit without review</span>
          </div>
        </div>
      </div>

      {/* Document History & Review Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Document Repository & Review Queue
          </h2>
          <button
            onClick={loadDocuments}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
            Loading document repository...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
            No documents uploaded yet. Upload a statement above to begin financial extraction.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setReviewingDocument(doc)}
                className="p-5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  {/* Status & Type Pills */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {doc.documentType.replace('_', ' ')}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        doc.status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : doc.status === 'pending_review'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {doc.status === 'confirmed' && <CheckCircle2 className="w-3 h-3" />}
                      {doc.status === 'pending_review' && <Clock className="w-3 h-3" />}
                      {doc.status === 'rejected' && <AlertTriangle className="w-3 h-3" />}
                      {doc.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Title & Metadata */}
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {doc.fileName}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Uploaded on {doc.createdAt ? doc.createdAt.split('T')[0] : 'N/A'} • {(doc.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  {/* Extracted preview */}
                  {doc.extractedSummary && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                      {doc.extractedSummary.institutionOrIssuer && (
                        <div className="text-slate-700 font-medium truncate">
                          Issuer: {doc.extractedSummary.institutionOrIssuer}
                        </div>
                      )}
                      {doc.extractedSummary.employerName && (
                        <div className="text-emerald-700 font-medium truncate">
                          Employer: {doc.extractedSummary.employerName}
                        </div>
                      )}
                      {doc.extractedSummary.billingProvider && (
                        <div className="text-amber-800 font-medium truncate">
                          Provider: {doc.extractedSummary.billingProvider}
                        </div>
                      )}
                      <div className="text-slate-500 text-[11px]">
                        Candidates: {doc.transactionCandidates?.length || 0} entries
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    {doc.status === 'pending_review' ? 'Review & Confirm' : 'View Extracted Data'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                  <button
                    onClick={(e) => handleDeleteDocument(doc.id, e)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewingDocument && (
        <DocumentReviewModal
          document={reviewingDocument}
          currency={currency}
          token={token}
          onClose={() => setReviewingDocument(null)}
          onSuccess={async () => {
            setReviewingDocument(null);
            await loadDocuments();
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
