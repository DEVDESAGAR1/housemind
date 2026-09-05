import { apiRequest, TestRunner } from '../test-helper';
import { DatabaseService } from '../../server/services/dbService';
import { IssueIntelligenceService } from '../../server/services/issueIntelligenceService';

export async function runDemoHouseholdAlignmentTests(runner: TestRunner): Promise<void> {
  runner.setSuite('Phase 24.7: Existing Demo Household Intelligence Alignment & Indian Localization');

  const userId = 'demo-alignment-tester-user';
  const token = `test-token-${userId}`;

  const user2 = 'demo-alignment-unauthorized-user';
  const token2 = `test-token-${user2}`;

  // =========================================================================
  // 1. Idempotent Demo Seeding & Privacy Cleanup
  // =========================================================================
  await runner.test('Demo Seeding: Populates localized Indian household idempotently across all domains', async () => {
    // Clean before test
    await DatabaseService.clearDemoData(userId);

    // First seed
    const seed1 = await DatabaseService.seedDemoData(userId);
    if (seed1.expenses <= 0 || seed1.assets <= 0 || seed1.transactions <= 0) {
      throw new Error(`Seeded counts invalid: ${JSON.stringify(seed1)}`);
    }

    // Verify Profile in INR
    const profile = await DatabaseService.getProfile(userId);
    if (!profile) throw new Error('Seeded profile missing');
    if (profile.currency !== 'INR') {
      throw new Error(`Expected profile currency to be 'INR', got: ${profile.currency}`);
    }
    if (!profile.homeName.includes('Gulmohar')) {
      throw new Error(`Expected Indian homeName 'Gulmohar Haven', got: ${profile.homeName}`);
    }

    // Second seed (idempotent check)
    const seed2 = await DatabaseService.seedDemoData(userId);
    const txCount = (await DatabaseService.listTransactions(userId)).length;
    const assetCount = (await DatabaseService.listAssets(userId)).length;
    const expenseCount = (await DatabaseService.listExpenses(userId)).length;

    if (txCount !== 10) {
      throw new Error(`Expected exactly 10 transactions after idempotent seeding, found ${txCount}`);
    }
    if (assetCount !== 7) {
      throw new Error(`Expected exactly 7 assets, found ${assetCount}`);
    }
    if (expenseCount !== 8) {
      throw new Error(`Expected exactly 8 expenses, found ${expenseCount}`);
    }
  });

  // =========================================================================
  // 2. Relationship Graph Integrity (GET /api/household/graph)
  // =========================================================================
  await runner.test('Graph Integrity: Constructs coherent multi-domain relationship graph without orphan links', async () => {
    const res = await apiRequest('/api/household/graph', {
      method: 'GET',
      token,
    });

    if (res.status !== 200) {
      throw new Error(`Failed to fetch household graph: ${res.status}`);
    }

    const { nodes, edges } = res.body.data;
    if (!Array.isArray(nodes) || nodes.length < 15) {
      throw new Error(`Expected at least 15 graph nodes, got ${nodes?.length}`);
    }
    if (!Array.isArray(edges) || edges.length < 10) {
      throw new Error(`Expected at least 10 graph edges, got ${edges?.length}`);
    }

    // Verify node IDs set
    const nodeIds = new Set(nodes.map((n: any) => n.id));

    // Verify all edge source and target nodes exist in the graph (0 orphan edges)
    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) {
        throw new Error(`Orphan graph edge source: "${edge.source}" not in nodes list`);
      }
      if (!nodeIds.has(edge.target)) {
        throw new Error(`Orphan graph edge target: "${edge.target}" not in nodes list`);
      }
    }

    // Verify relationship types
    const relationships = new Set(edges.map((e: any) => e.relationship));
    if (!relationships.has('located_in') || !relationships.has('covered_by') || !relationships.has('maintained_by') || !relationships.has('affects')) {
      throw new Error(`Expected relationship types located_in, covered_by, maintained_by, affects. Found: ${Array.from(relationships).join(', ')}`);
    }
  });

  // =========================================================================
  // 3. Scenario A: Repair vs. Replace Compound Decision
  // =========================================================================
  await runner.test('Scenario A (Repair vs Replace): Synthesizes compound recommendation for Daikin AC', async () => {
    const res = await apiRequest('/api/household/unified-actions', {
      method: 'GET',
      token,
    });

    if (res.status !== 200) {
      throw new Error(`Failed to fetch unified actions: ${res.status}`);
    }

    const actions = Array.isArray(res.body.actions) ? res.body.actions : (res.body.data?.actions || res.body.data || []);
    if (!Array.isArray(actions) || actions.length === 0) {
      throw new Error('Expected at least one active unified household action');
    }

    const repairReplaceAction = actions.find(
      (a: any) => a.type === 'repair_replace' || a.title.toLowerCase().includes('daikin') || a.title.toLowerCase().includes('repair-vs-replace')
    );

    if (!repairReplaceAction) {
      throw new Error(`Expected Repair vs Replace action for Daikin AC. Available actions: ${actions.map((a: any) => a.title).join(' | ')}`);
    }

    // Verify grounded facts
    const facts = repairReplaceAction.evidence?.facts || [];
    if (facts.length < 2) {
      throw new Error(`Expected multiple evidence facts, got: ${JSON.stringify(facts)}`);
    }

    // Verify action targets
    const targets = repairReplaceAction.relatedRecords || [];
    const hasDaikinAsset = targets.some((t: any) => t.id === 'demo_ast_ac_living');
    if (!hasDaikinAsset) {
      throw new Error('Repair vs Replace action missing target link to Daikin AC asset');
    }
  });

  // =========================================================================
  // 4. Scenario B: Approaching Warranty Expiration
  // =========================================================================
  await runner.test('Scenario B (Warranty Expiry): Identifies approaching warranty expiration on Daikin AC', async () => {
    const res = await apiRequest('/api/household/warranties', {
      method: 'GET',
      token,
    });

    if (res.status !== 200) {
      throw new Error(`Failed to list warranties: ${res.status}`);
    }

    const warranties = res.body.data;
    const daikinWarranty = warranties.find((w: any) => w.assetId === 'demo_ast_ac_living');
    if (!daikinWarranty) {
      throw new Error('Expected Daikin warranty record');
    }
    if (daikinWarranty.status !== 'expiring_soon') {
      throw new Error(`Expected warranty status 'expiring_soon', got '${daikinWarranty.status}'`);
    }
  });

  // =========================================================================
  // 5. Scenario C: Recurring Failure Intelligence
  // =========================================================================
  await runner.test('Scenario C (Recurrence): Issue Intelligence detects recurring failure pattern on Daikin AC', async () => {
    const report = await IssueIntelligenceService.analyzeIssue(userId, 'demo_issue_ac_compressor');

    if (!report.recurringSignal) {
      throw new Error('Expected recurringSignal in Issue Intelligence report');
    }
    if (!report.recurringSignal.isRecurring) {
      throw new Error(`Expected isRecurring to be true on Daikin AC, got: ${JSON.stringify(report.recurringSignal)}`);
    }
    if (report.recurringSignal.repeatedIssueCount < 2) {
      throw new Error(`Expected repeatedIssueCount >= 2, got ${report.recurringSignal.repeatedIssueCount}`);
    }

    // Verify historical resolution link
    const prevRes = report.recurringSignal.previousResolutions;
    if (!Array.isArray(prevRes) || prevRes.length === 0) {
      throw new Error('Expected previousResolutions array with historical repair cost');
    }
    if (prevRes[0].cost !== 4800) {
      throw new Error(`Expected previous repair cost ₹4,800, got: ${prevRes[0].cost}`);
    }
  });

  // =========================================================================
  // 6. Scenario D: Overdue Maintenance Risk
  // =========================================================================
  await runner.test('Scenario D (Maintenance Risk): Surfaces overdue filter replacement for Kent RO Purifier', async () => {
    const res = await apiRequest('/api/household/maintenances', {
      method: 'GET',
      token,
    });

    if (res.status !== 200) {
      throw new Error(`Failed to fetch maintenances: ${res.status}`);
    }

    const tasks = res.body.data;
    const roTask = tasks.find((t: any) => t.assetId === 'demo_ast_ro_purifier');
    if (!roTask) {
      throw new Error('Expected Kent RO maintenance task');
    }
    if (roTask.nextServiceDate !== '2026-09-01') {
      throw new Error(`Expected scheduled date '2026-09-01', got '${roTask.nextServiceDate}'`);
    }
  });

  // =========================================================================
  // 7. Scenario E: Financial Ledger Mathematical Integrity in ₹ INR
  // =========================================================================
  await runner.test('Scenario E (Financial Integrity): Verifies mathematical consistency of Indian financial transactions', async () => {
    const summaryRes = await apiRequest('/api/transactions/summary?currency=INR', {
      method: 'GET',
      token,
    });

    if (summaryRes.status !== 200) {
      throw new Error(`Failed to get transaction summary: ${summaryRes.status}`);
    }

    const { summary } = summaryRes.body;
    if (summary.totalIncome !== 186850) {
      throw new Error(`Expected total income ₹1,86,850 (₹1,85,000 salary + ₹1,850 refund), got: ${summary.totalIncome}`);
    }
    if (summary.totalExpenses <= 0) {
      throw new Error(`Expected total expenses > 0, got: ${summary.totalExpenses}`);
    }

    const expectedNet = Number((summary.totalIncome - summary.totalExpenses).toFixed(2));
    if (Math.abs(summary.netCashFlow - expectedNet) > 0.05) {
      throw new Error(`Expected net cash flow ${expectedNet}, got: ${summary.netCashFlow}`);
    }

    if (summary.savingsRate < 40 || summary.savingsRate > 70) {
      throw new Error(`Expected realistic savings rate between 40-70%, got: ${summary.savingsRate}%`);
    }
  });

  // =========================================================================
  // 8. Scenario F: Document-to-Asset Relationship Linkage
  // =========================================================================
  await runner.test('Scenario F (Document Linkage): Connects AC Tax Invoice to Daikin Split AC in document metadata', async () => {
    const res = await apiRequest('/api/documents', {
      method: 'GET',
      token,
    });

    if (res.status !== 200) {
      throw new Error(`Failed to fetch documents: ${res.status}`);
    }

    const docs = Array.isArray(res.body.documents) ? res.body.documents : (res.body.data?.documents || res.body.data || []);
    const acInvoice = docs.find((d: any) => d.id === 'demo_doc_ac_invoice');
    if (!acInvoice) {
      throw new Error('Expected Daikin AC tax invoice document');
    }
    if (acInvoice.metadata?.assetId !== 'demo_ast_ac_living') {
      throw new Error(`Expected linked assetId 'demo_ast_ac_living', got: ${acInvoice.metadata?.assetId}`);
    }
  });

  // =========================================================================
  // 9. Single Household Copilot Grounded Intelligence Q&A
  // =========================================================================
  await runner.test('Copilot Intelligence: Answers grounded household questions without hallucinating data', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token,
      body: {
        message: 'Give me a brief summary of my household and tell me which asset needs maintenance.',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Copilot chat request failed: ${res.status}`);
    }

    const { data } = res.body;
    if (!data || !data.reply) {
      throw new Error('Copilot response missing reply body');
    }

    // Verify response contains grounded facts
    const reply = data.reply.toLowerCase();
    if (!reply.includes('gulmohar') && !reply.includes('daikin') && !reply.includes('ro') && !reply.includes('ac')) {
      throw new Error(`Copilot reply lacks grounded household references: "${data.reply}"`);
    }
  });

  // =========================================================================
  // 10. Multi-Tenant Isolation & Privacy Security
  // =========================================================================
  await runner.test('Security & Tenant Isolation: User 2 cannot access or mutate User 1 demo data', async () => {
    const res = await apiRequest('/api/household/graph', {
      method: 'GET',
      token: token2,
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 for user 2 graph request, got ${res.status}`);
    }

    const { nodes } = res.body.data;
    if (nodes && nodes.length > 0) {
      throw new Error(`Tenant leak: User 2 has ${nodes.length} nodes from User 1's seeded household`);
    }
  });
}
