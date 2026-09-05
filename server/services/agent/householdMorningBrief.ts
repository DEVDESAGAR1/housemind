import { GoogleGenAI } from '@google/genai';
import { DatabaseService } from '../dbService';
import { ToolExecutor } from './toolExecutor';
import { UnifiedHouseholdActionService } from '../unifiedHouseholdActionService';
import {
  HouseholdMorningBrief,
  MorningBriefItem,
  MorningBriefUrgency,
  MorningBriefRecommendedAction,
  MorningBriefFinancialObligation,
  MorningBriefMaintenanceConcern,
  MorningBriefWarrantyConcern,
  MorningBriefTopAction,
  AgentToolAuditRecord,
  AgentAuditMetadata,
} from '../../../src/types';
import { getGeminiApiKey, getGeminiModel } from '../../config/secrets';

// Lazy-initialized Gemini Client
let genAIClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      console.warn('[MORNING BRIEF] Warning: GEMINI_API_KEY is not set.');
    }
    genAIClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

export class HouseholdMorningBriefService {
  /**
   * Generates a comprehensive, deterministic, multi-domain morning brief.
   */
  public static async generateMorningBrief(userId: string): Promise<HouseholdMorningBrief> {
    const toolAuditRecords: AgentToolAuditRecord[] = [];
    const timestamp = new Date().toISOString();
    const todayStr = timestamp.split('T')[0];
    const sevenDaysDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    // 1. Gather context from all safe read-only tools and database services in parallel
    const [
      profile,
      healthExec,
      obligationsExec,
      maintenanceExec,
      financeExec,
      warrantiesExec,
      notificationsExec,
      unifiedActionsRes,
      issuesList,
      expensesList,
      maintenancesList,
    ] = await Promise.all([
      DatabaseService.getProfile(userId).catch(() => null),
      ToolExecutor.executeTool(userId, 'getHouseholdHealth'),
      ToolExecutor.executeTool(userId, 'getUpcomingObligations', { days: 14 }),
      ToolExecutor.executeTool(userId, 'getOverdueMaintenance'),
      ToolExecutor.executeTool(userId, 'getFinancialSummary'),
      ToolExecutor.executeTool(userId, 'getExpiringWarrantiesAndDocuments', { daysAhead: 60 }),
      ToolExecutor.executeTool(userId, 'getRecentNotifications', { unreadOnly: true }),
      UnifiedHouseholdActionService.getUnifiedActions(userId, { limit: 5 }).catch(() => null),
      DatabaseService.listIssues(userId).catch(() => []),
      DatabaseService.listExpenses(userId).catch(() => []),
      DatabaseService.listMaintenances(userId).catch(() => []),
    ]);

    toolAuditRecords.push(
      healthExec.auditRecord,
      obligationsExec.auditRecord,
      maintenanceExec.auditRecord,
      financeExec.auditRecord,
      warrantiesExec.auditRecord,
      notificationsExec.auditRecord
    );

    const homeName = profile?.homeName || 'My Household';
    const healthData = healthExec.data || {};
    const obligationsData = obligationsExec.data || {};
    const maintenanceData = maintenanceExec.data || {};
    const financeData = financeExec.data || {};
    const warrantiesData = warrantiesExec.data || {};
    const notificationsData = notificationsExec.data || {};
    const currency = profile?.currency || financeData.currency || 'USD';

    const isProvisional = !!healthData.isProvisional;
    const healthScore = healthData.overallScore;
    const healthLabel = healthData.healthLabel || 'Unrated';
    const completenessScore = healthData.completenessScore ?? 0;

    const totalAssetsCount = Number(healthData.pillarBreakdown?.assetHealth?.score) > 0 ? 1 : 0; // fallback indicator
    const activeWarrantiesCount = Number(warrantiesData.activeWarrantiesTotal) || 0;
    const totalMonthlyBurnRate = Number(financeData.totalMonthlyBurnRate) || 0;
    const totalOutstandingDebt = Number(financeData.debtSummary?.totalOutstandingDebt) || 0;

    const itemsNeedingAttention: MorningBriefItem[] = [];
    const itemsToWatch: MorningBriefItem[] = [];

    // 2. Classify Overdue Maintenance Tasks
    const overdueTasks: any[] = maintenanceData.tasks || maintenanceData.overdueTasks || [];
    for (const task of overdueTasks) {
      const cost = Number(task.estimatedCost ?? task.cost) || 0;
      const isUrgent = task.priority === 'urgent' || cost >= 500;
      const urgency: MorningBriefUrgency = isUrgent ? 'critical' : 'overdue';
      const item: MorningBriefItem = {
        id: `maint_${task.id}`,
        title: task.title,
        category: 'maintenance',
        urgency,
        reason: `Maintenance is overdue (due: ${task.dueDate || 'past due'}). Estimated cost: ${currency} ${cost}.`,
        dueDate: task.dueDate,
        amount: cost,
        currency,
        actionTab: 'maintenance',
        subTab: 'maintenance',
        entityId: task.id,
        actionLabel: 'View Task',
      };
      itemsNeedingAttention.push(item);
    }

    // 3. Classify Critical Notifications
    const unreadNotifs: any[] = notificationsData.notifications || [];
    for (const notif of unreadNotifs) {
      if (notif.priority === 'critical') {
        itemsNeedingAttention.push({
          id: `notif_${notif.id}`,
          title: notif.title,
          category: 'alert',
          urgency: 'critical',
          reason: notif.message,
          actionTab: notif.targetTab || 'notifications',
          actionLabel: 'Review Alert',
        });
      }
    }

    // 4. Classify Calendar Obligations (Overdue, Due Today, Due Soon)
    const calendarEvents: any[] = obligationsData.events || [];
    let upcomingTotalDueNext7Days = 0;
    const keyObligations: MorningBriefFinancialObligation[] = [];

    for (const evt of calendarEvents) {
      const evtDate = evt.date;
      const isToday = evtDate === todayStr;
      const isPast = evtDate < todayStr;
      const isNext7Days = evtDate >= todayStr && evtDate <= sevenDaysDate;

      if (evt.amount && isNext7Days) {
        upcomingTotalDueNext7Days += Number(evt.amount) || 0;
      }

      if (evt.amount) {
        keyObligations.push({
          title: evt.title,
          amount: Number(evt.amount) || 0,
          dueDate: evt.date,
          type: evt.category || 'bill',
          status: evt.status,
        });
      }

      let categoryType: MorningBriefItem['category'] = 'general';
      let subTab: string | undefined = undefined;
      let actionTab = 'dashboard';

      if (evt.category === 'bills') {
        categoryType = 'expense';
        actionTab = 'expenses';
      } else if (evt.category === 'utilities') {
        categoryType = 'utility';
        actionTab = 'utilities';
        subTab = 'utilities';
      } else if (evt.category === 'loans') {
        categoryType = 'loan';
        actionTab = 'utilities';
        subTab = 'loans';
      } else if (evt.category === 'credit_cards') {
        categoryType = 'card';
        actionTab = 'utilities';
        subTab = 'cards';
      } else if (evt.category === 'maintenance') {
        categoryType = 'maintenance';
        actionTab = 'maintenance';
        subTab = 'maintenance';
      } else if (evt.category === 'warranties') {
        categoryType = 'warranty';
        actionTab = 'maintenance';
        subTab = 'warranties';
      }

      if (isPast && categoryType !== 'maintenance') {
        itemsNeedingAttention.push({
          id: `evt_${evt.id}`,
          title: evt.title,
          category: categoryType,
          urgency: 'overdue',
          reason: `Payment is past due since ${evtDate}. Amount: ${currency} ${evt.amount || 0}.`,
          dueDate: evtDate,
          amount: evt.amount,
          currency,
          actionTab,
          subTab,
          entityId: evt.id,
          actionLabel: 'Pay / Review',
        });
      } else if (isToday) {
        itemsNeedingAttention.push({
          id: `evt_${evt.id}`,
          title: evt.title,
          category: categoryType,
          urgency: 'due_today',
          reason: `Scheduled for payment today (${evtDate}). Amount: ${currency} ${evt.amount || 0}.`,
          dueDate: evtDate,
          amount: evt.amount,
          currency,
          actionTab,
          subTab,
          entityId: evt.id,
          actionLabel: 'Handle Today',
        });
      } else if (isNext7Days) {
        itemsToWatch.push({
          id: `evt_${evt.id}`,
          title: evt.title,
          category: categoryType,
          urgency: 'due_soon',
          reason: `Due in the next 7 days on ${evtDate}. Amount: ${currency} ${evt.amount || 0}.`,
          dueDate: evtDate,
          amount: evt.amount,
          currency,
          actionTab,
          subTab,
          entityId: evt.id,
          actionLabel: 'View Schedule',
        });
      }
    }

    // 5. Classify Expiring Warranties & Pending Documents
    const expiringWarranties: any[] = warrantiesData.expiringWarranties || [];
    const warrantyConcerns: MorningBriefWarrantyConcern[] = [];
    for (const w of expiringWarranties) {
      warrantyConcerns.push({
        title: `${w.provider} (${w.policyNumber})`,
        type: 'warranty',
        dateOrStatus: `Expires on ${w.endDate}`,
      });

      itemsToWatch.push({
        id: `war_${w.id}`,
        title: `Warranty Expiring: ${w.provider}`,
        category: 'warranty',
        urgency: 'due_soon',
        reason: `Protection expires on ${w.endDate}. Review policy terms before expiration.`,
        dueDate: w.endDate,
        currency,
        actionTab: 'maintenance',
        subTab: 'warranties',
        entityId: w.id,
        actionLabel: 'Review Policy',
      });
    }

    const pendingDocs: any[] = warrantiesData.pendingDocuments || [];
    for (const doc of pendingDocs) {
      warrantyConcerns.push({
        title: doc.fileName,
        type: 'document',
        dateOrStatus: doc.status,
      });

      itemsToWatch.push({
        id: `doc_${doc.id}`,
        title: `Review Document: ${doc.fileName}`,
        category: 'document',
        urgency: 'warning',
        reason: `Uploaded document is in "${doc.status}" state and requires confirmation.`,
        actionTab: 'documents',
        entityId: doc.id,
        actionLabel: 'Review OCR',
      });
    }

    // 6. Maintenance & Asset Concerns
    const maintenanceConcerns: MorningBriefMaintenanceConcern[] = overdueTasks.map((t) => ({
      title: t.title,
      urgency: (t.priority === 'urgent' ? 'critical' : 'overdue') as MorningBriefUrgency,
      dueDate: t.dueDate,
      cost: t.estimatedCost,
    }));

    // 7. Sort items by deterministic urgency priority
    const urgencyOrder: Record<MorningBriefUrgency, number> = {
      critical: 0,
      overdue: 1,
      due_today: 2,
      warning: 3,
      due_soon: 4,
      nominal: 5,
    };

    itemsNeedingAttention.sort((a, b) => (urgencyOrder[a.urgency] ?? 99) - (urgencyOrder[b.urgency] ?? 99));
    itemsToWatch.sort((a, b) => (urgencyOrder[a.urgency] ?? 99) - (urgencyOrder[b.urgency] ?? 99));

    // 8. Determine Overall Status & Headline
    const isHouseholdEmpty =
      totalMonthlyBurnRate === 0 &&
      overdueTasks.length === 0 &&
      calendarEvents.length === 0 &&
      expiringWarranties.length === 0 &&
      completenessScore < 20;

    let overallStatus: HouseholdMorningBrief['overallStatus'] = 'nominal';
    let statusHeadline = 'All Household Systems Operating Nominally';

    if (isHouseholdEmpty) {
      overallStatus = 'setup_required';
      statusHeadline = 'Household Setup in Progress — Welcome to HouseMind';
    } else if (itemsNeedingAttention.some((i) => i.urgency === 'critical')) {
      overallStatus = 'critical';
      const critCount = itemsNeedingAttention.filter((i) => i.urgency === 'critical').length;
      statusHeadline = `${critCount} Critical Issue${critCount > 1 ? 's' : ''} Require Immediate Attention`;
    } else if (itemsNeedingAttention.length > 0) {
      overallStatus = 'attention_required';
      const overdueCount = itemsNeedingAttention.filter((i) => i.urgency === 'overdue').length;
      const todayCount = itemsNeedingAttention.filter((i) => i.urgency === 'due_today').length;
      if (overdueCount > 0 && todayCount > 0) {
        statusHeadline = `${overdueCount} Overdue Item${overdueCount > 1 ? 's' : ''} & ${todayCount} Due Today`;
      } else if (overdueCount > 0) {
        statusHeadline = `${overdueCount} Overdue Item${overdueCount > 1 ? 's' : ''} Require Attention`;
      } else {
        statusHeadline = `${todayCount} Item${todayCount > 1 ? 's' : ''} Due Today`;
      }
    } else if (itemsToWatch.length > 0) {
      overallStatus = 'nominal';
      statusHeadline = `Nominal — ${itemsToWatch.length} Upcoming Item${itemsToWatch.length > 1 ? 's' : ''} on Radar`;
    }

    // 9. Formulate Recommended First Action & Top Action
    let recommendedFirstAction: MorningBriefRecommendedAction | null = null;
    let topAction: MorningBriefTopAction | null = null;

    if (itemsNeedingAttention.length > 0) {
      const top = itemsNeedingAttention[0];
      recommendedFirstAction = {
        title: top.title,
        category: top.category,
        urgency: top.urgency,
        reason: top.reason,
        actionTab: top.actionTab || 'dashboard',
        subTab: top.subTab,
        entityId: top.entityId,
        actionLabel: top.actionLabel || 'Take Action',
      };
    } else if (itemsToWatch.length > 0) {
      const top = itemsToWatch[0];
      recommendedFirstAction = {
        title: top.title,
        category: top.category,
        urgency: top.urgency,
        reason: top.reason,
        actionTab: top.actionTab || 'dashboard',
        subTab: top.subTab,
        entityId: top.entityId,
        actionLabel: top.actionLabel || 'Review',
      };
    } else if (isHouseholdEmpty) {
      recommendedFirstAction = {
        title: 'Add Your First Home Property',
        category: 'general',
        urgency: 'nominal',
        reason: 'Complete initial setup to unlock automated health scores and preventative intelligence.',
        actionTab: 'properties',
        actionLabel: 'Add Your Home',
      };
    } else {
      recommendedFirstAction = {
        title: 'Perform Routine Preventative Inspection',
        category: 'maintenance',
        urgency: 'nominal',
        reason: 'All active schedules and bills are currently up to date.',
        actionTab: 'dashboard',
        actionLabel: 'View Dashboard',
      };
    }

    // Top action for Morning Brief Modal
    const topUnifiedAction = unifiedActionsRes?.actions?.[0];
    if (topUnifiedAction && !isHouseholdEmpty && (!itemsNeedingAttention[0] || itemsNeedingAttention[0].urgency !== 'critical' || topUnifiedAction.priority === 'critical')) {
      const primaryRec = topUnifiedAction.recommendedActions?.[0];
      topAction = {
        id: topUnifiedAction.id,
        title: topUnifiedAction.title,
        why: topUnifiedAction.evidence?.facts?.slice(0, 3) || [topUnifiedAction.whyItMatters],
        actionLabel: primaryRec?.title || 'Review Action',
        targetTab: primaryRec?.targetTab || 'maintenance',
        subTab: primaryRec?.subTab,
        entityId: primaryRec?.entityId,
        copilotPrompt: `Why is "${topUnifiedAction.title}" recommended as my top household priority?`,
      };
    } else if (itemsNeedingAttention.length > 0) {
      const top = itemsNeedingAttention[0];
      topAction = {
        id: top.id,
        title: top.title,
        why: [top.reason],
        actionLabel: top.actionLabel || 'Take Action',
        targetTab: top.actionTab || 'dashboard',
        subTab: top.subTab,
        entityId: top.entityId,
        copilotPrompt: `Why does "${top.title}" need my attention today?`,
      };
    } else if (topUnifiedAction && !isHouseholdEmpty) {
      const primaryRec = topUnifiedAction.recommendedActions?.[0];
      topAction = {
        id: topUnifiedAction.id,
        title: topUnifiedAction.title,
        why: topUnifiedAction.evidence?.facts?.slice(0, 3) || [topUnifiedAction.whyItMatters],
        actionLabel: primaryRec?.title || 'Review Action',
        targetTab: primaryRec?.targetTab || 'maintenance',
        subTab: primaryRec?.subTab,
        entityId: primaryRec?.entityId,
        copilotPrompt: `Why is "${topUnifiedAction.title}" recommended as my top household priority?`,
      };
    } else if (itemsToWatch.length > 0) {
      const top = itemsToWatch[0];
      topAction = {
        id: top.id,
        title: top.title,
        why: [top.reason],
        actionLabel: top.actionLabel || 'Review',
        targetTab: top.actionTab || 'dashboard',
        subTab: top.subTab,
        entityId: top.entityId,
        copilotPrompt: `What should I know about upcoming item "${top.title}"?`,
      };
    } else if (isHouseholdEmpty) {
      topAction = {
        title: 'Add Your First Home Property',
        why: [
          'Get organized with unified cross-domain intelligence.',
          'Track assets, maintenance schedules, warranties, and recurring bills in one place.',
        ],
        actionLabel: 'Add Your Home',
        targetTab: 'properties',
        copilotPrompt: 'How should I get started with setting up my household in HouseMind?',
      };
    } else {
      topAction = {
        title: 'Perform Routine Preventative Inspection',
        why: ['All active upkeep schedules and recurring bills are currently up to date.'],
        actionLabel: 'View Dashboard',
        targetTab: 'dashboard',
        copilotPrompt: 'What preventative maintenance or checks should I plan for this season?',
      };
    }

    // 10. Meaningful Changes Since Last Briefing (2–3 bullet points)
    const meaningfulChanges: string[] = [];
    if (!isHouseholdEmpty) {
      for (const issue of issuesList) {
        if (issue.status === 'in_progress') {
          meaningfulChanges.push(`Issue "${issue.title}" moved to In Progress.`);
        } else if (issue.status === 'resolved' || issue.status === 'verified') {
          meaningfulChanges.push(`Issue "${issue.title}" was marked resolved.`);
        }
      }
      for (const m of maintenancesList) {
        if (m.status === 'completed') {
          meaningfulChanges.push(`Maintenance task "${m.title}" was completed.`);
        }
      }
      for (const exp of expensesList) {
        if (exp.category === 'maintenance' || exp.category === 'services' || (exp.title && /repair/i.test(exp.title))) {
          meaningfulChanges.push(`${currency} ${Number(exp.amount).toLocaleString()} repair expense recorded for "${exp.title}".`);
        }
      }
      if (warrantiesData.expiringWarranties && warrantiesData.expiringWarranties.length > 0) {
        const topWar = warrantiesData.expiringWarranties[0];
        meaningfulChanges.push(`Warranty for "${topWar.provider || topWar.assetName || 'Equipment'}" entered expiration window (due ${topWar.endDate}).`);
      }
    }

    const trimmedChanges = meaningfulChanges.slice(0, 3);
    if (trimmedChanges.length === 0 && !isHouseholdEmpty) {
      trimmedChanges.push('All tracked household assets and utility accounts operating nominally.');
    }

    // 11. Positive Signal
    let positiveSignal: string | undefined = undefined;
    if (!isHouseholdEmpty) {
      const resolvedIssue = issuesList.find((i) => i.status === 'resolved' || i.status === 'verified');
      if (resolvedIssue) {
        positiveSignal = `Issue "${resolvedIssue.title}" was successfully resolved.`;
      } else if (overdueTasks.length === 0 && itemsNeedingAttention.filter((i) => i.urgency === 'overdue').length === 0) {
        positiveSignal = 'All scheduled maintenance tasks and bill payments are currently up to date.';
      } else if (healthScore && healthScore >= 80) {
        positiveSignal = 'Your overall household operational score is in good health today.';
      }
    }

    // 12. Dismissal State Check
    const isDismissedToday = profile?.lastDismissedBriefDate === todayStr;
    const lastDismissedDate = profile?.lastDismissedBriefDate;

    // 13. Synthesize Narrative (Gemini with deterministic fallback)
    const synthesizedNarrative = await this.generateSynthesizedNarrative({
      homeName,
      currency,
      overallStatus,
      statusHeadline,
      isProvisional,
      healthScore,
      healthLabel,
      totalMonthlyBurnRate,
      upcomingTotalDueNext7Days,
      totalOutstandingDebt,
      itemsNeedingAttention,
      itemsToWatch,
      recommendedFirstAction,
    });

    const agentAudit: AgentAuditMetadata = {
      intent: 'MORNING_BRIEF',
      toolsInvoked: toolAuditRecords,
      authenticatedTenant: `tenant_${userId.substring(0, 8)}`,
      timestamp,
    };

    return {
      generatedAt: timestamp,
      homeName,
      statusHeadline,
      overallStatus,
      healthScore: isProvisional ? undefined : healthScore,
      healthLabel: isProvisional ? 'Unrated (Setup Required)' : healthLabel,
      isProvisional,
      completenessScore,
      itemsNeedingAttention,
      itemsToWatch,
      meaningfulChanges: trimmedChanges,
      positiveSignal,
      topAction,
      isDismissedToday,
      lastDismissedDate,
      financialObligationsSummary: {
        monthlyBurnRate: Number(totalMonthlyBurnRate.toFixed(2)),
        upcomingTotalDueNext7Days: Number(upcomingTotalDueNext7Days.toFixed(2)),
        currency,
        keyObligations: keyObligations.slice(0, 8),
      },
      maintenanceAssetConcerns: {
        overdueTasksCount: overdueTasks.length,
        upcomingTasksCount: calendarEvents.filter((e) => e.category === 'maintenance').length,
        concerns: maintenanceConcerns.slice(0, 6),
      },
      documentWarrantyConcerns: {
        expiringWarrantiesCount: expiringWarranties.length,
        pendingReviewDocsCount: pendingDocs.length,
        concerns: warrantyConcerns.slice(0, 6),
      },
      recommendedFirstAction,
      synthesizedNarrative,
      groundedFacts: {
        totalAssetsCount,
        activeWarrantiesCount,
        totalMonthlyBurnRate: Number(totalMonthlyBurnRate.toFixed(2)),
        totalOutstandingDebt: Number(totalOutstandingDebt.toFixed(2)),
        currency,
      },
      agentAudit,
    };
  }

