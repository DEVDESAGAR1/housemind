import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  Calendar,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  HelpCircle,
  Briefcase,
  Layers,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import {
  HouseholdDocument,
  TransactionCandidate,
  TransactionType,
} from '../types';

interface DocumentReviewModalProps {
  document: HouseholdDocument;
  currency: string;
  token: string;
  onClose: () => void;
  onSuccess: (confirmedCount: number) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const FINANCIAL_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Interest',
  'Dividend',
  'Refund',
  'Other Income',
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
];

export const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  document,
  currency,
  token,
  onClose,
  onSuccess,
  onShowToast,
}) => {
  const [candidates, setCandidates] = useState<TransactionCandidate[]>(
    document.transactionCandidates || []
  );
  const [accountOverride, setAccountOverride] = useState(
    document.extractedSummary?.accountIdentifier ||
      document.extractedSummary?.institutionOrIssuer ||
      'Primary Account'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  // Select all or deselect all
  const handleToggleAll = (select: boolean) => {
    setCandidates((prev) => prev.map((c) => ({ ...c, selected: select })));
  };

  // Field change handler
  const handleFieldChange = (
    id: string,
    field: keyof TransactionCandidate,
    val: any
  ) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, [field]: val };
          if (field === 'type' && val === 'CREDIT' && updated.category === 'Food') {
            updated.category = 'Salary';
          }
          return updated;
        }
        return c;
      })
    );
  };

  const selectedCount = candidates.filter((c) => c.selected).length;

  const handleConfirmImport = async () => {
    if (selectedCount === 0) {
      onShowToast('Please select at least one transaction to import.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/imports/${document.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          candidates,
          accountOverride: accountOverride.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to confirm import');
      }

      onShowToast(
        `Successfully imported ${data.confirmedCount} transactions into your ledger!`,
        'success'
      );
      onSuccess(data.confirmedCount);
    } catch (err: any) {
      console.error('Error confirming import:', err);
      onShowToast(err.message || 'Import failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectImport = async () => {
    try {
      setIsRejecting(true);
      const res = await fetch(`/api/imports/${document.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Rejected during user verification review' }),
      });

      if (!res.ok) {
        throw new Error('Failed to reject import');
      }

      onShowToast('Document import rejected. No records were created.', 'info');
      onSuccess(0);
    } catch (err: any) {
      console.error('Error rejecting import:', err);
      onShowToast(err.message || 'Failed to reject import', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  const summary = document.extractedSummary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-8 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Review & Confirm Document Import
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              File: <span className="font-semibold text-slate-700">{document.fileName}</span>{' '}
              ({(document.fileSize / 1024).toFixed(1)} KB) • Verify and edit AI-extracted records before saving.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Extracted Metadata Summary Banner */}
        {summary && (
          <div className="bg-slate-50/80 p-4 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {summary.institutionOrIssuer && (
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Institution / Issuer
                </span>
                <div className="font-bold text-slate-800 mt-0.5">
                  {summary.institutionOrIssuer}
                </div>
              </div>
            )}

            {summary.accountIdentifier && (
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Account / Card ID
                </span>
                <div className="font-bold text-slate-800 mt-0.5">
                  {summary.accountIdentifier}
                </div>
              </div>
            )}

            {summary.employerName && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase">
                  Employer
                </span>
                <div className="font-bold text-emerald-900 mt-0.5">
                  {summary.employerName}
                </div>
              </div>
            )}

            {summary.netSalary !== undefined && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase">
                  Net Salary Extracted
                </span>
                <div className="font-bold text-emerald-900 mt-0.5">
                  {currency} {Number(summary.netSalary).toLocaleString()}
                </div>
              </div>
            )}

            {summary.billingProvider && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/80">
                <span className="text-[11px] font-semibold text-amber-700 uppercase">
                  Billing Provider
                </span>
                <div className="font-bold text-amber-900 mt-0.5">
                  {summary.billingProvider}
                </div>
              </div>
            )}

            {summary.dueDate && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/80">
                <span className="text-[11px] font-semibold text-amber-700 uppercase">
                  Due Date
                </span>
                <div className="font-bold text-amber-900 mt-0.5 font-mono">
                  {summary.dueDate}
                </div>
              </div>
            )}

            {summary.totalCredits !== undefined && summary.totalCredits !== null && (
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Total Statement Credits
                </span>
                <div className="font-bold text-emerald-700 mt-0.5">
                  +{currency} {Number(summary.totalCredits).toLocaleString()}
                </div>
              </div>
            )}

            {summary.totalDebits !== undefined && summary.totalDebits !== null && (
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Total Statement Debits
                </span>
                <div className="font-bold text-rose-700 mt-0.5">
                  -{currency} {Number(summary.totalDebits).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Account Override & Batch Actions Bar */}
        <div className="px-6 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">
              Assign to Account:
            </span>
            <input
              type="text"
              value={accountOverride}
              onChange={(e) => setAccountOverride(e.target.value)}
              placeholder="Account Name"
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 w-48 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleAll(true)}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-medium px-2 py-1 rounded hover:bg-emerald-50"
            >
              Select All ({candidates.length})
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => handleToggleAll(false)}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-1 rounded hover:bg-slate-100"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Candidate Transactions Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {candidates.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No individual transaction entries were found in this document.
            </div>
          ) : (
            candidates.map((c) => (
              <div
                key={c.id}
                className={`p-4 rounded-xl border transition ${
                  c.selected
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-slate-200 bg-slate-50/50 opacity-60'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Selection Checkbox & Description */}
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={c.selected}
                      onChange={() => handleToggleSelect(c.id)}
                      className="w-4 h-4 mt-1 rounded text-emerald-600 focus:ring-emerald-500"
                    />

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          value={c.description}
                          onChange={(e) =>
                            handleFieldChange(c.id, 'description', e.target.value)
                          }
                          className="font-semibold text-xs text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 focus:outline-none px-1 py-0.5 flex-1 min-w-[200px]"
                        />

                        {/* AI Confidence badge */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Sparkles className="w-3 h-3" />
                          {Math.round(c.confidence * 100)}% AI Conf.
                        </span>

                        {/* Duplicate Alert */}
                        {c.isDuplicate && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Already imported
                          </span>
                        )}

                        {/* Salary Candidate Badge */}
                        {c.isSalaryCandidate && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            Possible Salary Income
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500">
                        {c.reference && <span>Ref: {c.reference}</span>}
                        {c.merchant && <span>Merchant: {c.merchant}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Inline Editors: Date, Type, Category, Amount */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Date */}
                    <input
                      type="date"
                      value={c.date}
                      onChange={(e) => handleFieldChange(c.id, 'date', e.target.value)}
                      className="text-xs px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                    />

                    {/* Type Selector */}
                    <select
                      value={c.type}
                      onChange={(e) =>
                        handleFieldChange(c.id, 'type', e.target.value as TransactionType)
                      }
                      className={`text-xs font-bold px-2 py-1.5 rounded-lg border focus:outline-none ${
                        c.type === 'CREDIT'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : c.type === 'DEBIT'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}
                    >
                      <option value="DEBIT">DEBIT (Withdrawal)</option>
                      <option value="CREDIT">CREDIT (Deposit)</option>
                      <option value="TRANSFER">TRANSFER (Movement)</option>
                    </select>

                    {/* Category Selector */}
                    <select
                      value={c.category}
                      onChange={(e) =>
                        handleFieldChange(c.id, 'category', e.target.value)
                      }
                      className="text-xs px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 max-w-[130px]"
                    >
                      {FINANCIAL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    {/* Amount */}
                    <div className="relative w-28">
                      <input
                        type="number"
                        step="0.01"
                        value={c.amount}
                        onChange={(e) =>
                          handleFieldChange(c.id, 'amount', Number(e.target.value))
                        }
                        className={`w-full text-xs font-mono font-bold px-2 py-1.5 rounded-lg border focus:outline-none text-right ${
                          c.type === 'CREDIT'
                            ? 'text-emerald-700 border-emerald-300 bg-emerald-50/30'
                            : c.type === 'DEBIT'
                            ? 'text-rose-700 border-rose-300 bg-rose-50/30'
                            : 'text-indigo-700 border-indigo-300 bg-indigo-50/30'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleRejectImport}
            disabled={isRejecting || isSubmitting}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-lg hover:bg-rose-50 transition"
          >
            {isRejecting ? 'Rejecting...' : 'Reject Document & Discard'}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/70"
            >
              Close
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={isSubmitting || selectedCount === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting
                ? 'Persisting to Ledger...'
                : `Confirm & Import (${selectedCount} Records)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
