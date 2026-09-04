import { DatabaseService } from '../dbService';
import { HouseholdHealthService } from '../householdHealthService';
import { CalendarService } from '../calendarService';
import { NotificationService } from '../notificationService';
import { AgentActivityService } from './agentActivityService';
import {
  HouseholdAgentIntent,
  AgentPriorityItem,
  HouseholdHealthReport,
  HouseholdCalendarResponse,
  HouseholdNotificationsResponse,
  HouseholdMemoryItem,
  AgentActivityItem,
} from '../../../src/types';

export interface SelectiveHouseholdContext {
  userId: string;
  intent: HouseholdAgentIntent;
  domainsConsulted: string[];
  profile: Record<string, any> | null;
  properties: Array<Record<string, any>>;
  rooms: Array<Record<string, any>>;
  assets: Array<Record<string, any>>;
  warranties: Array<Record<string, any>>;
  maintenances: Array<Record<string, any>>;
  utilities: Array<Record<string, any>>;
  loans: Array<Record<string, any>>;
  creditCards: Array<Record<string, any>>;
  expenses: Array<Record<string, any>>;
  transactions: Array<Record<string, any>>;
  documents: Array<Record<string, any>>;
  notifications: HouseholdNotificationsResponse | null;
  healthReport: HouseholdHealthReport | null;
  calendarResponse: HouseholdCalendarResponse | null;
  memories: Array<HouseholdMemoryItem>;
  agentActivities: Array<AgentActivityItem>;
}

export interface DeterministicFacts {
  currency: string;
  homeName: string;
  homeType: string;
  totalBurnMonthly: number;
  expensesMonthly: number;
  utilitiesMonthly: number;
  loansMonthly: number;
  totalDebt: number;
  loanDebt: number;
  creditCardDebt: number;
  healthScore: number;
  healthLabel: string;
  completenessScore: number;
  isProvisional: boolean;
  overdueTasksCount: number;
  upcomingTasksCount: number;
  billsDueSoonCount: number;
  activeWarrantiesCount: number;
  totalAssetsCount: number;
  priorityItems: AgentPriorityItem[];
}

/**
 * Normalizes recurring amounts to monthly baseline
 */
export function toMonthlyAmount(amount: number, frequency?: string): number {
  const val = Number(amount) || 0;
  switch (frequency) {
    case 'annual':
    case 'yearly':
      return val / 12;
    case 'semi_annual':
      return val / 6;
    case 'quarterly':
      return val / 3;
    case 'bi_weekly':
    case 'biweekly':
      return (val * 26) / 12;
    case 'weekly':
      return (val * 52) / 12;
    case 'monthly':
    default:
      return val;
  }
}

/**
 * Fast, deterministic intent classifier for user questions
 */
