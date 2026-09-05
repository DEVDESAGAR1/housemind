import crypto from 'crypto';
import { DatabaseService } from './dbService';
import { HouseholdHealthService } from './householdHealthService';
import { CrossDomainIntelligenceService } from './crossDomainIntelligenceService';
import { IssueIntelligenceService } from './issueIntelligenceService';
import {
  UnifiedHouseholdAction,
  UnifiedHouseholdActionType,
  UnifiedHouseholdActionPriority,
  UnifiedHouseholdActionStatus,
  UnifiedHouseholdActionsResponse,
  UnifiedActionTarget,
  UnifiedRecommendedActionItem,
  HouseholdDomain,
} from '../../src/types';

// Tenant-scoped state storage for lifecycle actions (in-memory with persistent safety)
interface TenantLifecycleState {
  dismissed: Set<string>; // set of fingerprint or id
  snoozed: Map<string, string>; // fingerprint/id -> ISO date string
  completed: Map<string, string>; // fingerprint/id -> ISO date string
}

const tenantLifecycleStores = new Map<string, TenantLifecycleState>();

function getTenantStore(userId: string): TenantLifecycleState {
  if (!tenantLifecycleStores.has(userId)) {
    tenantLifecycleStores.set(userId, {
      dismissed: new Set<string>(),
      snoozed: new Map<string, string>(),
      completed: new Map<string, string>(),
    });
  }
  return tenantLifecycleStores.get(userId)!;
}

/**
 * Deterministic fingerprint generator for unified household actions
 */
