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
  HelpCircle,
  ChevronDown,
  ChevronUp,
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
import { WhyAmISeeingThisModal, WhyEvidencePayload } from '../WhyAmISeeingThisModal';

export type AttentionPriority = 'critical' | 'overdue' | 'due_today' | 'warning' | 'due_soon' | 'info';

export interface AttentionItem {
  id: string;
  priority: AttentionPriority;
  category: 'expense' | 'maintenance' | 'asset' | 'warranty' | 'credit_card' | 'loan' | 'utility' | 'insight' | 'signal';
  title: string;
  subtitle: string;
  whatHappened: string;
  whyItMatters: string;
  whatToDoNext: string;
  dueDate?: string;
  dateStatusLabel?: string;
  daysDiff?: number;
  amount?: number;
  actionTab: string;
  actionSubTab?: string;
  actionEntityId?: string;
  actionLabel: string;
  sourceId?: string;
  rawInsight?: HouseholdInsight;
  evidencePayload?: WhyEvidencePayload;
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
  onNavigate: (tab: string, subTab?: string, entityId?: string) => void;
  onInvestigateInsight?: (insight: HouseholdInsight) => void;
}

const INITIAL_VISIBLE_COUNT = 3;

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
  const [showAll, setShowAll] = useState(false);
  const [activeWhyEvidence, setActiveWhyEvidence] = useState<WhyEvidencePayload | null>(null);

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
        const formattedAmount = exp.amount ? formatCurrency(exp.amount, currencyCode, locale) : '';

        if (ds.status === 'overdue') {
          const isCritical = ds.daysDiff < -14;
          const priority: AttentionPriority = isCritical ? 'critical' : 'overdue';
          const whatHappened = `Bill payment of ${formattedAmount} was due on ${exp.dueDate} (${ds.label}).`;
          const whyItMatters = isCritical
            ? 'Severe delinquency risk (>14 days past due). May incur late penalty charges or service disruption.'
            : 'Payment is past the scheduled due date. Prompt settlement avoids late fees.';
          const whatToDoNext = `Pay ${formattedAmount} to settle the ${exp.title} statement.`;

          items.push({
            id: `att_exp_${exp.id}`,
            priority,
            category: 'expense',
            title: `${exp.title} is overdue`,
            subtitle: `${ds.label} • ${(exp.category || 'General').replace('_', ' ')}`,
            whatHappened,
            whyItMatters,
            whatToDoNext,
            dueDate: exp.dueDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            amount: exp.amount,
            actionTab: 'expenses',
            actionEntityId: exp.id,
            actionLabel: 'Pay / View Bill',
            sourceId: exp.id,
            evidencePayload: {
              title: `${exp.title} Overdue Payment`,
              category: 'Household Finances',
              badge: { label: isCritical ? 'Critical Overdue' : 'Overdue', variant: isCritical ? 'critical' : 'overdue' },
              whatDetected: whatHappened,
              detectedSignals: [
                `Due date: ${exp.dueDate}`,
                `Overdue by: ${Math.abs(ds.daysDiff)} days`,
                `Amount: ${formattedAmount}`,
                `Category: ${(exp.category || 'General').replace('_', ' ')}`,
              ],
              relevantDate: exp.dueDate,
              severityOrPriority: isCritical ? 'Critical' : 'High',
              whyItMatters,
              whatToDoNext,
              sources: [{ title: exp.title, domain: 'expenses', route: 'expenses', entityId: exp.id }],
            },
          });
          seenIds.add(`exp_${exp.id}`);
        } else if (ds.status === 'due_today') {
          const whatHappened = `Payment of ${formattedAmount} for ${exp.title} is due today.`;
          const whyItMatters = 'Settling obligations on time protects household credit and prevents late fees.';
          const whatToDoNext = `Submit payment of ${formattedAmount} today.`;

          items.push({
            id: `att_exp_${exp.id}`,
            priority: 'due_today',
            category: 'expense',
            title: `${exp.title} is due today`,
            subtitle: `Due today • ${(exp.category || 'General').replace('_', ' ')}`,
            whatHappened,
            whyItMatters,
            whatToDoNext,
            dueDate: exp.dueDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            amount: exp.amount,
            actionTab: 'expenses',
            actionEntityId: exp.id,
            actionLabel: 'Pay Bill',
            sourceId: exp.id,
            evidencePayload: {
              title: `${exp.title} Due Today`,
              category: 'Household Finances',
              badge: { label: 'Due Today', variant: 'due_today' },
              whatDetected: whatHappened,
              detectedSignals: [`Scheduled date: Today (${exp.dueDate})`, `Amount: ${formattedAmount}`],
              relevantDate: exp.dueDate,
              whyItMatters,
              whatToDoNext,
              sources: [{ title: exp.title, domain: 'expenses', route: 'expenses', entityId: exp.id }],
            },
          });
          seenIds.add(`exp_${exp.id}`);
        } else if (ds.status === 'due_soon') {
          const whatHappened = `${exp.title} of ${formattedAmount} is coming due in ${ds.daysDiff} days.`;
          const whyItMatters = 'Advance visibility allows planning cash flow before the payment due date.';
          const whatToDoNext = `Review the upcoming bill and verify account funding.`;

          items.push({
            id: `att_exp_${exp.id}`,
            priority: 'due_soon',
            category: 'expense',
            title: `${exp.title} due soon`,
            subtitle: `${ds.label} (${ds.formattedDate})`,
            whatHappened,
            whyItMatters,
            whatToDoNext,
            dueDate: exp.dueDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            amount: exp.amount,
            actionTab: 'expenses',
            actionEntityId: exp.id,
            actionLabel: 'View Bill',
            sourceId: exp.id,
          });
          seenIds.add(`exp_${exp.id}`);
        }
      }
    }

    // 2. Credit Cards (High Utilization or Due Dates)
    for (const cc of safeCreditCards) {
      const balance = Number(cc.currentBalance) || 0;
      const limit = Number(cc.creditLimit) || 1;
      const utilPct = Math.round((balance / limit) * 100);
      const formattedBalance = formatCurrency(balance, currencyCode, locale);

      if (utilPct >= 75) {
        const whatHappened = `${cc.cardName || 'Credit Card'} balance (${formattedBalance}) exceeds ${utilPct}% of the credit limit.`;
        const whyItMatters = 'High credit utilization lowers overall household financial health and incurs higher interest.';
        const whatToDoNext = 'Make a principal payment to reduce utilization below 30%.';

        items.push({
          id: `att_cc_util_${cc.id}`,
          priority: utilPct >= 90 ? 'critical' : 'warning',
          category: 'credit_card',
          title: `High Card Utilization: ${cc.cardName || 'Credit Card'} (${utilPct}%)`,
          subtitle: `${formattedBalance} of ${formatCurrency(limit, currencyCode, locale)} used`,
          whatHappened,
          whyItMatters,
          whatToDoNext,
          amount: balance,
          actionTab: 'utilities',
          actionSubTab: 'cards',
          actionEntityId: cc.id,
          actionLabel: 'Manage Card',
          sourceId: cc.id,
          evidencePayload: {
            title: `${cc.cardName} Credit Utilization Alert`,
            category: 'Financial Health',
            badge: { label: `${utilPct}% Utilization`, variant: utilPct >= 90 ? 'critical' : 'warning' },
            whatDetected: whatHappened,
            detectedSignals: [
              `Current Balance: ${formattedBalance}`,
              `Credit Limit: ${formatCurrency(limit, currencyCode, locale)}`,
              `Utilization Ratio: ${utilPct}% (Recommended: <30%)`,
            ],
            whyItMatters,
            whatToDoNext,
            sources: [{ title: cc.cardName, domain: 'cards', route: 'utilities', subTab: 'cards', entityId: cc.id }],
          },
        });
      }

      if (cc.paymentDueDate && balance > 0) {
        const ds = getDateStatus(cc.paymentDueDate);
        const cardTitle = cc.cardNickname || cc.cardName || 'Credit Card';
        const minDue = cc.minimumDue ?? cc.minimumPaymentDue ?? balance;
        if (ds.status === 'overdue') {
          items.push({
            id: `att_cc_due_${cc.id}`,
            priority: 'critical',
            category: 'credit_card',
            title: `${cardTitle} Payment Overdue`,
            subtitle: `${ds.label} • Minimum Due: ${formatCurrency(minDue, currencyCode, locale)}`,
            whatHappened: `Payment on ${cardTitle} was due on ${cc.paymentDueDate} (${ds.label}).`,
            whyItMatters: 'Late credit card payments trigger penalty APRs and credit score impact.',
            whatToDoNext: 'Pay at least the minimum due immediately.',
            dueDate: cc.paymentDueDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            amount: minDue,
            actionTab: 'utilities',
            actionSubTab: 'cards',
            actionEntityId: cc.id,
            actionLabel: 'Pay Card',
            sourceId: cc.id,
          });
        }
      }
    }

    // 3. Maintenance Tasks (Overdue or Due Today)
    for (const task of safeMaintenances) {
      if (task.status !== 'completed' && (task.dueDate || task.scheduledDate || task.serviceDate)) {
        const targetDate = task.dueDate || task.scheduledDate || task.serviceDate;
        const ds = getDateStatus(targetDate);
        const relatedAsset = safeAssets.find((a) => a.id === task.assetId);
        const assetName = relatedAsset?.name || 'Equipment';

        if (ds.status === 'overdue') {
          const isCritical = ds.daysDiff < -30 || (task.cost && task.cost >= 500) || (task.estimatedCost && task.estimatedCost >= 500);
          const priority: AttentionPriority = isCritical ? 'critical' : 'overdue';
          const whatHappened = `Scheduled maintenance for ${assetName} ("${task.title}") passed on ${targetDate} (${ds.label}).`;
          const whyItMatters = isCritical
            ? 'Extended deferral increases the risk of component failure, higher repair bills, or voiding warranty.'
            : 'Routine servicing prevents premature wear and maintains energy efficiency.';
          const whatToDoNext = `Schedule service visit or complete the "${task.title}" checklist.`;

          items.push({
            id: `att_task_${task.id}`,
            priority,
            category: 'maintenance',
            title: `Overdue Maintenance: ${task.title}`,
            subtitle: `${ds.label} • ${assetName}`,
            whatHappened,
            whyItMatters,
            whatToDoNext,
            dueDate: targetDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            actionTab: 'maintenance',
            actionSubTab: 'maintenance',
            actionEntityId: task.id,
            actionLabel: 'View Maintenance',
            sourceId: task.id,
            evidencePayload: {
              title: `${task.title} Maintenance Overdue`,
              category: 'Appliance & Maintenance',
              badge: { label: isCritical ? 'Critical Maintenance' : 'Overdue', variant: isCritical ? 'critical' : 'overdue' },
              whatDetected: whatHappened,
              detectedSignals: [
                `Asset: ${assetName}`,
                `Scheduled date: ${targetDate}`,
                `Overdue by: ${Math.abs(ds.daysDiff)} days`,
                `Cost Estimate: ${formatCurrency(task.cost || task.estimatedCost || 0, currencyCode, locale)}`,
              ],
              relevantDate: targetDate,
              severityOrPriority: isCritical ? 'Critical' : 'High',
              whyItMatters,
              whatToDoNext,
              sources: [
                { title: task.title, domain: 'maintenance', route: 'maintenance', subTab: 'maintenance', entityId: task.id },
                ...(relatedAsset ? [{ title: relatedAsset.name, domain: 'assets', route: 'assets', entityId: relatedAsset.id }] : []),
              ],
            },
          });
          seenIds.add(`task_${task.id}`);
        } else if (ds.status === 'due_today') {
          items.push({
            id: `att_task_${task.id}`,
            priority: 'due_today',
            category: 'maintenance',
            title: `Maintenance Due Today: ${task.title}`,
            subtitle: `Due today • ${assetName}`,
            whatHappened: `Maintenance task "${task.title}" for ${assetName} is scheduled for today.`,
            whyItMatters: 'Completing maintenance on schedule keeps appliances running at peak performance.',
            whatToDoNext: 'Perform the inspection or confirm technician arrival.',
            dueDate: targetDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            actionTab: 'maintenance',
            actionSubTab: 'maintenance',
            actionEntityId: task.id,
            actionLabel: 'Log / Complete',
            sourceId: task.id,
          });
          seenIds.add(`task_${task.id}`);
        }
      }
    }

    // 4. Asset Reliability / Recurring Issues / Condition
    for (const asset of safeAssets) {
      const isAssetNeedingAttention =
        asset.currentStatus === 'needs_maintenance' ||
        asset.currentStatus === 'critical' ||
        asset.status === 'needs_maintenance' ||
        asset.status === 'critical';

      if (isAssetNeedingAttention && !seenIds.has(`asset_${asset.id}`)) {
        const whatHappened = `${asset.name} is flagged as needing maintenance or in critical status.`;
        const whyItMatters = 'Unaddressed degradation can lead to total equipment failure and unexpected emergency costs.';
        const whatToDoNext = 'Inspect equipment condition or review replacement options.';

        items.push({
          id: `att_asset_${asset.id}`,
          priority: 'warning',
          category: 'asset',
          title: `Attention Needed: ${asset.name}`,
          subtitle: `Status: ${asset.currentStatus || asset.status || 'Needs Review'} • ${asset.roomLocation || 'Main House'}`,
          whatHappened,
          whyItMatters,
          whatToDoNext,
          actionTab: 'assets',
          actionEntityId: asset.id,
          actionLabel: 'Inspect Asset',
          sourceId: asset.id,
          evidencePayload: {
            title: `${asset.name} Reliability Risk`,
            category: 'Home Assets',
            badge: { label: 'Status Warning', variant: 'warning' },
            whatDetected: whatHappened,
            detectedSignals: [
              `Asset: ${asset.name}`,
              `Category: ${asset.category || 'Appliance'}`,
              `Location: ${asset.roomLocation || 'Main House'}`,
              `Reported Status: ${asset.currentStatus || asset.status || 'Needs Maintenance'}`,
            ],
            whyItMatters,
            whatToDoNext,
            sources: [{ title: asset.name, domain: 'assets', route: 'assets', entityId: asset.id }],
          },
        });
      }
    }

    // 5. Expiring Warranties (Within 30 Days or Expired)
    for (const w of safeWarranties) {
      if (w.endDate) {
        const ds = getDateStatus(w.endDate);
        if (ds.status === 'overdue' && ds.daysDiff > -60) {
          const whatHappened = `Warranty coverage with ${w.warrantyProvider || 'provider'} expired ${Math.abs(ds.daysDiff)} days ago.`;
          const whyItMatters = 'Equipment is now out of manufacturer warranty. Any subsequent repairs are 100% out-of-pocket.';
          const whatToDoNext = 'Consider an extended annual maintenance contract (AMC) or verify current coverage.';

          items.push({
            id: `att_war_${w.id}`,
            priority: 'warning',
            category: 'warranty',
            title: `Warranty Expired: ${w.warrantyProvider || 'Coverage Policy'}`,
            subtitle: `Expired ${ds.label} • Policy #${w.policyNumber || 'N/A'}`,
            whatHappened,
            whyItMatters,
            whatToDoNext,
            dueDate: w.endDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            actionTab: 'maintenance',
            actionSubTab: 'warranties',
            actionEntityId: w.id,
            actionLabel: 'Review Policy',
            sourceId: w.id,
            evidencePayload: {
              title: `${w.warrantyProvider || 'Warranty'} Expired`,
              category: 'Warranty & Protection',
              badge: { label: 'Expired', variant: 'warning' },
              whatDetected: whatHappened,
              detectedSignals: [`Provider: ${w.warrantyProvider || 'N/A'}`, `End Date: ${w.endDate}`, `Policy #: ${w.policyNumber || 'N/A'}`],
              relevantDate: w.endDate,
              whyItMatters,
              whatToDoNext,
              sources: [{ title: w.warrantyProvider || 'Warranty Policy', domain: 'warranties', route: 'maintenance', subTab: 'warranties', entityId: w.id }],
            },
          });
        } else if (ds.status === 'due_today' || ds.status === 'due_soon' || (ds.status === 'upcoming' && ds.daysDiff <= 30)) {
          const isImminent = ds.daysDiff <= 7;
          const whatHappened = `Warranty coverage with ${w.warrantyProvider || 'provider'} expires in ${ds.daysDiff} days (${w.endDate}).`;
          const whyItMatters = 'Expiring warranty leaves future breakdowns unprotected.';
          const whatToDoNext = 'Schedule a pre-expiry inspection or renew extended coverage before expiration.';

          items.push({
            id: `att_war_${w.id}`,
            priority: isImminent ? 'warning' : 'due_soon',
            category: 'warranty',
            title: `Warranty Expiring: ${w.warrantyProvider || 'Coverage Policy'}`,
            subtitle: `${ds.label} (${ds.formattedDate}) • Consider renewing`,
            whatHappened,
            whyItMatters,
            whatToDoNext,
            dueDate: w.endDate,
            dateStatusLabel: ds.label,
            daysDiff: ds.daysDiff,
            actionTab: 'maintenance',
            actionSubTab: 'warranties',
            actionEntityId: w.id,
            actionLabel: 'View Warranty',
            sourceId: w.id,
          });
        }
      }
    }

    // 6. Active Insights (High / Critical)
    for (const ins of safeInsights) {
      if (ins.status === 'new' || ins.status === 'viewed') {
        if (ins.severity === 'critical' || ins.severity === 'high') {
          items.push({
            id: `att_ins_${ins.id}`,
            priority: ins.severity === 'critical' ? 'critical' : 'warning',
            category: 'insight',
            title: ins.title,
            subtitle: ins.description,
            whatHappened: ins.title,
            whyItMatters: ins.description,
            whatToDoNext: 'Investigate the detected anomaly and execute recommended corrective actions.',
            actionTab: ins.relatedEntityType === 'expense' ? 'expenses' : ins.relatedEntityType === 'asset' ? 'assets' : 'dashboard',
            actionLabel: 'Investigate',
            sourceId: ins.id,
            rawInsight: ins,
          });
        }
      }
    }

    // 7. Health Signals (Critical warnings)
    for (const sig of safeHealthSignals) {
      if (sig.status === 'critical') {
        items.push({
          id: `att_sig_${sig.id}`,
          priority: 'critical',
          category: 'signal',
          title: sig.title,
          subtitle: sig.description,
          whatHappened: sig.title,
          whyItMatters: sig.description,
          whatToDoNext: 'Resolve this critical household system signal to improve your Household Health Score.',
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

  // Visible Items (Attention Budget)
  const visibleItems = showAll ? filteredItems : filteredItems.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = filteredItems.length - visibleItems.length;

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
      case 'warranty':
        return <Sparkles className="w-4 h-4 text-indigo-600" />;
      case 'asset':
        return <Wrench className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    }
  };

  const handleOpenWhyModal = (item: AttentionItem) => {
    if (item.evidencePayload) {
      setActiveWhyEvidence(item.evidencePayload);
    } else {
      setActiveWhyEvidence({
        title: item.title,
        category: item.category,
        badge: { label: item.priority.replace('_', ' '), variant: item.priority },
        whatDetected: item.whatHappened || item.title,
        whyItMatters: item.whyItMatters || item.subtitle,
        whatToDoNext: item.whatToDoNext || `Click ${item.actionLabel} to resolve.`,
        relevantDate: item.dueDate,
        sources: item.sourceId
          ? [{ title: item.title, domain: item.category, route: item.actionTab, subTab: item.actionSubTab, entityId: item.actionEntityId }]
          : [],
        primaryAction: {
          label: item.actionLabel,
          onExecute: () => {
            if (item.rawInsight && onInvestigateInsight) {
              onInvestigateInsight(item.rawInsight);
            } else {
              onNavigate(item.actionTab, item.actionSubTab, item.actionEntityId);
            }
          },
        },
      });
    }
  };

  return (
    <div
      id="needs-attention-section"
      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-5 relative"
    >
      {/* Tier 1 Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
              T1
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
              Needs Attention Now
            </span>
            {attentionItems.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                {attentionItems.length}
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Urgent Household Obligations & Warnings
          </h2>
          <p className="text-xs text-slate-500">
            Real-time actionable queue answering <em>"What needs my attention?"</em> across all home domains.
          </p>
        </div>

        {/* Filter Pills */}
        {attentionItems.length > 0 && (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setShowAll(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({attentionItems.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter('critical_overdue');
                setShowAll(false);
              }}
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
                type="button"
                onClick={() => {
                  setFilter('due_today');
                  setShowAll(false);
                }}
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
              type="button"
              onClick={() => {
                setFilter('warnings');
                setShowAll(false);
              }}
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
          {visibleItems.map((item) => {
            const isCriticalOrOverdue = item.priority === 'critical' || item.priority === 'overdue';
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  item.priority === 'critical'
                    ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
                    : item.priority === 'overdue'
                    ? 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300'
                    : item.priority === 'due_today'
                    ? 'bg-amber-50/70 border-amber-300 hover:border-amber-400'
                    : item.priority === 'warning'
                    ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                    : 'bg-slate-50/60 border-slate-200 hover:border-indigo-200'
                }`}
              >
                {/* Left Side: Icon & Progressive 4-Part Structure */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
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

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getPriorityBadge(item.priority)}
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {item.title}
                      </h4>
                      {item.dateStatusLabel && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          • {item.dateStatusLabel}
                        </span>
                      )}
                    </div>

                    {/* Progressive Disclosure: What happened / Why it matters */}
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p className="line-clamp-2 leading-relaxed">
                        <strong className="text-slate-700">What happened:</strong> {item.whatHappened || item.subtitle}
                      </p>
                      {item.whyItMatters && item.whyItMatters !== item.whatHappened && (
                        <p className="line-clamp-1 text-slate-500 text-[11.5px]">
                          <strong className="text-slate-600">Why it matters:</strong> {item.whyItMatters}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Amount, Why Info Button & Action CTA */}
                <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                  {item.amount !== undefined && item.amount > 0 && (
                    <div className="text-left md:text-right pr-2">
                      <div className="text-xs sm:text-sm font-bold text-slate-900">
                        {formatCurrency(item.amount, currencyCode, locale)}
                      </div>
                      <div className="text-[10px] text-slate-500">Amount</div>
                    </div>
                  )}

                  {/* Why am I seeing this trigger */}
                  <button
                    type="button"
                    onClick={() => handleOpenWhyModal(item)}
                    aria-label={`Why am I seeing ${item.title}`}
                    title="Why am I seeing this?"
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition cursor-pointer shadow-2xs"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">Why?</span>
                  </button>

                  {/* Primary Direct Action */}
                  <button
                    id={`btn-act-${item.id}`}
                    type="button"
                    onClick={() => {
                      if (item.rawInsight && onInvestigateInsight) {
                        onInvestigateInsight(item.rawInsight);
                      } else {
                        onNavigate(item.actionTab, item.actionSubTab, item.actionEntityId);
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

          {/* Attention Budget: Expand / Collapse Toggle */}
          {filteredItems.length > INITIAL_VISIBLE_COUNT && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                id="btn-toggle-attention-budget"
                onClick={() => setShowAll(!showAll)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                {showAll ? (
                  <>
                    <span>Show top {INITIAL_VISIBLE_COUNT} urgent items</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>View {hiddenCount} more items needing attention</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grounded Why Am I Seeing This Modal */}
      <WhyAmISeeingThisModal
        isOpen={!!activeWhyEvidence}
        onClose={() => setActiveWhyEvidence(null)}
        evidence={activeWhyEvidence}
        onNavigate={onNavigate}
      />
    </div>
  );
}
