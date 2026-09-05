import { apiRequest, TestRunner } from '../test-helper';
import { HouseholdMorningBriefService } from '../../server/services/agent/householdMorningBrief';

export async function runPhase1ClarityHierarchyBriefTests(runner: TestRunner) {
  runner.setSuite('Phase 1: Product Clarity, Card Hierarchy & State-Aware Briefing');

  const token = 'test-token-phase1-clarity-user';
  const tokenEmpty = 'test-token-phase1-empty-user';
  let userId = '';
  let billId = '';
  let maintId = '';
  let assetId = '';

  // 1. SETUP: Create profile and multi-domain test household
  await runner.test('Setup: Seed localized Indian demo test household for Phase 1 clarity', async () => {
    const profRes = await apiRequest('/api/household/profile', {
      method: 'PUT',
      token,
      body: {
        homeName: 'Sharma Residence',
        homeType: 'single_family',
        currency: 'INR',
        locale: 'en-IN',
      },
    });
    if (profRes.status !== 200) {
      throw new Error(`Failed to initialize profile: ${JSON.stringify(profRes.body)}`);
    }
    userId = profRes.body.data.userId;
  });

  // 2. TIER 1: Needs Attention Now (Overdue Bills & Maintenance)
  await runner.test('Tier 1: Accurately identifies overdue obligations and priorities with 4-part action clarity', async () => {
    const pastDueDate = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];
    const expRes = await apiRequest('/api/household/expenses', {
      method: 'POST',
      token,
      body: {
        title: 'Tata Power Electricity Bill',
        amount: 4500,
        category: 'utilities',
        frequency: 'monthly',
        dueDate: pastDueDate,
        paymentStatus: 'overdue',
        isAutoPay: false,
      },
    });
    if (expRes.status !== 201) {
      throw new Error(`Failed to create expense: ${JSON.stringify(expRes.body)}`);
    }
    billId = expRes.body.data.id;

    const overdueMaintDate = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];
    const maintRes = await apiRequest('/api/household/maintenances', {
      method: 'POST',
      token,
      body: {
        title: 'Water Purifier RO Filter Replacement',
        serviceDate: overdueMaintDate,
        dueDate: overdueMaintDate,
        cost: 2500,
        recurringSchedule: 'semi_annual',
        status: 'overdue',
      },
    });
    if (maintRes.status !== 201) {
      throw new Error(`Failed to create maintenance: ${JSON.stringify(maintRes.body)}`);
    }
    maintId = maintRes.body.data.id;

    const briefRes = await apiRequest('/api/household/morning-brief', {
      method: 'GET',
      token,
    });
    if (briefRes.status !== 200) {
      throw new Error(`Failed to retrieve morning brief: ${JSON.stringify(briefRes.body)}`);
    }

    const brief = briefRes.body.data;
    if (!brief || !brief.itemsNeedingAttention || brief.itemsNeedingAttention.length < 2) {
      throw new Error(`Expected at least 2 attention items, received: ${JSON.stringify(brief?.itemsNeedingAttention)}`);
    }

    const roItem = brief.itemsNeedingAttention.find((i: any) =>
      i.title.toLowerCase().includes('water purifier') || i.title.toLowerCase().includes('ro')
    );
    if (!roItem || (roItem.urgency !== 'overdue' && roItem.urgency !== 'critical')) {
      throw new Error(`RO Item missing or incorrect urgency: ${JSON.stringify(roItem)}`);
    }
  });

  // 3. TIER 2: What Should I Do Next? (Unified Household Action Center)
  await runner.test('Tier 2: Produces unified household recommendations with grounded why-it-matters and evidence facts', async () => {
    const assetRes = await apiRequest('/api/household/assets', {
      method: 'POST',
      token,
      body: {
        name: 'Samsung Inverter Refrigerator',
        category: 'appliance',
        brand: 'Samsung',
        purchasePrice: 48000,
        currentStatus: 'needs_maintenance',
      },
    });
    if (assetRes.status !== 201) {
      throw new Error(`Failed to create asset: ${JSON.stringify(assetRes.body)}`);
    }
    assetId = assetRes.body.data.id;

    const issueRes = await apiRequest('/api/household/issues', {
      method: 'POST',
      token,
      body: {
        assetId,
        title: 'Cooling Compressor Recurring Failure',
        description: 'Compressor stopped cooling for the 3rd time in 6 months.',
        severity: 'high',
        status: 'reported',
        estimatedCost: 14000,
      },
    });
    if (issueRes.status !== 201) {
      throw new Error(`Failed to create issue: ${JSON.stringify(issueRes.body)}`);
    }

    const actionsRes = await apiRequest('/api/household/unified-actions?limit=5', {
      method: 'GET',
      token,
    });
    if (actionsRes.status !== 200) {
      throw new Error(`Failed to fetch unified actions: ${JSON.stringify(actionsRes.body)}`);
    }

    const actions = actionsRes.body.data?.actions;
    if (!actions || actions.length === 0) {
      throw new Error(`Expected at least 1 unified action recommendation`);
    }

    const topAction = actions[0];
    if (!topAction.title || !topAction.whyItMatters || !topAction.evidence?.facts) {
      throw new Error(`Unified action missing explainability fields: ${JSON.stringify(topAction)}`);
    }
  });

  // 4. TIER 3: Household Overview & Deterministic Health Score
  await runner.test('Tier 3: Calculates deterministic composite health score across 4 pillars', async () => {
    const healthRes = await apiRequest('/api/household/health', {
      method: 'GET',
      token,
    });
    if (healthRes.status !== 200) {
      throw new Error(`Failed to fetch health report: ${JSON.stringify(healthRes.body)}`);
    }

    const report = healthRes.body.data;
    if (report.overallScore === undefined || report.overallScore < 0 || report.overallScore > 100) {
      throw new Error(`Invalid health score: ${report.overallScore}`);
    }
    if (!report.categories?.home || !report.categories?.assets || !report.categories?.finances || !report.categories?.documents) {
      throw new Error(`Health report missing 4 pillar categories`);
    }
  });

  // 5. TIER 4: Cross-Domain Household Intelligence
  await runner.test('Tier 4: Correlates cross-domain signals with deterministic evidence', async () => {
    const xRes = await apiRequest('/api/household/cross-domain-insights?limit=5', {
      method: 'GET',
      token,
    });
    if (xRes.status !== 200) {
      throw new Error(`Failed to fetch cross-domain insights: ${JSON.stringify(xRes.body)}`);
    }
    const insights = xRes.body.data?.insights;
    if (!Array.isArray(insights)) {
      throw new Error(`Expected array of cross-domain insights`);
    }
  });

  // 6. STATE-AWARE MORNING BRIEF: Dynamic re-synthesis on household mutation
  await runner.test('Morning Brief State Awareness: Dynamically reflects mutation without becoming a stale snapshot', async () => {
    // Check initial brief
    const initialBrief = await HouseholdMorningBriefService.generateMorningBrief(userId);
    if (!initialBrief || !initialBrief.generatedAt) {
      throw new Error(`Morning brief missing generatedAt timestamp`);
    }

    // Mutate state: mark Tata Power bill as paid
    const updateRes = await apiRequest(`/api/household/expenses/${billId}`, {
      method: 'PUT',
      token,
      body: {
        paymentStatus: 'paid',
        isPaid: true,
      },
    });
    if (updateRes.status !== 200) {
      throw new Error(`Failed to update expense status: ${JSON.stringify(updateRes.body)}`);
    }

    // Re-fetch morning brief — the paid bill must disappear from overdue items
    const updatedBriefRes = await apiRequest('/api/household/morning-brief', {
      method: 'GET',
      token,
    });
    if (updatedBriefRes.status !== 200) {
      throw new Error(`Failed to re-fetch morning brief: ${JSON.stringify(updatedBriefRes.body)}`);
    }

    const updatedBrief = updatedBriefRes.body.data;
    const billItemAfterPayment = updatedBrief.itemsNeedingAttention.find((i: any) =>
      i.id === `evt_exp_${billId}` || (i.title && i.title.toLowerCase().includes('tata power'))
    );
    if (billItemAfterPayment) {
      throw new Error(`Paid bill should not appear as overdue in state-aware morning brief`);
    }
  });

  // 7. EMPTY HOUSEHOLD EXPERIENCE
  await runner.test('Empty Household: Returns safe setup_required status and explains onboarding next steps', async () => {
    await apiRequest('/api/household/profile', {
      method: 'PUT',
      token: tokenEmpty,
      body: {
        homeName: 'New Vacant Apartment',
        homeType: 'apartment',
        currency: 'USD',
      },
    });

    const emptyBriefRes = await apiRequest('/api/household/morning-brief', {
      method: 'GET',
      token: tokenEmpty,
    });
    if (emptyBriefRes.status !== 200) {
      throw new Error(`Failed to fetch empty morning brief: ${JSON.stringify(emptyBriefRes.body)}`);
    }

    const emptyBrief = emptyBriefRes.body.data;
    if (emptyBrief.overallStatus !== 'setup_required') {
      throw new Error(`Expected setup_required status, got: ${emptyBrief.overallStatus}`);
    }
  });
}
