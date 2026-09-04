import { DatabaseService, getOrCreateUserStore } from './dbService';
import { ActionExecutor } from './agent/actionExecutor';
import {
  HouseholdNotification,
  HouseholdNotificationsResponse,
  NotificationPreferences,
  HouseholdNotificationCategory,
  HouseholdNotificationPriority,
} from '../../src/types';

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'userId' | 'updatedAt'> = {
  categories: {
    billsPayments: true,
    maintenance: true,
    warranties: true,
    documents: true,
    householdAlerts: true,
  },
  advanceNoticeDays: {
    bills: 7,
    maintenance: 14,
    warranties: 30,
    documents: 30,
  },
  channels: {
    inApp: true,
    email: false,
  },
};

function calculateDaysDiff(targetIso: string, todayIso: string): number {
  const target = new Date(targetIso + 'T00:00:00Z');
  const today = new Date(todayIso + 'T00:00:00Z');
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function parseIsoDay(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length < 3) return null;
  return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
}

export class NotificationService {
  /**
   * Retrieves or initializes user notification preferences
   */
  static getPreferences(userId: string): NotificationPreferences {
    const store = getOrCreateUserStore(userId);
    if (!store.profile.notificationPreferences) {
      store.profile.notificationPreferences = {
        userId,
        ...DEFAULT_PREFERENCES,
        emailAddress: store.profile.email || '',
        updatedAt: new Date().toISOString(),
      };
    }
    return store.profile.notificationPreferences;
  }