export function detectAgentIntent(message: string): HouseholdAgentIntent {
  const lower = (message || '').toLowerCase().trim();

  // 1. Morning Brief / Daily Intelligence ("What needs my attention today?", "Give me my morning brief")
  if (
    lower.includes('morning brief') ||
    lower.includes('daily brief') ||
    lower.includes('daily briefing') ||
    lower.includes('morning briefing') ||
    lower.includes('attention today') ||
    lower.includes('important things in my household today') ||
    lower.includes('most important things in my household today') ||
    (lower.includes('today') && lower.includes('brief')) ||
    (lower.includes('today') && (lower.includes('attention') || lower.includes('priority') || lower.includes('important')))
  ) {
    return 'MORNING_BRIEF';
  }

  // 2. Casual Greetings
  if (
    /^(hello|hi|hey|greetings|good morning|good afternoon|good evening|howdy|sup|hola)\b/.test(lower) ||
    lower === 'hi' ||
    lower === 'hello' ||
    lower === 'hey'
  ) {
    return 'GREETING';
  }

  // 3. Needs Attention / Priorities / "What should I do first?"
  if (
    lower.includes('attention') ||
    lower.includes('priority') ||
    lower.includes('priorities') ||
    lower.includes('what should i do') ||
    lower.includes('what to do first') ||
    lower.includes('what to do next') ||
    lower.includes('action item') ||
    lower.includes('urgent') ||
    lower.includes('critical') ||
    lower.includes('action plan')
  ) {
    return 'NEEDS_ATTENTION';
  }

  // 4. Health Assessment ("How is my household doing?")
  if (
    lower.includes('health') ||
    lower.includes('how is my household doing') ||
    lower.includes('how is my home doing') ||
    lower.includes('how is our home') ||
    lower.includes('how are we doing') ||
    lower.includes('overall status') ||
    lower.includes('score') ||
    lower.includes('rating') ||
    lower.includes('diagnose')
  ) {
    return 'HOUSEHOLD_HEALTH';
  }

  // 4. Maintenance & Warranties
  if (
    lower.includes('maintenance') ||
    lower.includes('service') ||
    lower.includes('filter') ||
    lower.includes('tune-up') ||
    lower.includes('repair') ||
    lower.includes('warranty') ||
    lower.includes('warranties') ||
    lower.includes('policy') ||
    lower.includes('coverage') ||
    lower.includes('appliance') ||
    lower.includes('equipment') ||
    lower.includes('hvac') ||
    lower.includes('water heater') ||
    lower.includes('roof') ||
    lower.includes('lifespan')
  ) {
    return 'MAINTENANCE_WARRANTIES';
  }

  // 5. Finances, Bills & Debts
  if (
    lower.includes('bill') ||
    lower.includes('bills') ||
    lower.includes('utility') ||
    lower.includes('utilities') ||
    lower.includes('electric') ||
    lower.includes('power') ||
    lower.includes('water bill') ||
    lower.includes('gas bill') ||
    lower.includes('loan') ||
    lower.includes('mortgage') ||
    lower.includes('emi') ||
    lower.includes('debt') ||
    lower.includes('debts') ||
    lower.includes('credit card') ||
    lower.includes('cards') ||
    lower.includes('burn rate') ||
    lower.includes('spending') ||
    lower.includes('expense') ||
    lower.includes('expenses') ||
    lower.includes('cash flow') ||
    lower.includes('transaction') ||
    lower.includes('ledger')
  ) {
    return 'FINANCES_BILLS_DEBTS';
  }

  // 6. Documents & OCR
  if (
    lower.includes('document') ||
    lower.includes('documents') ||
    lower.includes('pdf') ||
    lower.includes('statement') ||
    lower.includes('receipt') ||
    lower.includes('upload') ||
    lower.includes('ocr') ||
    lower.includes('paper trail')
  ) {
    return 'DOCUMENTS_VAULT';
  }

  // 7. Calendar & Dates
  if (
    lower.includes('calendar') ||
    lower.includes('schedule') ||
    lower.includes('event') ||
    lower.includes('events') ||
    lower.includes('upcoming') ||
    lower.includes('this week') ||
    lower.includes('this month') ||
    lower.includes('due date') ||
    lower.includes('timeline')
  ) {
    return 'CALENDAR_SCHEDULE';
  }

  // 8. Notifications & Alerts
  if (
    lower.includes('notification') ||
    lower.includes('notifications') ||
    lower.includes('alert') ||
    lower.includes('alerts') ||
    lower.includes('inbox')
  ) {
    return 'NOTIFICATIONS_ALERTS';
  }

  return 'COMPREHENSIVE_DIAGNOSTIC';
}

/**
 * Builds targeted, minimal context for the detected user intent.
 * Avoids loading the whole database when only specific domains are needed.
 */
