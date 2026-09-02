import React from 'react';
import {
  Home,
  Wrench,
  Wallet,
  Calendar,
  Building2,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  Property,
  Room,
  HomeAsset,
  MaintenanceTask,
  WarrantyPolicy,
  HouseholdExpense,
  UtilityAccount,
  HouseholdLoan,
  CreditCardAccount,
  CategoryHealthBreakdown,
} from '../../types';
import { formatCurrency } from '../../config/locationCurrencyConfig';
import { getDateStatus } from './dateUtils';

interface DomainSnapshotsSectionProps {
  properties: Property[];
  rooms: Room[];
  assets: HomeAsset[];
  maintenances: MaintenanceTask[];
  warranties: WarrantyPolicy[];
  expenses: HouseholdExpense[];
  utilities: UtilityAccount[];
  loans: HouseholdLoan[];
  creditCards: CreditCardAccount[];
  homeHealth?: CategoryHealthBreakdown;
  assetHealth?: CategoryHealthBreakdown;
  financeHealth?: CategoryHealthBreakdown;
  currencyCode: string;
  locale?: string;
  onNavigate: (tab: string) => void;
}

export function DomainSnapshotsSection({
  properties = [],
  rooms = [],
  assets = [],
  maintenances = [],
  warranties = [],
  expenses = [],
  utilities = [],
  loans = [],
  creditCards = [],
  homeHealth,
  assetHealth,
  financeHealth,
  currencyCode,
  locale,
  onNavigate,
}: DomainSnapshotsSectionProps) {
  const safeProps = properties || [];
  const safeRooms = rooms || [];
  const safeAssets = assets || [];
  const safeMaintenances = maintenances || [];
  const safeWarranties = warranties || [];
  const safeExpenses = expenses || [];
  const safeUtilities = utilities || [];
  const safeLoans = loans || [];
  const safeCreditCards = creditCards || [];

  // 1. Home calculations
  const totalSquareFeet = safeProps.reduce((sum, p) => sum + (p.squareFootage || 0), 0);
  const totalPropertyValuation = safeProps.reduce(
    (sum, p) => sum + (p.currentEstimatedValue || p.purchaseValue || 0),
    0
  );

  // 2. Asset calculations
  const operationalAssets = safeAssets.filter((a) => a.currentStatus === 'operational').length;
  const operationalRate = safeAssets.length > 0 ? Math.round((operationalAssets / safeAssets.length) * 100) : 100;
  const attentionAssetsCount = safeAssets.filter(
    (a) => a.currentStatus === 'needs_maintenance' || a.currentStatus === 'critical'
  ).length;
  const totalAssetValuation = safeAssets.reduce(
    (sum, a) => sum + (a.currentEstimatedValue || a.purchaseCost || 0),
    0
  );
  const expiringWarrantiesCount = safeWarranties.filter((w) => {
    if (!w.endDate) return false;
    const ds = getDateStatus(w.endDate);
    return ds.daysDiff >= 0 && ds.daysDiff <= 30;
  }).length;

  // 3. Finance calculations
  const monthlyExpensesSum = safeExpenses.reduce((sum, exp) => {
    if (exp.frequency === 'monthly') return sum + exp.amount;
    if (exp.frequency === 'quarterly') return sum + exp.amount / 3;
    if (exp.frequency === 'annual') return sum + exp.amount / 12;
    return sum;
  }, 0);
  const monthlyLoanEmiSum = safeLoans
    .filter((l) => l.status === 'active')
    .reduce((sum, l) => sum + (l.emiAmount || 0), 0);
  const totalMonthlyCommitment = monthlyExpensesSum + monthlyLoanEmiSum;

  const totalOutstandingLoans = safeLoans.reduce((sum, l) => sum + (l.outstandingAmount ?? (l as any).currentBalance ?? 0), 0);
  const totalCreditCardDebt = safeCreditCards.reduce((sum, cc) => sum + (cc.outstandingAmount ?? (cc as any).currentBalance ?? 0), 0);
  const totalCreditLimit = safeCreditCards.reduce((sum, cc) => sum + (cc.creditLimit || 0), 0);
  const overallCreditUtilPercent = totalCreditLimit > 0 ? Math.round((totalCreditCardDebt / totalCreditLimit) * 100) : 0;

  // 4. Maintenance calculations
  const scheduledTasks = safeMaintenances.filter((m) => m.status !== 'completed');
  const overdueTasks = scheduledTasks.filter((m) => {
    const d = m.nextServiceDate || m.serviceDate;
    if (!d) return false;
    return getDateStatus(d).daysDiff < 0;
  });
  const upcomingTasks = scheduledTasks.filter((m) => {
    const d = m.nextServiceDate || m.serviceDate;
    if (!d) return false;
    const ds = getDateStatus(d);
    return ds.daysDiff >= 0 && ds.daysDiff <= 30;
  });
  const completedTasks = safeMaintenances.filter((m) => m.status === 'completed');
  const upcomingMaintenanceBudget = upcomingTasks.reduce((sum, t) => sum + (t.cost || 0), 0);

  return (
    <div id="household-domain-snapshots" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Household Domain Snapshots</h2>
          <p className="text-xs text-slate-500">
            Authoritative operating summaries across properties, equipment, cash commitments, and upkeep.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Home & Spaces */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-indigo-200 transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shadow-2xs">
                <Home className="w-4 h-4" />
              </div>
              {homeHealth && (
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  {homeHealth.score}/100 • {homeHealth.statusLabel}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">Home & Properties</h3>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                {properties.length} propert{properties.length === 1 ? 'y' : 'ies'} • {rooms.length} room{rooms.length !== 1 ? 's' : ''} zoned
              </p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Total Valuation:</span>
                <span className="font-bold text-slate-900">
                  {totalPropertyValuation > 0
                    ? formatCurrency(totalPropertyValuation, currencyCode, locale)
                    : 'Not set'}
                </span>
              </div>
              {totalSquareFeet > 0 && (
                <div className="flex items-center justify-between text-slate-600">
                  <span>Living Space:</span>
                  <span className="font-semibold text-slate-800">{totalSquareFeet.toLocaleString()} sq ft</span>
                </div>
              )}
            </div>
          </div>

          <button
            id="btn-snapshot-view-properties"
            onClick={() => onNavigate('properties')}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 text-indigo-900 text-xs font-semibold border border-slate-200/80 hover:border-indigo-200 transition cursor-pointer"
          >
            <span>View Properties & Rooms</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2. Assets & Equipment */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-indigo-200 transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-2xs">
                <Wrench className="w-4 h-4" />
              </div>
              {assetHealth && (
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  {assetHealth.score}/100 • {assetHealth.statusLabel}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">Assets & Equipment</h3>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                {assets.length} tracked item{assets.length !== 1 ? 's' : ''} • {operationalRate}% operational
              </p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Asset Valuation:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(totalAssetValuation, currencyCode, locale)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Attention / Expiring:</span>
                <span className={`font-semibold ${attentionAssetsCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                  {attentionAssetsCount} service • {expiringWarrantiesCount} warranty
                </span>
              </div>
            </div>
          </div>

          <button
            id="btn-snapshot-view-assets"
            onClick={() => onNavigate('assets')}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 text-indigo-900 text-xs font-semibold border border-slate-200/80 hover:border-indigo-200 transition cursor-pointer"
          >
            <span>View Assets & Equipment</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3. Finances & Commitments */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-indigo-200 transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-2xs">
                <Wallet className="w-4 h-4" />
              </div>
              {financeHealth && (
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {financeHealth.score}/100 • {financeHealth.statusLabel}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">Finances & Debt</h3>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                {expenses.length} bills • {loans.length} loan{loans.length !== 1 ? 's' : ''} • {creditCards.length} card{creditCards.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Monthly Burn:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(totalMonthlyCommitment, currencyCode, locale)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Debt / Credit Util:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(totalOutstandingLoans + totalCreditCardDebt, currencyCode, locale)} ({overallCreditUtilPercent}%)
                </span>
              </div>
            </div>
          </div>

          <button
            id="btn-snapshot-view-finances"
            onClick={() => onNavigate('finances')}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 text-indigo-900 text-xs font-semibold border border-slate-200/80 hover:border-indigo-200 transition cursor-pointer"
          >
            <span>View Finances & Debts</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4. Maintenance & Upkeep */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-indigo-200 transition">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shadow-2xs">
                <Calendar className="w-4 h-4" />
              </div>
              <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                overdueTasks.length > 0
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {overdueTasks.length > 0 ? `${overdueTasks.length} Overdue` : 'On Schedule'}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">Maintenance & Service</h3>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                {scheduledTasks.length} pending • {completedTasks.length} completed
              </p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>30d Svc Budget:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(upcomingMaintenanceBudget, currencyCode, locale)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Scheduled (30d):</span>
                <span className="font-semibold text-slate-800">{upcomingTasks.length} task{upcomingTasks.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <button
            id="btn-snapshot-view-maintenance"
            onClick={() => onNavigate('maintenance')}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 text-indigo-900 text-xs font-semibold border border-slate-200/80 hover:border-indigo-200 transition cursor-pointer"
          >
            <span>View Maintenance Tasks</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
