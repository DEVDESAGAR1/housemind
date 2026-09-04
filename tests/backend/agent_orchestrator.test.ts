import { apiRequest, TestRunner } from '../test-helper';
import {
  detectAgentIntent,
  buildSelectiveHouseholdContext,
  extractDeterministicFacts,
  generateDeterministicAgentReply,
  toMonthlyAmount,
} from '../../server/services/agent/householdContextBuilder';
import { HouseholdAgentOrchestrator } from '../../server/services/agent/householdAgentOrchestrator';
import { DatabaseService } from '../../server/services/dbService';

export async function runAgentOrchestratorTests(runner: TestRunner) {
  runner.setSuite('Phase 15A: Household Agent & Orchestrator Foundation');

  const tokenUserA = 'test-token-agent-user-a';
  const tokenUserB = 'test-token-agent-user-b';
  const userIdA = 'agent-user-a';
  const userIdB = 'agent-user-b';

  // 1. Intent Detection Unit Tests
  await runner.test('Agent Intent: Correctly classifies user intents across all domains', async () => {
    // Greetings
    if (detectAgentIntent('Hello there!') !== 'GREETING') throw new Error('Expected GREETING for hello');
    if (detectAgentIntent('Hi') !== 'GREETING') throw new Error('Expected GREETING for hi');
    if (detectAgentIntent('Good morning') !== 'GREETING') throw new Error('Expected GREETING for good morning');

    // Needs Attention / Priorities
    if (detectAgentIntent('What needs my attention?') !== 'NEEDS_ATTENTION') {
      throw new Error('Expected NEEDS_ATTENTION for attention query');
    }
    if (detectAgentIntent('What should I do first?') !== 'NEEDS_ATTENTION') {
      throw new Error('Expected NEEDS_ATTENTION for what should I do first');
    }
    if (detectAgentIntent('What are my top urgent priorities?') !== 'NEEDS_ATTENTION') {
      throw new Error('Expected NEEDS_ATTENTION for top priorities');
    }

    // Health
    if (detectAgentIntent('How is my household doing?') !== 'HOUSEHOLD_HEALTH') {
      throw new Error('Expected HOUSEHOLD_HEALTH for how is my household doing');
    }
    if (detectAgentIntent('What is our household health score?') !== 'HOUSEHOLD_HEALTH') {
      throw new Error('Expected HOUSEHOLD_HEALTH for health score');
    }

    // Maintenance & Warranties
    if (detectAgentIntent('When is my next HVAC filter maintenance due?') !== 'MAINTENANCE_WARRANTIES') {
      throw new Error('Expected MAINTENANCE_WARRANTIES for HVAC maintenance');
    }
    if (detectAgentIntent('Do I have any active appliance warranties?') !== 'MAINTENANCE_WARRANTIES') {
      throw new Error('Expected MAINTENANCE_WARRANTIES for warranty query');
    }

    // Finances, Bills & Debts
    if (detectAgentIntent('What is our total monthly burn rate and utility bills?') !== 'FINANCES_BILLS_DEBTS') {
      throw new Error('Expected FINANCES_BILLS_DEBTS for burn rate and utility bills');
    }
    if (detectAgentIntent('How much mortgage debt and credit card balance do we have?') !== 'FINANCES_BILLS_DEBTS') {
      throw new Error('Expected FINANCES_BILLS_DEBTS for mortgage and credit cards');
    }

    // Documents
    if (detectAgentIntent('Show me my uploaded documents and OCR statements') !== 'DOCUMENTS_VAULT') {
      throw new Error('Expected DOCUMENTS_VAULT for uploaded documents');
    }

    // Calendar
    if (detectAgentIntent('What events are on my household calendar this month?') !== 'CALENDAR_SCHEDULE') {
      throw new Error('Expected CALENDAR_SCHEDULE for calendar query');
    }

    // Notifications
    if (detectAgentIntent('Check my notification inbox alerts') !== 'NOTIFICATIONS_ALERTS') {
      throw new Error('Expected NOTIFICATIONS_ALERTS for notification alerts');
    }
  });

  // 2. Selective Context Builder (Minimal Domain Retrieval)
  await runner.test('Selective Context: Only queries relevant domains for specific intents', async () => {
    // Greeting only queries profile
    const greetingContext = await buildSelectiveHouseholdContext(userIdA, 'GREETING');
    if (!greetingContext.domainsConsulted.includes('profile')) {
      throw new Error('GREETING should consult profile');
    }
    if (greetingContext.domainsConsulted.includes('healthReport') || greetingContext.expenses.length > 0) {
      throw new Error('GREETING should not query expenses or health report');
    }

    // Documents only queries documents + profile
    const docsContext = await buildSelectiveHouseholdContext(userIdA, 'DOCUMENTS_VAULT');
    if (!docsContext.domainsConsulted.includes('documents')) {
      throw new Error('DOCUMENTS_VAULT should consult documents');
    }
    if (docsContext.domainsConsulted.includes('loans') || docsContext.domainsConsulted.includes('utilities')) {
      throw new Error('DOCUMENTS_VAULT should not load loans or utilities');
    }

    // Needs Attention queries health, maintenance, utilities, loans, cards, expenses, notifications
    const attentionContext = await buildSelectiveHouseholdContext(userIdA, 'NEEDS_ATTENTION');
    if (
      !attentionContext.domainsConsulted.includes('healthReport') ||
      !attentionContext.domainsConsulted.includes('maintenances') ||
      !attentionContext.domainsConsulted.includes('utilities')
    ) {
      throw new Error('NEEDS_ATTENTION should consult health, maintenances, and utilities');
    }
  });

  // 3. Deterministic Facts Extraction & Math Normalization
  await runner.test('Deterministic Facts: Accurately computes burn rate, debt totals, and overdue items', async () => {
    // Test frequency normalizer
    if (toMonthlyAmount(1200, 'annual') !== 100) throw new Error('Annual 1200 should be 100/mo');
    if (toMonthlyAmount(300, 'quarterly') !== 100) throw new Error('Quarterly 300 should be 100/mo');
    if (toMonthlyAmount(50, 'weekly') !== (50 * 52) / 12) throw new Error('Weekly 50 calculation mismatch');

    const syntheticContext: any = {
      userId: 'synth-user',
      intent: 'COMPREHENSIVE_DIAGNOSTIC',
      domainsConsulted: ['all'],
      profile: { homeName: 'Sunnyvale Haven', currency: 'USD', homeType: 'single_family' },
      properties: [{ id: 'p1', name: 'Sunnyvale Haven', squareFootage: 2400 }],
      rooms: [],
      assets: [{ id: 'a1', name: 'Water Heater', category: 'plumbing' }],
      warranties: [{ id: 'w1', status: 'active', endDate: '2030-01-01' }],
      maintenances: [
        { id: 'm1', title: 'HVAC Filter', status: 'scheduled', serviceDate: '2020-01-01', cost: 35 }, // overdue
        { id: 'm2', title: 'Roof Inspection', status: 'scheduled', serviceDate: '2030-01-01', cost: 200 }, // future
      ],
      utilities: [{ id: 'u1', name: 'Power Corp', typicalAmount: 150 }],
      loans: [{ id: 'l1', loanName: 'Mortgage', outstandingAmount: 400000, emiAmount: 2100 }],
      creditCards: [{ id: 'c1', cardNickname: 'Visa Signature', outstandingAmount: 3000, creditLimit: 5000 }], // 60% util -> urgent
      expenses: [{ id: 'e1', title: 'Home Insurance', amount: 1200, frequency: 'annual' }], // 100/mo
      transactions: [],
      documents: [],
      notifications: null,
      healthReport: { overallScore: 82, completenessScore: 88, statusLabel: 'Excellent', isProvisional: false },
      calendarResponse: null,
    };

    const facts = extractDeterministicFacts(syntheticContext);

    // Expenses: 100 + Utilities: 150 + Loans: 2100 = 2350
    if (facts.totalBurnMonthly !== 2350) {
      throw new Error(`Expected totalBurnMonthly = 2350, got ${facts.totalBurnMonthly}`);
    }
    // Loan: 400000 + Card: 3000 = 403000
    if (facts.totalDebt !== 403000) {
      throw new Error(`Expected totalDebt = 403000, got ${facts.totalDebt}`);
    }
    if (facts.overdueTasksCount !== 1) {
      throw new Error(`Expected 1 overdue task, got ${facts.overdueTasksCount}`);
    }
    if (facts.activeWarrantiesCount !== 1) {
      throw new Error(`Expected 1 active warranty, got ${facts.activeWarrantiesCount}`);
    }
    // Priority items should have overdue maintenance and high credit card utilization
    if (facts.priorityItems.length < 2) {
      throw new Error(`Expected at least 2 ranked priority items, got ${facts.priorityItems.length}`);
    }
    const hasOverdueMaint = facts.priorityItems.some((p) => p.category === 'maintenance' && p.urgency === 'urgent');
    const hasHighCardUtil = facts.priorityItems.some((p) => p.category === 'card' && p.urgency === 'urgent');
    if (!hasOverdueMaint || !hasHighCardUtil) {
      throw new Error('Priority items must include urgent overdue maintenance and high card utilization');
    }
  });

  // 4. Clean / Provisional Profile Health Score UX
  await runner.test('Provisional Health: Empty profile formats as Unrated (Setup Required)', async () => {
    const emptyContext: any = {
      userId: 'empty-user',
      intent: 'HOUSEHOLD_HEALTH',
      domainsConsulted: ['healthReport'],
      profile: { homeName: 'New Household', currency: 'USD' },
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
      healthReport: { overallScore: 63, completenessScore: 10, statusLabel: 'Provisional', isProvisional: true },
      calendarResponse: null,
    };

    const facts = extractDeterministicFacts(emptyContext);
    if (!facts.isProvisional) {
      throw new Error('Empty household with completeness < 25% must be provisional');
    }
    if (facts.healthLabel !== 'Unrated (Setup Required)') {
      throw new Error(`Expected healthLabel to be 'Unrated (Setup Required)', got '${facts.healthLabel}'`);
    }

    const reply = generateDeterministicAgentReply(emptyContext, 'HOUSEHOLD_HEALTH', 'How is my household doing?');
    if (!reply.reply.includes('Unrated (Setup Required)') || !reply.reply.includes('Completeness')) {
      throw new Error('Health reply for provisional account must explain Unrated status and onboarding steps');
    }
  });

  // 5. Setup User A Real Seed Data
  await runner.test('Seed User A household domain records', async () => {
    // 1. Profile
    await apiRequest('/api/household/profile', {
      method: 'PUT',
      token: tokenUserA,
      body: {
        homeName: 'Maplewood Manor',
        homeType: 'single_family',
        squareFootage: 2650,
        currency: 'USD',
      },
    });

    // 2. Property
    await apiRequest('/api/properties', {
      method: 'POST',
      token: tokenUserA,
      body: {
        name: 'Maplewood Manor',
        propertyType: 'single_family',
        squareFootage: 2650,
        purchaseValue: 480000,
      },
    });

    // 3. Asset
    await apiRequest('/api/household/assets', {
      method: 'POST',
      token: tokenUserA,
      body: {
        name: 'Carrier Infinity Heat Pump',
        category: 'hvac',
        brand: 'Carrier',
        installDate: '2023-05-15',
        expectedLifespanYears: 15,
        currentStatus: 'operational',
      },
    });

    // 4. Overdue Maintenance Task
    await apiRequest('/api/maintenances', {
      method: 'POST',
      token: tokenUserA,
      body: {
        title: 'Replace Furnace MERV 13 Filter',
        serviceDate: '2025-01-10', // Overdue
        status: 'scheduled',
        cost: 40,
        serviceProvider: 'DIY',
      },
    });

    // 5. Utility Account
    await apiRequest('/api/utilities', {
      method: 'POST',
      token: tokenUserA,
      body: {
        name: 'Evergreen Electric & Gas',
        provider: 'Evergreen Power',
        serviceType: 'electricity',
        typicalAmount: 165,
        dueDateDay: 15,
        paymentStatus: 'pending',
      },
    });

    // 6. Mortgage Loan
    await apiRequest('/api/loans', {
      method: 'POST',
      token: tokenUserA,
      body: {
        loanName: 'Primary Home Mortgage',
        loanType: 'mortgage',
        lender: 'Chase Bank',
        principalAmount: 380000,
        outstandingAmount: 345000,
        interestRate: 4.25,
        emiAmount: 1868,
        tenureMonths: 360,
        startDate: '2022-01-01',
        endDate: '2052-01-01',
        paymentDueDay: 1,
      },
    });

    // 7. Credit Card with High Balance
    await apiRequest('/api/credit-cards', {
      method: 'POST',
      token: tokenUserA,
      body: {
        cardNickname: 'Amex Gold Reserve',
        cardIssuer: 'American Express',
        last4Digits: '9012',
        creditLimit: 10000,
        outstandingAmount: 6800, // 68% util -> high risk
        paymentDueDate: '2026-09-25',
        minimumDue: 180,
      },
    });
  });

  // 6. Integration: Copilot Chat with "What needs my attention?"
  await runner.test('Orchestrator: "What needs my attention?" ranks overdue maintenance and high card utilization', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: {
        message: 'What needs my attention first?',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const { data } = res.body;
    if (!data?.reply) throw new Error('Missing reply in copilot response');

    // Verify structured response metadata
    if (data.groundedSummary?.intent !== 'NEEDS_ATTENTION') {
      throw new Error(`Expected intent 'NEEDS_ATTENTION', got '${data.groundedSummary?.intent}'`);
    }

    if (!Array.isArray(data.groundedSummary?.domainsConsulted)) {
      throw new Error('Expected domainsConsulted array in groundedSummary');
    }

    // Verify priority items are present in agentActionPlan
    const priorityItems = data.agentActionPlan?.priorityItems || [];
    if (priorityItems.length === 0) {
      throw new Error('Expected at least 1 priority item for overdue maintenance / high utilization');
    }

    const hasMaintItem = priorityItems.some((p: any) => p.title.includes('MERV 13') || p.category === 'maintenance');
    if (!hasMaintItem) {
      throw new Error('Expected overdue furnace filter maintenance in priority items');
    }
  });

  // 7. Integration: Copilot Chat with "How is my household doing?"
  await runner.test('Orchestrator: "How is my household doing?" grounds in health and real records', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: {
        message: 'How is my household doing?',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const { data } = res.body;
    if (data.groundedSummary?.intent !== 'HOUSEHOLD_HEALTH') {
      throw new Error(`Expected intent 'HOUSEHOLD_HEALTH', got '${data.groundedSummary?.intent}'`);
    }

    const reply = data.reply || '';
    if (!reply.includes('Maplewood Manor') && !reply.includes('Health') && !reply.includes('Burn Rate')) {
      throw new Error(`Expected health diagnostic mentioning Maplewood Manor or Health/Burn Rate, got: ${reply}`);
    }
  });

  // 8. Integration: Specific Domain Query (Finances & Debts)
  await runner.test('Orchestrator: Inquires about debts and calculates loan and card balances', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: {
        message: 'What is our total mortgage balance and monthly payment to Chase Bank?',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }

    const { data } = res.body;
    const reply = data.reply || '';

    // Should mention Chase Bank, $345,000 or $1,868
    if (!reply.includes('Chase') && !reply.includes('345,000') && !reply.includes('1868')) {
      throw new Error(`Expected loan grounding with Chase or balance figures in reply: ${reply}`);
    }
  });

  // 9. Integration: Specific Domain Query (Assets & Appliances)
  await runner.test('Orchestrator: Inquires about home equipment and answers with Carrier Heat Pump', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: {
        message: 'What heating and cooling equipment do we have registered?',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }

    const { data } = res.body;
    const reply = data.reply || '';

    if (!reply.includes('Carrier') && !reply.includes('Heat Pump')) {
      throw new Error(`Expected Carrier Heat Pump in reply: ${reply}`);
    }
  });

  // 10. Anti-Hallucination: Missing Data Query
  await runner.test('Anti-Hallucination: Non-existent items are acknowledged as not recorded', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: {
        message: 'When was our swimming pool pump last serviced and what is its warranty?',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }

    const { data } = res.body;
    const reply = data.reply || '';

    // Model must not hallucinate a fake pool pump
    if (reply.toLowerCase().includes('installed on 20') || reply.toLowerCase().includes('pool pump policy #')) {
      throw new Error(`Model hallucinated non-existent pool pump: ${reply}`);
    }
  });

  // 11. Multi-Tenant Cross-User IDOR Isolation
  await runner.test('Multi-Tenant Isolation: User B cannot see User A household data via Copilot', async () => {
    // User B asks about Carrier Heat Pump or Chase Mortgage
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserB,
      body: {
        message: 'What is my mortgage balance with Chase Bank and what heat pump do I have?',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }

    const { data } = res.body;
    const reply = data.reply || '';

    // Must NOT contain User A's data
    if (reply.includes('345,000') || reply.includes('Carrier Infinity') || reply.includes('Maplewood Manor')) {
      throw new Error(`CROSS-TENANT LEAK: User B received User A's private household data!`);
    }

    if (data.groundedSummary?.expensesCount > 0 || data.groundedSummary?.assetsCount > 0) {
      throw new Error(`User B should have 0 expenses and assets loaded`);
    }
  });
}
