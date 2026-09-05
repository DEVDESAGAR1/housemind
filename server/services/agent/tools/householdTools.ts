import { DatabaseService } from '../../dbService';
import { HouseholdHealthService } from '../../householdHealthService';
import { CalendarService } from '../../calendarService';
import { NotificationService } from '../../notificationService';
import { CrossDomainIntelligenceService } from '../../crossDomainIntelligenceService';
import { UnifiedHouseholdActionService } from '../../unifiedHouseholdActionService';
import { toMonthlyAmount } from '../householdContextBuilder';

export interface UpcomingObligationsParams {
  days?: number;
}

export interface ExpiringWarrantiesParams {
  daysAhead?: number;
}

export interface RecentNotificationsParams {
  unreadOnly?: boolean;
}

/**
 * Safe, Read-Only Household Tools Layer for Agent Execution.
 * All functions strictly receive authenticated userId from the server.
 */
export class HouseholdTools {
  /**
   * 1. Retrieves household health score and category vitality report
   */
  public static async getHouseholdHealth(userId: string) {
    const report = await HouseholdHealthService.getHouseholdHealth(userId, {
      includeAiExplanation: false,
    });

    return {
      overallScore: report.overallScore,
      statusLabel: report.statusLabel,
      completenessScore: report.completenessScore,
      isProvisional: report.isProvisional,
      homeScore: report.categories?.home?.score ?? 0,
      assetScore: report.categories?.assets?.score ?? 0,
      financeScore: report.categories?.finances?.score ?? 0,
      docScore: report.categories?.documents?.score ?? 0,
      topRecommendations: (report.recommendations || []).slice(0, 3).map((r) => ({
        title: r.title,
        description: r.description,
        priority: r.priority,
      })),
    };
  }

