import { DatabaseService, getOrCreateUserStore } from './dbService';
import {
  HouseholdCalendarEvent,
  HouseholdCalendarResponse,
  HouseholdCalendarEventType,
  HouseholdCalendarEventStatus,
  HouseholdCalendarEventPriority,
} from '../../src/types';

interface GetCalendarEventsOptions {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  category?: string;  // all, bills, maintenance, loans_cards, warranties, documents
  searchQuery?: string;
  referenceDate?: Date;
}

function parseIsoDay(dateStr?: string | null): { year: number; month: number; day: number; iso: string } | null {
  if (!dateStr) return null;
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length < 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  const iso = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  return { year, month, day, iso };
}

function calculateDaysDiff(targetIso: string, todayIso: string): number {
  const target = new Date(targetIso + 'T00:00:00Z');
  const today = new Date(todayIso + 'T00:00:00Z');
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function formatDisplayDate(iso: string): string {
  const parsed = parseIsoDay(iso);
  if (!parsed) return iso;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parsed.month - 1]} ${parsed.day}, ${parsed.year}`;
}

export class CalendarService {
  /**
   * Derives all household calendar events on the fly from existing data collections
   */
  static async getCalendarEvents(
    userId: string,
    options: GetCalendarEventsOptions = {}
  ): Promise<HouseholdCalendarResponse> {
    const store = getOrCreateUserStore(userId);
    const refDate = options.referenceDate || new Date();
    const todayIso = refDate.toISOString().slice(0, 10);

    // Default range: 90 days in the past to 180 days in the future
    const pastBoundary = new Date(refDate.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const futureBoundary = new Date(refDate.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const filterStartDate = options.startDate || pastBoundary;
    const filterEndDate = options.endDate || futureBoundary;

    const allEvents: HouseholdCalendarEvent[] = [];

    // 1. Recurring & Standalone Expenses
    const expenses = Array.from(store.expenses.values());
    for (const exp of expenses) {
      if (!exp.dueDate) continue;
      const parsed = parseIsoDay(exp.dueDate);
      if (!parsed) continue;

      const daysDiff = calculateDaysDiff(parsed.iso, todayIso);
      const isPaid = exp.paymentStatus === 'paid';
      let status: HouseholdCalendarEventStatus = 'upcoming';
      let priority: HouseholdCalendarEventPriority = 'normal';

      if (isPaid) {
        status = 'paid';
        priority = 'normal';
      } else if (daysDiff < 0) {
        status = 'overdue';
        priority = 'critical';
      } else if (daysDiff === 0) {
        status = 'due_today';
        priority = 'critical';
      } else if (daysDiff <= 3) {
        status = 'due_soon';
        priority = 'important';
      } else if (daysDiff <= 14) {
        status = 'upcoming';
        priority = 'upcoming';
      }

      allEvents.push({
        id: `cal_exp_${exp.id}_${parsed.iso}`,
        eventType: 'expense',
        title: exp.title,
        subtitle: `${exp.category ? exp.category.replace('_', ' ') : 'Bill'} • ${exp.frequency || 'recurring'}`,
        date: parsed.iso,
        amount: exp.amount,
        currency: 'USD',
        status,
        priority,
        sourceEntityType: 'expense',
        sourceId: exp.id,
        targetTab: 'expenses',
        targetSubTab: 'recurring',
        isCompleted: isPaid,
        isPaid,
        isAutoPay: exp.isAutoPay,
        daysDiff,
        formattedDate: formatDisplayDate(parsed.iso),
        metadata: {
          category: exp.category,
          frequency: exp.frequency,
          notes: exp.notes,
        },
      });
    }

    // 2. Utility Accounts
    const utilities = Array.from(store.utilities.values());
    for (const util of utilities) {
      // Determine target date: nextDueDate, or project current/next month due date from dueDateDay
      let targetIso: string | null = null;
      if (util.nextDueDate) {
        const parsed = parseIsoDay(util.nextDueDate);
        if (parsed) targetIso = parsed.iso;
      } else if (util.dueDateDay) {
        const dDay = Math.min(Math.max(util.dueDateDay, 1), 28);
        const curMonthIso = `${todayIso.slice(0, 7)}-${String(dDay).padStart(2, '0')}`;
        targetIso = curMonthIso;
      }

      if (!targetIso) continue;

      const daysDiff = calculateDaysDiff(targetIso, todayIso);
      const isPaid = util.isAutoPay && daysDiff > 0;
      let status: HouseholdCalendarEventStatus = 'upcoming';
      let priority: HouseholdCalendarEventPriority = 'normal';

      if (daysDiff < 0) {
        status = 'overdue';
        priority = 'critical';
      } else if (daysDiff === 0) {
        status = 'due_today';
        priority = 'critical';
      } else if (daysDiff <= 3) {
        status = 'due_soon';
        priority = 'important';
      } else if (daysDiff <= 14) {
        status = 'upcoming';
        priority = 'upcoming';
      }

      allEvents.push({
        id: `cal_util_${util.id}_${targetIso}`,
        eventType: 'utility',
        title: `${util.name || 'Utility Bill'} (${util.provider || 'Provider'})`,
        subtitle: `Account #${util.accountNumber || 'N/A'} • ${util.utilityType || 'Utility'}`,
        date: targetIso,
        amount: util.latestBillAmount || util.typicalAmount,
        currency: 'USD',
        status,
        priority,
        sourceEntityType: 'utility',
        sourceId: util.id,
        targetTab: 'utilities',
        targetSubTab: 'accounts',
        isCompleted: isPaid,
        isPaid,
        isAutoPay: util.isAutoPay,
        daysDiff,
        formattedDate: formatDisplayDate(targetIso),
        metadata: {
          utilityType: util.utilityType,
          provider: util.provider,
          accountNumber: util.accountNumber,
        },
      });
    }

    // 3. Household Loans & Mortgages (Generate events for active loans across horizon)
    const loans = Array.from(store.loans.values());
    for (const loan of loans) {
      if (loan.status !== 'active') continue;
      const dueDay = Math.min(Math.max(loan.paymentDueDay || 1, 1), 28);

      // Project 6 months horizon
      const refYear = refDate.getFullYear();
      const refMonth = refDate.getMonth();

      for (let offset = -1; offset <= 5; offset++) {
        const pDate = new Date(refYear, refMonth + offset, dueDay);
        const pIso = pDate.toISOString().slice(0, 10);
        const daysDiff = calculateDaysDiff(pIso, todayIso);

        let status: HouseholdCalendarEventStatus = 'upcoming';
        let priority: HouseholdCalendarEventPriority = 'normal';

        if (daysDiff < 0) {
          status = 'overdue';
          priority = 'important';
        } else if (daysDiff === 0) {
          status = 'due_today';
          priority = 'critical';
        } else if (daysDiff <= 3) {
          status = 'due_soon';
          priority = 'important';
        } else if (daysDiff <= 14) {
          status = 'upcoming';
          priority = 'upcoming';
        }

        allEvents.push({
          id: `cal_loan_${loan.id}_${pIso}`,
          eventType: 'loan',
          title: `EMI: ${loan.loanName} (${loan.lender || 'Lender'})`,
          subtitle: `Principal: $${(loan.principalAmount || 0).toLocaleString()} • Rate: ${loan.interestRate || 0}%`,
          date: pIso,
          amount: loan.emiAmount,
          currency: 'USD',
          status,
          priority,
          sourceEntityType: 'loan',
          sourceId: loan.id,
          targetTab: 'utilities',
          targetSubTab: 'loans',
          isCompleted: false,
          isPaid: false,
          daysDiff,
          formattedDate: formatDisplayDate(pIso),
          metadata: {
            loanType: loan.loanType,
            lender: loan.lender,
            emiAmount: loan.emiAmount,
          },
        });
      }
    }

    // 4. Credit Cards
    const creditCards = Array.from(store.creditCards.values());
    for (const card of creditCards) {
      if (!card.paymentDueDate) continue;
      const parsed = parseIsoDay(card.paymentDueDate);
      if (!parsed) continue;

      const daysDiff = calculateDaysDiff(parsed.iso, todayIso);
      const isPaid = card.paymentStatus === 'paid';
      let status: HouseholdCalendarEventStatus = 'upcoming';
      let priority: HouseholdCalendarEventPriority = 'normal';

      if (isPaid) {
        status = 'paid';
        priority = 'normal';
      } else if (daysDiff < 0) {
        status = 'overdue';
        priority = 'critical';
      } else if (daysDiff === 0) {
        status = 'due_today';
        priority = 'critical';
      } else if (daysDiff <= 3) {
        status = 'due_soon';
        priority = 'important';
      } else {
        status = 'upcoming';
        priority = 'upcoming';
      }

      allEvents.push({
        id: `cal_cc_${card.id}_${parsed.iso}`,
        eventType: 'credit_card',
        title: `Card Payment: ${card.cardNickname} (*${card.last4Digits || '0000'})`,
        subtitle: `Issuer: ${card.bankIssuer || 'Bank'} • Min Due: $${card.minimumDue || card.outstandingAmount}`,
        date: parsed.iso,
        amount: card.outstandingAmount,
        currency: 'USD',
        status,
        priority,
        sourceEntityType: 'credit_card',
        sourceId: card.id,
        targetTab: 'utilities',
        targetSubTab: 'cards',
        isCompleted: isPaid,
        isPaid,
        isAutoPay: card.isAutoPay,
        daysDiff,
        formattedDate: formatDisplayDate(parsed.iso),
        metadata: {
          last4: card.last4Digits,
          bankIssuer: card.bankIssuer,
          limit: card.creditLimit,
        },
      });
    }

    // 5. Maintenance Tasks
    const maintenances = Array.from(store.maintenances.values());
    for (const m of maintenances) {
      const targetDate = m.nextServiceDate || m.serviceDate;
      if (!targetDate) continue;
      const parsed = parseIsoDay(targetDate);
      if (!parsed) continue;

      const daysDiff = calculateDaysDiff(parsed.iso, todayIso);
      const isCompleted = m.status === 'completed';
      let status: HouseholdCalendarEventStatus = 'upcoming';
      let priority: HouseholdCalendarEventPriority = 'normal';

      if (isCompleted) {
        status = 'completed';
        priority = 'normal';
      } else if (daysDiff < 0) {
        status = 'overdue';
        priority = 'critical';
      } else if (daysDiff === 0) {
        status = 'due_today';
        priority = 'important';
      } else if (daysDiff <= 7) {
        status = 'due_soon';
        priority = 'important';
      } else {
        status = 'upcoming';
        priority = 'upcoming';
      }

      const linkedAsset = m.assetId ? store.assets.get(m.assetId) : null;
      const linkedProperty = m.propertyId ? store.properties.get(m.propertyId) : null;

      allEvents.push({
        id: `cal_maint_${m.id}_${parsed.iso}`,
        eventType: 'maintenance',
        title: m.title,
        subtitle: `${linkedAsset?.name ? `Asset: ${linkedAsset.name} • ` : ''}${m.serviceProvider || 'Self-service'} (${m.recurrence || 'one-time'})`,
        date: parsed.iso,
        amount: m.cost,
        currency: 'USD',
        status,
        priority,
        sourceEntityType: 'maintenance',
        sourceId: m.id,
        targetTab: 'maintenance',
        targetSubTab: 'tasks',
        isCompleted,
        isPaid: isCompleted,
        daysDiff,
        formattedDate: formatDisplayDate(parsed.iso),
        metadata: {
          assetName: linkedAsset?.name,
          propertyName: linkedProperty?.name,
          serviceProvider: m.serviceProvider,
          recurrence: m.recurrence,
          notes: m.notes,
        },
      });
    }

    // 6. Warranties (Expiry Dates)
    const warranties = Array.from(store.warranties.values());
    for (const w of warranties) {
      if (!w.endDate) continue;
      const parsed = parseIsoDay(w.endDate);
      if (!parsed) continue;

      const daysDiff = calculateDaysDiff(parsed.iso, todayIso);
      let status: HouseholdCalendarEventStatus = 'upcoming';
      let priority: HouseholdCalendarEventPriority = 'normal';

      if (daysDiff < 0) {
        status = 'overdue';
        priority = 'normal'; // Expired
      } else if (daysDiff === 0) {
        status = 'due_today';
        priority = 'critical';
      } else if (daysDiff <= 7) {
        status = 'due_soon';
        priority = 'critical';
      } else if (daysDiff <= 30) {
        status = 'due_soon';
        priority = 'important';
      } else {
        status = 'upcoming';
        priority = 'normal';
      }

      const linkedAsset = w.assetId ? store.assets.get(w.assetId) : null;

      allEvents.push({
        id: `cal_war_${w.id}_${parsed.iso}`,
        eventType: 'warranty',
        title: `Warranty Expiry: ${w.warrantyProvider || 'Warranty'}`,
        subtitle: `${linkedAsset?.name ? `Covering: ${linkedAsset.name} • ` : ''}Policy #${w.policyNumber || 'N/A'}`,
        date: parsed.iso,
        status,
        priority,
        sourceEntityType: 'warranty',
        sourceId: w.id,
        targetTab: 'maintenance',
        targetSubTab: 'warranties',
        isCompleted: false,
        isPaid: true,
        daysDiff,
        formattedDate: formatDisplayDate(parsed.iso),
        metadata: {
          assetName: linkedAsset?.name,
          policyNumber: w.policyNumber,
          provider: w.warrantyProvider,
        },
      });
    }

    // 7. Documents (Expiry / Renewal deadlines if present)
    const documents = Array.from(store.documents.values());
    for (const doc of documents) {
      const docExpiry = (doc as any).expirationDate || (doc as any).expiryDate || (doc.metadata && doc.metadata.expirationDate);
      if (!docExpiry) continue;
      const parsed = parseIsoDay(docExpiry);
      if (!parsed) continue;

      const daysDiff = calculateDaysDiff(parsed.iso, todayIso);
      let status: HouseholdCalendarEventStatus = 'upcoming';
      let priority: HouseholdCalendarEventPriority = 'normal';

      if (daysDiff < 0) {
        status = 'overdue';
        priority = 'important';
      } else if (daysDiff === 0) {
        status = 'due_today';
        priority = 'critical';
      } else if (daysDiff <= 14) {
        status = 'due_soon';
        priority = 'important';
      }

      allEvents.push({
        id: `cal_doc_${doc.id}_${parsed.iso}`,
        eventType: 'document',
        title: `Document Renewal: ${doc.title || doc.fileName}`,
        subtitle: `Category: ${doc.category || 'General'} • Type: ${doc.documentType || 'Document'}`,
        date: parsed.iso,
        status,
        priority,
        sourceEntityType: 'document',
        sourceId: doc.id,
        targetTab: 'documents',
        isCompleted: false,
        isPaid: false,
        daysDiff,
        formattedDate: formatDisplayDate(parsed.iso),
        metadata: {
          documentType: doc.documentType,
          category: doc.category,
        },
      });
    }

    // 8. Household Issues & Repair Schedules
    const issues = Array.from(store.issues.values());
    for (const issue of issues) {
      const isResolved =
        issue.status === 'resolved' || issue.status === 'verified' || issue.status === 'closed' || issue.status === 'cancelled';

      const linkedAsset = issue.assetId ? store.assets.get(issue.assetId) : null;

      // Check scheduledDate (e.g. booked technician visit)
      if (issue.scheduledDate) {
        const parsed = parseIsoDay(issue.scheduledDate);
        if (parsed) {
          const daysDiff = calculateDaysDiff(parsed.iso, todayIso);
          let status: HouseholdCalendarEventStatus = 'upcoming';
          let priority: HouseholdCalendarEventPriority = issue.severity === 'critical' ? 'critical' : 'important';

          if (isResolved) {
            status = 'completed';
            priority = 'normal';
          } else if (daysDiff < 0) {
            status = 'overdue';
            priority = 'critical';
          } else if (daysDiff === 0) {
            status = 'due_today';
            priority = 'critical';
          } else if (daysDiff <= 3) {
            status = 'due_soon';
            priority = 'important';
          }

          allEvents.push({
            id: `cal_issue_sched_${issue.id}_${parsed.iso}`,
            eventType: 'maintenance',
            title: `Repair Scheduled: ${issue.title}`,
            subtitle: `${linkedAsset?.name ? `${linkedAsset.name} • ` : ''}${issue.serviceProvider || 'Technician Visit'}`,
            date: parsed.iso,
            status,
            priority,
            sourceEntityType: 'maintenance',
            sourceId: issue.id,
            targetTab: 'maintenance',
            targetSubTab: 'issues',
            isCompleted: isResolved,
            isPaid: false,
            daysDiff,
            formattedDate: formatDisplayDate(parsed.iso),
            metadata: {
              issueId: issue.id,
              severity: issue.severity,
              serviceProvider: issue.serviceProvider,
              assetName: linkedAsset?.name,
            },
          });
        }
      }

      // Check dueDate (resolution deadline) if not resolved
      if (issue.dueDate && !isResolved) {
        const parsed = parseIsoDay(issue.dueDate);
        if (parsed) {
          const daysDiff = calculateDaysDiff(parsed.iso, todayIso);
          let status: HouseholdCalendarEventStatus = 'upcoming';
          let priority: HouseholdCalendarEventPriority = issue.severity === 'critical' ? 'critical' : 'normal';

          if (daysDiff < 0) {
            status = 'overdue';
            priority = 'critical';
          } else if (daysDiff === 0) {
            status = 'due_today';
            priority = 'critical';
          } else if (daysDiff <= 3) {
            status = 'due_soon';
            priority = 'important';
          }

          allEvents.push({
            id: `cal_issue_due_${issue.id}_${parsed.iso}`,
            eventType: 'maintenance',
            title: `Resolution Due: ${issue.title}`,
            subtitle: `${linkedAsset?.name ? `${linkedAsset.name} • ` : ''}Severity: ${issue.severity}`,
            date: parsed.iso,
            status,
            priority,
            sourceEntityType: 'maintenance',
            sourceId: issue.id,
            targetTab: 'maintenance',
            targetSubTab: 'issues',
            isCompleted: false,
            isPaid: false,
            daysDiff,
            formattedDate: formatDisplayDate(parsed.iso),
            metadata: {
              issueId: issue.id,
              severity: issue.severity,
              assetName: linkedAsset?.name,
            },
          });
        }
      }

      // Check followUpDate if present
      if (issue.followUpDate) {
        const parsed = parseIsoDay(issue.followUpDate);
        if (parsed) {
          const daysDiff = calculateDaysDiff(parsed.iso, todayIso);
          allEvents.push({
            id: `cal_issue_followup_${issue.id}_${parsed.iso}`,
            eventType: 'maintenance',
            title: `Repair Follow-Up: ${issue.title}`,
            subtitle: `${linkedAsset?.name ? `${linkedAsset.name} • ` : ''}Verify operation holding`,
            date: parsed.iso,
            status: daysDiff < 0 ? 'overdue' : daysDiff === 0 ? 'due_today' : 'upcoming',
            priority: 'normal',
            sourceEntityType: 'maintenance',
            sourceId: issue.id,
            targetTab: 'maintenance',
            targetSubTab: 'issues',
            isCompleted: issue.status === 'verified',
            isPaid: false,
            daysDiff,
            formattedDate: formatDisplayDate(parsed.iso),
            metadata: {
              issueId: issue.id,
              assetName: linkedAsset?.name,
            },
          });
        }
      }
    }

    // Filter by Date Range
    let filtered = allEvents.filter((ev) => ev.date >= filterStartDate && ev.date <= filterEndDate);

    // Filter by Category
    if (options.category && options.category !== 'all') {
      const cat = options.category.toLowerCase();
      filtered = filtered.filter((ev) => {
        if (cat === 'bills') return ev.eventType === 'expense' || ev.eventType === 'utility';
        if (cat === 'maintenance') return ev.eventType === 'maintenance';
        if (cat === 'loans_cards') return ev.eventType === 'loan' || ev.eventType === 'credit_card';
        if (cat === 'warranties') return ev.eventType === 'warranty';
        if (cat === 'documents') return ev.eventType === 'document';
        return ev.eventType === cat;
      });
    }

    // Filter by Search Query
    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (ev) =>
          ev.title.toLowerCase().includes(q) ||
          ev.subtitle.toLowerCase().includes(q) ||
          ev.eventType.toLowerCase().includes(q) ||
          (ev.metadata && Object.values(ev.metadata).some((v) => String(v).toLowerCase().includes(q)))
      );
    }

    // Sort chronologically ascending
    filtered.sort((a, b) => a.date.localeCompare(b.date));

    // Summary statistics
    const countsByCategory: Record<string, number> = {};
    const countsByStatus = {
      overdue: 0,
      due_today: 0,
      due_soon: 0,
      upcoming: 0,
      completed: 0,
    };

    for (const ev of filtered) {
      countsByCategory[ev.eventType] = (countsByCategory[ev.eventType] || 0) + 1;
      if (ev.status === 'overdue') countsByStatus.overdue++;
      else if (ev.status === 'due_today') countsByStatus.due_today++;
      else if (ev.status === 'due_soon') countsByStatus.due_soon++;
      else if (ev.status === 'upcoming') countsByStatus.upcoming++;
      else if (ev.status === 'completed' || ev.status === 'paid') countsByStatus.completed++;
    }

    return {
      startDate: filterStartDate,
      endDate: filterEndDate,
      totalCount: filtered.length,
      events: filtered,
      countsByCategory,
      countsByStatus,
    };
  }
}
