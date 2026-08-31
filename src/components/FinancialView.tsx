import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  CreditCard,
  Building2,
  Calendar,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  Edit2,
  X,
  Wallet,
  PieChart,
} from 'lucide-react';
import {
  FinancialTransaction,
  FinancialSummary,
  TransactionType,
  FinancialCategory,
  HouseholdProfile,
} from '../types';
import { formatCurrency, getCurrencySymbol } from '../config/locationCurrencyConfig';

interface FinancialViewProps {
  token: string;
  profile: HouseholdProfile | null;
  onNavigateToDocuments: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const FINANCIAL_CATEGORIES = {
  INCOME: ['Salary', 'Freelance', 'Business', 'Interest', 'Dividend', 'Refund', 'Other Income'],
  EXPENSE: [
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
  ],
  TRANSFER: ['Transfer In', 'Transfer Out'],
};

export const FinancialView: React.FC<FinancialViewProps> = ({
  token,
  profile,
  onNavigateToDocuments,
  onShowToast,
}) => {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | TransactionType>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formType, setFormType] = useState<TransactionType>('DEBIT');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formMerchant, setFormMerchant] = useState('');
  const [formCategory, setFormCategory] = useState('Food');
  const [formAccount, setFormAccount] = useState('Main Checking');
  const [formReference, setFormReference] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsSalary, setFormIsSalary] = useState(false);

  const currency = profile?.currency || 'USD';

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const [txRes, sumRes] = await Promise.all([
        fetch('/api/transactions', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/transactions/summary?currency=${currency}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
      }
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData.summary || null);
      }
    } catch (err) {
      console.error('Error loading financial data:', err);
      onShowToast('Failed to load financial records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadFinancialData();
    }
  }, [token, currency]);

  // Unique accounts for filter dropdown
  const uniqueAccounts = useMemo(() => {
    const accs = new Set<string>();
    transactions.forEach((t) => {
      if (t.account) accs.add(t.account);
    });
    return Array.from(accs);
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedType !== 'ALL' && t.type !== selectedType) return false;
      if (selectedCategory !== 'ALL' && t.category !== selectedCategory) return false;
      if (selectedAccount !== 'ALL' && t.account !== selectedAccount) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = t.description.toLowerCase().includes(term);
        const matchesMerchant = t.merchant && t.merchant.toLowerCase().includes(term);
        const matchesCat = t.category.toLowerCase().includes(term);
        const matchesAcc = t.account && t.account.toLowerCase().includes(term);
        const matchesRef = t.reference && t.reference.toLowerCase().includes(term);
        if (!matchesDesc && !matchesMerchant && !matchesCat && !matchesAcc && !matchesRef) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, selectedType, selectedCategory, selectedAccount, searchTerm]);

  const openAddModal = (tx?: FinancialTransaction) => {
    if (tx) {
      setEditingTransaction(tx);
      setFormType(tx.type);
      setFormAmount(String(tx.amount));
      setFormDate(tx.date);
      setFormDescription(tx.description);
      setFormMerchant(tx.merchant || '');
      setFormCategory(tx.category);
      setFormAccount(tx.account || 'Main Checking');
      setFormReference(tx.reference || '');
      setFormNotes(tx.notes || '');
      setFormIsSalary(Boolean(tx.isSalary));
    } else {
      setEditingTransaction(null);
      setFormType('DEBIT');
      setFormAmount('');
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormDescription('');
      setFormMerchant('');
      setFormCategory('Food');
      setFormAccount('Main Checking');
      setFormReference('');
      setFormNotes('');
      setFormIsSalary(false);
    }
    setIsAddModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0 || !formDescription.trim()) {
      onShowToast('Please provide a valid positive amount and description', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        type: formType,
        amount: Number(formAmount),
        currency,
        date: formDate,
        description: formDescription.trim(),
        merchant: formMerchant.trim() || null,
        category: formCategory,
        account: formAccount.trim() || 'Main Checking',
        reference: formReference.trim() || null,
        notes: formNotes.trim() || null,
        isSalary: formType === 'CREDIT' ? formIsSalary : false,
      };

      const url = editingTransaction
        ? `/api/transactions/${editingTransaction.id}`
        : '/api/transactions';
      const method = editingTransaction ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save transaction');
      }

      onShowToast(
        editingTransaction ? 'Transaction updated' : 'Transaction recorded successfully',
        'success'
      );
      setIsAddModalOpen(false);
      await loadFinancialData();
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      onShowToast(err.message || 'Failed to save transaction', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to delete transaction');
      }

      onShowToast('Transaction deleted', 'info');
      setDeleteConfirmId(null);
      await loadFinancialData();
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      onShowToast(err.message || 'Failed to delete', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Financial & Cash Flow Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Verified financial transactions, bank statement reconciliations, and cash flow ledger.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="import-document-btn"
            onClick={onNavigateToDocuments}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition shadow-sm"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            Import Statements & Bills
          </button>
          <button
            id="add-transaction-btn"
            onClick={() => openAddModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Financial Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Confirmed Income
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(summary?.totalIncome ?? 0, currency, profile?.locale)}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>Recurring: {formatCurrency(summary?.recurringIncome ?? 0, currency, profile?.locale)}</span>
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Confirmed Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(summary?.totalExpenses ?? 0, currency, profile?.locale)}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>Recurring: {formatCurrency(summary?.recurringExpenses ?? 0, currency, profile?.locale)}</span>
            </div>
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Net Cash Flow
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                (summary?.netCashFlow ?? 0) >= 0
                  ? 'bg-teal-50 text-teal-600'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-bold ${
                (summary?.netCashFlow ?? 0) >= 0 ? 'text-teal-700' : 'text-amber-700'
              }`}
            >
              {(summary?.netCashFlow ?? 0) >= 0 ? '+' : ''}
              {formatCurrency(summary?.netCashFlow ?? 0, currency, profile?.locale)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Income minus verified expenses
            </div>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Calculated Savings Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-700">
              {summary?.savingsRate ?? 0}%
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Net Cash Flow / Total Income
            </div>
          </div>
        </div>
      </div>

      {/* Credit / Debit / Transfer Breakdown & Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Direction Breakdown */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-slate-500" />
            Transaction Balance Classifications
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-emerald-900">Total Credits (Deposits)</span>
              </div>
              <span className="text-sm font-bold text-emerald-800">
                +{formatCurrency(summary?.totalCredits ?? 0, currency, profile?.locale)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50/60 border border-rose-100">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-semibold text-rose-900">Total Debits (Withdrawals)</span>
              </div>
              <span className="text-sm font-bold text-rose-800">
                -{formatCurrency(summary?.totalDebits ?? 0, currency, profile?.locale)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-xs font-semibold text-slate-700">Account Transfers</span>
              </div>
              <span className="text-sm font-bold text-slate-800">
                {formatCurrency(summary?.totalTransfers ?? 0, currency, profile?.locale)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Transfers are strictly isolated from net income/expense calculations.
          </p>
        </div>

        {/* Top Spending Categories */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-slate-500" />
            Top Spending Categories
          </h2>

          {summary?.topSpendingCategories && summary.topSpendingCategories.length > 0 ? (
            <div className="space-y-3">
              {summary.topSpendingCategories.slice(0, 4).map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{cat.category}</span>
                    <span>
                      {formatCurrency(cat.amount, currency, profile?.locale)} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, cat.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No categorized expense transactions recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Ledger & Transactions Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, payee, merchant, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Type Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-lg">
            {(['ALL', 'CREDIT', 'DEBIT', 'TRANSFER'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  selectedType === t
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'ALL' ? 'All Types' : t}
              </button>
            ))}
          </div>

          {/* Account Filter */}
          {uniqueAccounts.length > 0 && (
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Accounts ({uniqueAccounts.length})</option>
              {uniqueAccounts.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description & Payee</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading transactions ledger...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No transactions match your current filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {tx.date}
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">
                        {tx.description}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        {tx.merchant && <span>Merchant: {tx.merchant}</span>}
                        {tx.reference && <span>Ref: {tx.reference}</span>}
                        {tx.isSalary && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-medium">
                            Salary
                          </span>
                        )}
                        {tx.source === 'statement_import' && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium">
                            Imported
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold ${
                          tx.type === 'CREDIT'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : tx.type === 'DEBIT'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {tx.type === 'CREDIT' && <ArrowDownRight className="w-3 h-3" />}
                        {tx.type === 'DEBIT' && <ArrowUpRight className="w-3 h-3" />}
                        {tx.type === 'TRANSFER' && <ArrowLeftRight className="w-3 h-3" />}
                        {tx.type}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                      {tx.category}
                    </td>

                    {/* Account */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {tx.account || 'Main Account'}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold">
                      <span
                        className={
                          tx.type === 'CREDIT'
                            ? 'text-emerald-700'
                            : tx.type === 'DEBIT'
                            ? 'text-rose-700'
                            : 'text-indigo-700'
                        }
                      >
                        {tx.type === 'CREDIT' ? '+' : tx.type === 'DEBIT' ? '-' : ''}
                        {formatCurrency(Number(tx.amount), tx.currency || currency, profile?.locale)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openAddModal(tx)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(tx.id)}
                          className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingTransaction ? 'Edit Transaction' : 'Record Financial Transaction'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-5 space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Transaction Classification
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['DEBIT', 'CREDIT', 'TRANSFER'] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => {
                        setFormType(t);
                        if (t === 'CREDIT' && formCategory === 'Food') setFormCategory('Salary');
                        if (t === 'TRANSFER') setFormCategory('Transfer Out');
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${
                        formType === t
                          ? t === 'CREDIT'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : t === 'DEBIT'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Amount ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grocery Store, Monthly Salary, Rent Transfer"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Category & Account */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    {formType === 'CREDIT' &&
                      FINANCIAL_CATEGORIES.INCOME.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    {formType === 'DEBIT' &&
                      FINANCIAL_CATEGORIES.EXPENSE.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    {formType === 'TRANSFER' &&
                      FINANCIAL_CATEGORIES.TRANSFER.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Account / Card
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Savings, ICICI Card"
                    value={formAccount}
                    onChange={(e) => setFormAccount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Payee / Merchant & Reference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Merchant / Payee (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Supermarket, Landlord"
                    value={formMerchant}
                    onChange={(e) => setFormMerchant(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reference / Ref No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-98421"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Salary Checkbox for Credits */}
              {formType === 'CREDIT' && (
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/60 flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="salaryCheckbox"
                    checked={formIsSalary}
                    onChange={(e) => setFormIsSalary(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="salaryCheckbox" className="text-xs font-medium text-emerald-900 cursor-pointer">
                    Flag as Recurring Salary / Primary Income
                  </label>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or billing details..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingTransaction ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Delete Transaction?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently remove this transaction from your financial ledger?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTransaction(deleteConfirmId)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
