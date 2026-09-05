import crypto from 'crypto';
import { DatabaseService } from './dbService';
import { HouseholdHealthService } from './householdHealthService';
import {
  CrossDomainInsight,
  CrossDomainInsightType,
  CrossDomainInsightPriority,
  CrossDomainInsightsResponse,
  HouseholdTimelineEvent,
  HouseholdTimelineResponse,
  HouseholdGraphNode,
  HouseholdGraphEdge,
  HouseholdGraphResponse,
  HouseholdDomain,
} from '../../src/types';

// In-memory tenant store for dismissed cross-domain insight IDs
const userDismissedInsights = new Map<string, Set<string>>();

function getDismissedSet(userId: string): Set<string> {
  if (!userDismissedInsights.has(userId)) {
    userDismissedInsights.set(userId, new Set<string>());
  }
  return userDismissedInsights.get(userId)!;
}

/**
 * Deterministic fingerprint generator for cross-domain insights
 */
export function generateCrossDomainFingerprint(
  type: CrossDomainInsightType,
  entityId: string,
  keyMetric: string | number
): string {
  const raw = `cross_domain:${type}:${entityId}:${keyMetric}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24);
}

export class CrossDomainIntelligenceService {
  /**
   * 1. Constructs lightweight tenant relationship graph over all household entities
   */
  public static async buildHouseholdGraph(userId: string): Promise<HouseholdGraphResponse> {
    const [
      properties,
      rooms,
      assets,
      warranties,
      maintenances,
      issues,
      expenses,
      loans,
      creditCards,
      documents,
    ] = await Promise.all([
      DatabaseService.listProperties(userId),
      DatabaseService.listRooms(userId),
      DatabaseService.listAssets(userId),
      DatabaseService.listWarranties(userId),
      DatabaseService.listMaintenances(userId),
      DatabaseService.listIssues(userId),
      DatabaseService.listExpenses(userId),
      DatabaseService.listLoans(userId),
      DatabaseService.listCreditCards(userId),
      DatabaseService.listDocuments(userId),
    ]);

    const nodes: HouseholdGraphNode[] = [];
    const edges: HouseholdGraphEdge[] = [];

    // Properties
    for (const p of properties) {
      nodes.push({
        id: `node_prop_${p.id}`,
        domain: 'properties',
        label: p.name,
        type: p.propertyType,
        metadata: { address: p.address, valuation: p.valuation },
      });
    }

    // Rooms
    for (const r of rooms) {
      nodes.push({
        id: `node_room_${r.id}`,
        domain: 'rooms',
        label: r.name,
        type: r.type,
      });

      if (r.propertyId) {
        edges.push({
          id: `edge_room_prop_${r.id}_${r.propertyId}`,
          source: `node_room_${r.id}`,
          target: `node_prop_${r.propertyId}`,
          relationship: 'located_in',
          label: 'Room in Property',
        });
      }
    }

    // Assets
    for (const a of assets) {
      nodes.push({
        id: `node_asset_${a.id}`,
        domain: 'assets',
        label: a.name,
        type: a.category,
        status: a.status,
        metadata: { make: a.make, model: a.modelNumber || (a as any).model },
      });

      if (a.roomId) {
        edges.push({
          id: `edge_asset_room_${a.id}_${a.roomId}`,
          source: `node_asset_${a.id}`,
          target: `node_room_${a.roomId}`,
          relationship: 'located_in',
          label: 'Asset in Room',
        });
      } else if (a.propertyId) {
        edges.push({
          id: `edge_asset_prop_${a.id}_${a.propertyId}`,
          source: `node_asset_${a.id}`,
          target: `node_prop_${a.propertyId}`,
          relationship: 'located_in',
          label: 'Asset in Property',
        });
      }
    }

    // Warranties
    for (const w of warranties) {
      nodes.push({
        id: `node_war_${w.id}`,
        domain: 'warranties',
        label: `${w.warrantyProvider} Warranty`,
        status: w.status,
        metadata: { endDate: w.endDate, provider: w.warrantyProvider },
      });

      if (w.assetId) {
        edges.push({
          id: `edge_war_asset_${w.id}_${w.assetId}`,
          source: `node_war_${w.id}`,
          target: `node_asset_${w.assetId}`,
          relationship: 'covered_by',
          label: 'Covers Asset',
        });
      }
    }

    // Maintenances
    for (const m of maintenances) {
      nodes.push({
        id: `node_maint_${m.id}`,
        domain: 'maintenance',
        label: m.title,
        status: m.status,
        metadata: { dueDate: m.nextServiceDate || m.serviceDate, cost: m.cost },
      });

      if (m.assetId) {
        edges.push({
          id: `edge_maint_asset_${m.id}_${m.assetId}`,
          source: `node_maint_${m.id}`,
          target: `node_asset_${m.assetId}`,
          relationship: 'maintained_by',
          label: 'Maintains Asset',
        });
      }
    }

    // Issues / Tickets
    for (const i of issues) {
      nodes.push({
        id: `node_issue_${i.id}`,
        domain: 'issues',
        label: i.title,
        status: i.status,
        metadata: { severity: i.severity, safetyWarning: !!i.safetyWarning, dueDate: i.dueDate },
      });

      if (i.assetId) {
        edges.push({
          id: `edge_issue_asset_${i.id}_${i.assetId}`,
          source: `node_issue_${i.id}`,
          target: `node_asset_${i.assetId}`,
          relationship: 'affects',
          label: 'Affects Asset',
        });
      }
      if (i.roomId) {
        edges.push({
          id: `edge_issue_room_${i.id}_${i.roomId}`,
          source: `node_issue_${i.id}`,
          target: `node_room_${i.roomId}`,
          relationship: 'located_in',
          label: 'Issue in Room',
        });
      }
      if (i.relatedIssueIds && Array.isArray(i.relatedIssueIds)) {
        for (const relId of i.relatedIssueIds) {
          edges.push({
            id: `edge_issue_rel_${i.id}_${relId}`,
            source: `node_issue_${i.id}`,
            target: `node_issue_${relId}`,
            relationship: 'related_to',
            label: 'Related Issue',
          });
        }
      }
    }

    // Documents
    for (const d of documents) {
      nodes.push({
        id: `node_doc_${d.id}`,
        domain: 'documents',
        label: d.fileName || d.title || 'Document',
        type: d.docType,
        status: d.status,
      });

      const linkedAssetId = (d as any).assetId || (d.metadata as any)?.assetId;
      if (linkedAssetId) {
        edges.push({
          id: `edge_doc_asset_${d.id}_${linkedAssetId}`,
          source: `node_doc_${d.id}`,
          target: `node_asset_${linkedAssetId}`,
          relationship: 'documented_by',
          label: 'Document for Asset',
        });
      }
    }

    // Finance (Expenses, Loans, Cards)
    for (const exp of expenses) {
      nodes.push({
        id: `node_exp_${exp.id}`,
        domain: 'finance',
        label: exp.title,
        type: exp.category,
        metadata: { amount: exp.amount, dueDate: exp.dueDate },
      });

      if ((exp as any).assetId) {
        edges.push({
          id: `edge_exp_asset_${exp.id}_${(exp as any).assetId}`,
          source: `node_exp_${exp.id}`,
          target: `node_asset_${(exp as any).assetId}`,
          relationship: 'incurred_cost',
          label: 'Expense for Asset',
        });
      }
    }

    for (const l of loans) {
      nodes.push({
        id: `node_loan_${l.id}`,
        domain: 'finance',
        label: l.loanName,
        type: l.loanType,
        metadata: { emiAmount: l.emiAmount, balance: l.outstandingBalance },
      });
    }

    for (const cc of creditCards) {
      nodes.push({
        id: `node_cc_${cc.id}`,
        domain: 'finance',
        label: cc.cardNickname,
        type: 'credit_card',
        metadata: { outstanding: cc.outstandingAmount, dueDate: cc.paymentDueDate },
      });
    }

    return {
      nodesCount: nodes.length,
      edgesCount: edges.length,
      nodes,
      edges,
    };
  }

  /**
   * 2. Deterministically derives cross-domain household insights across all 8 insight types
   */
  public static async generateCrossDomainInsights(
    userId: string,
    options?: {
      priority?: string;
      type?: string;
      includeDismissed?: boolean;
      limit?: number;
      referenceDate?: Date;
    }
  ): Promise<CrossDomainInsightsResponse> {
    const refDate = options?.referenceDate || new Date();
    const todayStr = refDate.toISOString().split('T')[0];
    const in30DaysStr = new Date(refDate.getTime() + 30 * 86400000).toISOString().split('T')[0];
    const in45DaysStr = new Date(refDate.getTime() + 45 * 86400000).toISOString().split('T')[0];

    const [
      profile,
      properties,
      rooms,
      assets,
      warranties,
      maintenances,
      issues,
      expenses,
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
      DatabaseService.listLoans(userId),
      DatabaseService.listCreditCards(userId),
      DatabaseService.listDocuments(userId),
      HouseholdHealthService.getHouseholdHealth(userId, { includeAiExplanation: false }).catch(
        () => null
      ),
    ]);

    const currency = profile?.currency || 'USD';
    const dismissedSet = getDismissedSet(userId);
    const insights: CrossDomainInsight[] = [];

    // Map helpers for fast lookups
    const assetMap = new Map(assets.map((a) => [a.id, a]));
    const roomMap = new Map(rooms.map((r) => [r.id, r]));
    const propertyMap = new Map(properties.map((p) => [p.id, p]));

    const openIssues = issues.filter(
      (i) => !['resolved', 'verified', 'closed', 'cancelled'].includes(i.status)
    );

    // Group issues by asset
    const issuesByAsset = new Map<string, typeof issues>();
    for (const i of issues) {
      if (i.assetId) {
        const list = issuesByAsset.get(i.assetId) || [];
        list.push(i);
        issuesByAsset.set(i.assetId, list);
      }
    }

    // Group warranties by asset
    const warrantiesByAsset = new Map<string, typeof warranties>();
    for (const w of warranties) {
      if (w.assetId) {
        const list = warrantiesByAsset.get(w.assetId) || [];
        list.push(w);
        warrantiesByAsset.set(w.assetId, list);
      }
    }

    // Group maintenances by asset
    const maintenancesByAsset = new Map<string, typeof maintenances>();
    for (const m of maintenances) {
      if (m.assetId) {
        const list = maintenancesByAsset.get(m.assetId) || [];
        list.push(m);
        maintenancesByAsset.set(m.assetId, list);
      }
    }

    // Group documents by asset
    const documentsByAsset = new Map<string, typeof documents>();
    for (const d of documents) {
      const aId = (d as any).assetId || (d.metadata as any)?.assetId;
      if (aId) {
        const list = documentsByAsset.get(aId) || [];
        list.push(d);
        documentsByAsset.set(aId, list);
      }
    }

    // =========================================================================
    // RULE A: Critical Safety Hazard (Type: Risk, Priority: Critical)
    // =========================================================================
    for (const issue of openIssues) {
      if (issue.severity === 'critical' || issue.safetyWarning) {
        const asset = issue.assetId ? assetMap.get(issue.assetId) : null;
        const fp = generateCrossDomainFingerprint('risk', issue.id, 'safety_hazard');

        insights.push({
          id: `ins_risk_safety_${issue.id}`,
          userId,
          type: 'risk',
          title: `Critical safety risk: ${issue.title}`,
          explanation: `A critical hazard was flagged on ${asset ? asset.name : 'household'}. Immediate isolation and certified professional inspection are strongly advised.`,
          priority: 'critical',
          severity: 'critical',
          relatedDomains: ['issues', 'assets', 'notifications'],
          relatedRecords: [
            {
              id: issue.id,
              domain: 'issues',
              title: issue.title,
              route: 'maintenance',
            },
            ...(asset
              ? [
                  {
                    id: asset.id,
                    domain: 'assets' as HouseholdDomain,
                    title: asset.name,
                    route: 'assets',
                  },
                ]
              : []),
          ],
          deterministicEvidence: {
            facts: [
              `Issue severity: CRITICAL`,
              `Reported: ${issue.reportedAt || todayStr}`,
              `Safety Category: ${(issue.safetyWarning as any)?.category || (typeof issue.safetyWarning === 'string' ? issue.safetyWarning : 'Hazard')}`,
              `Escalation: ${(issue.safetyWarning as any)?.immediateAction || 'Disconnect power/gas and call certified technician'}`,
            ],
            metrics: { severity: issue.severity, hasSafetyWarning: !!issue.safetyWarning },
          },
          recommendedAction: {
            title: 'Review Safety Escalation & Contact Emergency Tech',
            actionType: 'inspect',
            targetRoute: 'maintenance',
            params: { issueId: issue.id },
          },
          deduplicationKey: fp,
          createdAt: issue.reportedAt || todayStr,
          updatedAt: todayStr,
          isDismissed: dismissedSet.has(fp),
        });
      }
    }

    // =========================================================================
    // RULE B: Asset + Open Issue + Active Warranty (Type: Opportunity, Priority: Due Soon/Warning)
    // =========================================================================
    for (const issue of openIssues) {
      if (issue.assetId) {
        const asset = assetMap.get(issue.assetId);
        const wars = warrantiesByAsset.get(issue.assetId) || [];
        const activeWarranty = wars.find(
          (w) => w.status === 'active' || (w.endDate && w.endDate >= todayStr)
        );

        if (asset && activeWarranty) {
          const daysRemaining = activeWarranty.endDate
            ? Math.max(
                0,
                Math.ceil(
                  (new Date(activeWarranty.endDate).getTime() - new Date(todayStr).getTime()) /
                    86400000
                )
              )
            : 90;

          const isExpiringSoon = daysRemaining <= 45;
          const priority: CrossDomainInsightPriority = isExpiringSoon
            ? daysRemaining <= 7
              ? 'due_today'
              : 'warning'
            : 'due_soon';

          const fp = generateCrossDomainFingerprint(
            isExpiringSoon ? 'deadline' : 'opportunity',
            `${issue.id}_${activeWarranty.id}`,
            'warranty_coverage'
          );

          insights.push({
            id: `ins_war_claim_${issue.id}`,
            userId,
            type: isExpiringSoon ? 'deadline' : 'opportunity',
            title: isExpiringSoon
              ? `Warranty expiring soon on malfunctioning ${asset.name}`
              : `${asset.name} has active warranty for open issue`,
            explanation: `An unresolved issue "${issue.title}" is logged on ${asset.name}. This appliance is currently covered under warranty by ${activeWarranty.warrantyProvider} (expires in ${daysRemaining} days on ${activeWarranty.endDate}).`,
            priority,
            severity: isExpiringSoon ? 'high' : 'medium',
            relatedDomains: ['assets', 'issues', 'warranties', 'documents'],
            relatedRecords: [
              { id: issue.id, domain: 'issues', title: issue.title, route: 'maintenance' },
              { id: asset.id, domain: 'assets', title: asset.name, route: 'assets' },
              {
                id: activeWarranty.id,
                domain: 'warranties',
                title: `${activeWarranty.warrantyProvider} Policy`,
                route: 'maintenance',
              },
            ],
            deterministicEvidence: {
              facts: [
                `Active warranty provider: ${activeWarranty.warrantyProvider}`,
                `Policy expires: ${activeWarranty.endDate || 'Ongoing'} (${daysRemaining} days left)`,
                `Issue: ${issue.title} (Status: ${issue.status})`,
                `Repair may be fully or partially covered without out-of-pocket expense`,
              ],
              metrics: { daysRemaining, issueSeverity: issue.severity },
            },
            recommendedAction: {
              title: 'Review Warranty Details & File Claim',
              actionType: 'navigate',
              targetRoute: 'maintenance',
              params: { warrantyId: activeWarranty.id, issueId: issue.id },
            },
            deduplicationKey: fp,
            createdAt: issue.reportedAt || todayStr,
            updatedAt: todayStr,
            isDismissed: dismissedSet.has(fp),
          });
        }
      }
    }

    // =========================================================================
    // RULE C: Asset + Open Issue + Overdue Maintenance (Type: Risk/Opportunity, Priority: Overdue)
    // =========================================================================
    for (const issue of openIssues) {
      if (issue.assetId) {
        const asset = assetMap.get(issue.assetId);
        const maints = maintenancesByAsset.get(issue.assetId) || [];
        const overdueMaint = maints.find((m) => {
          const d = m.nextServiceDate || m.serviceDate;
          return m.status !== 'completed' && d && d < todayStr;
        });

        if (asset && overdueMaint) {
          const dueDate = overdueMaint.nextServiceDate || overdueMaint.serviceDate || 'Past due';
          const fp = generateCrossDomainFingerprint(
            'opportunity',
            `${issue.id}_${overdueMaint.id}`,
            'overdue_maint_issue'
          );

          insights.push({
            id: `ins_maint_correl_${issue.id}`,
            userId,
            type: 'opportunity',
            title: `Overdue maintenance correlates with ${asset.name} issue`,
            explanation: `Preventive maintenance "${overdueMaint.title}" is overdue for ${asset.name} (due ${dueDate}), which currently has an open issue "${issue.title}". Servicing may resolve the malfunction.`,
            priority: 'overdue',
            severity: 'high',
            relatedDomains: ['assets', 'issues', 'maintenance'],
            relatedRecords: [
              { id: issue.id, domain: 'issues', title: issue.title, route: 'maintenance' },
              { id: asset.id, domain: 'assets', title: asset.name, route: 'assets' },
              {
                id: overdueMaint.id,
                domain: 'maintenance',
                title: overdueMaint.title,
                route: 'maintenance',
              },
            ],
            deterministicEvidence: {
              facts: [
                `Maintenance task: ${overdueMaint.title} (Overdue since ${dueDate})`,
                `Open issue: ${issue.title} (Status: ${issue.status})`,
                `Preventive upkeep history indicates maintenance lapse prior to failure`,
              ],
              metrics: { dueDate, estimatedCost: overdueMaint.cost },
            },
            recommendedAction: {
              title: 'Schedule Overdue Service & Repair',
              actionType: 'schedule',
              targetRoute: 'maintenance',
              params: { maintenanceId: overdueMaint.id, issueId: issue.id },
            },
            deduplicationKey: fp,
            createdAt: todayStr,
            updatedAt: todayStr,
            isDismissed: dismissedSet.has(fp),
          });
        }
      }
    }

    // =========================================================================
    // RULE D: Recurring Asset Failures (Type: Recurrence, Priority: Warning)
    // =========================================================================
    for (const [assetId, assetIssues] of issuesByAsset.entries()) {
      if (assetIssues.length >= 2) {
        const asset = assetMap.get(assetId);
        if (asset) {
          const fp = generateCrossDomainFingerprint(
            'recurrence',
            assetId,
            `count_${assetIssues.length}`
          );

          insights.push({
            id: `ins_recurrence_${assetId}`,
            userId,
            type: 'recurrence',
            title: `Recurring failure pattern detected on ${asset.name}`,
            explanation: `${asset.name} has ${assetIssues.length} recorded issues across its history. Repeated malfunctions suggest a persistent component defect or root cause requiring specialist overhaul.`,
            priority: 'warning',
            severity: assetIssues.length >= 3 ? 'high' : 'medium',
            relatedDomains: ['assets', 'issues', 'maintenance'],
            relatedRecords: [
              { id: asset.id, domain: 'assets', title: asset.name, route: 'assets' },
              ...assetIssues.slice(0, 3).map((i) => ({
                id: i.id,
                domain: 'issues' as HouseholdDomain,
                title: i.title,
                route: 'maintenance',
              })),
            ],
            deterministicEvidence: {
              facts: [
                `Recorded issue count: ${assetIssues.length} incidents`,
                `Recent issues: ${assetIssues
                  .slice(0, 3)
                  .map((i) => `"${i.title}" (${i.status})`)
                  .join(', ')}`,
                `Asset age/install: ${asset.purchaseDate || 'Recorded in inventory'}`,
              ],
              metrics: { issueCount: assetIssues.length },
            },
            recommendedAction: {
              title: 'Review Full Issue History & Root Cause Diagnostics',
              actionType: 'inspect',
              targetRoute: 'maintenance',
              params: { assetId },
            },
            deduplicationKey: fp,
            createdAt: todayStr,
            updatedAt: todayStr,
            isDismissed: dismissedSet.has(fp),
          });
        }
      }
    }

    // =========================================================================
    // RULE E: Approaching Warranty Expiration (Type: Deadline, Priority: Warning / Due Soon)
    // =========================================================================
    for (const war of warranties) {
      if (war.endDate && war.endDate >= todayStr && war.endDate <= in30DaysStr) {
        const asset = war.assetId ? assetMap.get(war.assetId) : null;
        const daysLeft = Math.max(
          0,
          Math.ceil((new Date(war.endDate).getTime() - new Date(todayStr).getTime()) / 86400000)
        );

        const fp = generateCrossDomainFingerprint('deadline', war.id, `exp_${war.endDate}`);

        insights.push({
          id: `ins_war_exp_${war.id}`,
          userId,
          type: 'deadline',
          title: `Warranty expiring: ${war.warrantyProvider}${asset ? ` (${asset.name})` : ''}`,
          explanation: `The warranty policy from ${war.warrantyProvider} expires in ${daysLeft} days on ${war.endDate}. Verify appliance health or inspect renewal options.`,
          priority: daysLeft <= 7 ? 'warning' : 'due_soon',
          severity: daysLeft <= 7 ? 'high' : 'medium',
          relatedDomains: ['warranties', 'assets', 'documents'],
          relatedRecords: [
            {
              id: war.id,
              domain: 'warranties',
              title: `${war.warrantyProvider} Policy`,
              route: 'maintenance',
            },
            ...(asset
              ? [{ id: asset.id, domain: 'assets' as HouseholdDomain, title: asset.name, route: 'assets' }]
              : []),
          ],
          deterministicEvidence: {
            facts: [
              `Provider: ${war.warrantyProvider}`,
              `Expiry date: ${war.endDate} (${daysLeft} days remaining)`,
              `Policy number: ${war.policyNumber || 'On file'}`,
            ],
            metrics: { daysRemaining: daysLeft },
          },
          recommendedAction: {
            title: 'Audit Asset & Check Extension Options',
            actionType: 'review',
            targetRoute: 'maintenance',
          },
          deduplicationKey: fp,
          createdAt: todayStr,
          updatedAt: todayStr,
          isDismissed: dismissedSet.has(fp),
        });
      }
    }

    // =========================================================================
    // RULE F: Cumulative Recorded Repair Costs (Type: Cost, Priority: Warning)
    // =========================================================================
    for (const [assetId, assetIssues] of issuesByAsset.entries()) {
      const asset = assetMap.get(assetId);
      if (asset) {
        const totalRepairCost = assetIssues.reduce(
          (sum, i) => sum + (Number(i.actualCost) || Number(i.estimatedCost) || 0),
          0
        );

        if (totalRepairCost > 0 && (totalRepairCost >= 5000 || (asset.purchasePrice && totalRepairCost >= asset.purchasePrice * 0.35))) {
          const fp = generateCrossDomainFingerprint('cost', assetId, `repairs_${totalRepairCost}`);

          insights.push({
            id: `ins_cost_repairs_${assetId}`,
            userId,
            type: 'cost',
            title: `High cumulative repair costs on ${asset.name}`,
            explanation: `Recorded repair and service expenses on ${asset.name} total ${currency} ${totalRepairCost.toLocaleString()}. Evaluate repair vs. replacement viability.`,
            priority: 'warning',
            severity: 'medium',
            relatedDomains: ['assets', 'issues', 'finance'],
            relatedRecords: [
              { id: asset.id, domain: 'assets', title: asset.name, route: 'assets' },
              ...assetIssues.slice(0, 2).map((i) => ({
                id: i.id,
                domain: 'issues' as HouseholdDomain,
                title: i.title,
                route: 'maintenance',
              })),
            ],
            deterministicEvidence: {
              facts: [
                `Total recorded repair spend: ${currency} ${totalRepairCost.toLocaleString()}`,
                `Original asset valuation/price: ${asset.purchasePrice ? `${currency} ${Number(asset.purchasePrice).toLocaleString()}` : 'Not recorded'}`,
                `Associated issues: ${assetIssues.length} recorded repairs`,
              ],
              metrics: { totalRepairCost, assetPurchasePrice: asset.purchasePrice },
            },
            recommendedAction: {
              title: 'Simulate Upgrade in What-If Decision Simulator',
              actionType: 'navigate',
              targetRoute: 'simulator',
            },
            deduplicationKey: fp,
            createdAt: todayStr,
            updatedAt: todayStr,
            isDismissed: dismissedSet.has(fp),
          });
        }
      }
    }

    // =========================================================================
    // RULE G: High-Value Asset / Claim Missing Documentation (Type: Missing Info, Priority: Warning)
    // =========================================================================
    for (const asset of assets) {
      const assetDocs = documentsByAsset.get(asset.id) || [];
      const hasWarranties = (warrantiesByAsset.get(asset.id) || []).length > 0;
      const val = Number(asset.purchasePrice) || Number(asset.estimatedValue) || 0;

      if ((val >= 20000 || (val >= 250 && currency === 'USD') || hasWarranties) && assetDocs.length === 0) {
        const fp = generateCrossDomainFingerprint('missing_info', asset.id, 'no_docs');

        insights.push({
          id: `ins_missing_doc_${asset.id}`,
          userId,
          type: 'missing_info',
          title: `Missing purchase invoice/warranty document for ${asset.name}`,
          explanation: `${asset.name} does not have a saved purchase invoice, receipt, or warranty policy document attached in your document vault.`,
          priority: 'due_soon',
          severity: 'low',
          relatedDomains: ['assets', 'documents'],
          relatedRecords: [
            { id: asset.id, domain: 'assets', title: asset.name, route: 'assets' },
          ],
          deterministicEvidence: {
            facts: [
              `Asset: ${asset.name} (${asset.category})`,
              `Valuation: ${val > 0 ? `${currency} ${val.toLocaleString()}` : 'Not specified'}`,
              `Attached documents in vault: 0`,
              `Document proof simplifies warranty claims and insurance claims`,
            ],
            metrics: { attachedDocsCount: 0, assetValuation: val },
          },
          recommendedAction: {
            title: 'Upload Receipt / Warranty Document',
            actionType: 'navigate',
            targetRoute: 'documents',
            params: { assetId: asset.id },
          },
          deduplicationKey: fp,
          createdAt: todayStr,
          updatedAt: todayStr,
          isDismissed: dismissedSet.has(fp),
        });
      }
    }

    // =========================================================================
    // RULE H: Household Operational Vitality (Type: Positive Signal, Priority: Due Soon)
    // =========================================================================
    const overdueMaintCount = maintenances.filter((m) => {
      const d = m.nextServiceDate || m.serviceDate;
      return m.status !== 'completed' && d && d < todayStr;
    }).length;

    const criticalIssuesCount = openIssues.filter(
      (i) => i.severity === 'critical' || !!i.safetyWarning
    ).length;

    if (
      (healthReport?.overallScore || 0) >= 80 &&
      overdueMaintCount === 0 &&
      criticalIssuesCount === 0 &&
      assets.length >= 3
    ) {
      const fp = generateCrossDomainFingerprint(
        'positive_signal',
        'household',
        `health_${healthReport?.overallScore}`
      );

      insights.push({
        id: `ins_pos_vitality_${userId}`,
        userId,
        type: 'positive_signal',
        title: 'Strong household operational health',
        explanation: `All scheduled upkeep tasks are current, zero critical issues are unresolved, and household equipment is operating reliably.`,
        priority: 'due_soon',
        severity: 'low',
        relatedDomains: ['properties', 'assets', 'maintenance', 'finance'],
        relatedRecords: [
          ...properties.slice(0, 1).map((p) => ({
            id: p.id,
            domain: 'properties' as HouseholdDomain,
            title: p.name,
            route: 'properties',
          })),
        ],
        deterministicEvidence: {
          facts: [
            `Overall Household Health: ${healthReport?.overallScore || 85}/100 (${healthReport?.statusLabel || 'Excellent'})`,
            `Active critical issues: 0`,
            `Overdue maintenance tasks: 0`,
            `Asset inventory completeness: ${healthReport?.completenessScore || 90}%`,
          ],
          metrics: { healthScore: healthReport?.overallScore, overdueCount: 0 },
        },
        recommendedAction: {
          title: 'View Household Health Score & Pillar Breakdown',
          actionType: 'navigate',
          targetRoute: 'dashboard',
        },
        deduplicationKey: fp,
        createdAt: todayStr,
        updatedAt: todayStr,
        isDismissed: dismissedSet.has(fp),
      });
    }

    // Priority ordering helper
    const priorityWeight: Record<CrossDomainInsightPriority, number> = {
      critical: 5,
      overdue: 4,
      due_today: 3,
      warning: 2,
      due_soon: 1,
    };

    // Filter out dismissed insights unless explicitly included
    let filteredInsights = options?.includeDismissed
      ? insights
      : insights.filter((i) => !i.isDismissed);

    if (options?.priority && options.priority !== 'all') {
      filteredInsights = filteredInsights.filter((i) => i.priority === options.priority);
    }
    if (options?.type && options.type !== 'all') {
      filteredInsights = filteredInsights.filter((i) => i.type === options.type);
    }

    // Sort by priority weight desc, then createdAt desc
    filteredInsights.sort((a, b) => {
      const wDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (wDiff !== 0) return wDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    if (options?.limit && options.limit > 0) {
      filteredInsights = filteredInsights.slice(0, options.limit);
    }

    const counts = {
      total: filteredInsights.length,
      criticalCount: filteredInsights.filter((i) => i.priority === 'critical').length,
      overdueCount: filteredInsights.filter((i) => i.priority === 'overdue').length,
      dueTodayCount: filteredInsights.filter((i) => i.priority === 'due_today').length,
      warningCount: filteredInsights.filter((i) => i.priority === 'warning').length,
      dueSoonCount: filteredInsights.filter((i) => i.priority === 'due_soon').length,
    };

    return {
      ...counts,
      insights: filteredInsights,
    };
  }

  /**
   * 3. Aggregates all household operations into a unified chronological timeline
   */
  public static async generateHouseholdTimeline(
    userId: string,
    options?: {
      domain?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<HouseholdTimelineResponse> {
    const [
      assets,
      warranties,
      maintenances,
      issues,
      expenses,
      loans,
      creditCards,
      documents,
    ] = await Promise.all([
      DatabaseService.listAssets(userId),
      DatabaseService.listWarranties(userId),
      DatabaseService.listMaintenances(userId),
      DatabaseService.listIssues(userId),
      DatabaseService.listExpenses(userId),
      DatabaseService.listLoans(userId),
      DatabaseService.listCreditCards(userId),
      DatabaseService.listDocuments(userId),
    ]);

    const events: HouseholdTimelineEvent[] = [];
    const domainCounts: Record<string, number> = {
      all: 0,
      assets: 0,
      warranties: 0,
      maintenance: 0,
      issues: 0,
      finance: 0,
      documents: 0,
    };

    // 1. Assets
    for (const a of assets) {
      if (a.purchaseDate || a.createdAt) {
        const d = a.purchaseDate || a.createdAt.split('T')[0];
        events.push({
          id: `tl_asset_${a.id}`,
          date: d,
          title: `Asset Registered: ${a.name}`,
          description: `${a.make || ''} ${a.modelNumber || (a as any).model || ''} added to household inventory.`,
          domain: 'assets',
          eventType: 'asset_added',
          recordId: a.id,
          targetRoute: 'assets',
          amount: a.purchasePrice,
        });
      }
    }

    // 2. Warranties
    for (const w of warranties) {
      if (w.startDate) {
        events.push({
          id: `tl_war_start_${w.id}`,
          date: w.startDate,
          title: `Warranty Activated: ${w.warrantyProvider}`,
          description: `Coverage period commenced for policy #${w.policyNumber || 'N/A'}.`,
          domain: 'warranties',
          eventType: 'warranty_started',
          recordId: w.id,
          targetRoute: 'maintenance',
        });
      }
      if (w.endDate) {
        events.push({
          id: `tl_war_end_${w.id}`,
          date: w.endDate,
          title: `Warranty Expiration: ${w.warrantyProvider}`,
          description: `Policy coverage ends on this date.`,
          domain: 'warranties',
          eventType: 'warranty_expires',
          recordId: w.id,
          targetRoute: 'maintenance',
        });
      }
    }

    // 3. Maintenance
    for (const m of maintenances) {
      const d = m.serviceDate || m.nextServiceDate || m.createdAt.split('T')[0];
      events.push({
        id: `tl_maint_${m.id}`,
        date: d,
        title: `Maintenance: ${m.title}`,
        description: `Service status: ${m.status}. Provider: ${m.serviceProvider || 'Self-service'}.`,
        domain: 'maintenance',
        eventType: m.status === 'completed' ? 'maintenance_completed' : 'maintenance_scheduled',
        status: m.status,
        recordId: m.id,
        targetRoute: 'maintenance',
        amount: m.cost,
      });
    }

    // 4. Issues
    for (const i of issues) {
      if (i.reportedAt) {
        events.push({
          id: `tl_issue_rep_${i.id}`,
          date: i.reportedAt.split('T')[0],
          title: `Issue Reported: ${i.title}`,
          description: `Status: ${i.status}. Severity: ${i.severity.toUpperCase()}.`,
          domain: 'issues',
          eventType: 'issue_reported',
          status: i.status,
          severity: i.severity === 'critical' ? 'critical' : i.severity === 'high' ? 'high' : 'medium',
          recordId: i.id,
          targetRoute: 'maintenance',
          amount: i.actualCost || i.estimatedCost,
        });
      }
      if (i.resolvedAt) {
        events.push({
          id: `tl_issue_res_${i.id}`,
          date: i.resolvedAt.split('T')[0],
          title: `Issue Resolved: ${i.title}`,
          description: `Repair resolved. Resolution: ${i.resolution || 'Work completed'}.`,
          domain: 'issues',
          eventType: 'issue_resolved',
          status: 'resolved',
          recordId: i.id,
          targetRoute: 'maintenance',
          amount: i.actualCost,
        });
      }
    }

    // 5. Documents
    for (const doc of documents) {
      if (doc.createdAt) {
        events.push({
          id: `tl_doc_${doc.id}`,
          date: doc.createdAt.split('T')[0],
          title: `Document Uploaded: ${doc.fileName || doc.title}`,
          description: `Type: ${doc.docType}. Status: ${doc.status}.`,
          domain: 'documents',
          eventType: 'document_uploaded',
          status: doc.status,
          recordId: doc.id,
          targetRoute: 'documents',
        });
      }
    }

    // 6. Finance (Expenses & Bills)
    for (const exp of expenses) {
      if (exp.dueDate || exp.createdAt) {
        events.push({
          id: `tl_exp_${exp.id}`,
          date: exp.dueDate || exp.createdAt.split('T')[0],
          title: `Bill Due: ${exp.title}`,
          description: `Amount: ${exp.amount}. Status: ${exp.paymentStatus || 'pending'}.`,
          domain: 'finance',
          eventType: 'bill_due',
          recordId: exp.id,
          targetRoute: 'expenses',
          amount: exp.amount,
        });
      }
    }

    // Count totals per domain
    for (const ev of events) {
      domainCounts.all++;
      if (domainCounts[ev.domain] !== undefined) {
        domainCounts[ev.domain]++;
      }
    }

    // Filter by domain
    let filtered = events;
    if (options?.domain && options.domain !== 'all') {
      filtered = filtered.filter((e) => e.domain === options.domain);
    }
    if (options?.startDate) {
      filtered = filtered.filter((e) => e.date >= options.startDate!);
    }
    if (options?.endDate) {
      filtered = filtered.filter((e) => e.date <= options.endDate!);
    }

    // Sort descending by date
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (options?.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }

    return {
      totalEvents: filtered.length,
      events: filtered,
      domainCounts,
    };
  }

  /**
   * 4. Dismisses or acknowledges an insight for a user without mutating source records
   */
  public static async dismissCrossDomainInsight(
    userId: string,
    insightId: string
  ): Promise<boolean> {
    const set = getDismissedSet(userId);
    set.add(insightId);
    return true;
  }
}
