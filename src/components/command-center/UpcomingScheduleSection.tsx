import { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Wrench,
  DollarSign,
  CreditCard,
  Building2,
  ShieldCheck,
  ArrowUpRight,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import {
  HouseholdExpense,
  MaintenanceTask,
  UtilityAccount,
  HouseholdLoan,
  CreditCardAccount,
  WarrantyPolicy,
} from '../../types';
import { formatCurrency } from '../../config/locationCurrencyConfig';
import { getDateStatus } from './dateUtils';

export interface UpcomingObligation {
  id: string;
  type: 'expense' | 'maintenance' | 'utility' | 'loan' | 'credit_card' | 'warranty';
  title: string;
  subtitle: string;
  dueDate: string;
  daysDiff: number;
  formattedDate: string;
  dateBadgeLabel: string;
  amount?: number;
  isAutoPay?: boolean;
  actionTab: string;
  actionLabel: string;
}

interface UpcomingScheduleSectionProps {
  expenses: HouseholdExpense[];
  maintenances: MaintenanceTask[];
  utilities: UtilityAccount[];
  loans: HouseholdLoan[];
  creditCards: CreditCardAccount[];
  warranties: WarrantyPolicy[];
  currencyCode: string;
  locale?: string;
  onNavigate: (tab: string) => void;
}

export function UpcomingScheduleSection({
  expenses,
  maintenances,
  utilities,
  loans,
  creditCards,
  warranties,
  currencyCode,
  locale,
  onNavigate,
}: UpcomingScheduleSectionProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'bills' | 'maintenance' | 'loans_cards' | 'warranties'>('all');

  const upcomingList = useMemo(() => {
    const list: UpcomingObligation[] = [];

    // 1. Expenses / Recurring Bills
    for (const exp of expenses) {
      if (exp.dueDate) {
        const ds = getDateStatus(exp.dueDate);
        if (ds.daysDiff >= 0 && ds.daysDiff <= 30) {
          list.push({
            id: `up_exp_${exp.id}`,
            type: 'expense',
            title: exp.title,
            subtitle: `${exp.category.replace('_', ' ')} • ${exp.frequency || 'monthly'}`,
            dueDate: exp.dueDate,
            daysDiff: ds.daysDiff,
            formattedDate: ds.formattedDate,
            dateBadgeLabel: ds.label,
            amount: exp.amount,
            isAutoPay: exp.isAutoPay,
            actionTab: 'expenses',
            actionLabel: 'View Bill',
          });
        }
      }
    }

    // 2. Maintenances
    for (const m of maintenances) {
      if (m.status !== 'completed') {
        const targetDate = m.nextServiceDate || m.serviceDate;
        if (targetDate) {
          const ds = getDateStatus(targetDate);
          if (ds.daysDiff >= 0 && ds.daysDiff <= 30) {
            list.push({
              id: `up_maint_${m.id}`,
              type: 'maintenance',
              title: m.title,
              subtitle: `Service Provider: ${m.serviceProvider || 'Self-service'} • ${(m as any).priority || 'standard'} priority`,
              dueDate: targetDate,
              daysDiff: ds.daysDiff,
              formattedDate: ds.formattedDate,
              dateBadgeLabel: ds.label,
              amount: m.cost,
              actionTab: 'maintenance',
              actionLabel: 'View Task',
            });
          }
        }
      }
    }

    // 3. Utilities
    for (const u of utilities) {
      const targetDate = u.nextDueDate;
      if (targetDate) {
        const ds = getDateStatus(targetDate);
        if (ds.daysDiff >= 0 && ds.daysDiff <= 30) {
          list.push({
            id: `up_util_${u.id}`,
            type: 'utility',
            title: `${u.name} (${u.provider})`,
            subtitle: `Account #${u.accountNumber || 'N/A'} • ${u.utilityType || 'Utility'}`,
            dueDate: targetDate,
            daysDiff: ds.daysDiff,
            formattedDate: ds.formattedDate,
            dateBadgeLabel: ds.label,
            amount: u.latestBillAmount || u.typicalAmount,
            isAutoPay: u.isAutoPay,
            actionTab: 'debts',
            actionLabel: 'View Utility',
          });
        }
      }
    }

    // 4. Loans / EMIs
    for (const l of loans) {
      if (l.status === 'active') {
        const now = new Date();
        const dueDay = l.paymentDueDay || 1;
        const dueYear = now.getFullYear();
        const dueMonth = now.getMonth() + (now.getDate() > dueDay ? 1 : 0);
        const calcDate = new Date(dueYear, dueMonth, dueDay);
        const isoDue = calcDate.toISOString().slice(0, 10);
        const ds = getDateStatus(isoDue);

        if (ds.daysDiff >= 0 && ds.daysDiff <= 30) {
          list.push({
            id: `up_loan_${l.id}`,
            type: 'loan',
            title: `${l.loanName} EMI`,
            subtitle: `Lender: ${l.lender || 'Financial Institution'} • Due Day ${dueDay}`,
            dueDate: isoDue,
            daysDiff: ds.daysDiff,
            formattedDate: ds.formattedDate,
            dateBadgeLabel: ds.label,
            amount: l.emiAmount,
            actionTab: 'debts',
            actionLabel: 'View Loan',
          });
        }
      }
    }

    // 5. Credit Cards
    for (const cc of creditCards) {
      if (cc.paymentDueDate && cc.outstandingAmount > 0) {
        const ds = getDateStatus(cc.paymentDueDate);
        if (ds.daysDiff >= 0 && ds.daysDiff <= 30) {
          list.push({
            id: `up_cc_${cc.id}`,
            type: 'credit_card',
            title: `Credit Card Bill: ${cc.cardNickname}`,
            subtitle: `Card ending in *${cc.last4Digits || '0000'} • ${cc.cardIssuer || 'Bank'}`,
            dueDate: cc.paymentDueDate,
            daysDiff: ds.daysDiff,
            formattedDate: ds.formattedDate,
            dateBadgeLabel: ds.label,
            amount: cc.outstandingAmount,
            isAutoPay: cc.isAutoPay,
            actionTab: 'debts',
            actionLabel: 'Manage Card',
          });
        }
      }
    }

    // 6. Warranties Expiring
    for (const w of warranties) {
      if (w.endDate) {
        const ds = getDateStatus(w.endDate);
        if (ds.daysDiff >= 0 && ds.daysDiff <= 30) {
          list.push({
            id: `up_war_${w.id}`,
            type: 'warranty',
            title: `Warranty Expiry: ${w.warrantyProvider || 'Equipment Coverage'}`,
            subtitle: `Policy #${w.policyNumber || 'N/A'}`,
            dueDate: w.endDate,
            daysDiff: ds.daysDiff,
            formattedDate: ds.formattedDate,
            dateBadgeLabel: ds.label,
            actionTab: 'maintenance',
            actionLabel: 'View Warranty',
          });
        }
      }
    }

    // Sort chronologically ascending
    return list.sort((a, b) => a.daysDiff - b.daysDiff);
  }, [expenses, maintenances, utilities, loans, creditCards, warranties]);

  // Tab counts
  const billsCount = upcomingList.filter((i) => i.type === 'expense' || i.type === 'utility').length;
  const maintenanceCount = upcomingList.filter((i) => i.type === 'maintenance').length;
  const loansCardsCount = upcomingList.filter((i) => i.type === 'loan' || i.type === 'credit_card').length;
  const warrantiesCount = upcomingList.filter((i) => i.type === 'warranty').length;

  const filteredList = useMemo(() => {
    switch (activeTab) {
      case 'bills':
        return upcomingList.filter((i) => i.type === 'expense' || i.type === 'utility');
      case 'maintenance':
        return upcomingList.filter((i) => i.type === 'maintenance');
      case 'loans_cards':
        return upcomingList.filter((i) => i.type === 'loan' || i.type === 'credit_card');
      case 'warranties':
        return upcomingList.filter((i) => i.type === 'warranty');
      default:
        return upcomingList;
    }
  }, [upcomingList, activeTab]);

  const totalUpcomingFinancial = upcomingList
    .filter((i) => i.type !== 'warranty')
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const getUpcomingTypeIcon = (type: UpcomingObligation['type']) => {
    switch (type) {
      case 'expense':
      case 'utility':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'loan':
      case 'credit_card':
        return <CreditCard className="w-4 h-4 text-indigo-600" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-amber-600" />;
      case 'warranty':
        return <ShieldCheck className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div
      id="household-command-center-upcoming-schedule"
      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Upcoming Schedule (Next 30 Days)</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {upcomingList.length} Scheduled
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Forward-looking calendar of bills, loan EMIs, scheduled maintenance, and expiring warranties.
          </p>
        </div>

        {totalUpcomingFinancial > 0 && (
          <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] text-slate-500 font-medium">30d Total Obligations:</span>
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              {formatCurrency(totalUpcomingFinancial, currencyCode, locale)}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl text-xs font-medium">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white text-indigo-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All ({upcomingList.length})
        </button>
        <button
          onClick={() => setActiveTab('bills')}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            activeTab === 'bills'
              ? 'bg-white text-indigo-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Bills & Utilities ({billsCount})
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            activeTab === 'maintenance'
              ? 'bg-white text-indigo-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Maintenance ({maintenanceCount})
        </button>
        <button
          onClick={() => setActiveTab('loans_cards')}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            activeTab === 'loans_cards'
              ? 'bg-white text-indigo-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Loans & Cards ({loansCardsCount})
        </button>
        <button
          onClick={() => setActiveTab('warranties')}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            activeTab === 'warranties'
              ? 'bg-white text-indigo-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Warranties ({warrantiesCount})
        </button>
      </div>

      {/* List */}
      {filteredList.length === 0 ? (
        <div className="py-8 text-center px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-xs font-bold text-slate-800">
            No upcoming items in this category
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Your household has no recorded upcoming obligations in the next 30 days.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filteredList.map((item) => (
            <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  {getUpcomingTypeIcon(item.type)}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">{item.title}</span>
                    {item.isAutoPay && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Zap className="w-2.5 h-2.5" />
                        Auto-Pay
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-slate-500 truncate">{item.subtitle}</p>
                </div>
              </div>

              {/* Right: Date, Amount & View Button */}
              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-11 sm:pl-0">
                <div className="text-left sm:text-right">
                  <div className="flex items-center sm:justify-end gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-md border ${
                        item.daysDiff === 0
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse'
                          : item.daysDiff <= 3
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      }`}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {item.dateBadgeLabel}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.formattedDate}</div>
                </div>

                {item.amount !== undefined && (
                  <div className="text-right min-w-[70px]">
                    <div className="text-xs sm:text-sm font-bold text-slate-900">
                      {formatCurrency(item.amount, currencyCode, locale)}
                    </div>
                  </div>
                )}

                <button
                  id={`btn-view-${item.id}`}
                  onClick={() => onNavigate(item.actionTab)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                  title={item.actionLabel}
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
