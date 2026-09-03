import React, { useState, useEffect } from 'react';
import {
  Zap,
  Landmark,
  CreditCard,
  Plus,
  DollarSign,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  Trash2,
  Edit2,
  Percent,
  X,
  FileText,
  TrendingDown,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  UtilityAccount,
  HouseholdLoan,
  CreditCardAccount,
  Property,
  UtilityType,
  LoanType,
} from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ContextualHelp } from './help/ContextualHelp';

interface UtilitiesDebtsViewProps {
  utilities: UtilityAccount[];
  loans: HouseholdLoan[];
  creditCards: CreditCardAccount[];
  properties: Property[];
  onRefresh: () => void;
  onOpenEntityExtractor: (entityType: 'utility' | 'loan' | 'credit_card') => void;
  addToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  currency?: string;
  initialTab?: 'utilities' | 'loans' | 'cards';
  onTabChange?: (tab: 'utilities' | 'loans' | 'cards') => void;
  autoOpenAddType?: 'utility' | 'loan' | 'card' | null;
  onAddModalOpened?: () => void;
}

export function UtilitiesDebtsView({
  utilities,
  loans,
  creditCards,
  properties,
  onRefresh,
  onOpenEntityExtractor,
  addToast,
  currency = 'USD',
  initialTab,
  onTabChange,
  autoOpenAddType,
  onAddModalOpened,
}: UtilitiesDebtsViewProps) {
  const [activeTab, setActiveTab] = useState<'utilities' | 'loans' | 'cards'>(initialTab || 'utilities');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleSetTab = (tab: 'utilities' | 'loans' | 'cards') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Deletion Confirmation States
  const [deletingUtility, setDeletingUtility] = useState<UtilityAccount | null>(null);
  const [isDeletingUtility, setIsDeletingUtility] = useState(false);
  const [deletingLoan, setDeletingLoan] = useState<HouseholdLoan | null>(null);
  const [isDeletingLoan, setIsDeletingLoan] = useState(false);
  const [deletingCard, setDeletingCard] = useState<CreditCardAccount | null>(null);
  const [isDeletingCard, setIsDeletingCard] = useState(false);

  // Utility Account Modal
  const [isUtilityModalOpen, setIsUtilityModalOpen] = useState(false);
  const [editingUtility, setEditingUtility] = useState<UtilityAccount | null>(null);
  const [utilityForm, setUtilityForm] = useState({
    name: '',
    utilityType: 'electricity' as UtilityType,
    providerName: '',
    accountNumber: '',
    propertyId: properties[0]?.id || '',
    billingCycle: 'monthly',
    paymentDueDay: 15,
    typicalMonthlyCost: 140,
    latestBillAmount: 152,
    autoPayEnabled: true,
    isPaidThisMonth: false,
    notes: '',
  });

  // Loan Modal
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<HouseholdLoan | null>(null);
  const [loanForm, setLoanForm] = useState({
    name: '',
    loanType: 'mortgage' as LoanType,
    lenderName: '',
    accountNumber: '',
    propertyId: properties[0]?.id || '',
    originalPrincipal: 320000,
    currentBalance: 285000,
    interestRatePercent: 4.25,
    monthlyPayment: 1574,
    paymentDueDay: 1,
    maturityYear: 2048,
    notes: '',
  });

  // Credit Card Modal
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardAccount | null>(null);
  const [cardForm, setCardForm] = useState({
    cardName: '',
    issuer: '',
    lastFourDigits: '4242',
    creditLimit: 12000,
    currentBalance: 1850,
    aprPercent: 18.24,
    minimumPaymentDue: 45,
    paymentDueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    autoPayEnabled: true,
    notes: '',
  });

  // Aggregated Debt & Utility totals
  const totalMonthlyUtilities = utilities.reduce(
    (sum, u) => sum + (u.typicalMonthlyCost || u.latestBillAmount || 0),
    0
  );
  const totalLoanDebt = loans.reduce((sum, l) => sum + (l.currentBalance || 0), 0);
  const totalMonthlyLoanPayments = loans.reduce((sum, l) => sum + (l.monthlyPayment || 0), 0);
  const totalCardBalance = creditCards.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  const totalCardLimit = creditCards.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
  const overallCardUtilization =
    totalCardLimit > 0 ? Math.round((totalCardBalance / totalCardLimit) * 100) : 0;

  // Utility Actions
  const handleOpenNewUtility = () => {
    setEditingUtility(null);
    setUtilityForm({
      name: '',
      utilityType: 'electricity',
      providerName: '',
      accountNumber: '',
      propertyId: properties[0]?.id || '',
      billingCycle: 'monthly',
      paymentDueDay: 15,
      typicalMonthlyCost: 120,
      latestBillAmount: 135,
      autoPayEnabled: true,
      isPaidThisMonth: false,
      notes: '',
    });
    setIsUtilityModalOpen(true);
  };

  const handleOpenEditUtility = (u: UtilityAccount) => {
    setEditingUtility(u);
    setUtilityForm({
      name: u.name,
      utilityType: u.utilityType,
      providerName: u.providerName,
      accountNumber: u.accountNumber || '',
      propertyId: u.propertyId || properties[0]?.id || '',
      billingCycle: u.billingCycle || 'monthly',
      paymentDueDay: u.paymentDueDay || 15,
      typicalMonthlyCost: u.typicalMonthlyCost || 0,
      latestBillAmount: u.latestBillAmount || 0,
      autoPayEnabled: u.autoPayEnabled ?? true,
      isPaidThisMonth: u.isPaidThisMonth ?? false,
      notes: u.notes || '',
    });
    setIsUtilityModalOpen(true);
  };

  const handleSaveUtility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUtility) {
        await api.updateUtility(editingUtility.id, utilityForm);
        addToast('success', 'Utility Updated', `Updated "${utilityForm.name}".`);
      } else {
        await api.createUtility(utilityForm);
        addToast('success', 'Utility Added', `Added utility "${utilityForm.name}".`);
      }
      setIsUtilityModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Error Saving Utility', err.message);
    }
  };

  const handlePromptDeleteUtility = (u: UtilityAccount) => {
    setDeletingUtility(u);
  };

  const handleConfirmDeleteUtility = async () => {
    if (!deletingUtility) return;
    try {
      setIsDeletingUtility(true);
      await api.deleteUtility(deletingUtility.id);
      addToast('info', 'Utility Removed', `Deleted utility "${deletingUtility.name}".`);
      setDeletingUtility(null);
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message);
    } finally {
      setIsDeletingUtility(false);
    }
  };

  const handleToggleUtilityPaid = async (u: UtilityAccount) => {
    try {
      await api.updateUtility(u.id, {
        isPaidThisMonth: !u.isPaidThisMonth,
      });
      addToast(
        'success',
        u.isPaidThisMonth ? 'Marked Unpaid' : 'Bill Marked Paid',
        `Updated ${u.name} status.`
      );
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message);
    }
  };

  // Loan Actions
  const handleOpenNewLoan = () => {
    setEditingLoan(null);
    setLoanForm({
      name: '',
      loanType: 'mortgage',
      lenderName: '',
      accountNumber: '',
      propertyId: properties[0]?.id || '',
      originalPrincipal: 300000,
      currentBalance: 275000,
      interestRatePercent: 4.5,
      monthlyPayment: 1520,
      paymentDueDay: 1,
      maturityYear: 2050,
      notes: '',
    });
    setIsLoanModalOpen(true);
  };

  const handleOpenEditLoan = (l: HouseholdLoan) => {
    setEditingLoan(l);
    setLoanForm({
      name: l.name,
      loanType: l.loanType,
      lenderName: l.lenderName,
      accountNumber: l.accountNumber || '',
      propertyId: l.propertyId || properties[0]?.id || '',
      originalPrincipal: l.originalPrincipal || 0,
      currentBalance: l.currentBalance || 0,
      interestRatePercent: l.interestRatePercent || 0,
      monthlyPayment: l.monthlyPayment || 0,
      paymentDueDay: l.paymentDueDay || 1,
      maturityYear: l.maturityYear || 2050,
      notes: l.notes || '',
    });
    setIsLoanModalOpen(true);
  };

  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLoan) {
        await api.updateLoan(editingLoan.id, loanForm);
        addToast('success', 'Loan Updated', `Updated "${loanForm.name}".`);
      } else {
        await api.createLoan(loanForm);
        addToast('success', 'Loan Added', `Registered loan "${loanForm.name}".`);
      }
      setIsLoanModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Error Saving Loan', err.message);
    }
  };

  const handlePromptDeleteLoan = (l: HouseholdLoan) => {
    setDeletingLoan(l);
  };

  const handleConfirmDeleteLoan = async () => {
    if (!deletingLoan) return;
    try {
      setIsDeletingLoan(true);
      await api.deleteLoan(deletingLoan.id);
      addToast('info', 'Loan Removed', `Deleted loan record "${deletingLoan.name}".`);
      setDeletingLoan(null);
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message);
    } finally {
      setIsDeletingLoan(false);
    }
  };

  // Credit Card Actions
  const handleOpenNewCard = () => {
    setEditingCard(null);
    setCardForm({
      cardName: '',
      issuer: '',
      lastFourDigits: '1234',
      creditLimit: 10000,
      currentBalance: 1200,
      aprPercent: 19.99,
      minimumPaymentDue: 35,
      paymentDueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      autoPayEnabled: true,
      notes: '',
    });
    setIsCardModalOpen(true);
  };

  useEffect(() => {
    if (autoOpenAddType) {
      if (autoOpenAddType === 'utility') {
        handleOpenNewUtility();
      } else if (autoOpenAddType === 'loan') {
        handleOpenNewLoan();
      } else if (autoOpenAddType === 'card') {
        handleOpenNewCard();
      }
      onAddModalOpened?.();
    }
  }, [autoOpenAddType]);

  const handleOpenEditCard = (c: CreditCardAccount) => {
    setEditingCard(c);
    setCardForm({
      cardName: c.cardName,
      issuer: c.issuer,
      lastFourDigits: c.lastFourDigits || '',
      creditLimit: c.creditLimit || 0,
      currentBalance: c.currentBalance || 0,
      aprPercent: c.aprPercent || 0,
      minimumPaymentDue: c.minimumPaymentDue || 0,
      paymentDueDate: c.paymentDueDate ? c.paymentDueDate.slice(0, 10) : '',
      autoPayEnabled: c.autoPayEnabled ?? true,
      notes: c.notes || '',
    });
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCard) {
        await api.updateCreditCard(editingCard.id, cardForm);
        addToast('success', 'Card Updated', `Updated "${cardForm.cardName}".`);
      } else {
        await api.createCreditCard(cardForm);
        addToast('success', 'Card Registered', `Added card "${cardForm.cardName}".`);
      }
      setIsCardModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Error Saving Card', err.message);
    }
  };

  const handlePromptDeleteCard = (c: CreditCardAccount) => {
    setDeletingCard(c);
  };

  const handleConfirmDeleteCard = async () => {
    if (!deletingCard) return;
    try {
      setIsDeletingCard(true);
      await api.deleteCreditCard(deletingCard.id);
      addToast('info', 'Card Removed', `Deleted credit card "${deletingCard.cardName}".`);
      setDeletingCard(null);
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message);
    } finally {
      setIsDeletingCard(false);
    }
  };

  const utilityTypeIcons: Record<UtilityType, string> = {
    electricity: '⚡ Electric',
    water: '💧 Water / Sewer',
    gas: '🔥 Natural Gas',
    internet: '🌐 Internet / Fiber',
    mobile: '📱 Mobile / Cellular',
    heating_oil: '🛢️ Heating Oil',
    trash: '♻️ Trash / Recycling',
    solar: '☀️ Solar',
    hoa: '🏘️ HOA Dues',
    other: '📦 Utility',
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-amber-500" />
            <span>Household Utilities, Mortgages & Debt</span>
            <ContextualHelp
              id="help-utilities-debts"
              title="Utilities & Debt Management"
              summary="Track utility providers, mortgage loan balances, and credit card commitments."
              bullets={[
                'Track AutoPay status and payment due dates for each account.',
                'Record mortgage principal balances, interest rates, and monthly EMIs.',
                'Mark obligations as paid to keep financial health scores up to date.',
              ]}
            />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track utility bills, amortized household loans, credit card balances, and scheduled payment due dates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              onOpenEntityExtractor(
                activeTab === 'utilities' ? 'utility' : activeTab === 'loans' ? 'loan' : 'credit_card'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Extract from Statement</span>
          </button>

          {activeTab === 'utilities' && (
            <button
              onClick={handleOpenNewUtility}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Utility Account</span>
            </button>
          )}

          {activeTab === 'loans' && (
            <button
              onClick={handleOpenNewLoan}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Loan / Mortgage</span>
            </button>
          )}

          {activeTab === 'cards' && (
            <button
              onClick={handleOpenNewCard}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Credit Card</span>
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Utilities Monthly Burn */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Monthly Utilities</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            {currency} {Math.round(totalMonthlyUtilities).toLocaleString()}/mo
          </p>
          <span className="text-[11px] text-slate-500 block font-medium">
            {utilities.length} accounts configured
          </span>
        </div>

        {/* Total Loan Debt & EMI */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Mortgages & Loans</span>
            <Landmark className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            {currency} {Math.round(totalLoanDebt).toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 block font-medium">
            {currency} {Math.round(totalMonthlyLoanPayments).toLocaleString()}/mo payment across {loans.length} loans
          </span>
        </div>

        {/* Card Revolving Balance & Utilization */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Card Balances</span>
            <CreditCard className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            {currency} {Math.round(totalCardBalance).toLocaleString()}
          </p>
          <div className="flex items-center gap-2 pt-0.5">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  overallCardUtilization > 50
                    ? 'bg-rose-500'
                    : overallCardUtilization > 30
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(overallCardUtilization, 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
              {overallCardUtilization}%
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => handleSetTab('utilities')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'utilities'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Utilities & Bills ({utilities.length})</span>
        </button>

        <button
          onClick={() => handleSetTab('loans')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'loans'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Loans & Mortgages ({loans.length})</span>
        </button>

        <button
          onClick={() => handleSetTab('cards')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'cards'
              ? 'bg-violet-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Credit Cards ({creditCards.length})</span>
        </button>
      </div>

      {/* Tab 1: Utilities Grid */}
      {activeTab === 'utilities' && (
        <div className="space-y-4">
          {utilities.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mx-auto">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No utility accounts registered</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Track electricity, gas, municipal water, high-speed fiber, and HOA billing cycles.
              </p>
              <button
                onClick={handleOpenNewUtility}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Utility Record</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {utilities.map((util) => (
                <div
                  key={util.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4.5 hover:border-amber-300 transition shadow-2xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800">
                          {utilityTypeIcons[util.utilityType] || util.utilityType}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{util.name}</h4>
                        <p className="text-xs font-semibold text-slate-600">{util.providerName}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditUtility(util)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePromptDeleteUtility(util)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                          title="Delete Utility"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {util.accountNumber && (
                      <p className="text-[11px] text-slate-400 font-mono mt-1">Acct: {util.accountNumber}</p>
                    )}
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Typical / Latest Bill</span>
                      <span className="text-sm font-bold text-slate-900">
                        {currency} {util.latestBillAmount || util.typicalMonthlyCost || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Due: Day {util.paymentDueDay || 1} of month</span>
                      <span>{util.autoPayEnabled ? '⚡ Auto-Pay' : 'Manual Pay'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleUtilityPaid(util)}
                      className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        util.isPaidThisMonth
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{util.isPaidThisMonth ? 'Paid for this Cycle' : 'Mark Bill Paid'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Loans & Mortgages */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          {loans.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 mx-auto">
                <Landmark className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No mortgages or loans registered</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Record your primary mortgage, HELOC, or home improvement financing to calculate net equity.
              </p>
              <button
                onClick={handleOpenNewLoan}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Mortgage / Loan</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loans.map((loan) => {
                const paidOffPercent =
                  loan.originalPrincipal && loan.originalPrincipal > 0
                    ? Math.round(
                        ((loan.originalPrincipal - (loan.currentBalance || 0)) /
                          loan.originalPrincipal) *
                          100
                      )
                    : 0;

                return (
                  <div
                    key={loan.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4.5 hover:border-rose-300 transition shadow-2xs flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 uppercase">
                            {loan.loanType}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">{loan.name}</h4>
                          <p className="text-xs font-semibold text-slate-600">{loan.lenderName}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditLoan(loan)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePromptDeleteLoan(loan)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                            title="Delete Loan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {loan.interestRatePercent && (
                        <p className="text-xs text-slate-500 mt-2 font-medium">
                          Rate: <span className="text-slate-900 font-bold">{loan.interestRatePercent}% APR</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Outstanding Balance</span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {currency} {(loan.currentBalance || 0).toLocaleString()}
                        </span>
                      </div>

                      {loan.originalPrincipal && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                            <span>Principal Paid: {Math.max(0, paidOffPercent)}%</span>
                            <span>Orig: {currency} {loan.originalPrincipal.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(Math.max(0, paidOffPercent), 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 font-medium">
                        <span>Payment: {currency} {loan.monthlyPayment?.toLocaleString()}/mo</span>
                        <span>Maturity: {loan.maturityYear || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Credit Cards */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          {creditCards.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 mx-auto">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No credit cards registered</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Track credit limits, current balances, APRs, and monthly due dates in one secure vault.
              </p>
              <button
                onClick={handleOpenNewCard}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Credit Card</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creditCards.map((card) => {
                const utilRatio =
                  card.creditLimit && card.creditLimit > 0
                    ? Math.round(((card.currentBalance || 0) / card.creditLimit) * 100)
                    : 0;

                return (
                  <div
                    key={card.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4.5 hover:border-violet-300 transition shadow-2xs flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            •••• {card.lastFourDigits || '0000'}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">{card.cardName}</h4>
                          <p className="text-xs font-semibold text-violet-700">{card.issuer}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditCard(card)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePromptDeleteCard(card)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                            title="Delete Credit Card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {card.aprPercent && (
                        <p className="text-xs text-slate-500 mt-2 font-medium">
                          APR: <span className="font-bold text-slate-800">{card.aprPercent}%</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Balance</span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {currency} {(card.currentBalance || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                          <span>Limit: {currency} {(card.creditLimit || 0).toLocaleString()}</span>
                          <span className="font-bold">{utilRatio}% used</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              utilRatio > 50 ? 'bg-rose-500' : utilRatio > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(utilRatio, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Due: {card.paymentDueDate ? new Date(card.paymentDueDate).toLocaleDateString() : 'N/A'}</span>
                        <span className="font-medium">Min: {currency} {card.minimumPaymentDue || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Utility Modal */}
      {isUtilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingUtility ? 'Edit Utility Account' : 'Add Utility Account'}
              </h3>
              <button
                onClick={() => setIsUtilityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUtility} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Nickname *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pacific Power & Light"
                  value={utilityForm.name}
                  onChange={(e) => setUtilityForm({ ...utilityForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Utility Type</label>
                  <select
                    value={utilityForm.utilityType}
                    onChange={(e) =>
                      setUtilityForm({ ...utilityForm, utilityType: e.target.value as UtilityType })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  >
                    <option value="electricity">Electricity</option>
                    <option value="water">Water / Sewer</option>
                    <option value="gas">Natural Gas</option>
                    <option value="internet">Internet / Fiber</option>
                    <option value="trash">Trash / Recycling</option>
                    <option value="solar">Solar</option>
                    <option value="hoa">HOA Dues</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Provider Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PGE"
                    value={utilityForm.providerName}
                    onChange={(e) => setUtilityForm({ ...utilityForm, providerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 992-184-29"
                    value={utilityForm.accountNumber}
                    onChange={(e) => setUtilityForm({ ...utilityForm, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Day of Month</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={utilityForm.paymentDueDay}
                    onChange={(e) =>
                      setUtilityForm({ ...utilityForm, paymentDueDay: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Typical Cost ({currency})</label>
                  <input
                    type="number"
                    value={utilityForm.typicalMonthlyCost}
                    onChange={(e) =>
                      setUtilityForm({ ...utilityForm, typicalMonthlyCost: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Latest Bill ({currency})</label>
                  <input
                    type="number"
                    value={utilityForm.latestBillAmount}
                    onChange={(e) =>
                      setUtilityForm({ ...utilityForm, latestBillAmount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUtilityModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Utility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loan Modal */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingLoan ? 'Edit Loan / Mortgage' : 'Add Loan / Mortgage'}
              </h3>
              <button
                onClick={() => setIsLoanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 30-Year Fixed Primary Mortgage"
                  value={loanForm.name}
                  onChange={(e) => setLoanForm({ ...loanForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Type</label>
                  <select
                    value={loanForm.loanType}
                    onChange={(e) => setLoanForm({ ...loanForm, loanType: e.target.value as LoanType })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  >
                    <option value="mortgage">Mortgage</option>
                    <option value="heloc">HELOC (Home Equity Line)</option>
                    <option value="home_equity">Home Equity Loan</option>
                    <option value="auto">Auto Loan</option>
                    <option value="personal">Personal Loan</option>
                    <option value="student">Student Loan</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lender / Institution *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chase Home Lending"
                    value={loanForm.lenderName}
                    onChange={(e) => setLoanForm({ ...loanForm, lenderName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Balance ({currency})</label>
                  <input
                    type="number"
                    value={loanForm.currentBalance}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, currentBalance: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Payment ({currency})</label>
                  <input
                    type="number"
                    value={loanForm.monthlyPayment}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, monthlyPayment: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interest Rate %</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="4.25"
                    value={loanForm.interestRatePercent}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, interestRatePercent: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Day</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={loanForm.paymentDueDay}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, paymentDueDay: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Maturity Year</label>
                  <input
                    type="number"
                    placeholder="2052"
                    value={loanForm.maturityYear || ''}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, maturityYear: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Card Modal */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCard ? 'Edit Credit Card' : 'Add Credit Card'}
              </h3>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Card Nickname *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chase Sapphire Reserve, Amex Blue"
                  value={cardForm.cardName}
                  onChange={(e) => setCardForm({ ...cardForm, cardName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Issuer / Bank *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chase, Capital One, Citi"
                    value={cardForm.issuer}
                    onChange={(e) => setCardForm({ ...cardForm, issuer: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last 4 Digits</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="4242"
                    value={cardForm.lastFourDigits}
                    onChange={(e) => setCardForm({ ...cardForm, lastFourDigits: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Balance ({currency})</label>
                  <input
                    type="number"
                    value={cardForm.currentBalance}
                    onChange={(e) =>
                      setCardForm({ ...cardForm, currentBalance: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Limit ({currency})</label>
                  <input
                    type="number"
                    value={cardForm.creditLimit}
                    onChange={(e) =>
                      setCardForm({ ...cardForm, creditLimit: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">APR %</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="18.99"
                    value={cardForm.aprPercent}
                    onChange={(e) =>
                      setCardForm({ ...cardForm, aprPercent: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    value={cardForm.paymentDueDate}
                    onChange={(e) => setCardForm({ ...cardForm, paymentDueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Credit Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Utility Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingUtility)}
        title="Delete Utility Account"
        itemName={deletingUtility?.name || 'Utility'}
        itemType="utility account"
        description="Are you sure you want to permanently delete this utility account?"
        warningNote="Historical bill records and provider information will be removed."
        confirmLabel="Delete Utility"
        isDeleting={isDeletingUtility}
        onConfirm={handleConfirmDeleteUtility}
        onCancel={() => setDeletingUtility(null)}
      />

      {/* Delete Loan Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingLoan)}
        title="Delete Loan Account"
        itemName={deletingLoan?.name || 'Loan'}
        itemType="loan record"
        description="Are you sure you want to permanently delete this loan liability?"
        warningNote="Principal balance tracking and interest rate calculations will be removed from your debt dashboard."
        confirmLabel="Delete Loan"
        isDeleting={isDeletingLoan}
        onConfirm={handleConfirmDeleteLoan}
        onCancel={() => setDeletingLoan(null)}
      />

      {/* Delete Credit Card Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingCard)}
        title="Delete Credit Card"
        itemName={deletingCard?.cardName || 'Credit Card'}
        itemType="credit card"
        description="Are you sure you want to permanently delete this credit card account?"
        warningNote="Revolving balance tracking and minimum due alerts for this card will be removed."
        confirmLabel="Delete Card"
        isDeleting={isDeletingCard}
        onConfirm={handleConfirmDeleteCard}
        onCancel={() => setDeletingCard(null)}
      />
    </div>
  );
}