  /**
   * 2. Retrieves upcoming calendar obligations, bills, EMIs, and upkeep tasks
   */
  public static async getUpcomingObligations(
    userId: string,
    params?: UpcomingObligationsParams
  ) {
    const days = Math.min(Math.max(Number(params?.days) || 30, 1), 90);
    const calendar = await CalendarService.getCalendarEvents(userId, {
      referenceDate: new Date(),
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const maxDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

    const filteredEvents = (calendar?.events || [])
      .filter((e) => e.date >= todayStr && e.date <= maxDate)
      .slice(0, 10)
      .map((e) => ({
        id: e.id,
        title: e.title,
        date: e.formattedDate || e.date,
        eventType: e.eventType,
        status: e.status,
        priority: e.priority,
        amount: e.amount,
      }));

    return {
      horizonDays: days,
      totalCount: filteredEvents.length,
      countsByStatus: calendar?.countsByStatus || { overdue: 0, due_today: 0, due_soon: 0, upcoming: 0 },
      events: filteredEvents,
    };
  }

  /**
   * 3. Retrieves overdue maintenance tasks requiring immediate action
   */
  public static async getOverdueMaintenance(userId: string) {
    const maintenances = await DatabaseService.listMaintenances(userId);
    const profile = await DatabaseService.getProfile(userId).catch(() => null);
    const currency = profile?.currency || 'USD';
    const todayStr = new Date().toISOString().split('T')[0];

    const overdueTasks = maintenances.filter((m) => {
      const due = m.nextServiceDate || m.serviceDate;
      return m.status !== 'completed' && due && due < todayStr;
    });

    const totalEstCost = overdueTasks.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);

    return {
      currency,
      overdueCount: overdueTasks.length,
      totalEstimatedCost: totalEstCost,
      tasks: overdueTasks.map((m) => ({
        id: m.id,
        title: m.title,
        dueDate: m.nextServiceDate || m.serviceDate,
        status: m.status,
        estimatedCost: m.cost || 0,
        provider: m.serviceProvider || 'Self/DIY',
      })),
    };
  }

  /**
   * 4. Computes comprehensive household financial overview and debt commitments
   */
  public static async getFinancialSummary(userId: string) {
    const [profile, expenses, utilities, loans, creditCards] = await Promise.all([
      DatabaseService.getProfile(userId).catch(() => null),
      DatabaseService.listExpenses(userId).catch(() => []),
      DatabaseService.listUtilities(userId).catch(() => []),
      DatabaseService.listLoans(userId).catch(() => []),
      DatabaseService.listCreditCards(userId).catch(() => []),
    ]);

    const currency = profile?.currency || 'USD';

    let monthlyExpenses = 0;
    for (const e of expenses) {
      monthlyExpenses += toMonthlyAmount(e.amount, e.frequency);
    }
    let monthlyUtilities = 0;
    for (const u of utilities) {
      monthlyUtilities += Number(u.typicalAmount) || 0;
    }
    let monthlyLoans = 0;
    for (const l of loans) {
      monthlyLoans += Number(l.emiAmount) || 0;
    }
    const totalMonthlyBurnRate = monthlyExpenses + monthlyUtilities + monthlyLoans;

    let loanPrincipal = 0;
    for (const l of loans) {
      loanPrincipal += Number(l.outstandingAmount ?? l.principalAmount) || 0;
    }
    let cardBalances = 0;
    for (const c of creditCards) {
      cardBalances += Number(c.outstandingAmount) || 0;
    }
    const totalDebt = loanPrincipal + cardBalances;

    return {
      currency,
      totalMonthlyBurnRate: Number(totalMonthlyBurnRate.toFixed(2)),
      breakdown: {
        recurringExpensesMonthly: Number(monthlyExpenses.toFixed(2)),
        utilitiesMonthly: Number(monthlyUtilities.toFixed(2)),
        loanEmisMonthly: Number(monthlyLoans.toFixed(2)),
      },
      debtSummary: {
        totalOutstandingDebt: totalDebt,
        loanPrincipal,
        creditCardBalances: cardBalances,
        activeLoansCount: loans.length,
        activeCreditCardsCount: creditCards.length,
      },
      accountsTracked: {
        expensesCount: expenses.length,
        utilitiesCount: utilities.length,
        loansCount: loans.length,
        creditCardsCount: creditCards.length,
      },
    };
  }

  /**
   * 5. Retrieves expiring warranties and pending document reviews
   */
  public static async getExpiringWarrantiesAndDocuments(
    userId: string,
    params?: ExpiringWarrantiesParams
  ) {
    const daysAhead = Math.min(Math.max(Number(params?.daysAhead) || 60, 1), 180);
    const [warranties, documents] = await Promise.all([
      DatabaseService.listWarranties(userId).catch(() => []),
      DatabaseService.listDocuments(userId).catch(() => []),
    ]);

    const todayStr = new Date().toISOString().split('T')[0];
    const thresholdDate = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0];

    const expiringWarranties = warranties.filter((w) => {
      const isLive = w.status === 'active' || w.status === 'expiring_soon';
      return isLive && w.endDate && w.endDate >= todayStr && w.endDate <= thresholdDate;
    });

    const pendingDocs = documents.filter(
      (d) => d.status === 'pending_review' || d.status === 'parsed'
    );

    return {
      horizonDays: daysAhead,
      activeWarrantiesTotal: warranties.filter((w) => w.status === 'active' || w.status === 'expiring_soon').length,
      expiringWarrantiesCount: expiringWarranties.length,
      expiringWarranties: expiringWarranties.map((w) => ({
        id: w.id,
        provider: w.warrantyProvider,
        policyNumber: w.policyNumber || 'N/A',
        endDate: w.endDate,
      })),
      pendingReviewDocumentsCount: pendingDocs.length,
      pendingDocuments: pendingDocs.slice(0, 5).map((d) => ({
        id: d.id,
        fileName: d.fileName,
        docType: d.docType,
        status: d.status,
      })),
    };
  }