export async function buildSelectiveHouseholdContext(
  userId: string,
  intent: HouseholdAgentIntent
): Promise<SelectiveHouseholdContext> {
  const domainsConsulted: string[] = ['profile'];

  // Base profile is always loaded
  let profilePromise = DatabaseService.getProfile(userId).catch(() => null);

  let properties: Array<Record<string, any>> = [];
  let rooms: Array<Record<string, any>> = [];
  let assets: Array<Record<string, any>> = [];
  let warranties: Array<Record<string, any>> = [];
  let maintenances: Array<Record<string, any>> = [];
  let utilities: Array<Record<string, any>> = [];
  let loans: Array<Record<string, any>> = [];
  let creditCards: Array<Record<string, any>> = [];
  let expenses: Array<Record<string, any>> = [];
  let transactions: Array<Record<string, any>> = [];
  let documents: Array<Record<string, any>> = [];
  let notifications: HouseholdNotificationsResponse | null = null;
  let healthReport: HouseholdHealthReport | null = null;
  let calendarResponse: HouseholdCalendarResponse | null = null;
  let memories: Array<HouseholdMemoryItem> = [];
  let agentActivities: Array<AgentActivityItem> = [];

  switch (intent) {
    case 'GREETING': {
      // Greetings only need profile details
      const profile = await profilePromise;
      return {
        userId,
        intent,
        domainsConsulted: ['profile'],
        profile,
        properties: [],
        rooms: [],
        assets: [],
        warranties: [],
        maintenances: [],
        utilities: [],
        loans: [],
        creditCards: [],
        expenses: [],
        transactions: [],
        documents: [],
        notifications: null,
        healthReport: null,
        calendarResponse: null,
        memories: [],
        agentActivities: [],
      };
    }

    case 'MORNING_BRIEF': {
      domainsConsulted.push(
        'healthReport',
        'maintenances',
        'utilities',
        'loans',
        'creditCards',
        'expenses',
        'warranties',
        'documents',
        'notifications',
        'calendar'
      );
      const [prof, health, maints, utils, lns, cards, exps, wars, docs, notifs, cal] = await Promise.all([
        profilePromise,
        HouseholdHealthService.getHouseholdHealth(userId, { includeAiExplanation: false }).catch(() => null),
        DatabaseService.listMaintenances(userId).catch(() => []),
        DatabaseService.listUtilities(userId).catch(() => []),
        DatabaseService.listLoans(userId).catch(() => []),
        DatabaseService.listCreditCards(userId).catch(() => []),
        DatabaseService.listExpenses(userId).catch(() => []),
        DatabaseService.listWarranties(userId).catch(() => []),
        DatabaseService.listDocuments(userId).catch(() => []),
        NotificationService.getNotifications(userId).catch(() => null),
        CalendarService.getCalendarEvents(userId, { referenceDate: new Date() }).catch(() => null),
      ]);
      profilePromise = Promise.resolve(prof);
      healthReport = health;
      maintenances = maints;
      utilities = utils;
      loans = lns;
      creditCards = cards;
      expenses = exps;
      warranties = wars;
      documents = docs;
      notifications = notifs;
      calendarResponse = cal;
      break;
    }

    case 'HOUSEHOLD_HEALTH': {
      domainsConsulted.push('healthReport', 'properties', 'assets', 'expenses');
      const [prof, health, props, asts, exps] = await Promise.all([
        profilePromise,
        HouseholdHealthService.getHouseholdHealth(userId, { includeAiExplanation: false }).catch(() => null),
        DatabaseService.listProperties(userId).catch(() => []),
        DatabaseService.listAssets(userId).catch(() => []),
        DatabaseService.listExpenses(userId).catch(() => []),
      ]);
      profilePromise = Promise.resolve(prof);
      healthReport = health;
      properties = props;
      assets = asts;
      expenses = exps;
      break;
    }

    case 'NEEDS_ATTENTION': {
      domainsConsulted.push(
        'healthReport',
        'maintenances',
        'utilities',
        'loans',
        'creditCards',
        'expenses',
        'notifications'
      );
      const [prof, health, maints, utils, lns, cards, exps, notifs] = await Promise.all([
        profilePromise,
        HouseholdHealthService.getHouseholdHealth(userId, { includeAiExplanation: false }).catch(() => null),
        DatabaseService.listMaintenances(userId).catch(() => []),
        DatabaseService.listUtilities(userId).catch(() => []),
        DatabaseService.listLoans(userId).catch(() => []),
        DatabaseService.listCreditCards(userId).catch(() => []),
        DatabaseService.listExpenses(userId).catch(() => []),
        NotificationService.getNotifications(userId).catch(() => null),
      ]);
      profilePromise = Promise.resolve(prof);
      healthReport = health;
      maintenances = maints;
      utilities = utils;
      loans = lns;
      creditCards = cards;
      expenses = exps;
      notifications = notifs;
      break;
    }

    case 'MAINTENANCE_WARRANTIES': {
      domainsConsulted.push('properties', 'rooms', 'assets', 'warranties', 'maintenances');
      const [prof, props, rms, asts, wars, maints] = await Promise.all([
        profilePromise,
        DatabaseService.listProperties(userId).catch(() => []),
        DatabaseService.listRooms(userId).catch(() => []),
        DatabaseService.listAssets(userId).catch(() => []),
        DatabaseService.listWarranties(userId).catch(() => []),
        DatabaseService.listMaintenances(userId).catch(() => []),
      ]);
      profilePromise = Promise.resolve(prof);
      properties = props;
      rooms = rms;
      assets = asts;
      warranties = wars;
      maintenances = maints;
      break;
    }

    case 'FINANCES_BILLS_DEBTS': {
      domainsConsulted.push('expenses', 'utilities', 'loans', 'creditCards', 'transactions');
      const [prof, exps, utils, lns, cards, txs] = await Promise.all([
        profilePromise,
        DatabaseService.listExpenses(userId).catch(() => []),
        DatabaseService.listUtilities(userId).catch(() => []),
        DatabaseService.listLoans(userId).catch(() => []),
        DatabaseService.listCreditCards(userId).catch(() => []),
        DatabaseService.listTransactions(userId).catch(() => []),
      ]);
      profilePromise = Promise.resolve(prof);
      expenses = exps;
      utilities = utils;
      loans = lns;
      creditCards = cards;
      transactions = txs;
      break;
    }

    case 'DOCUMENTS_VAULT': {
      domainsConsulted.push('documents');
      const [prof, docs] = await Promise.all([
        profilePromise,
        DatabaseService.listDocuments(userId).catch(() => []),
      ]);
      profilePromise = Promise.resolve(prof);
      documents = docs;
      break;
    }

    case 'CALENDAR_SCHEDULE': {
      domainsConsulted.push('calendar');
      const [prof, cal] = await Promise.all([
        profilePromise,
        CalendarService.getCalendarEvents(userId, { referenceDate: new Date() }).catch(() => null),
      ]);
      profilePromise = Promise.resolve(prof);
      calendarResponse = cal;
      break;
    }

    case 'NOTIFICATIONS_ALERTS': {
      domainsConsulted.push('notifications');
      const [prof, notifs] = await Promise.all([
        profilePromise,
        NotificationService.getNotifications(userId).catch(() => null),
      ]);
      profilePromise = Promise.resolve(prof);
      notifications = notifs;
      break;
    }

    case 'COMPREHENSIVE_DIAGNOSTIC':
    default: {
      domainsConsulted.push('all');
      const [
        prof,
        exps,
        asts,
        txs,
        props,
        rms,
        wars,
        maints,
        utils,
        lns,
        cards,
        docs,
        notifs,
        health,
        cal,
      ] = await Promise.all([
        profilePromise,
        DatabaseService.listExpenses(userId).catch(() => []),
        DatabaseService.listAssets(userId).catch(() => []),
        DatabaseService.listTransactions(userId).catch(() => []),
        DatabaseService.listProperties(userId).catch(() => []),
        DatabaseService.listRooms(userId).catch(() => []),
        DatabaseService.listWarranties(userId).catch(() => []),
        DatabaseService.listMaintenances(userId).catch(() => []),
        DatabaseService.listUtilities(userId).catch(() => []),
        DatabaseService.listLoans(userId).catch(() => []),
        DatabaseService.listCreditCards(userId).catch(() => []),
        DatabaseService.listDocuments(userId).catch(() => []),
        NotificationService.getNotifications(userId).catch(() => null),
        HouseholdHealthService.getHouseholdHealth(userId, { includeAiExplanation: false }).catch(() => null),
        CalendarService.getCalendarEvents(userId, { referenceDate: new Date() }).catch(() => null),
      ]);
      profilePromise = Promise.resolve(prof);
      expenses = exps;
      assets = asts;
      transactions = txs;
      properties = props;
      rooms = rms;
      warranties = wars;
      maintenances = maints;
      utilities = utils;
      loans = lns;
      creditCards = cards;
      documents = docs;
      notifications = notifs;
      healthReport = health;
      calendarResponse = cal;
      break;
    }
  }

  const [profile, memList, actRes] = await Promise.all([
    profilePromise,
    DatabaseService.listMemories(userId, true).catch(() => []),
    Promise.resolve(AgentActivityService.getActivityTimeline(userId, { limit: 10 })),
  ]);

  if (memList.length > 0) {
    domainsConsulted.push('memories');
  }
  if (actRes.activities.length > 0) {
    domainsConsulted.push('agentActivities');
  }
  memories = memList;
  agentActivities = actRes.activities;

  return {
    userId,
    intent,
    domainsConsulted,
    profile,
    properties,
    rooms,
    assets,
    warranties,
    maintenances,
    utilities,
    loans,
    creditCards,
    expenses,
    transactions,
    documents,
    notifications,
    healthReport,
    calendarResponse,
    memories,
    agentActivities,
  };
}