  /**
   * Generates Gemini narrative with strict timeout and deterministic fallback.
   */
  private static async generateSynthesizedNarrative(params: {
    homeName: string;
    currency: string;
    overallStatus: string;
    statusHeadline: string;
    isProvisional: boolean;
    healthScore?: number;
    healthLabel?: string;
    totalMonthlyBurnRate: number;
    upcomingTotalDueNext7Days: number;
    totalOutstandingDebt: number;
    itemsNeedingAttention: MorningBriefItem[];
    itemsToWatch: MorningBriefItem[];
    recommendedFirstAction: MorningBriefRecommendedAction | null;
  }): Promise<string> {
    const {
      homeName,
      currency,
      overallStatus,
      statusHeadline,
      isProvisional,
      healthScore,
      healthLabel,
      totalMonthlyBurnRate,
      upcomingTotalDueNext7Days,
      totalOutstandingDebt,
      itemsNeedingAttention,
      itemsToWatch,
      recommendedFirstAction,
    } = params;

    // Build concise deterministic narrative fallback
    const buildFallbackText = (): string => {
      if (overallStatus === 'setup_required') {
        return `Good morning! Welcome to **${homeName}**.

Your household profile is currently being configured. To unlock full automated tracking, start by adding your property details, key home equipment, and utility accounts.

**Recommended Step:** ${recommendedFirstAction?.title || 'Add your first property'} — ${recommendedFirstAction?.reason || ''}`;
      }

      const attentionList =
        itemsNeedingAttention.length > 0
          ? itemsNeedingAttention
              .map((i, idx) => `${idx + 1}. **[${i.urgency.toUpperCase()}] ${i.title}**: ${i.reason}`)
              .join('\n')
          : '• None. All primary obligations and scheduled upkeep are up to date.';

      const watchList =
        itemsToWatch.length > 0
          ? itemsToWatch
              .slice(0, 4)
              .map((i, idx) => `${idx + 1}. **${i.title}**: ${i.reason}`)
              .join('\n')
          : '• None. No immediate items on the 7-day radar.';

      const healthStr = isProvisional
        ? 'Unrated (Setup in progress)'
        : `${healthScore}/100 (${healthLabel})`;

      return `### 🌅 Morning Brief: ${homeName}
**Status:** ${statusHeadline} (Health: ${healthStr})

#### 🚨 Immediate Attention:
${attentionList}

#### 🔭 On the Radar (Next 7 Days):
${watchList}

#### 💳 Financial Outlook:
- **Upcoming Due (Next 7 Days):** ${currency} ${upcomingTotalDueNext7Days.toFixed(2)}
- **Monthly Baseline Burn Rate:** ${currency} ${totalMonthlyBurnRate.toFixed(2)}/mo
- **Outstanding Debt Commitments:** ${currency} ${totalOutstandingDebt.toLocaleString()}

**Recommended First Action:** ${recommendedFirstAction?.title || 'Perform preventative check'} (${recommendedFirstAction?.reason || ''})`;
    };

    // Attempt Gemini synthesis
    const client = getGeminiClient();
    const modelName = getGeminiModel('gemini-2.5-flash');

    const systemPrompt = `You are HouseMind Morning Brief AI, synthesizing the daily operational brief for **${homeName}**.
You must produce a concise, professional, clear briefing in markdown.

AUTHORITATIVE FACTS:
- Headline: ${statusHeadline}
- Status: ${overallStatus}
- Household Health: ${isProvisional ? 'Unrated' : `${healthScore}/100 (${healthLabel})`}
- Total Monthly Burn Rate: ${currency} ${totalMonthlyBurnRate.toFixed(2)}
- Total Due in Next 7 Days: ${currency} ${upcomingTotalDueNext7Days.toFixed(2)}
- Total Outstanding Debt: ${currency} ${totalOutstandingDebt.toLocaleString()}
- Critical & Overdue Items (${itemsNeedingAttention.length}): ${JSON.stringify(itemsNeedingAttention.map((i) => ({ title: i.title, urgency: i.urgency, reason: i.reason })))}
- Items to Watch (${itemsToWatch.length}): ${JSON.stringify(itemsToWatch.slice(0, 4).map((i) => ({ title: i.title, reason: i.reason })))}
- Recommended First Action: ${recommendedFirstAction?.title} (${recommendedFirstAction?.reason})

RULES:
1. Do not invent non-existent facts or change monetary figures.
2. Structure with clean markdown headings and bullet points.
3. Keep the tone calm, objective, and executive.
4. Conclude with the specific Recommended First Action.`;

    try {
      const generatePromise = client.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Please synthesize my morning brief based strictly on the authoritative facts.' }],
          },
        ] as any,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.2,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Morning brief AI timeout (>3.5s)')), 3500)
      );

      const response = (await Promise.race([generatePromise, timeoutPromise])) as any;
      const text = response?.text;
      if (text && text.trim().length > 0) {
        return text.trim();
      }
      throw new Error('Empty Gemini response received');
    } catch (err: any) {
      console.warn('[MORNING BRIEF] Using deterministic fallback narrative:', err?.message || String(err));
      return buildFallbackText();
    }
  }
}