  /**
   * 6. Retrieves recent alerts and notification center triage
   */
  public static async getRecentNotifications(
    userId: string,
    params?: RecentNotificationsParams
  ) {
    const notifs = await NotificationService.getNotifications(userId);
    const list = notifs?.notifications || [];

    const filtered = params?.unreadOnly ? list.filter((n) => !n.isRead) : list;

    return {
      unreadCount: notifs?.unreadCount || 0,
      totalCount: list.length,
      notifications: filtered.slice(0, 6).map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        priority: n.priority,
        category: n.category,
        dueDate: n.dueDate,
        isRead: n.isRead,
      })),
    };
  }

  /**
   * 7. Retrieves household issues, tickets, and recurrence intelligence
   */
  public static async getHouseholdIssues(
    userId: string,
    params?: { status?: string; severity?: string; assetId?: string }
  ) {
    const issues = await DatabaseService.listIssues(userId);
    const profile = await DatabaseService.getProfile(userId).catch(() => null);
    const currency = profile?.currency || 'USD';

    let filtered = issues;
    if (params?.status) {
      if (params.status === 'open') {
        filtered = filtered.filter(
          (i) => !['resolved', 'verified', 'closed', 'cancelled'].includes(i.status)
        );
      } else {
        filtered = filtered.filter((i) => i.status === params.status);
      }
    }
    if (params?.severity) {
      filtered = filtered.filter((i) => i.severity === params.severity);
    }
    if (params?.assetId) {
      filtered = filtered.filter((i) => i.assetId === params.assetId);
    }

    const openCount = issues.filter(
      (i) => !['resolved', 'verified', 'closed', 'cancelled'].includes(i.status)
    ).length;
    const criticalCount = issues.filter(
      (i) =>
        (i.severity === 'critical' || !!i.safetyWarning) &&
        !['resolved', 'verified', 'closed', 'cancelled'].includes(i.status)
    ).length;

    return {
      currency,
      totalIssuesCount: issues.length,
      openIssuesCount: openCount,
      criticalIssuesCount: criticalCount,
      matchingIssuesCount: filtered.length,
      issues: filtered.slice(0, 10).map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        severity: i.severity,
        safetyWarning: i.safetyWarning,
        reportedAt: i.reportedAt,
        scheduledDate: i.scheduledDate,
        dueDate: i.dueDate,
        serviceProvider: i.serviceProvider,
        estimatedCost: i.estimatedCost,
        actualCost: i.actualCost,
        resolution: i.resolution,
        rootCause: i.rootCause,
      })),
    };
  }

  /**
   * 8. Retrieves cross-domain household insights linking assets, warranties, maintenance, issues, and finance
   */
  public static async getCrossDomainInsights(
    userId: string,
    params?: { priority?: string; type?: string; limit?: number }
  ) {
    const result = await CrossDomainIntelligenceService.generateCrossDomainInsights(userId, {
      priority: params?.priority,
      type: params?.type,
      limit: params?.limit || 10,
    });

    return {
      totalInsights: result.total,
      criticalCount: result.criticalCount,
      overdueCount: result.overdueCount,
      warningCount: result.warningCount,
      dueSoonCount: result.dueSoonCount,
      insights: result.insights.map((ins) => ({
        id: ins.id,
        type: ins.type,
        title: ins.title,
        priority: ins.priority,
        severity: ins.severity,
        explanation: ins.explanation,
        relatedDomains: ins.relatedDomains,
        relatedRecords: ins.relatedRecords.map((r) => ({
          domain: r.domain,
          title: r.title,
        })),
        evidence: ins.deterministicEvidence.facts,
        recommendedAction: ins.recommendedAction?.title,
      })),
    };
  }

  /**
   * 9. Retrieves operational household timeline across all domains
   */
  public static async getHouseholdTimeline(
    userId: string,
    params?: { domain?: string; limit?: number }
  ) {
    const timeline = await CrossDomainIntelligenceService.generateHouseholdTimeline(userId, {
      domain: params?.domain,
      limit: params?.limit || 15,
    });

    return {
      totalEvents: timeline.totalEvents,
      domainCounts: timeline.domainCounts,
      events: timeline.events.map((e) => ({
        id: e.id,
        date: e.date,
        title: e.title,
        description: e.description,
        domain: e.domain,
        eventType: e.eventType,
        status: e.status,
        amount: e.amount,
      })),
    };
  }
  /**
   * 10. Retrieves consolidated, prioritized next actions across the household
   */
  public static async getUnifiedHouseholdActions(
    userId: string,
    params?: { priority?: string; domain?: string; limit?: number }
  ) {
    const result = await UnifiedHouseholdActionService.getUnifiedActions(userId, {
      priority: params?.priority,
      domain: params?.domain,
      limit: params?.limit || 10,
    });

    return {
      total: result.total,
      criticalCount: result.criticalCount,
      overdueCount: result.overdueCount,
      dueTodayCount: result.dueTodayCount,
      warningCount: result.warningCount,
      dueSoonCount: result.dueSoonCount,
      actions: result.actions.map((act) => ({
        id: act.id,
        type: act.type,
        priority: act.priority,
        title: act.title,
        summary: act.summary,
        whyItMatters: act.whyItMatters,
        evidence: act.evidence.facts,
        relatedRecords: act.relatedRecords.map((r) => ({
          domain: r.domain,
          title: r.title,
        })),
        recommendedActions: act.recommendedActions.map((ra) => ra.title),
      })),
    };
  }
}

