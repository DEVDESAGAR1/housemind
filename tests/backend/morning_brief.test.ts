import { apiRequest, TestRunner } from '../test-helper';
import { HouseholdMorningBriefService } from '../../server/services/agent/householdMorningBrief';
import { HouseholdMorningBrief } from '../../src/types';

export async function runMorningBriefTests(runner: TestRunner) {
  runner.setSuite('Phase 17: Household Morning Brief / Killer Agent Workflow');

  const tokenUserA = 'test-token-mb-user-a';
  const tokenUserB = 'test-token-mb-user-b';
  const tokenUserEmpty = 'test-token-mb-user-empty';
  const tokenUserPartial = 'test-token-mb-user-partial';

  const userIdA = 'mb-user-a';
  const userIdB = 'mb-user-b';
  const userIdEmpty = 'mb-user-empty';
  const userIdPartial = 'mb-user-partial';

  // 1. Seed User A with rich multi-domain household records
  await runner.test('Morning Brief: Seed User A multi-domain household records', async () => {
    // Profile
    const profileRes = await apiRequest('/api/household/profile', {
      method: 'PUT',
      token: tokenUserA,
      body: {
        homeName: 'Pine Crest Residence',
        homeType: 'single_family',
        currency: 'USD',
      },
    });
    if (profileRes.status !== 200) throw new Error(`Profile setup failed: ${profileRes.status}`);

    // Overdue urgent maintenance (cost >= 500)
    const maint1Res = await apiRequest('/api/maintenances', {
      method: 'POST',
      token: tokenUserA,
      body: {
        title: 'Furnace Ignition Sensor Cleaning',
        category: 'hvac',
        serviceDate: '2024-08-15',
        status: 'scheduled',
        cost: 650,
      },
    });
    if (maint1Res.status !== 201) throw new Error(`Maint 1 creation failed: ${maint1Res.status}`);

    // Routine overdue maintenance
    const maint2Res = await apiRequest('/api/maintenances', {
      method: 'POST',
      token: tokenUserA,
      body: {
        title: 'Refrigerator Water Filter Replacement',
        category: 'appliances',
        serviceDate: '2024-08-20',
        status: 'scheduled',
        cost: 65,
      },
    });
    if (maint2Res.status !== 201) throw new Error(`Maint 2 creation failed: ${maint2Res.status}`);

    // Utility account
    const utilRes = await apiRequest('/api/utilities', {
      method: 'POST',
      token: tokenUserA,
      body: {
        name: 'City Water Works',
        provider: 'City Water',
        serviceType: 'water',
        typicalAmount: 95,
        dueDateDay: 18,
      },
    });
    if (utilRes.status !== 201) throw new Error(`Utility creation failed: ${utilRes.status}`);

    // Mortgage loan
    const loanRes = await apiRequest('/api/loans', {
      method: 'POST',
      token: tokenUserA,
      body: {
        loanName: 'Primary Mortgage 30Y',
        lender: 'First Republic Home',
        loanType: 'mortgage',
        principalAmount: 420000,
        outstandingAmount: 395000,
        interestRate: 6.25,
        emiAmount: 2580,
        tenureMonths: 360,
        startDate: '2023-01-01',
        endDate: '2053-01-01',
        paymentDueDay: 1,
      },
    });
    if (loanRes.status !== 201) throw new Error(`Loan creation failed: ${loanRes.status}`);

    // Credit Card with balance
    const cardRes = await apiRequest('/api/credit-cards', {
      method: 'POST',
      token: tokenUserA,
      body: {
        cardNickname: 'Sapphire Reserve',
        cardIssuer: 'Chase Bank',
        last4Digits: '4455',
        creditLimit: 20000,
        outstandingAmount: 4200,
        paymentDueDate: '2026-09-20',
        minimumDue: 120,
      },
    });
    if (cardRes.status !== 201) throw new Error(`Card creation failed: ${cardRes.status}`);

    // Expiring Warranty in 20 days
    const dueIn20Days = new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0];
    const warRes = await apiRequest('/api/household/warranties', {
      method: 'POST',
      token: tokenUserA,
      body: {
        assetName: 'Bosch 800 Series Dishwasher',
        warrantyProvider: 'SquareTrade Protection',
        policyNumber: 'SQ-889922',
        startDate: '2023-09-01',
        endDate: dueIn20Days,
        warrantyDurationMonths: 36,
        status: 'active',
      },
    });
    if (warRes.status !== 201) throw new Error(`Warranty creation failed: ${warRes.status}`);
  });

  // 2. Multi-Domain Morning Brief Generation & Content Verification
  await runner.test('Morning Brief: Combines all household domains into structured brief', async () => {
    const brief: HouseholdMorningBrief = await HouseholdMorningBriefService.generateMorningBrief(userIdA);

    if (!brief) throw new Error('Morning brief must be defined');
    if (brief.homeName !== 'Pine Crest Residence') throw new Error(`Expected Pine Crest Residence, got: ${brief.homeName}`);
    if (brief.financialObligationsSummary.currency !== 'USD') throw new Error('Expected USD currency');
    if (brief.financialObligationsSummary.monthlyBurnRate <= 0) throw new Error('Burn rate should be > 0');
    if (brief.maintenanceAssetConcerns.overdueTasksCount !== 2) {
      throw new Error(`Expected 2 overdue tasks, got: ${brief.maintenanceAssetConcerns.overdueTasksCount}`);
    }
    if (brief.documentWarrantyConcerns.expiringWarrantiesCount < 1) {
      throw new Error('Should reflect at least 1 expiring warranty');
    }
    if (!brief.agentAudit || brief.agentAudit.intent !== 'MORNING_BRIEF') {
      throw new Error('Agent audit metadata must be present with MORNING_BRIEF intent');
    }
    if (brief.agentAudit.toolsInvoked.length !== 6) {
      throw new Error(`All 6 safe tools must be audited, got: ${brief.agentAudit.toolsInvoked.length}`);
    }
  });

  // 3. Priority Ordering & Urgency Classification
  await runner.test('Morning Brief: Correctly prioritizes Critical > Overdue > Due Today > Warning > Due Soon', async () => {
    const brief = await HouseholdMorningBriefService.generateMorningBrief(userIdA);

    // Urgent maintenance should be classified as critical
    const criticalItems = brief.itemsNeedingAttention.filter((i) => i.urgency === 'critical');
    if (criticalItems.length < 1) {
      throw new Error('Expected at least 1 critical item (Furnace Ignition Sensor)');
    }
    if (!criticalItems.some((i) => i.title.includes('Furnace'))) {
      throw new Error('Furnace must be classified as critical');
    }

    // Overdue routine maintenance should be classified as overdue
    const overdueItems = brief.itemsNeedingAttention.filter((i) => i.urgency === 'overdue');
    if (overdueItems.length < 1) {
      throw new Error('Expected at least 1 overdue item (Refrigerator Filter)');
    }

    // Expiring warranty should be in itemsToWatch with due_soon urgency
    const dueSoonItems = brief.itemsToWatch.filter((i) => i.urgency === 'due_soon');
    if (!dueSoonItems.some((i) => i.title.includes('Warranty'))) {
      throw new Error('Expiring warranty must be in itemsToWatch with due_soon');
    }

    // Recommended first action must pick the top urgent/critical item
    if (!brief.recommendedFirstAction) {
      throw new Error('Recommended first action must be selected');
    }
    if (brief.recommendedFirstAction.urgency !== 'critical') {
      throw new Error(`Expected recommended action urgency critical, got: ${brief.recommendedFirstAction.urgency}`);
    }
    if (!brief.recommendedFirstAction.title.includes('Furnace')) {
      throw new Error(`Expected Furnace in recommended action, got: ${brief.recommendedFirstAction.title}`);
    }
  });

  // 4. Deterministic Financial Math
  await runner.test('Morning Brief: Computes authoritative financial burn rate and debt balances', async () => {
    const brief = await HouseholdMorningBriefService.generateMorningBrief(userIdA);

    // Monthly burn rate = typical utilities (95) + loan EMI (2580) = 2675
    if (brief.financialObligationsSummary.monthlyBurnRate !== 2675) {
      throw new Error(`Expected burn rate 2675, got: ${brief.financialObligationsSummary.monthlyBurnRate}`);
    }
    // Total debt = mortgage (395000) + card (4200) = 399200
    if (brief.groundedFacts.totalOutstandingDebt !== 399200) {
      throw new Error(`Expected total debt 399200, got: ${brief.groundedFacts.totalOutstandingDebt}`);
    }
  });

  // 5. No-Data / Fresh Household Handling
  await runner.test('Morning Brief: Produces non-alarming, welcoming setup brief on empty accounts', async () => {
    const brief = await HouseholdMorningBriefService.generateMorningBrief(userIdEmpty);

    if (!brief) throw new Error('Brief must generate for empty household');
    if (brief.overallStatus !== 'setup_required') {
      throw new Error(`Expected status setup_required, got: ${brief.overallStatus}`);
    }
    if (!brief.statusHeadline.includes('Setup in Progress')) {
      throw new Error(`Expected headline to indicate setup mode, got: ${brief.statusHeadline}`);
    }
    if (brief.itemsNeedingAttention.length !== 0) {
      throw new Error(`Expected 0 attention items on empty account, got: ${brief.itemsNeedingAttention.length}`);
    }
    if (!brief.recommendedFirstAction || brief.recommendedFirstAction.category !== 'general') {
      throw new Error('Must recommend general onboarding step');
    }
    if (!brief.synthesizedNarrative.includes('Welcome') && !brief.synthesizedNarrative.includes('setup')) {
      throw new Error('Narrative should welcome user in setup mode');
    }
  });

  // 6. Partial / Missing Single Domain Data Resilience
  await runner.test('Morning Brief: Operates cleanly when specific domains have zero records', async () => {
    await apiRequest('/api/household/profile', {
      method: 'PUT',
      token: tokenUserPartial,
      body: { homeName: 'Sunnyvale Townhome', currency: 'EUR' },
    });
    await apiRequest('/api/maintenances', {
      method: 'POST',
      token: tokenUserPartial,
      body: { title: 'HVAC Air Filter', category: 'hvac', status: 'pending', serviceDate: '2026-10-01' },
    });

    const brief = await HouseholdMorningBriefService.generateMorningBrief(userIdPartial);
    if (brief.homeName !== 'Sunnyvale Townhome') throw new Error(`Expected Sunnyvale Townhome, got: ${brief.homeName}`);
    if (brief.financialObligationsSummary.currency !== 'EUR') throw new Error('Expected EUR currency');
    if (brief.financialObligationsSummary.monthlyBurnRate !== 0) throw new Error('Expected 0 burn rate');
    if (brief.maintenanceAssetConcerns.overdueTasksCount !== 0) throw new Error('Expected 0 overdue tasks');
  });

  // 7. Deterministic Fallback & Anti-Hallucination
  await runner.test('Morning Brief: Deterministic fallback narrative avoids hallucinated entities', async () => {
    const brief = await HouseholdMorningBriefService.generateMorningBrief(userIdA);

    if (brief.synthesizedNarrative.length < 50) throw new Error('Narrative must be substantial');
    if (!brief.synthesizedNarrative.includes('Pine Crest Residence')) throw new Error('Must ground in home name');
    // Verify no fake entities
    if (brief.synthesizedNarrative.includes('Tesla Powerwall')) throw new Error('Must not hallucinate Tesla Powerwall');
    if (brief.synthesizedNarrative.includes('Sub-Zero Wine Cooler')) throw new Error('Must not hallucinate Sub-Zero');
  });

  // 8. Multi-Tenant Cross-User Isolation
  await runner.test('Morning Brief: User B morning brief is isolated from User A data', async () => {
    const briefB = await HouseholdMorningBriefService.generateMorningBrief(userIdB);

    if (briefB.homeName === 'Pine Crest Residence') throw new Error('User B must not see User A home name');
    if (briefB.maintenanceAssetConcerns.overdueTasksCount !== 0) throw new Error('User B must have 0 overdue tasks');
    if (briefB.financialObligationsSummary.monthlyBurnRate !== 0) throw new Error('User B must have 0 burn rate');
    if (briefB.groundedFacts.totalOutstandingDebt !== 0) throw new Error('User B must have 0 debt');
  });

  // 9. Stability & Idempotence on Repeated Calls
  await runner.test('Morning Brief: Repeated brief generations produce stable deterministic facts', async () => {
    const brief1 = await HouseholdMorningBriefService.generateMorningBrief(userIdA);
    const brief2 = await HouseholdMorningBriefService.generateMorningBrief(userIdA);

    if (brief1.overallStatus !== brief2.overallStatus) throw new Error('Status must match');
    if (brief1.statusHeadline !== brief2.statusHeadline) throw new Error('Headline must match');
    if (brief1.financialObligationsSummary.monthlyBurnRate !== brief2.financialObligationsSummary.monthlyBurnRate) {
      throw new Error('Monthly burn rate must match');
    }
    if (brief1.groundedFacts.totalOutstandingDebt !== brief2.groundedFacts.totalOutstandingDebt) {
      throw new Error('Total debt must match');
    }
    if (brief1.itemsNeedingAttention.length !== brief2.itemsNeedingAttention.length) {
      throw new Error('Attention items count must match');
    }
  });

  // 10. Copilot Chat Integration with Morning Brief Query
  await runner.test('Morning Brief: Copilot handles "Give me my morning brief" and returns structured brief', async () => {
    const chatRes = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: {
        message: 'Give me my morning brief today.',
      },
    });

    if (chatRes.status !== 200) throw new Error(`Expected 200, got: ${chatRes.status}`);
    if (!chatRes.body.data.morningBrief) throw new Error('Chat response must contain morningBrief object');
    if (chatRes.body.data.agentAudit?.intent !== 'MORNING_BRIEF') {
      throw new Error(`Expected intent MORNING_BRIEF, got: ${chatRes.body.data.agentAudit?.intent}`);
    }
    if (chatRes.body.data.reply.length < 50) throw new Error('Chat reply should include briefing text');
  });

  // 11. Security Denial on Mutation Queries during Brief
  await runner.test('Morning Brief: Denies autonomous mutations if user attempts delete during brief', async () => {
    const chatRes = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: {
        message: 'Delete all my overdue maintenance tasks right now.',
      },
    });

    if (chatRes.status !== 200) throw new Error(`Expected 200, got: ${chatRes.status}`);
    const deniedTool = chatRes.body.data.agentAudit?.toolsInvoked.find((t: any) => t.status === 'denied');
    if (!deniedTool) throw new Error('Must log a denied tool audit record');
    if (deniedTool.category !== 'DELETE') throw new Error(`Expected category DELETE, got: ${deniedTool.category}`);
  });

  // 12. Direct API Endpoint GET /api/copilot/morning-brief
  await runner.test('Morning Brief: GET /api/copilot/morning-brief returns 200 with valid morning brief', async () => {
    const endpointRes = await apiRequest('/api/copilot/morning-brief', {
      method: 'GET',
      token: tokenUserA,
    });

    if (endpointRes.status !== 200) throw new Error(`Expected 200, got: ${endpointRes.status}`);
    if (!endpointRes.body.success) throw new Error('Response must be success: true');
    if (endpointRes.body.data.homeName !== 'Pine Crest Residence') {
      throw new Error(`Expected Pine Crest Residence, got: ${endpointRes.body.data.homeName}`);
    }
    if (endpointRes.body.data.financialObligationsSummary.currency !== 'USD') {
      throw new Error('Expected USD currency');
    }
    if (endpointRes.body.data.itemsNeedingAttention.length < 1) {
      throw new Error('Expected attention items');
    }
  });
}