/**
 * Extracts and calculates exact pre-computed deterministic facts
 */
export function extractDeterministicFacts(context: SelectiveHouseholdContext): DeterministicFacts {
  const currency = context.profile?.currency || 'USD';
  const homeName = context.profile?.homeName || 'My Household';
  const homeType = context.profile?.homeType || 'single_family';

  const expensesMonthly = context.expenses.reduce(
    (sum, e) => sum + toMonthlyAmount(e.amount, e.frequency),
    0
  );
  const utilitiesMonthly = context.utilities.reduce(
    (sum, u) => sum + (Number(u.typicalAmount) || 0),
    0
  );
  const loansMonthly = context.loans.reduce(
    (sum, l) => sum + (Number(l.emiAmount) || 0),
    0
  );
  const totalBurnMonthly = expensesMonthly + utilitiesMonthly + loansMonthly;

  const loanDebt = context.loans.reduce(
    (sum, l) => sum + (Number(l.outstandingAmount ?? l.principalAmount) || 0),
    0
  );
  const creditCardDebt = context.creditCards.reduce(
    (sum, c) => sum + (Number(c.outstandingAmount) || 0),
    0
  );
  const totalDebt = loanDebt + creditCardDebt;

  const healthScore = context.healthReport?.overallScore ?? 63;
  const completenessScore = context.healthReport?.completenessScore ?? 0;
  const isProvisional = context.healthReport?.isProvisional ?? completenessScore < 25;
  const healthLabel = isProvisional
    ? 'Unrated (Setup Required)'
    : context.healthReport?.statusLabel || 'Good';

  const todayStr = new Date().toISOString().split('T')[0];

  // Overdue Maintenance
  const overdueTasks = context.maintenances.filter((m) => {
    const d = m.nextServiceDate || m.serviceDate;
    return m.status !== 'completed' && d && d < todayStr;
  });

  const upcomingTasks = context.maintenances.filter((m) => {
    const d = m.nextServiceDate || m.serviceDate;
    return m.status !== 'completed' && (!d || d >= todayStr);
  });

  const activeWarranties = context.warranties.filter(
    (w) => w.status === 'active' && (!w.endDate || w.endDate >= todayStr)
  );

  // Derive Priority Action Items
  const priorityItems: AgentPriorityItem[] = [];

  // Priority 1: Overdue Maintenance
  for (const m of overdueTasks) {
    priorityItems.push({
      id: m.id,
      title: m.title,
      category: 'maintenance',
      urgency: 'urgent',
      reason: `Maintenance is overdue (due ${m.nextServiceDate || m.serviceDate}). Prevent equipment breakdown.`,
      actionTab: 'maintenance',
      amount: Number(m.cost) || undefined,
    });
  }

  // Priority 2: Overdue / Due Soon Bills
  for (const exp of context.expenses) {
    if (exp.paymentStatus === 'overdue' || (exp.dueDate && exp.dueDate <= todayStr)) {
      priorityItems.push({
        id: exp.id,
        title: exp.title,
        category: 'utility',
        urgency: 'urgent',
        reason: `Bill of ${currency} ${exp.amount} is overdue or due today.`,
        actionTab: 'expenses',
        dueDate: exp.dueDate || undefined,
        amount: exp.amount,
      });
    }
  }

  // Priority 3: High Credit Card Utilization (>50%)
  for (const card of context.creditCards) {
    if (card.creditLimit && card.outstandingAmount) {
      const util = (card.outstandingAmount / card.creditLimit) * 100;
      if (util > 50) {
        priorityItems.push({
          id: card.id,
          title: card.cardNickname,
          category: 'card',
          urgency: 'urgent',
          reason: `High credit utilization (${Math.round(util)}% of ${currency} ${card.creditLimit}). Accumulating interest drag.`,
          actionTab: 'utilities',
          amount: card.outstandingAmount,
        });
      }
    }
  }

  // Priority 4: Upcoming tasks within 14 days
  for (const m of upcomingTasks.slice(0, 2)) {
    if (!priorityItems.some((p) => p.id === m.id)) {
      priorityItems.push({
        id: m.id,
        title: m.title,
        category: 'maintenance',
        urgency: 'soon',
        reason: `Scheduled maintenance due soon (${m.nextServiceDate || m.serviceDate || 'Scheduled'}).`,
        actionTab: 'maintenance',
        amount: Number(m.cost) || undefined,
      });
    }
  }

  return {
    currency,
    homeName,
    homeType,
    totalBurnMonthly,
    expensesMonthly,
    utilitiesMonthly,
    loansMonthly,
    totalDebt,
    loanDebt,
    creditCardDebt,
    healthScore,
    healthLabel,
    completenessScore,
    isProvisional,
    overdueTasksCount: overdueTasks.length,
    upcomingTasksCount: upcomingTasks.length,
    billsDueSoonCount: context.expenses.filter((e) => e.dueDate && e.dueDate >= todayStr).length,
    activeWarrantiesCount: activeWarranties.length,
    totalAssetsCount: context.assets.length,
    priorityItems: priorityItems.slice(0, 4),
  };
}

