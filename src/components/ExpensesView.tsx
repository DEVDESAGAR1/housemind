import { useState, useMemo, FormEvent } from 'react';
import { Plus, Search, Filter, Trash2, Edit3, Calendar, CheckCircle2, Clock, AlertCircle, DollarSign, X } from 'lucide-react';
import { HouseholdExpense, ExpenseCategory, ExpenseFrequency, PaymentStatus } from '../types';
import { formatCurrency, getCurrencySymbol } from '../config/locationCurrencyConfig';

interface ExpensesViewProps {
  expenses: HouseholdExpense[];
  currency: string;
  isLoading: boolean;
  onAddExpense: (expense: Omit<HouseholdExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateExpense: (id: string, updated: Partial<HouseholdExpense>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

export function ExpensesView({
  expenses,
  currency,
  isLoading,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
}: ExpensesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<HouseholdExpense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('utilities');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<ExpenseFrequency>('monthly');
  const [dueDate, setDueDate] = useState('');
  const [isAutoPay, setIsAutoPay] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySymbol = getCurrencySymbol(currency);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || (e.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, selectedCategory]);

  const openAddModal = () => {
    setEditingExpense(null);
    setTitle('');
    setCategory('utilities');
    setAmount('');
    setFrequency('monthly');
    setDueDate('');
    setIsAutoPay(false);
    setPaymentStatus('pending');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exp: HouseholdExpense) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setCategory(exp.category);
    setAmount(exp.amount.toString());
    setFrequency(exp.frequency);
    setDueDate(exp.dueDate || '');
    setIsAutoPay(exp.isAutoPay);
    setPaymentStatus(exp.paymentStatus);
    setNotes(exp.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Amount must be a positive number greater than 0.');
      return;
    }

    const payload = {
      title: title.trim(),
      category,
      amount: numAmount,
      frequency,
      dueDate: dueDate.trim() || undefined,
      isAutoPay,
      paymentStatus,
      notes: notes.trim() || undefined,
    };

    try {
      setIsSubmitting(true);
      if (editingExpense) {
        await onUpdateExpense(editingExpense.id, payload);
      } else {
        await onAddExpense(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      await onDeleteExpense(deletingId);
      setDeletingId(null);
    } catch (err: any) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleStatus = async (exp: HouseholdExpense) => {
    const nextStatus: PaymentStatus = exp.paymentStatus === 'paid' ? 'pending' : 'paid';
    await onUpdateExpense(exp.id, { paymentStatus: nextStatus });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Household Expenses & Bills</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage recurring utilities, maintenance costs, and home services.</p>
        </div>

        <button
          id="add-expense-btn"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses by title or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:inline" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="utilities">Utilities</option>
            <option value="maintenance">Maintenance</option>
            <option value="insurance">Insurance</option>
            <option value="mortgage_rent">Mortgage / Rent</option>
            <option value="services">Services</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Expense List */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          Loading household expenses...
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="text-base font-semibold text-slate-800">No expenses found</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'all'
              ? 'No records match your active search filter.'
              : 'Add your recurring utility bills, mortgage, or home subscriptions to track total expenses.'}
          </p>
          {expenses.length === 0 && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-700 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record First Expense</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                id={`expense-row-${exp.id}`}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
              >
                {/* Left Info */}
                <div className="flex items-start gap-3.5">
                  <button
                    onClick={() => toggleStatus(exp)}
                    title={exp.paymentStatus === 'paid' ? 'Mark as Pending' : 'Mark as Paid'}
                    className={`mt-0.5 p-1 rounded-lg transition cursor-pointer ${
                      exp.paymentStatus === 'paid'
                        ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-50'
                        : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    {exp.paymentStatus === 'paid' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm sm:text-base">{exp.title}</span>
                      {exp.isAutoPay && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                          Auto-Pay
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="capitalize px-2 py-0.5 bg-slate-100 rounded-md font-medium text-slate-700">
                        {exp.category.replace('_', ' ')}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{exp.frequency}</span>
                      {exp.dueDate && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Due: {exp.dueDate}
                          </span>
                        </>
                      )}
                    </div>

                    {exp.notes && <p className="text-xs text-slate-500 pt-0.5">{exp.notes}</p>}
                  </div>
                </div>

                {/* Right Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 pl-8 sm:pl-0">
                  <div className="text-left sm:text-right">
                    <div className="text-base sm:text-lg font-bold text-slate-900">
                      {formatCurrency(exp.amount, currency)}
                    </div>
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        exp.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : exp.paymentStatus === 'overdue'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {exp.paymentStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                    <button
                      onClick={() => openEditModal(exp)}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                      title="Edit Expense"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingId(exp.id);
                        setDeletingName(exp.title);
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="Delete Expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-base">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                <span>{editingExpense ? 'Edit Expense' : 'Add Household Expense'}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Expense Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Electric Utility, Fiber Internet, Homeowners Insurance"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition cursor-pointer"
                    >
                      <option value="utilities">Utilities</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="insurance">Insurance</option>
                      <option value="mortgage_rent">Mortgage / Rent</option>
                      <option value="services">Services</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Amount ({currencySymbol}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Frequency *
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as ExpenseFrequency)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition cursor-pointer"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                      <option value="one_time">One-Time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Due Date (YYYY-MM-DD)
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition cursor-pointer"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      id="isAutoPay-checkbox"
                      type="checkbox"
                      checked={isAutoPay}
                      onChange={(e) => setIsAutoPay(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="isAutoPay-checkbox" className="text-sm text-slate-700 cursor-pointer font-medium">
                      Automatic Autopay Enabled
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Notes & Account Info
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes or service account reference..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Create Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-2.5 text-rose-600 font-semibold text-base">
                <Trash2 className="w-5 h-5" />
                <span>Delete Expense</span>
              </div>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete <strong className="text-slate-900">{deletingName}</strong>?
              </p>
              <p className="text-xs text-slate-400">
                This item will be permanently removed from your household records.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