  /**
   * Updates user notification preferences
   */
  static updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): NotificationPreferences {
    const store = getOrCreateUserStore(userId);
    const current = this.getPreferences(userId);

    const updated: NotificationPreferences = {
      ...current,
      ...updates,
      userId,
      categories: {
        ...current.categories,
        ...(updates.categories || {}),
      },
      advanceNoticeDays: {
        ...current.advanceNoticeDays,
        ...(updates.advanceNoticeDays || {}),
      },
      channels: {
        ...current.channels,
        ...(updates.channels || {}),
      },
      updatedAt: new Date().toISOString(),
    };

    store.profile.notificationPreferences = updated;
    return updated;
  }

  /**
   * Retrieves notification read and dismissed state maps
   */
  private static getNotificationStateMap(userId: string): Map<string, { isRead: boolean; readAt?: string; isDismissed?: boolean }> {
    const store = getOrCreateUserStore(userId);
    if (!(store as any).notificationStates) {
      (store as any).notificationStates = new Map<string, { isRead: boolean; readAt?: string; isDismissed?: boolean }>();
    }
    return (store as any).notificationStates;
  }

  /**
   * Derives all active household notifications deterministically from source records
   */
  static async getNotifications(
    userId: string,
    options: { referenceDate?: Date } = {}
  ): Promise<HouseholdNotificationsResponse> {
    const store = getOrCreateUserStore(userId);
    const prefs = this.getPreferences(userId);
    const stateMap = this.getNotificationStateMap(userId);
    const refDate = options.referenceDate || new Date();
    const todayIso = refDate.toISOString().slice(0, 10);

    const notifications: HouseholdNotification[] = [];

    // 1. Bills & Payments Notifications
    if (prefs.categories.billsPayments) {
      const billHorizon = prefs.advanceNoticeDays.bills || 7;

      // Expenses
      const expenses = Array.from(store.expenses.values());
      for (const exp of expenses) {
        if (exp.paymentStatus === 'paid' || !exp.dueDate) continue;
        const dueIso = parseIsoDay(exp.dueDate);
        if (!dueIso) continue;

        const daysDiff = calculateDaysDiff(dueIso, todayIso);

        // Include if overdue or due within configured horizon
        if (daysDiff <= billHorizon) {
          const notifId = `notif_exp_${exp.id}_${dueIso}`;
          const isOverdue = daysDiff < 0;
          const isToday = daysDiff === 0;

          let priority: HouseholdNotificationPriority = 'upcoming';
          let title = `Bill Due: ${exp.title}`;
          let message = `${exp.title} ($${exp.amount}) is due in ${daysDiff} day${daysDiff === 1 ? '' : 's'}.`;

          if (isOverdue) {
            priority = 'critical';
            title = `Overdue Bill: ${exp.title}`;
            message = `${exp.title} payment of $${exp.amount} is ${Math.abs(daysDiff)} day${Math.abs(daysDiff) === 1 ? '' : 's'} past due.`;
          } else if (isToday) {
            priority = 'important';
            title = `Bill Due Today: ${exp.title}`;
            message = `${exp.title} payment of $${exp.amount} is due today.`;
          } else if (daysDiff <= 3) {
            priority = 'important';
          }

          const savedState = stateMap.get(notifId);
          if (!savedState?.isDismissed) {
            notifications.push({
              id: notifId,
              userId,
              category: 'bills_payments',
              priority,
              title,
              message,
              dueDate: dueIso,
              sourceEntityType: 'expense',
              sourceId: exp.id,
              targetTab: 'expenses',
              targetSubTab: 'recurring',
              actionLabel: 'View Bill',
              isRead: savedState?.isRead || false,
              readAt: savedState?.readAt,
              isDismissed: false,
              createdAt: new Date(refDate.getTime() - Math.max(0, 5 - daysDiff) * 3600000).toISOString(),
              metadata: { amount: exp.amount, isAutoPay: exp.isAutoPay },
            });
          }
        }
      }

      // Utilities
      const utilities = Array.from(store.utilities.values());
      for (const util of utilities) {
        const targetDate = util.nextDueDate || (util.dueDateDay ? `${todayIso.slice(0, 7)}-${String(util.dueDateDay).padStart(2, '0')}` : null);
        if (!targetDate) continue;
        const dueIso = parseIsoDay(targetDate);
        if (!dueIso) continue;

        const daysDiff = calculateDaysDiff(dueIso, todayIso);

        if (daysDiff <= billHorizon) {
          const notifId = `notif_util_${util.id}_${dueIso}`;
          const isOverdue = daysDiff < 0;
          const isToday = daysDiff === 0;

          let priority: HouseholdNotificationPriority = 'upcoming';
          let title = `Utility Bill Due: ${util.name || 'Utility'}`;
          const amt = util.latestBillAmount || util.typicalAmount || 0;
          let message = `${util.name} (${util.provider || 'Utility'}) is due in ${daysDiff} days.`;

          if (isOverdue) {
            priority = 'critical';
            title = `Overdue Utility: ${util.name || 'Utility'}`;
            message = `${util.name} payment${amt ? ` ($${amt})` : ''} is ${Math.abs(daysDiff)} days overdue.`;
          } else if (isToday) {
            priority = 'important';
            title = `Utility Due Today: ${util.name}`;
            message = `${util.name} payment${amt ? ` ($${amt})` : ''} is due today.`;
          } else if (daysDiff <= 3) {
            priority = 'important';
          }

          const savedState = stateMap.get(notifId);
          if (!savedState?.isDismissed) {
            notifications.push({
              id: notifId,
              userId,
              category: 'bills_payments',
              priority,
              title,
              message,
              dueDate: dueIso,
              sourceEntityType: 'utility',
              sourceId: util.id,
              targetTab: 'utilities',
              targetSubTab: 'accounts',
              actionLabel: 'View Utility',
              isRead: savedState?.isRead || false,
              readAt: savedState?.readAt,
              isDismissed: false,
              createdAt: new Date(refDate.getTime() - 2 * 3600000).toISOString(),
              metadata: { provider: util.provider, isAutoPay: util.isAutoPay },
            });
          }
        }
      }

      // Credit Cards
      const cards = Array.from(store.creditCards.values());
      for (const card of cards) {
        if (card.paymentStatus === 'paid' || !card.paymentDueDate) continue;
        const dueIso = parseIsoDay(card.paymentDueDate);
        if (!dueIso) continue;

        const daysDiff = calculateDaysDiff(dueIso, todayIso);

        if (daysDiff <= billHorizon) {
          const notifId = `notif_cc_${card.id}_${dueIso}`;
          const isOverdue = daysDiff < 0;
          const isToday = daysDiff === 0;

          let priority: HouseholdNotificationPriority = 'upcoming';
          let title = `Credit Card Due: ${card.cardNickname}`;
          let message = `Payment for ${card.cardNickname} (*${card.last4Digits}) is due in ${daysDiff} days. Balance: $${card.outstandingAmount}.`;

          if (isOverdue) {
            priority = 'critical';
            title = `Overdue Card Bill: ${card.cardNickname}`;
            message = `Card payment of $${card.outstandingAmount} for ${card.cardNickname} (*${card.last4Digits}) is ${Math.abs(daysDiff)} days overdue.`;
          } else if (isToday) {
            priority = 'important';
            title = `Card Payment Due Today: ${card.cardNickname}`;
            message = `Card balance of $${card.outstandingAmount} for ${card.cardNickname} is due today.`;
          } else if (daysDiff <= 3) {
            priority = 'important';
          }

          const savedState = stateMap.get(notifId);
          if (!savedState?.isDismissed) {
            notifications.push({
              id: notifId,
              userId,
              category: 'bills_payments',
              priority,
              title,
              message,
              dueDate: dueIso,
              sourceEntityType: 'credit_card',
              sourceId: card.id,
              targetTab: 'utilities',
              targetSubTab: 'cards',
              actionLabel: 'View Card',
              isRead: savedState?.isRead || false,
              readAt: savedState?.readAt,
              isDismissed: false,
              createdAt: new Date(refDate.getTime() - 1 * 3600000).toISOString(),
              metadata: { last4: card.last4Digits, outstanding: card.outstandingAmount },
            });
          }
        }
      }

      // Loans / EMIs
      const loans = Array.from(store.loans.values());
      for (const loan of loans) {
        if (loan.status !== 'active') continue;
        const dueDay = loan.paymentDueDay || 1;
        const calcIso = `${todayIso.slice(0, 7)}-${String(dueDay).padStart(2, '0')}`;
        const daysDiff = calculateDaysDiff(calcIso, todayIso);

        if (daysDiff >= -5 && daysDiff <= billHorizon) {
          const notifId = `notif_loan_${loan.id}_${calcIso}`;
          const isOverdue = daysDiff < 0;
          const isToday = daysDiff === 0;

          let priority: HouseholdNotificationPriority = 'upcoming';
          let title = `Loan EMI Due: ${loan.loanName}`;
          let message = `Monthly EMI of $${loan.emiAmount} for ${loan.loanName} is due in ${daysDiff} days.`;

          if (isOverdue) {
            priority = 'critical';
            title = `Overdue EMI: ${loan.loanName}`;
            message = `Monthly EMI of $${loan.emiAmount} for ${loan.loanName} is ${Math.abs(daysDiff)} days overdue.`;
          } else if (isToday) {
            priority = 'important';
            title = `EMI Due Today: ${loan.loanName}`;
            message = `Monthly installment of $${loan.emiAmount} for ${loan.loanName} is due today.`;
          }

          const savedState = stateMap.get(notifId);
          if (!savedState?.isDismissed) {
            notifications.push({
              id: notifId,
              userId,
              category: 'bills_payments',
              priority,
              title,
              message,
              dueDate: calcIso,
              sourceEntityType: 'loan',
              sourceId: loan.id,
              targetTab: 'utilities',
              targetSubTab: 'loans',
              actionLabel: 'View Loan',
              isRead: savedState?.isRead || false,
              readAt: savedState?.readAt,
              isDismissed: false,
              createdAt: new Date(refDate.getTime() - 4 * 3600000).toISOString(),
              metadata: { emiAmount: loan.emiAmount },
            });
          }
        }
      }
    }

    // 2. Maintenance Notifications
    if (prefs.categories.maintenance) {
      const maintHorizon = prefs.advanceNoticeDays.maintenance || 14;
      const maintenances = Array.from(store.maintenances.values());

      for (const m of maintenances) {
        if (m.status === 'completed') continue;
        const targetDate = m.nextServiceDate || m.serviceDate;
        if (!targetDate) continue;
        const dueIso = parseIsoDay(targetDate);
        if (!dueIso) continue;

        const daysDiff = calculateDaysDiff(dueIso, todayIso);

        if (daysDiff <= maintHorizon) {
          const notifId = `notif_maint_${m.id}_${dueIso}`;
          const isOverdue = daysDiff < 0;
          const isToday = daysDiff === 0;

          let priority: HouseholdNotificationPriority = 'upcoming';
          let title = `Maintenance Due: ${m.title}`;
          let message = `Scheduled service "${m.title}" is due in ${daysDiff} days.`;

          if (isOverdue) {
            priority = 'important';
            title = `Overdue Maintenance: ${m.title}`;
            message = `Scheduled service "${m.title}" was due ${Math.abs(daysDiff)} days ago. Complete or reschedule soon.`;
          } else if (isToday) {
            priority = 'important';
            title = `Service Scheduled Today: ${m.title}`;
            message = `Upkeep task "${m.title}" is scheduled for today.`;
          }

          const savedState = stateMap.get(notifId);
          if (!savedState?.isDismissed) {
            notifications.push({
              id: notifId,
              userId,
              category: 'maintenance',
              priority,
              title,
              message,
              dueDate: dueIso,
              sourceEntityType: 'maintenance',
              sourceId: m.id,
              targetTab: 'maintenance',
              targetSubTab: 'tasks',
              actionLabel: 'View Task',
              isRead: savedState?.isRead || false,
              readAt: savedState?.readAt,
              isDismissed: false,
              createdAt: new Date(refDate.getTime() - 6 * 3600000).toISOString(),
              metadata: { recurrence: m.recurrence },
            });
          }
        }
      }
    }

    // 3. Warranties Notifications
    if (prefs.categories.warranties) {
      const warHorizon = prefs.advanceNoticeDays.warranties || 30;
      const warranties = Array.from(store.warranties.values());

      for (const w of warranties) {
        if (!w.endDate) continue;
        const dueIso = parseIsoDay(w.endDate);
        if (!dueIso) continue;

        const daysDiff = calculateDaysDiff(dueIso, todayIso);

        if (daysDiff >= -14 && daysDiff <= warHorizon) {
          const notifId = `notif_war_${w.id}_${dueIso}`;
          const isExpired = daysDiff < 0;
          const isToday = daysDiff === 0;

          let priority: HouseholdNotificationPriority = 'upcoming';
          let title = `Warranty Expiring: ${w.warrantyProvider || 'Warranty'}`;
          let message = `Warranty coverage from ${w.warrantyProvider || 'Provider'} expires in ${daysDiff} days.`;

          if (isExpired) {
            priority = 'upcoming';
            title = `Warranty Expired: ${w.warrantyProvider || 'Warranty'}`;
            message = `Coverage from ${w.warrantyProvider || 'Provider'} expired ${Math.abs(daysDiff)} days ago.`;
          } else if (isToday) {
            priority = 'critical';
            title = `Warranty Expires Today: ${w.warrantyProvider || 'Warranty'}`;
            message = `Final day of coverage for policy #${w.policyNumber || 'N/A'}.`;
          } else if (daysDiff <= 7) {
            priority = 'important';
            title = `Warranty Expiring Soon: ${w.warrantyProvider}`;
            message = `Coverage ends in ${daysDiff} days. Review active claims or renewal options.`;
          }

          const savedState = stateMap.get(notifId);
          if (!savedState?.isDismissed) {
            notifications.push({
              id: notifId,
              userId,
              category: 'warranties',
              priority,
              title,
              message,
              dueDate: dueIso,
              sourceEntityType: 'warranty',
              sourceId: w.id,
              targetTab: 'maintenance',
              targetSubTab: 'warranties',
              actionLabel: 'View Policy',
              isRead: savedState?.isRead || false,
              readAt: savedState?.readAt,
              isDismissed: false,
              createdAt: new Date(refDate.getTime() - 12 * 3600000).toISOString(),
              metadata: { policyNumber: w.policyNumber },
            });
          }
        }
      }
    }

    // 4. Documents & Compliance Notifications
    if (prefs.categories.documents) {
      const docHorizon = prefs.advanceNoticeDays.documents || 30;
      const documents = Array.from(store.documents.values());

      for (const doc of documents) {
        const expiry = (doc as any).expirationDate || (doc as any).expiryDate || (doc.metadata && doc.metadata.expirationDate);
        if (!expiry) continue;
        const dueIso = parseIsoDay(expiry);
        if (!dueIso) continue;

        const daysDiff = calculateDaysDiff(dueIso, todayIso);

        if (daysDiff >= -14 && daysDiff <= docHorizon) {
          const notifId = `notif_doc_${doc.id}_${dueIso}`;
          const isExpired = daysDiff < 0;

          let priority: HouseholdNotificationPriority = 'upcoming';
          let title = `Document Expiring: ${doc.title || doc.fileName}`;
          let message = `${doc.title || doc.fileName} expires in ${daysDiff} days.`;

          if (isExpired) {
            priority = 'important';
            title = `Document Expired: ${doc.title || doc.fileName}`;
            message = `${doc.title || doc.fileName} expired ${Math.abs(daysDiff)} days ago. Renewal may be required.`;
          } else if (daysDiff <= 7) {
            priority = 'important';
          }

          const savedState = stateMap.get(notifId);
          if (!savedState?.isDismissed) {
            notifications.push({
              id: notifId,
              userId,
              category: 'documents',
              priority,
              title,
              message,
              dueDate: dueIso,
              sourceEntityType: 'document',
              sourceId: doc.id,
              targetTab: 'documents',
              actionLabel: 'View Document',
              isRead: savedState?.isRead || false,
              readAt: savedState?.readAt,
              isDismissed: false,
              createdAt: new Date(refDate.getTime() - 24 * 3600000).toISOString(),
            });
          }
        }
      }
    }

    // 5. Household Alerts & Agent Notifications
    if (prefs.categories.householdAlerts) {
      // 5a. Critical Asset Alerts
      const assets = Array.from(store.assets.values());
      for (const asset of assets) {
        if (asset.status === 'critical') {
          const notifId = `notif_alert_asset_crit_${asset.id}`;
          const savedState = stateMap.get(notifId);
          if (!savedState?.isDismissed) {
            notifications.push({
              id: notifId,
              userId,
              category: 'alerts',
              priority: 'critical',
              title: `Critical Asset Alert: ${asset.name}`,
              message: `${asset.name} is marked as critical condition and requires urgent technician inspection or replacement.`,
              sourceEntityType: 'asset',
              sourceId: asset.id,
              targetTab: 'assets',
              actionLabel: 'Inspect Asset',
              isRead: savedState?.isRead || false,
              readAt: savedState?.readAt,
              isDismissed: false,
              createdAt: new Date(refDate.getTime() - 1 * 3600000).toISOString(),
            });
          }
        }
      }

      // 5b. Agent Action Approval Notifications (Phase 20)
      const pendingProposals = ActionExecutor.listPendingProposals(userId);
      for (const proposal of pendingProposals) {
        const notifId = `notif_action_approval_${proposal.actionId}`;
        const savedState = stateMap.get(notifId);
        if (!savedState?.isDismissed) {
          notifications.push({
            id: notifId,
            userId,
            category: 'agent',
            priority: 'important',
            title: `Approval Required: ${proposal.title}`,
            message: `HouseMind is waiting for your authorization to execute "${proposal.title}". Expected outcome: ${proposal.expectedOutcome}`,
            sourceEntityType: 'agent_action',
            sourceId: proposal.actionId,
            targetTab: 'copilot',
            targetSubTab: 'actions',
            actionLabel: 'Review & Approve',
            isRead: savedState?.isRead || false,
            readAt: savedState?.readAt,
            isDismissed: false,
            createdAt: proposal.createdAt,
            metadata: {
              actionId: proposal.actionId,
              actionType: proposal.actionType,
              riskLevel: proposal.riskLevel,
            },
          });
        }
      }

      // 5c. Household Issue Intelligence Alerts (Phase 24.3)
      const issues = Array.from(store.issues.values());
      for (const issue of issues) {
        const isResolved =
          issue.status === 'resolved' || issue.status === 'verified' || issue.status === 'closed' || issue.status === 'cancelled';

        if (isResolved) continue;

        const linkedAsset = issue.assetId ? store.assets.get(issue.assetId) : undefined;

        // 1. Critical safety risk issue alert
        if (issue.severity === 'critical' || issue.safetyWarning) {
          const notifId = `notif_issue_safety_${issue.id}`;
          const savedState = stateMap.get(notifId);
          if (!savedState?.isDismissed) {
            notifications.push({
              id: notifId,
              userId,
              category: 'alerts',
              priority: 'critical',
              title: `Urgent Hazard: ${issue.title}`,
              message: issue.safetyWarning
                ? `${issue.safetyWarning} Check issue intelligence for safe escalation steps.`
                : `Critical household issue reported for ${linkedAsset?.name || 'property'}. Immediate mitigation required.`,
              sourceEntityType: 'issue' as any,
              sourceId: issue.id,
              targetTab: 'maintenance',
              targetSubTab: 'issues',
              actionLabel: 'Inspect Issue',
              isRead: savedState?.isRead || false,
              readAt: savedState?.readAt,
              isDismissed: false,
              createdAt: issue.reportedAt || issue.createdAt,
            });
          }
        }

        // 2. Scheduled Repair Approaching
        if (issue.scheduledDate) {
          const dueIso = parseIsoDay(issue.scheduledDate);
          if (dueIso) {
            const daysDiff = calculateDaysDiff(dueIso, todayIso);
            if (daysDiff >= 0 && daysDiff <= 3) {
              const notifId = `notif_issue_sched_${issue.id}_${dueIso}`;
              const savedState = stateMap.get(notifId);
              if (!savedState?.isDismissed) {
                notifications.push({
                  id: notifId,
                  userId,
                  category: 'maintenance',
                  priority: daysDiff === 0 ? 'critical' : 'important',
                  title: daysDiff === 0 ? `Repair Service Today: ${issue.title}` : `Upcoming Repair: ${issue.title}`,
                  message: `${issue.serviceProvider ? `Technician (${issue.serviceProvider})` : 'Service appointment'} scheduled for ${dueIso}. Prepare access to ${linkedAsset?.name || 'affected area'}.`,
                  dueDate: dueIso,
                  sourceEntityType: 'issue' as any,
                  sourceId: issue.id,
                  targetTab: 'maintenance',
                  targetSubTab: 'issues',
                  actionLabel: 'View Schedule',
                  isRead: savedState?.isRead || false,
                  readAt: savedState?.readAt,
                  isDismissed: false,
                  createdAt: issue.createdAt,
                });
              }
            }
          }
        }

        // 3. Overdue Resolution Due Date
        if (issue.dueDate) {
          const dueIso = parseIsoDay(issue.dueDate);
          if (dueIso) {
            const daysDiff = calculateDaysDiff(dueIso, todayIso);
            if (daysDiff < 0) {
              const notifId = `notif_issue_overdue_${issue.id}`;
              const savedState = stateMap.get(notifId);
              if (!savedState?.isDismissed) {
                notifications.push({
                  id: notifId,
                  userId,
                  category: 'maintenance',
                  priority: 'important',
                  title: `Unresolved Issue Overdue: ${issue.title}`,
                  message: `Target resolution date (${dueIso}) passed ${Math.abs(daysDiff)} days ago. Review next steps or update timeline.`,
                  dueDate: dueIso,
                  sourceEntityType: 'issue' as any,
                  sourceId: issue.id,
                  targetTab: 'maintenance',
                  targetSubTab: 'issues',
                  actionLabel: 'Resolve Issue',
                  isRead: savedState?.isRead || false,
                  readAt: savedState?.readAt,
                  isDismissed: false,
                  createdAt: issue.createdAt,
                });
              }
            }
          }
        }
      }
    }

    // Sort: Critical first, then unread first, then date ascending
    const priorityWeight: Record<HouseholdNotificationPriority, number> = {
      critical: 3,
      important: 2,
      upcoming: 1,
    };

    notifications.sort((a, b) => {
      // Unread prioritized slightly
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      // Higher priority first
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;

      // Due date earlier first
      if (a.dueDate && b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    const categoriesCount: Record<string, number> = {};
    let unreadCount = 0;

    for (const n of notifications) {
      categoriesCount[n.category] = (categoriesCount[n.category] || 0) + 1;
      if (!n.isRead) {
        unreadCount++;
      }
    }

    return {
      totalCount: notifications.length,
      unreadCount,
      notifications,
      categoriesCount,
      preferences: prefs,
    };
  }

  /**
   * Marks a specific notification as read
   */
  static markRead(userId: string, notificationId: string): boolean {
    const stateMap = this.getNotificationStateMap(userId);
    const existing = stateMap.get(notificationId) || { isRead: false };
    stateMap.set(notificationId, {
      ...existing,
      isRead: true,
      readAt: new Date().toISOString(),
    });
    return true;
  }

  /**
   * Marks a specific notification as unread
   */
  static markUnread(userId: string, notificationId: string): boolean {
    const stateMap = this.getNotificationStateMap(userId);
    const existing = stateMap.get(notificationId) || { isRead: true };
    stateMap.set(notificationId, {
      ...existing,
      isRead: false,
      readAt: undefined,
    });
    return true;
  }

  /**
   * Marks all current active notifications as read
   */
  static async markAllRead(userId: string): Promise<number> {
    const res = await this.getNotifications(userId);
    const stateMap = this.getNotificationStateMap(userId);
    const nowIso = new Date().toISOString();
    let count = 0;

    for (const n of res.notifications) {
      if (!n.isRead) {
        stateMap.set(n.id, {
          ...(stateMap.get(n.id) || {}),
          isRead: true,
          readAt: nowIso,
        });
        count++;
      }
    }
    return count;
  }

  /**
   * Dismisses a notification so it is hidden
   */
  static dismiss(userId: string, notificationId: string): boolean {
    const stateMap = this.getNotificationStateMap(userId);
    const existing = stateMap.get(notificationId) || { isRead: true };
    stateMap.set(notificationId, {
      ...existing,
      isDismissed: true,
    });
    return true;
  }

  /**
   * Architecture ready for future SMTP / Sendgrid outbound email dispatch
   */
  static async simulateEmailDigest(userId: string): Promise<{ delivered: boolean; queuedCount: number; message: string }> {
    const prefs = this.getPreferences(userId);
    const notifs = await this.getNotifications(userId);
    const criticals = notifs.notifications.filter((n) => n.priority === 'critical' || n.priority === 'important');

    if (!prefs.channels.email) {
      return {
        delivered: false,
        queuedCount: 0,
        message: 'Email channel is currently disabled in user notification preferences.',
      };
    }

    return {
      delivered: true,
      queuedCount: criticals.length,
      message: `Email notification architecture active: ${criticals.length} high-priority household alerts prepared for ${prefs.emailAddress || 'primary user'}.`,
    };
  }
}
