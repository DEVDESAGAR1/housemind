import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Calendar,
  Wrench,
  DollarSign,
  CreditCard,
  CheckCircle2,
  ArrowUpRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  HouseholdExpense,
  HomeAsset,
  MaintenanceTask,
  WarrantyPolicy,
  UtilityAccount,
  HouseholdLoan,
  CreditCardAccount,
  HouseholdInsight,
  HouseholdHealthSignal,
} from '../../types';
import { formatCurrency } from '../../config/locationCurrencyConfig';
import { getDateStatus } from './dateUtils';

export type AttentionPriority = 'critical' | 'overdue' | 'due_today' | 'warning' | 'due_soon' | 'info';

export interface AttentionItem {
  id: string;
  priority: AttentionPriority;
  category: 'expense' | 'maintenance' | 'asset' | 'warranty' | 'credit_card' | 'loan' | 'utility' | 'insight' | 'signal';
  title: string;
  subtitle: string;
  dueDate?: string;
  dateStatusLabel?: string;
  daysDiff?: number;
  amount?: number;
  actionTab: string;
  actionLabel: string;
  sourceId?: string;
  rawInsight?: HouseholdInsight;
}

interface NeedsAttentionSectionProps {
  expenses: HouseholdExpense[];
  assets: HomeAsset[];
  maintenances: MaintenanceTask[];
  warranties: WarrantyPolicy[];
  utilities: UtilityAccount[];
  loans: HouseholdLoan[];
  creditCards: CreditCardAccount[];
  insights: HouseholdInsight[];
  healthSignals?: HouseholdHealthSignal[];
  currencyCode: string;
  locale?: string;
  onNavigate: (tab: string) => void;
  onInvestigateInsight?: (insight: HouseholdInsight) => void;
}