/**
 * Deterministic Reasoning Engine: Produces data-grounded responses when Gemini is offline.
 */
export function generateDeterministicAgentReply(
  context: SelectiveHouseholdContext,
  intent: HouseholdAgentIntent,
  userMessage: string
): { reply: string; suggestedQuestions: string[]; priorityItems?: AgentPriorityItem[] } {
  const facts = extractDeterministicFacts(context);
  const { currency } = facts;
  const lower = (userMessage || '').toLowerCase();

  // 1. Casual Greetings
  if (intent === 'GREETING') {
    return {
      reply: `Hello! I'm HouseMind Copilot, your intelligent assistant for **${facts.homeName}**.

How can I assist you with your home equipment, utility bills, maintenance schedule, or finances today?`,
      suggestedQuestions: [
        'How is my household doing?',
        'What needs my attention?',
        'What is our total monthly burn rate?',
      ],
    };
  }

  // 1.1 Data Privacy, Security & Tenant Isolation
  if (
    lower.includes('data protection') ||
    lower.includes('privacy') ||
    lower.includes('tenant isolation') ||
    lower.includes('security sandbox') ||
    lower.includes('governance') ||
    (lower.includes('data') && lower.includes('protect')) ||
    (lower.includes('household data') && (lower.includes('protect') || lower.includes('safe') || lower.includes('isolate')))
  ) {
    return {
      reply: `### Household Data Protection & Security Sandbox:
HouseMind enforces strict architectural data privacy and tenant isolation boundaries:
• **Tenant Grounded Isolation:** All household records (properties, assets, expenses, documents) are strictly isolated per authenticated user account with server-verified tokens.
• **Advisory AI Sandbox:** Copilot operates in a strictly read-only advisory mode. Autonomous mutations require your explicit human approval through the Action Approval Gate.
• **Zero Unapproved Access:** Cross-household data sharing, unauthorized API calls, and raw credential persistence are denied by the deterministic Permission Engine.`,
      suggestedQuestions: [
        'How is my household health calculated?',
        'What data is stored in my HouseMind account?',
      ],
    };
  }

  // 1.2 Missing Equipment / Specific Item Check
  const specificEquipmentKeywords = ['jacuzzi', 'pool', 'spa', 'generator', 'sauna', 'elevator', 'irrigation', 'boiler'];
  const searchedKeyword = specificEquipmentKeywords.find((k) => lower.includes(k));
  if (searchedKeyword) {
    const hasMatchingAsset = context.assets.some((a) => (a.name || '').toLowerCase().includes(searchedKeyword) || (a.category || '').toLowerCase().includes(searchedKeyword));
    if (!hasMatchingAsset) {
      return {
        reply: `I don't have enough household data on **${searchedKeyword}** yet. No ${searchedKeyword} or matching equipment is currently recorded in your home inventory.\n\nTo track installation dates, warranties, or maintenance for your ${searchedKeyword}, you can add it in the **Assets & Appliances** tab.`,
        suggestedQuestions: [
          'What equipment is currently registered in my home?',
          'How do I add a new home asset?',
        ],
      };
    }
  }

  // 2. Morning Brief ("Give me my morning brief", "What needs my attention today?")
  if (intent === 'MORNING_BRIEF') {
    const attentionList =
      facts.priorityItems.length > 0
        ? facts.priorityItems
            .map((item, idx) => `**${idx + 1}. [${item.urgency.toUpperCase()}] ${item.title}** (${item.category})\n   • *Reason:* ${item.reason}`)
            .join('\n\n')
        : '• All systems nominal. Zero overdue tasks or critical alerts.';

    const healthStr = facts.isProvisional
      ? 'Unrated (Setup Required)'
      : `${facts.healthScore}/100 (${facts.healthLabel})`;

    return {
      reply: `### 🌅 Morning Brief: ${facts.homeName}
**Status:** ${facts.priorityItems.length > 0 ? `${facts.priorityItems.length} Item(s) Require Attention` : 'All Systems Nominal'} (Health: ${healthStr})

#### 🚨 Immediate Attention:
${attentionList}

#### 💳 Financial Snapshot:
• **Monthly Burn Rate:** ${currency} ${facts.totalBurnMonthly.toFixed(2)}/mo
• **Outstanding Debt:** ${currency} ${facts.totalDebt.toLocaleString()} (Loans: ${currency} ${facts.loanDebt.toLocaleString()} + Cards: ${currency} ${facts.creditCardDebt.toLocaleString()})

#### 🔧 Equipment & Upkeep:
• **Inventory:** ${facts.totalAssetsCount} monitored appliances, ${facts.activeWarrantiesCount} active warranties, ${facts.upcomingTasksCount} upcoming tasks (${facts.overdueTasksCount} overdue).

**Recommended First Action:** ${facts.priorityItems.length > 0 ? `Address ${facts.priorityItems[0].title}` : 'Perform routine preventative check'}.`,
      suggestedQuestions: [
        'What should I do first?',
        'How is my household health calculated?',
        'Show my upcoming financial obligations',
      ],
      priorityItems: facts.priorityItems,
    };
  }

  // 3. Needs Attention & Priorities ("What should I do first?")
  if (intent === 'NEEDS_ATTENTION' || lower.includes('what should i do')) {
    if (facts.priorityItems.length === 0) {
      return {
        reply: `### Household Priorities & Action Plan:
✅ **All Systems Nominal!** You have no overdue maintenance tasks, overdue bills, or high-risk alerts at this moment.

• **Health Rating:** ${facts.isProvisional ? 'Unrated (Setup Required)' : `${facts.healthScore}/100 (${facts.healthLabel})`}
• **Monthly Operating Burn:** ${currency} ${facts.totalBurnMonthly.toFixed(2)}/mo
• **Active Equipment:** ${facts.totalAssetsCount} items monitored

Would you like to explore preventative maintenance schedules or optimize recurring utility expenses?`,
        suggestedQuestions: [
          'How is my household health calculated?',
          'What bills or debt payments are upcoming?',
          'Which appliances have active warranties?',
        ],
        priorityItems: [],
      };
    }

    const itemsList = facts.priorityItems
      .map((item, idx) => `**${idx + 1}. [${item.urgency.toUpperCase()}] ${item.title}** (${item.category})\n   • *Reason:* ${item.reason}`)
      .join('\n\n');

    return {
      reply: `### Ranked Household Priorities:
Here are the highest-impact actions needing your attention right now:

${itemsList}

**Recommended Immediate Action:** Address item #1 to keep your equipment operational and avoid late penalties.`,
      suggestedQuestions: [
        'How does this impact our Household Health Score?',
        'What is our total monthly debt commitment?',
        'Show my upcoming calendar schedule',
      ],
      priorityItems: facts.priorityItems,
    };
  }

  // 3. Household Health Assessment ("How is my household doing?")
  if (intent === 'HOUSEHOLD_HEALTH') {
    if (facts.isProvisional) {
      return {
        reply: `### Household Health Status:
• **Current Status:** **Unrated (Setup Required)**
• **Data Completeness Index:** ${facts.completenessScore}%

Your household health score is currently in setup mode because baseline records are still being configured.

**How to establish your score:**
1. 🏡 **Register Property & Square Footage** under Properties & Spaces (+20% accuracy)
2. 🔧 **Log Major Appliances (HVAC, Water Heater)** under Assets (+30%)
3. 💳 **Add Recurring Bills & Utilities** (+35%)`,
        suggestedQuestions: [
          'What needs my attention?',
          'How do I add an appliance warranty?',
          'What is our total monthly burn rate?',
        ],
      };
    }

    return {
      reply: `### Household Health Intelligence Report:
• **Overall Health Score:** **${facts.healthScore}/100 (${facts.healthLabel})**
• **Completeness Index:** ${facts.completenessScore}%

**Pillar Breakdown:**
• **Operating Burn Rate:** ${currency} ${facts.totalBurnMonthly.toFixed(2)}/mo
• **Total Debt Tracked:** ${currency} ${facts.totalDebt.toLocaleString()}
• **Monitored Equipment:** ${facts.totalAssetsCount} registered assets (${facts.activeWarrantiesCount} under active warranty)
• **Overdue Maintenance:** ${facts.overdueTasksCount} task(s)`,
      suggestedQuestions: [
        'What needs my attention?',
        'Which maintenance tasks are scheduled next?',
        'How can we reduce our monthly burn rate?',
      ],
    };
  }

  // 4. Maintenance & Warranties
  // 4. Maintenance & Warranties & Equipment
  if (intent === 'MAINTENANCE_WARRANTIES') {
    if (context.maintenances.length === 0 && context.warranties.length === 0 && context.assets.length === 0) {
      return {
        reply: `You currently have no equipment, preventative maintenance tasks, or warranty policies logged in HouseMind.

Adding your HVAC, water heater, and appliance protection plans will activate automated upkeep reminders and protect against unexpected repair costs.`,
        suggestedQuestions: [
          'What seasonal maintenance should every homeowner perform?',
          'How do I register a new appliance warranty?',
        ],
      };
    }

    const assetList = context.assets
      .slice(0, 5)
      .map(
        (a) =>
          `• **${a.name}** (${a.category}): Brand: ${a.brand || 'N/A'} | Status: *${a.currentStatus || 'operational'}* | Install Date: ${a.installDate || 'N/A'}`
      )
      .join('\n');

    const taskList = context.maintenances
      .slice(0, 4)
      .map(
        (m) =>
          `• **${m.title}**: Status is *${m.status}* | Due: ${m.nextServiceDate || m.serviceDate || 'Scheduled'} | Est Cost: ${currency} ${m.cost || 0}`
      )
      .join('\n');

    const warList = context.warranties
      .slice(0, 3)
      .map(
        (w) =>
          `• **${w.warrantyProvider}** (Policy #${w.policyNumber || 'N/A'}): Status is *${w.status}* | Ends: ${w.endDate || 'N/A'}`
      )
      .join('\n');

    return {
      reply: `### Equipment, Maintenance & Warranty Overview:

**Monitored Equipment (${context.assets.length}):**
${assetList || 'No appliances or equipment logged yet.'}

**Scheduled Tasks (${context.maintenances.length}):**
${taskList || 'No maintenance tasks scheduled.'}

**Active Protection Policies (${context.warranties.length}):**
${warList || 'No active warranty policies logged.'}`,
      suggestedQuestions: [
        'When does my next warranty expire?',
        'What needs my attention first?',
      ],
    };
  }

  // 5. Finances, Bills & Debts
  if (intent === 'FINANCES_BILLS_DEBTS') {
    const expenseList = context.expenses
      .slice(0, 5)
      .map(
        (e) =>
          `• **${e.title}**: ${currency} ${e.amount} (${e.frequency}) | Due: ${e.dueDate || 'N/A'} | Status: *${e.paymentStatus || 'pending'}*`
      )
      .join('\n');

    return {
      reply: `### Household Financial & Debt Overview:
• **Total Monthly Burn Rate:** **${currency} ${facts.totalBurnMonthly.toFixed(2)}/mo**
  - Recurring Expenses: ${currency} ${facts.expensesMonthly.toFixed(2)}/mo (${context.expenses.length} accounts)
  - Utilities: ${currency} ${facts.utilitiesMonthly.toFixed(2)}/mo (${context.utilities.length} accounts)
  - Loan & Mortgage EMIs: ${currency} ${facts.loansMonthly.toFixed(2)}/mo (${context.loans.length} loans)
• **Total Outstanding Debt:** **${currency} ${facts.totalDebt.toLocaleString()}**
  - Loan Principal: ${currency} ${facts.loanDebt.toLocaleString()}
  - Credit Cards: ${currency} ${facts.creditCardDebt.toLocaleString()}

${expenseList ? `**Tracked Recurring Bills & Utilities:**\n${expenseList}` : ''}`,
      suggestedQuestions: [
        'Which bills or debt payments are upcoming?',
        'How can we reduce our monthly burn rate?',
        'What needs my attention?',
      ],
    };
  }

  // 6. Documents Vault
  if (intent === 'DOCUMENTS_VAULT') {
    return {
      reply: `### Ingested Documents & Paper Trail:
• **Total Documents Archived:** ${context.documents.length} files
• **Verified Records:** ${context.documents.filter((d) => d.status === 'confirmed').length} confirmed
• **Pending Review:** ${context.documents.filter((d) => d.status === 'pending_review').length} candidates

Upload bank statements, appliance invoices, or warranties via **AI Document Intake** for automated OCR extraction.`,
      suggestedQuestions: [
        'How does document OCR extraction work?',
        'What needs my attention?',
      ],
    };
  }

  // 7. Calendar Schedule
  if (intent === 'CALENDAR_SCHEDULE') {
    const events = context.calendarResponse?.events || [];
    const eventList = events
      .slice(0, 5)
      .map((e) => `• **${e.formattedDate || e.date}**: ${e.title} (${e.eventType}) — Status: *${e.status}*`)
      .join('\n');

    return {
      reply: `### Upcoming Household Schedule:
${eventList || 'No upcoming calendar events scheduled in the next 30 days.'}

You can subscribe to these dates in Apple Calendar or Google Calendar via our RFC 5545 iCal feed.`,
      suggestedQuestions: [
        'What needs my attention?',
        'Which bills are due next?',
      ],
    };
  }

  // 8. Notifications
  if (intent === 'NOTIFICATIONS_ALERTS') {
    const notifs = context.notifications?.notifications || [];
    const unread = context.notifications?.unreadCount || 0;
    const notifList = notifs
      .slice(0, 4)
      .map((n) => `• [${n.priority.toUpperCase()}] **${n.title}**: ${n.message}`)
      .join('\n');

    return {
      reply: `### Household Notification Center:
• **Unread Alerts:** ${unread} active notification(s)

${notifList || 'No recent notifications.'}`,
      suggestedQuestions: [
        'What needs my attention first?',
        'How is my household doing?',
      ],
    };
  }

  // Default Comprehensive Diagnostic
  return {
    reply: `### Household Operating Diagnostic for ${facts.homeName}:
• **Health Rating:** ${facts.isProvisional ? 'Unrated (Setup Required)' : `${facts.healthScore}/100 (${facts.healthLabel})`}
• **Monthly Burn Rate:** ${currency} ${facts.totalBurnMonthly.toFixed(2)}/mo
• **Total Outstanding Debt:** ${currency} ${facts.totalDebt.toLocaleString()}
• **Tracked Assets & Equipment:** ${facts.totalAssetsCount} items
• **Scheduled Upkeep:** ${facts.upcomingTasksCount} tasks (${facts.overdueTasksCount} overdue)

How can I help optimize your household today?`,
    suggestedQuestions: [
      'What needs my attention?',
      'How is my household doing?',
      'What is our total monthly burn rate?',
    ],
  };
}