export function generateUnifiedActionFingerprint(
  type: UnifiedHouseholdActionType,
  entityId: string,
  qualifier: string | number = ''
): string {
  const raw = `unified_action:${type}:${entityId}:${qualifier}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24);
}

const PRIORITY_WEIGHTS: Record<UnifiedHouseholdActionPriority, number> = {
  critical: 5,
  overdue: 4,
  due_today: 3,
  warning: 2,
  due_soon: 1,
};

export class UnifiedHouseholdActionService {
  /**
   * Generates prioritized, deduplicated, and actionable recommendations across all household domains.
   */
  public static async getUnifiedActions(
    userId: string,
    options?: {
      priority?: string;
      domain?: string;
      status?: string;
      limit?: number;
      referenceDate?: Date;
    }
  ): Promise<UnifiedHouseholdActionsResponse> {
    const refDate = options?.referenceDate || new Date();
    const todayStr = refDate.toISOString().split('T')[0];
    const in7DaysStr = new Date(refDate.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const in30DaysStr = new Date(refDate.getTime() + 30 * 86400000).toISOString().split('T')[0];

    const store = getTenantStore(userId);

    // Fetch all domain datasets in parallel
    const [
      profile,
      properties,
      rooms,
      assets,
      warranties,
      maintenances,
      issues,
      expenses,
      utilities,
      loans,
      creditCards,
      documents,
      healthReport,
    ] = await Promise.all([
      DatabaseService.getProfile(userId).catch(() => null),
      DatabaseService.listProperties(userId),
      DatabaseService.listRooms(userId),
      DatabaseService.listAssets(userId),
      DatabaseService.listWarranties(userId),
      DatabaseService.listMaintenances(userId),
      DatabaseService.listIssues(userId),
      DatabaseService.listExpenses(userId),
      DatabaseService.listUtilities(userId),
      DatabaseService.listLoans(userId),
      DatabaseService.listCreditCards(userId),
      DatabaseService.listDocuments(userId),
      HouseholdHealthService.getHouseholdHealth(userId, { includeAiExplanation: false }).catch(() => null),
    ]);

    const currency = profile?.currency || 'USD';
    const actions: UnifiedHouseholdAction[] = [];

    // Lookup index maps
    const assetMap = new Map(assets.map((a) => [a.id, a]));
    const roomMap = new Map(rooms.map((r) => [r.id, r]));
    const propertyMap = new Map(properties.map((p) => [p.id, p]));

    // Group issues by asset
    const issuesByAsset = new Map<string, typeof issues>();
    for (const issue of issues) {
      if (issue.assetId) {
        const list = issuesByAsset.get(issue.assetId) || [];
        list.push(issue);
        issuesByAsset.set(issue.assetId, list);
      }
    }

    // Group expenses by asset
    const expensesByAsset = new Map<string, typeof expenses>();
    for (const exp of expenses) {
      const aId = (exp as any).assetId;
      if (aId) {
        const list = expensesByAsset.get(aId) || [];
        list.push(exp);
        expensesByAsset.set(aId, list);
      }
    }

    // Group warranties by asset
    const warrantiesByAsset = new Map<string, typeof warranties>();
    for (const war of warranties) {
      if (war.assetId) {
        const list = warrantiesByAsset.get(war.assetId) || [];
        list.push(war);
        warrantiesByAsset.set(war.assetId, list);
      }
    }

    // Track assets that have already been grouped into composite decisions to avoid duplicate lower-value alerts
    const assetsWithCompoundAction = new Set<string>();

    // ---------------------------------------------------------------------------
    // 1. COMPOUND ASSET DECISION: REPAIR VS. REPLACE & WARRANTY LEVERAGE
    // ---------------------------------------------------------------------------
    for (const asset of assets) {
      const assetIssues = issuesByAsset.get(asset.id) || [];
      const openIssues = assetIssues.filter(
        (i) => !['resolved', 'verified', 'closed', 'cancelled'].includes(i.status)
      );
      const assetExpenses = expensesByAsset.get(asset.id) || [];
      const repairExpenses = assetExpenses.filter(
        (e) => e.category === 'maintenance' || e.category === 'services' || (e.title && e.title.toLowerCase().includes('repair'))
      );
      const totalRepairCost = repairExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const assetWarranties = warrantiesByAsset.get(asset.id) || [];
      const activeWarranty = assetWarranties.find(
        (w) => (w.status === 'active' || w.status === 'expiring_soon') && (!w.endDate || w.endDate >= todayStr)
      );
      const warrantyExpiringSoon = activeWarranty && activeWarranty.endDate && activeWarranty.endDate <= in30DaysStr;

      const isHighRepairCost = totalRepairCost > 5000 || (asset.purchasePrice && totalRepairCost >= asset.purchasePrice * 0.4);
      const isRepeatedIssues = assetIssues.length >= 2;

      if ((isRepeatedIssues || isHighRepairCost) && (openIssues.length > 0 || warrantyExpiringSoon)) {
        assetsWithCompoundAction.add(asset.id);

        const daysUntilExpiry = activeWarranty?.endDate
          ? Math.ceil((new Date(activeWarranty.endDate).getTime() - refDate.getTime()) / 86400000)
          : null;

        const hasCriticalIssue = openIssues.some((i) => i.severity === 'critical' || i.severity === 'high');
        const priority: UnifiedHouseholdActionPriority = hasCriticalIssue ? 'critical' : warrantyExpiringSoon ? 'warning' : 'warning';

        const facts: string[] = [
          `${asset.name} has ${assetIssues.length} recorded issue${assetIssues.length > 1 ? 's' : ''} (${openIssues.length} currently unresolved).`,
        ];
        if (totalRepairCost > 0) {
          facts.push(`${currency} ${totalRepairCost.toLocaleString()} recorded in accumulated repair costs.`);
        }
        if (activeWarranty) {
          facts.push(
            `Covered under ${activeWarranty.warrantyProvider} warranty${
              daysUntilExpiry !== null ? ` (expires in ${daysUntilExpiry} days on ${activeWarranty.endDate})` : ''
            }.`
          );
        } else {
          facts.push('Currently operating with no active warranty coverage.');
        }

        const relatedRecords: UnifiedActionTarget[] = [
          {
            id: asset.id,
            domain: 'assets',
            title: asset.name,
            type: asset.category,
            route: 'assets',
            entityId: asset.id,
          },
        ];

        for (const i of openIssues.slice(0, 2)) {
          relatedRecords.push({
            id: i.id,
            domain: 'issues',
            title: i.title,
            type: i.severity,
            route: 'maintenance',
            subTab: 'issues',
            entityId: i.id,
          });
        }

        if (activeWarranty) {
          relatedRecords.push({
            id: activeWarranty.id,
            domain: 'warranties',
            title: `${activeWarranty.warrantyProvider} Warranty`,
            route: 'maintenance',
            subTab: 'warranties',
            entityId: activeWarranty.id,
          });
        }

        const recommendedActions: UnifiedRecommendedActionItem[] = [];
        if (openIssues.length > 0) {
          recommendedActions.push({
            id: `act_issue_${openIssues[0].id}`,
            title: `Review Issue: ${openIssues[0].title}`,
            actionType: 'navigate',
            targetTab: 'maintenance',
            subTab: 'issues',
            entityId: openIssues[0].id,
            isPrimary: true,
          });
        }
        if (activeWarranty) {
          recommendedActions.push({
            id: `act_war_${activeWarranty.id}`,
            title: 'Inspect Warranty Claim',
            actionType: 'navigate',
            targetTab: 'maintenance',
            subTab: 'warranties',
            entityId: activeWarranty.id,
          });
        }
        recommendedActions.push({
          id: `act_asset_${asset.id}`,
          title: `Inspect ${asset.name}`,
          actionType: 'navigate',
          targetTab: 'assets',
          entityId: asset.id,
        });
        recommendedActions.push({
          id: `act_copilot_${asset.id}`,
          title: 'Ask Copilot for Repair vs Replace Analysis',
          actionType: 'copilot',
          targetTab: 'copilot',
          params: {
            initialPrompt: `Can you analyze repair vs replace for my ${asset.name}? It has had ${assetIssues.length} issues and ${currency} ${totalRepairCost} spent in repairs.`,
          },
        });

        const dedupKey = generateUnifiedActionFingerprint('repair_replace', asset.id, activeWarranty?.id || 'nowar');

        actions.push({
          id: `action_${dedupKey}`,
          userId,
          type: 'repair_replace',
          priority,
          title: activeWarranty && daysUntilExpiry !== null && daysUntilExpiry <= 30
            ? `Review ${asset.name} repair-vs-replace decision before warranty expiry (${daysUntilExpiry}d remaining)`
            : `Evaluate repair-vs-replace strategy for high-maintenance ${asset.name}`,
          summary: `${asset.name} has accumulated ${assetIssues.length} issues and ${currency} ${totalRepairCost.toLocaleString()} in repairs. Act now while warranty/service options are available.`,
          whyItMatters: `High recurring repair spend indicates approaching end-of-life or defective components. Deciding before warranty runs out avoids out-of-pocket replacement costs.`,
          evidence: {
            facts,
            calculation: `${assetIssues.length} issues + ${currency} ${totalRepairCost} repair spend`,
            metrics: { issueCount: assetIssues.length, totalRepairCost, daysUntilExpiry },
          },
          relatedRecords,
          recommendedActions,
          status: 'active',
          deduplicationKey: dedupKey,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // ---------------------------------------------------------------------------
    // 2. CRITICAL SAFETY HAZARDS & URGENT UNRESOLVED ISSUES
    // ---------------------------------------------------------------------------
    const unhandledIssues = issues.filter(
      (i) => !['resolved', 'verified', 'closed', 'cancelled'].includes(i.status)
    );

    for (const issue of unhandledIssues) {
      // If issue is already part of a compound action and not a critical safety hazard, skip standalone duplicate
      const isSafetyHazard =
        issue.safetyWarning ||
        issue.severity === 'critical' ||
        /leak|gas|spark|fire|shock|electrical|flood|hazard|burst/i.test(issue.title + ' ' + (issue.description || ''));

      if (issue.assetId && assetsWithCompoundAction.has(issue.assetId) && !isSafetyHazard) {
        continue;
      }

      const asset = issue.assetId ? assetMap.get(issue.assetId) : null;
      const room = issue.roomId ? roomMap.get(issue.roomId) : (asset?.roomId ? roomMap.get(asset.roomId) : null);
      const property = asset?.propertyId ? propertyMap.get(asset.propertyId) : (properties[0] || null);

      const priority: UnifiedHouseholdActionPriority =
        isSafetyHazard || issue.severity === 'critical'
          ? 'critical'
          : issue.severity === 'high'
          ? 'warning'
          : 'due_soon';

      const facts: string[] = [
        `Issue "${issue.title}" is in "${issue.status.replace('_', ' ')}" status with severity "${issue.severity}".`,
      ];
      if (issue.safetyWarning) {
        facts.push(`Safety warning: ${issue.safetyWarning}`);
      }
      if (asset) {
        facts.push(`Affects equipment: ${asset.name} (${asset.category})`);
      }
      if (room) {
        facts.push(`Located in room: ${room.name}`);
      }

      const relatedRecords: UnifiedActionTarget[] = [
        {
          id: issue.id,
          domain: 'issues',
          title: issue.title,
          type: issue.severity,
          route: 'maintenance',
          subTab: 'issues',
          entityId: issue.id,
        },
      ];
      if (asset) {
        relatedRecords.push({
          id: asset.id,
          domain: 'assets',
          title: asset.name,
          route: 'assets',
          entityId: asset.id,
        });
      }

      const recommendedActions: UnifiedRecommendedActionItem[] = [
        {
          id: `act_resolve_${issue.id}`,
          title: 'Open Resolution Checklist',
          actionType: 'navigate',
          targetTab: 'maintenance',
          subTab: 'issues',
          entityId: issue.id,
          isPrimary: true,
        },
      ];

      const dedupKey = generateUnifiedActionFingerprint(
        isSafetyHazard ? 'safety_hazard' : 'risk',
        issue.id,
        issue.status
      );

      actions.push({
        id: `action_${dedupKey}`,
        userId,
        type: isSafetyHazard ? 'safety_hazard' : 'risk',
        priority,
        title: isSafetyHazard
          ? `Resolve urgent safety hazard: ${issue.title}`
          : `Resolve open household ticket: ${issue.title}`,
        summary: issue.description || `Active household issue requires triage and resolution checklist execution.`,
        whyItMatters: isSafetyHazard
          ? `Safety hazards can cause catastrophic household damage, personal injury, or costly collateral failures.`
          : `Unresolved equipment issues accelerate wear and cause unexpected appliance downtime.`,
        evidence: {
          facts,
          metrics: { severity: issue.severity, status: issue.status },
        },
        relatedRecords,
        recommendedActions,
        status: 'active',
        deduplicationKey: dedupKey,
        createdAt: issue.createdAt || new Date().toISOString(),
        updatedAt: issue.updatedAt || new Date().toISOString(),
      });
    }

    // ---------------------------------------------------------------------------
    // 3. OVERDUE & IMMINENT MAINTENANCE TASKS
    // ---------------------------------------------------------------------------
    for (const task of maintenances) {
      if (task.status === 'completed' || task.status === 'cancelled') continue;

      const isOverdue = task.scheduledDate && task.scheduledDate < todayStr;
      const isDueToday = task.scheduledDate === todayStr;
      const isDueSoon = task.scheduledDate && task.scheduledDate > todayStr && task.scheduledDate <= in7DaysStr;

      if (isOverdue || isDueToday || isDueSoon) {
        const priority: UnifiedHouseholdActionPriority = isOverdue
          ? 'overdue'
          : isDueToday
          ? 'due_today'
          : 'due_soon';

        const asset = task.assetId ? assetMap.get(task.assetId) : null;
        const facts: string[] = [
          `Task "${task.title}" is scheduled for ${task.scheduledDate || 'pending'}.`,
        ];
        if (isOverdue) {
          const daysOverdue = Math.ceil((refDate.getTime() - new Date(task.scheduledDate).getTime()) / 86400000);
          facts.push(`Task is overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}.`);
        }
        if (asset) {
          facts.push(`Target equipment: ${asset.name}`);
        }
        if (task.cost) {
          facts.push(`Estimated upkeep cost: ${currency} ${task.cost}`);
        }

        const relatedRecords: UnifiedActionTarget[] = [
          {
            id: task.id,
            domain: 'maintenance',
            title: task.title,
            route: 'maintenance',
            subTab: 'maintenance',
            entityId: task.id,
          },
        ];
        if (asset) {
          relatedRecords.push({
            id: asset.id,
            domain: 'assets',
            title: asset.name,
            route: 'assets',
            entityId: asset.id,
          });
        }

        const recommendedActions: UnifiedRecommendedActionItem[] = [
          {
            id: `act_maint_${task.id}`,
            title: isOverdue ? 'Complete Overdue Task' : 'Log Maintenance Completion',
            actionType: 'navigate',
            targetTab: 'maintenance',
            subTab: 'maintenance',
            entityId: task.id,
            isPrimary: true,
          },
        ];

        const dedupKey = generateUnifiedActionFingerprint('overdue_maintenance', task.id, task.scheduledDate || 'nodate');

        actions.push({
          id: `action_${dedupKey}`,
          userId,
          type: 'overdue_maintenance',
          priority,
          title: isOverdue
            ? `Complete overdue maintenance: ${task.title}`
            : isDueToday
            ? `Maintenance scheduled for today: ${task.title}`
            : `Upcoming maintenance scheduled: ${task.title}`,
          summary: task.description || `Routine upkeep preserves manufacturer warranties and prevents breakdowns.`,
          whyItMatters: `Neglected maintenance voids warranty coverage and accelerates equipment degradation.`,
          evidence: {
            facts,
            metrics: { scheduledDate: task.scheduledDate, cost: task.cost },
          },
          relatedRecords,
          recommendedActions,
          status: 'active',
          deduplicationKey: dedupKey,
          createdAt: task.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // ---------------------------------------------------------------------------
    // 4. OVERDUE & IMMINENT FINANCIAL OBLIGATIONS (BILLS, UTILITIES, LOANS)
    // ---------------------------------------------------------------------------
    for (const exp of expenses) {
      if (exp.isPaid) continue;
      if (!exp.dueDate) continue;

      const isOverdue = exp.dueDate < todayStr;
      const isDueToday = exp.dueDate === todayStr;
      const isDueSoon = exp.dueDate > todayStr && exp.dueDate <= in7DaysStr;

      if (isOverdue || isDueToday || isDueSoon) {
        const priority: UnifiedHouseholdActionPriority = isOverdue
          ? 'overdue'
          : isDueToday
          ? 'due_today'
          : 'due_soon';

        const facts: string[] = [
          `Expense "${exp.title}" of ${currency} ${Number(exp.amount).toLocaleString()} is due ${exp.dueDate}.`,
        ];
        if (isOverdue) {
          const daysOverdue = Math.ceil((refDate.getTime() - new Date(exp.dueDate).getTime()) / 86400000);
          facts.push(`Payment is overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}.`);
        }
        if (exp.category) {
          facts.push(`Category: ${exp.category}`);
        }

        const relatedRecords: UnifiedActionTarget[] = [
          {
            id: exp.id,
            domain: 'finance',
            title: exp.title,
            type: exp.category,
            route: 'expenses',
            entityId: exp.id,
          },
        ];

        const recommendedActions: UnifiedRecommendedActionItem[] = [
          {
            id: `act_exp_${exp.id}`,
            title: 'Review Bill & Mark Paid',
            actionType: 'navigate',
            targetTab: 'expenses',
            entityId: exp.id,
            isPrimary: true,
          },
        ];

        const dedupKey = generateUnifiedActionFingerprint('overdue_payment', exp.id, exp.dueDate);

        actions.push({
          id: `action_${dedupKey}`,
          userId,
          type: 'overdue_payment',
          priority,
          title: isOverdue
            ? `Settle overdue payment: ${exp.title} (${currency} ${Number(exp.amount).toLocaleString()})`
            : isDueToday
            ? `Bill payment due today: ${exp.title} (${currency} ${Number(exp.amount).toLocaleString()})`
            : `Upcoming bill due soon: ${exp.title} (${currency} ${Number(exp.amount).toLocaleString()})`,
          summary: `Payment of ${currency} ${Number(exp.amount).toLocaleString()} due on ${exp.dueDate}.`,
          whyItMatters: `Late payments incur penalties and disrupt essential household services.`,
          evidence: {
            facts,
            metrics: { amount: exp.amount, dueDate: exp.dueDate },
          },
          relatedRecords,
          recommendedActions,
          status: 'active',
          deduplicationKey: dedupKey,
          createdAt: exp.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // ---------------------------------------------------------------------------
    // 5. IMMINENT WARRANTY EXPIRATIONS (STANDALONE)
    // ---------------------------------------------------------------------------
    for (const war of warranties) {
      if ((war.status !== 'active' && war.status !== 'expiring_soon') || !war.endDate) continue;
      if (war.assetId && assetsWithCompoundAction.has(war.assetId)) continue; // absorbed in compound action

      const isExpired = war.endDate < todayStr;
      const isExpiringSoon = war.endDate >= todayStr && war.endDate <= in30DaysStr;

      if (isExpiringSoon || isExpired) {
        const daysLeft = Math.ceil((new Date(war.endDate).getTime() - refDate.getTime()) / 86400000);
        const asset = war.assetId ? assetMap.get(war.assetId) : null;

        const priority: UnifiedHouseholdActionPriority = isExpired ? 'overdue' : 'due_soon';

        const facts: string[] = [
          `Warranty with ${war.warrantyProvider} ${isExpired ? 'expired on' : 'expires in ' + daysLeft + ' days on'} ${war.endDate}.`,
        ];
        if (asset) {
          facts.push(`Protects equipment: ${asset.name}`);
        }
        if (war.policyNumber) {
          facts.push(`Policy #: ${war.policyNumber}`);
        }

        const relatedRecords: UnifiedActionTarget[] = [
          {
            id: war.id,
            domain: 'warranties',
            title: `${war.warrantyProvider} Warranty`,
            route: 'maintenance',
            subTab: 'warranties',
            entityId: war.id,
          },
        ];
        if (asset) {
          relatedRecords.push({
            id: asset.id,
            domain: 'assets',
            title: asset.name,
            route: 'assets',
            entityId: asset.id,
          });
        }

        const recommendedActions: UnifiedRecommendedActionItem[] = [
          {
            id: `act_war_${war.id}`,
            title: 'View Warranty Policy',
            actionType: 'navigate',
            targetTab: 'maintenance',
            subTab: 'warranties',
            entityId: war.id,
            isPrimary: true,
          },
        ];

        const dedupKey = generateUnifiedActionFingerprint('warranty_action', war.id, war.endDate);

        actions.push({
          id: `action_${dedupKey}`,
          userId,
          type: 'warranty_action',
          priority,
          title: isExpired
            ? `Warranty recently expired for ${asset?.name || war.warrantyProvider}`
            : `Review warranty expiry for ${asset?.name || war.warrantyProvider} (${daysLeft}d left)`,
          summary: `Policy ${war.policyNumber || ''} covering ${asset?.name || 'appliance'} expires on ${war.endDate}.`,
          whyItMatters: `Review remaining claims or check extension options before coverage permanently lapses.`,
          evidence: {
            facts,
            metrics: { endDate: war.endDate, daysLeft },
          },
          relatedRecords,
          recommendedActions,
          status: 'active',
          deduplicationKey: dedupKey,
          createdAt: war.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // ---------------------------------------------------------------------------
    // 6. HIGH-VALUE DOCUMENTATION & WARRANTY DEFICITS
    // ---------------------------------------------------------------------------
    for (const asset of assets) {
      if (assetsWithCompoundAction.has(asset.id)) continue;
      const assetWarranties = warrantiesByAsset.get(asset.id) || [];
      const hasWarranty = assetWarranties.length > 0;
      const isHighValue = (asset.purchasePrice && asset.purchasePrice >= 20000) || asset.category === 'appliances' || asset.category === 'hvac' || asset.category === 'vehicles';

      if (isHighValue && !hasWarranty && !asset.modelNumber) {
        const facts = [
          `${asset.name} is a high-value ${asset.category} record without warranty coverage or registered serial/model number.`,
        ];

        const relatedRecords: UnifiedActionTarget[] = [
          {
            id: asset.id,
            domain: 'assets',
            title: asset.name,
            route: 'assets',
            entityId: asset.id,
          },
        ];

        const recommendedActions: UnifiedRecommendedActionItem[] = [
          {
            id: `act_doc_${asset.id}`,
            title: 'Add Model / Warranty',
            actionType: 'navigate',
            targetTab: 'assets',
            entityId: asset.id,
            isPrimary: true,
          },
        ];

        const dedupKey = generateUnifiedActionFingerprint('document_gap', asset.id, 'nowar_nomodel');

        actions.push({
          id: `action_${dedupKey}`,
          userId,
          type: 'document_gap',
          priority: 'warning',
          title: `Record warranty & model details for ${asset.name}`,
          summary: `Missing model number and warranty documentation may delay technician service and claim approvals.`,
          whyItMatters: `Complete equipment profiles enable one-click technician discovery and parts matching.`,
          evidence: {
            facts,
            metrics: { category: asset.category, purchasePrice: asset.purchasePrice },
          },
          relatedRecords,
          recommendedActions,
          status: 'active',
          deduplicationKey: dedupKey,
          createdAt: asset.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // ---------------------------------------------------------------------------
    // 7. POSITIVE SIGNAL (IF HOUSEHOLD IS FULLY OPTIMIZED)
    // ---------------------------------------------------------------------------
    if (actions.length === 0 && assets.length > 0) {
      const dedupKey = generateUnifiedActionFingerprint('positive_signal', userId, todayStr);
      actions.push({
        id: `action_${dedupKey}`,
        userId,
        type: 'positive_signal',
        priority: 'due_soon',
        title: 'Household operations fully compliant & protected',
        summary: `All scheduled maintenance is up to date, warranties are active, and no open issues require attention.`,
        whyItMatters: `Proactive management keeps your household health score high and eliminates surprise repair costs.`,
        evidence: {
          facts: [
            `${assets.length} equipment assets protected.`,
            `${warranties.length} active warranties recorded.`,
            `Zero overdue payments or maintenance tasks.`,
          ],
        },
        relatedRecords: [],
        recommendedActions: [
          {
            id: 'act_dashboard',
            title: 'View Household Command Center',
            actionType: 'navigate',
            targetTab: 'dashboard',
            isPrimary: true,
          },
        ],
        status: 'active',
        deduplicationKey: dedupKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // ---------------------------------------------------------------------------
    // 8. APPLY TENANT LIFECYCLE (DISMISS, SNOOZE, COMPLETE) & SORTING
    // ---------------------------------------------------------------------------
    const nowIso = refDate.toISOString();

    const processedActions: UnifiedHouseholdAction[] = actions.map((act) => {
      let currentStatus: UnifiedHouseholdActionStatus = 'active';
      let snoozedUntil: string | undefined = undefined;
      let completedAt: string | undefined = undefined;

      if (store.dismissed.has(act.id) || store.dismissed.has(act.deduplicationKey)) {
        currentStatus = 'dismissed';
      } else if (store.completed.has(act.id) || store.completed.has(act.deduplicationKey)) {
        currentStatus = 'completed';
        completedAt = store.completed.get(act.id) || store.completed.get(act.deduplicationKey);
      } else if (store.snoozed.has(act.id) || store.snoozed.has(act.deduplicationKey)) {
        const snoozeDate = store.snoozed.get(act.id) || store.snoozed.get(act.deduplicationKey)!;
        if (snoozeDate > nowIso) {
          currentStatus = 'snoozed';
          snoozedUntil = snoozeDate;
        } else {
          // Snooze period expired, return to active
          store.snoozed.delete(act.id);
          store.snoozed.delete(act.deduplicationKey);
        }
      }

      return {
        ...act,
        status: currentStatus,
        snoozedUntil,
        completedAt,
      };
    });

    // Filter by options
    let filtered = processedActions;
    if (options?.status) {
      filtered = filtered.filter((a) => a.status === options.status);
    } else {
      // By default, return active actions only
      filtered = filtered.filter((a) => a.status === 'active');
    }

    if (options?.priority) {
      filtered = filtered.filter((a) => a.priority === options.priority);
    }

    if (options?.domain) {
      filtered = filtered.filter((a) =>
        a.relatedRecords.some((r) => r.domain === options.domain)
      );
    }

    // Deterministic priority ordering: critical (5) > overdue (4) > due_today (3) > warning (2) > due_soon (1)
    filtered.sort((a, b) => {
      const weightA = PRIORITY_WEIGHTS[a.priority] || 0;
      const weightB = PRIORITY_WEIGHTS[b.priority] || 0;
      if (weightB !== weightA) return weightB - weightA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    if (options?.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }

    // Compute counts
    const criticalCount = filtered.filter((a) => a.priority === 'critical').length;
    const overdueCount = filtered.filter((a) => a.priority === 'overdue').length;
    const dueTodayCount = filtered.filter((a) => a.priority === 'due_today').length;
    const warningCount = filtered.filter((a) => a.priority === 'warning').length;
    const dueSoonCount = filtered.filter((a) => a.priority === 'due_soon').length;

    return {
      total: filtered.length,
      criticalCount,
      overdueCount,
      dueTodayCount,
      warningCount,
      dueSoonCount,
      actions: filtered,
    };
  }

  /**
   * Non-destructively dismisses an action recommendation.
   */
  public static async dismissAction(
    userId: string,
    actionId: string,
    fingerprint?: string
  ): Promise<{ success: boolean; dismissedId: string }> {
    const store = getTenantStore(userId);
    store.dismissed.add(actionId);
    if (fingerprint) {
      store.dismissed.add(fingerprint);
    }
    return { success: true, dismissedId: actionId };
  }

  /**
   * Snoozes an action recommendation for N days without deleting source records.
   */
  public static async snoozeAction(
    userId: string,
    actionId: string,
    durationDays = 7,
    fingerprint?: string
  ): Promise<{ success: boolean; snoozedUntil: string }> {
    const store = getTenantStore(userId);
    const validDays = Math.min(Math.max(Number(durationDays) || 7, 1), 90);
    const snoozedUntil = new Date(Date.now() + validDays * 86400000).toISOString();

    store.snoozed.set(actionId, snoozedUntil);
    if (fingerprint) {
      store.snoozed.set(fingerprint, snoozedUntil);
    }

    return { success: true, snoozedUntil };
  }

  /**
   * Marks an action recommendation as completed.
   */
  public static async completeAction(
    userId: string,
    actionId: string,
    fingerprint?: string
  ): Promise<{ success: boolean; completedAt: string }> {
    const store = getTenantStore(userId);
    const completedAt = new Date().toISOString();

    store.completed.set(actionId, completedAt);
    if (fingerprint) {
      store.completed.set(fingerprint, completedAt);
    }

    return { success: true, completedAt };
  }
}