export function NeedsAttentionSection({
  expenses,
  assets,
  maintenances,
  warranties,
  utilities,
  loans,
  creditCards,
  insights,
  healthSignals = [],
  currencyCode,
  locale,
  onNavigate,
  onInvestigateInsight,
}: NeedsAttentionSectionProps) {
  const [filter, setFilter] = useState<'all' | 'critical_overdue' | 'due_today' | 'warnings'>('all');

  const attentionItems = useMemo(() => {
    const items: AttentionItem[] = [];
    const seenIds = new Set<string>();

    const safeExpenses = expenses || [];
    const safeCreditCards = creditCards || [];
    const safeMaintenances = maintenances || [];
    const safeAssets = assets || [];
    const safeWarranties = warranties || [];
    const safeInsights = insights || [];
    const safeHealthSignals = healthSignals || [];

    // 1. Expenses / Bills
    for (const exp of safeExpenses) {
      if (exp.paymentStatus !== 'paid' && exp.dueDate) {
        const ds = getDateStatus(exp.dueDate);
        if (ds.status === 'overdue') {
          const isCritical = ds.daysDiff < -14;
          items.push({
            id: `att_exp_${exp.id}`,
            priority: isCritical ? 'critical' : 'overdue',
            category: 'expense',
            title: `${exp.title} is overdue`,
            subtitle: `${ds.label} • ${exp.category.replace('_', ' ')}`,
            dueDate: exp.dueDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            amount: exp.amount,
            actionTab: 'expenses',
            actionLabel: 'Pay / View Bill',
            sourceId: exp.id,
          });
          seenIds.add(`exp_${exp.id}`);
        } else if (ds.status === 'due_today') {
          items.push({
            id: `att_exp_${exp.id}`,
            priority: 'due_today',
            category: 'expense',
            title: `${exp.title} is due today`,
            subtitle: `Due today • ${exp.category.replace('_', ' ')}`,
            dueDate: exp.dueDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            amount: exp.amount,
            actionTab: 'expenses',
            actionLabel: 'Pay Bill',
            sourceId: exp.id,
          });
          seenIds.add(`exp_${exp.id}`);
        } else if (ds.status === 'due_soon') {
          items.push({
            id: `att_exp_${exp.id}`,
            priority: 'due_soon',
            category: 'expense',
            title: `${exp.title} due soon`,
            subtitle: `${ds.label} (${ds.formattedDate})`,
            dueDate: exp.dueDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            amount: exp.amount,
            actionTab: 'expenses',
            actionLabel: 'View Bill',
            sourceId: exp.id,
          });
          seenIds.add(`exp_${exp.id}`);
        }
      }
    }

    // 2. Credit Cards
    for (const cc of safeCreditCards) {
      if (cc.outstandingAmount > 0 && cc.paymentDueDate) {
        const ds = getDateStatus(cc.paymentDueDate);
        if (ds.status === 'overdue') {
          items.push({
            id: `att_cc_${cc.id}`,
            priority: 'overdue',
            category: 'credit_card',
            title: `Credit Card Bill Overdue: ${cc.cardNickname}`,
            subtitle: `${ds.label} • *${cc.last4Digits || '0000'}`,
            dueDate: cc.paymentDueDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            amount: cc.outstandingAmount,
            actionTab: 'debts',
            actionLabel: 'Manage Card',
            sourceId: cc.id,
          });
        } else if (ds.status === 'due_today') {
          items.push({
            id: `att_cc_${cc.id}`,
            priority: 'due_today',
            category: 'credit_card',
            title: `Card Payment Due Today: ${cc.cardNickname}`,
            subtitle: `Due today • Min due: ${formatCurrency(cc.minimumDue || cc.outstandingAmount, currencyCode, locale)}`,
            dueDate: cc.paymentDueDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            amount: cc.outstandingAmount,
            actionTab: 'debts',
            actionLabel: 'Make Payment',
            sourceId: cc.id,
          });
        }
      }

      // High credit utilization check
      if (cc.creditLimit > 0) {
        const utilRatio = cc.outstandingAmount / cc.creditLimit;
        if (utilRatio >= 0.75) {
          items.push({
            id: `att_cc_util_${cc.id}`,
            priority: 'warning',
            category: 'credit_card',
            title: `High Card Utilization: ${cc.cardNickname} (${Math.round(utilRatio * 100)}%)`,
            subtitle: `Outstanding: ${formatCurrency(cc.outstandingAmount, currencyCode, locale)} of ${formatCurrency(cc.creditLimit, currencyCode, locale)} limit`,
            actionTab: 'debts',
            actionLabel: 'Review Debt',
            sourceId: cc.id,
          });
        }
      }
    }

    // 3. Maintenance Tasks
    for (const m of safeMaintenances) {
      if (m.status !== 'completed') {
        const targetDate = m.nextServiceDate || m.serviceDate;
        if (targetDate) {
          const ds = getDateStatus(targetDate);
          if (ds.status === 'overdue') {
            const isCritical = ds.daysDiff < -14;
            items.push({
              id: `att_maint_${m.id}`,
              priority: isCritical ? 'critical' : 'overdue',
              category: 'maintenance',
              title: `Service Overdue: ${m.title}`,
              subtitle: `${ds.label} • Priority: ${(m as any).priority || 'standard'}`,
              dueDate: targetDate,
              dateStatusLabel: ds.label,
              daysDiff: ds.daysDiff,
              amount: m.cost,
              actionTab: 'maintenance',
              actionLabel: 'Log Service',
              sourceId: m.id,
            });
          } else if (ds.status === 'due_today') {
            items.push({
              id: `att_maint_${m.id}`,
              priority: 'due_today',
              category: 'maintenance',
              title: `Maintenance Scheduled Today: ${m.title}`,
              subtitle: `Due today • ${m.serviceProvider || 'Self-service'}`,
              dueDate: targetDate,
              dateStatusLabel: ds.label,
              daysDiff: ds.daysDiff,
              amount: m.cost,
              actionTab: 'maintenance',
              actionLabel: 'View Task',
              sourceId: m.id,
            });
          } else if (ds.status === 'due_soon') {
            items.push({
              id: `att_maint_${m.id}`,
              priority: 'due_soon',
              category: 'maintenance',
              title: `Upcoming Service: ${m.title}`,
              subtitle: `${ds.label} (${ds.formattedDate})`,
              dueDate: targetDate,
              dateStatusLabel: ds.label,
              daysDiff: ds.daysDiff,
              amount: m.cost,
              actionTab: 'maintenance',
              actionLabel: 'View Task',
              sourceId: m.id,
            });
          }
        }
      }
    }

    // 4. Assets Needing Attention
    for (const ast of safeAssets) {
      if (ast.currentStatus === 'critical') {
        items.push({
          id: `att_ast_crit_${ast.id}`,
          priority: 'critical',
          category: 'asset',
          title: `Equipment Failure: ${ast.name}`,
          subtitle: `Status is Critical • ${ast.brand || 'Unspecified brand'} in ${ast.roomLocation || 'Home'}`,
          actionTab: 'assets',
          actionLabel: 'Review Equipment',
          sourceId: ast.id,
        });
      } else if (ast.currentStatus === 'needs_maintenance') {
        items.push({
          id: `att_ast_maint_${ast.id}`,
          priority: 'warning',
          category: 'asset',
          title: `Maintenance Required: ${ast.name}`,
          subtitle: ast.maintenanceNotes || `Equipment marked as needing service in ${ast.roomLocation || 'Home'}`,
          actionTab: 'assets',
          actionLabel: 'Service Asset',
          sourceId: ast.id,
        });
      }
    }

    // 5. Warranties Expiring Soon (< 30 days)
    for (const w of safeWarranties) {
      if (w.endDate) {
        const ds = getDateStatus(w.endDate);
        if (ds.status === 'overdue' && ds.daysDiff >= -14) {
          items.push({
            id: `att_war_exp_${w.id}`,
            priority: 'warning',
            category: 'warranty',
            title: `Warranty Recently Expired: ${w.warrantyProvider || 'Coverage Policy'}`,
            subtitle: `Expired ${ds.label} • Policy #${w.policyNumber || 'N/A'}`,
            dueDate: w.endDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            actionTab: 'maintenance',
            actionLabel: 'Review Policy',
            sourceId: w.id,
          });
        } else if (ds.status === 'due_today' || ds.status === 'due_soon' || (ds.status === 'upcoming' && ds.daysDiff <= 30)) {
          const isImminent = ds.daysDiff <= 7;
          items.push({
            id: `att_war_${w.id}`,
            priority: isImminent ? 'warning' : 'due_soon',
            category: 'warranty',
            title: `Warranty Expiring: ${w.warrantyProvider || 'Coverage Policy'}`,
            subtitle: `${ds.label} (${ds.formattedDate}) • Consider renewing`,
            dueDate: w.endDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            actionTab: 'maintenance',
            actionLabel: 'View Warranty',
            sourceId: w.id,
          });
        }
      }
    }

    // 6. Deterministic Active Insights (High / Critical)
    for (const ins of safeInsights) {
      if (ins.status === 'new' || ins.status === 'viewed') {
        if (ins.severity === 'critical' || ins.severity === 'high') {
          // Avoid duplicate entry if covered already
          items.push({
            id: `att_ins_${ins.id}`,
            priority: ins.severity === 'critical' ? 'critical' : 'warning',
            category: 'insight',
            title: ins.title,
            subtitle: ins.description,
            actionTab: ins.relatedEntityType === 'expense' ? 'expenses' : ins.relatedEntityType === 'asset' ? 'assets' : 'dashboard',
            actionLabel: 'Investigate',
            sourceId: ins.id,
            rawInsight: ins,
          });
        }
      }
    }

    // 7. Health Signals (Critical warnings from Phase 3)
    for (const sig of safeHealthSignals) {
      if (sig.status === 'critical') {
        items.push({
          id: `att_sig_${sig.id}`,
          priority: 'critical',
          category: 'signal',
          title: sig.title,
          subtitle: sig.description,
          actionTab: sig.actionTab || 'dashboard',
          actionLabel: sig.actionLabel || 'Fix Issue',
          sourceId: sig.id,
        });
      }
    }

    // Priority Sort Order: Critical (0) -> Overdue (1) -> Due Today (2) -> Warning (3) -> Due Soon (4) -> Info (5)
    const priorityWeights: Record<AttentionPriority, number> = {
      critical: 0,
      overdue: 1,
      due_today: 2,
      warning: 3,
      due_soon: 4,
      info: 5,
    };

    return items.sort((a, b) => {
      const diff = priorityWeights[a.priority] - priorityWeights[b.priority];
      if (diff !== 0) return diff;
      return (a.daysDiff ?? 999) - (b.daysDiff ?? 999);
    });
  }, [expenses, assets, maintenances, warranties, utilities, loans, creditCards, insights, healthSignals, currencyCode, locale]);

  // Counts
  const criticalOverdueCount = attentionItems.filter((i) => i.priority === 'critical' || i.priority === 'overdue').length;
  const dueTodayCount = attentionItems.filter((i) => i.priority === 'due_today').length;
  const warningCount = attentionItems.filter((i) => i.priority === 'warning' || i.priority === 'due_soon').length;

  const filteredItems = useMemo(() => {
    if (filter === 'critical_overdue') {
      return attentionItems.filter((i) => i.priority === 'critical' || i.priority === 'overdue');
    }
    if (filter === 'due_today') {
      return attentionItems.filter((i) => i.priority === 'due_today');
    }
    if (filter === 'warnings') {
      return attentionItems.filter((i) => i.priority === 'warning' || i.priority === 'due_soon');
    }
    return attentionItems;
  }, [attentionItems, filter]);

  const getPriorityBadge = (priority: AttentionPriority) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <ShieldAlert className="w-3 h-3" />
            Critical
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Clock className="w-3 h-3" />
            Overdue
          </span>
        );
      case 'due_today':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <Calendar className="w-3 h-3" />
            Due Today
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            Warning
          </span>
        );
      case 'due_soon':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Clock className="w-3 h-3" />
            Due Soon
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-700">
            <Info className="w-3 h-3" />
            Info
          </span>
        );
    }
  };

  const getCategoryIcon = (cat: AttentionItem['category']) => {
    switch (cat) {
      case 'expense':
      case 'utility':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'credit_card':
      case 'loan':
        return <CreditCard className="w-4 h-4 text-indigo-600" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-amber-600" />;
      case 'asset':
        return <Wrench className="w-4 h-4 text-rose-600" />;
      case 'warranty':
        return <ShieldAlert className="w-4 h-4 text-blue-600" />;
      case 'insight':
      case 'signal':
        return <Sparkles className="w-4 h-4 text-violet-600" />;
    }
  };

  return (
    <div
      id="household-command-center-needs-attention"
      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-5"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-2xs ${
              criticalOverdueCount > 0
                ? 'bg-rose-600 text-white animate-pulse'
                : attentionItems.length > 0
                ? 'bg-amber-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}>
              {criticalOverdueCount > 0 ? (
                <ShieldAlert className="w-4 h-4" />
              ) : attentionItems.length > 0 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Needs Attention</h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                criticalOverdueCount > 0
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : attentionItems.length > 0
                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {attentionItems.length} Item{attentionItems.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time actionable queue answering <em>"What needs my attention?"</em> across all home domains.
          </p>
        </div>

        {/* Filter Pills */}
        {attentionItems.length > 0 && (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium self-start sm:self-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({attentionItems.length})
            </button>
            <button
              onClick={() => setFilter('critical_overdue')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filter === 'critical_overdue'
                  ? 'bg-white text-rose-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overdue ({criticalOverdueCount})
            </button>
            {dueTodayCount > 0 && (
              <button
                onClick={() => setFilter('due_today')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filter === 'due_today'
                    ? 'bg-white text-amber-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Due Today ({dueTodayCount})
              </button>
            )}
            <button
              onClick={() => setFilter('warnings')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filter === 'warnings'
                  ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Warnings ({warningCount})
            </button>
          </div>
        )}
      </div>

      {/* Attention Item List */}
      {filteredItems.length === 0 ? (
        <div className="py-8 text-center px-4 bg-emerald-50/40 rounded-2xl border border-dashed border-emerald-200">
          <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900">
            {filter === 'all'
              ? 'All Clear — No urgent items require attention'
              : 'No items matching this filter'}
          </h3>
          <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
            All equipment is operational, bills and loans are current, and maintenance tasks are up to date.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isCriticalOrOverdue = item.priority === 'critical' || item.priority === 'overdue';
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.priority === 'critical'
                    ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
                    : item.priority === 'overdue'
                    ? 'bg-rose-50/30 border-rose-200/80 hover:border-rose-300'
                    : item.priority === 'due_today'
                    ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400'
                    : item.priority === 'warning'
                    ? 'bg-amber-50/30 border-amber-200 hover:border-amber-300'
                    : 'bg-slate-50/60 border-slate-200 hover:border-indigo-200'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${
                      isCriticalOrOverdue
                        ? 'bg-rose-100 text-rose-700'
                        : item.priority === 'due_today'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {getCategoryIcon(item.category)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {getPriorityBadge(item.priority)}
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                {/* Right Side: Amount (if any) & Action Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                  {item.amount !== undefined && item.amount > 0 && (
                    <div className="text-left sm:text-right">
                      <div className="text-xs sm:text-sm font-bold text-slate-900">
                        {formatCurrency(item.amount, currencyCode, locale)}
                      </div>
                      <div className="text-[10px] text-slate-500">Amount</div>
                    </div>
                  )}

                  <button
                    id={`btn-act-${item.id}`}
                    onClick={() => {
                      if (item.rawInsight && onInvestigateInsight) {
                        onInvestigateInsight(item.rawInsight);
                      } else {
                        onNavigate(item.actionTab);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                      isCriticalOrOverdue
                        ? 'bg-rose-700 hover:bg-rose-800 text-white'
                        : item.priority === 'due_today'
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-slate-900 hover:bg-indigo-600 text-white'
                    }`}
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
