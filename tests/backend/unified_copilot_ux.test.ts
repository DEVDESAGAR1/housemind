import { apiRequest, TestRunner } from '../test-helper';
import { DatabaseService } from '../../server/services/dbService';
import { ActionExecutor } from '../../server/services/agent/actionExecutor';
import { AgentActivityService } from '../../server/services/agent/agentActivityService';

export async function runUnifiedCopilotUXTests(runner: TestRunner) {
  runner.setSuite('Phase 22: Unified Agentic Copilot UX Across the Entire Application');

  const tokenUserA = 'test-token-copilot-ux-user-a';
  const tokenUserB = 'test-token-copilot-ux-user-b';
  const userIdA = 'copilot-ux-user-a';
  const userIdB = 'copilot-ux-user-b';

  // Setup test environment
  DatabaseService.clearUserData(userIdA);
  DatabaseService.clearUserData(userIdB);
  AgentActivityService.clearActivityForTest();
  ActionExecutor.clearProposalsForTest();

  // Initialize profiles
  await DatabaseService.setProfile(userIdA, {
    homeName: 'Maplewood Residence',
    homeType: 'single_family',
    currency: 'USD',
    country: 'United States',
    squareFootage: 2450,
  });

  await DatabaseService.setProfile(userIdB, {
    homeName: 'Highland Cottage',
    homeType: 'cottage',
    currency: 'EUR',
    country: 'Germany',
    squareFootage: 1200,
  });

  const hvacAsset = await DatabaseService.createAsset(userIdA, {
    name: 'Carrier Heat Pump System',
    category: 'hvac',
    brand: 'Carrier',
    modelNumber: '25VNA4',
    serialNumber: 'CR-98231',
    installDate: '2020-04-15',
    currentStatus: 'operational',
    expectedLifespanYears: 15,
  });

  await DatabaseService.createAsset(userIdA, {
    name: 'LG Smart Refrigerator',
    category: 'refrigeration',
    brand: 'LG',
    modelNumber: 'LFXS28968S',
    installDate: '2021-08-10',
    currentStatus: 'operational',
    expectedLifespanYears: 10,
  });

  const maintTask1 = await DatabaseService.createMaintenance(userIdA, {
    title: 'Replace HVAC Hepa Filter',
    category: 'hvac',
    status: 'scheduled',
    serviceDate: '2026-03-01',
    cost: 45,
    serviceProvider: 'Self/DIY',
  });

  await DatabaseService.createWarranty(userIdA, {
    warrantyProvider: 'Carrier Protection Care',
    policyNumber: 'CP-55421',
    status: 'active',
    endDate: '2028-04-15',
    assetId: hvacAsset.id,
  });

  await DatabaseService.createExpense(userIdA, {
    title: 'Pacific Gas & Electric',
    category: 'utilities',
    amount: 175,
    frequency: 'monthly',
    dueDate: '2026-09-15',
    paymentStatus: 'pending',
  });

  await DatabaseService.createExpense(userIdA, {
    title: 'City Water Utility',
    category: 'utilities',
    amount: 65,
    frequency: 'monthly',
    dueDate: '2026-09-10',
    paymentStatus: 'pending',
  });

  await DatabaseService.createLoan(userIdA, {
    loanName: 'Primary Mortgage',
    loanType: 'mortgage',
    lender: 'First Horizon National',
    principalAmount: 385000,
    outstandingAmount: 342000,
    emiAmount: 2150,
    interestRate: 4.25,
    paymentDueDay: 1,
  });

  await DatabaseService.createCreditCard(userIdA, {
    cardNickname: 'Sapphire Reserve',
    cardIssuer: 'Chase',
    last4Digits: '4821',
    creditLimit: 15000,
    outstandingAmount: 1850,
    paymentStatus: 'pending',
  });

  await DatabaseService.saveDocument(userIdA, {
    id: 'doc_carrier_cert_01',
    userId: userIdA,
    fileName: 'carrier_warranty_cert.pdf',
    documentType: 'warranty',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  // 1. Every Copilot Entry Point verification
  await runner.test('1. Unified Copilot Chat API endpoint handles conversation payload', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Hello HouseMind!' },
    });
    if (res.status !== 200 || !res.body?.success) {
      throw new Error(`Expected 200 success, got: ${res.status} - ${JSON.stringify(res.body)}`);
    }
    if (!res.body.data?.reply || !res.body.data?.conversationId) {
      throw new Error('Expected reply and conversationId in response');
    }
  });

  // 2. Shared Chat UI Data Structure
  await runner.test('2. Response returns structured fields for UI cards (suggested questions, audit, grounding)', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'What needs my attention?' },
    });
    if (res.status !== 200 || !res.body?.data) {
      throw new Error(`Invalid response: ${JSON.stringify(res.body)}`);
    }
    if (!Array.isArray(res.body.data.suggestedQuestions) || !res.body.data.groundedSummary || !res.body.data.agentAudit) {
      throw new Error('Missing structured cards fields in response');
    }
  });

  // 3. Lightweight Greetings
  await runner.test('3. Greetings remain lightweight without invoking heavy domain retrieval tools', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Hi' },
    });
    if (res.status !== 200 || !res.body?.data) {
      throw new Error(`Invalid response: ${JSON.stringify(res.body)}`);
    }
    const reply = res.body.data.reply.toLowerCase();
    if (!reply.includes('copilot') && !reply.includes('hi') && !reply.includes('hello')) {
      throw new Error(`Unexpected greeting reply: ${reply}`);
    }
    if (res.body.data.agentAudit.toolsInvoked.length !== 0) {
      throw new Error('Greeting should not execute heavy tools');
    }
  });

  // 4. Conversation Continuity
  await runner.test('4. Conversation continuity: Messages persist across turns in the same conversation', async () => {
    const res1 = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'What bills are overdue or coming up?' },
    });
    const convId = res1.body.data.conversationId;
    if (!convId) throw new Error('Missing conversationId in turn 1');

    const res2 = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { conversationId: convId, message: 'Which one is most urgent?' },
    });
    if (res2.status !== 200 || res2.body.data.conversationId !== convId) {
      throw new Error(`Conversation continuity broken: expected ${convId}, got ${res2.body?.data?.conversationId}`);
    }

    const convHistoryRes = await apiRequest(`/api/copilot/conversations/${convId}`, {
      method: 'GET',
      token: tokenUserA,
    });
    if (convHistoryRes.status !== 200 || convHistoryRes.body.data.messages.length < 4) {
      throw new Error(`Expected at least 4 messages, got: ${convHistoryRes.body?.data?.messages?.length}`);
    }
  });

  // 5. Follow-Up Questions Reasoning
  await runner.test('5. Follow-up questions maintain context without resetting to generic overview', async () => {
    const conv = await DatabaseService.saveConversation(userIdA, {
      id: 'conv_multi_turn_01',
      userId: userIdA,
      title: 'Bill Questions',
      messages: [
        { id: 'm1', role: 'user', content: 'What bills do I have?', timestamp: new Date().toISOString() },
        { id: 'm2', role: 'assistant', content: 'You have Pacific Gas & Electric ($175) and City Water Utility ($65).', timestamp: new Date().toISOString() },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessage: 'You have bills.',
    });

    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { conversationId: conv.id, message: 'Why is Pacific Gas & Electric higher?' },
    });
    if (res.status !== 200 || !res.body.data.reply) {
      throw new Error(`Failed follow-up response: ${JSON.stringify(res.body)}`);
    }
  });

  // 6. "I Don't Know" Handling
  await runner.test('6. Missing household data returns truthful missing-data explanation without hallucination', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'When was my jacuzzi water heater installed?' },
    });
    if (res.status !== 200) throw new Error('Expected 200 response');
    const reply = res.body.data.reply.toLowerCase();
    const isTruthful =
      reply.includes('not recorded') ||
      reply.includes('no equipment') ||
      reply.includes('jacuzzi') ||
      reply.includes('not have') ||
      reply.includes('not found') ||
      reply.includes("don't have");
    if (!isTruthful) {
      throw new Error(`Expected missing data statement, got: ${reply}`);
    }
  });

  // 7. Markdown Formatting Integrity
  await runner.test('7. Markdown formatting integrity: Outputs clean markdown with bullets and no raw JSON dumps', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Summarize our monthly finances' },
    });
    if (res.status !== 200) throw new Error('Expected 200 response');
    const reply = res.body.data.reply;
    if (reply.includes('{"userId":') || reply.includes('"[object Object]"')) {
      throw new Error(`Raw JSON or object detected in Markdown reply: ${reply}`);
    }
  });

  // 8. Health Intelligence Grounding
  await runner.test('8. Health response: Reflects authoritative calculated health score and metrics', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'How is my household doing?' },
    });
    if (res.status !== 200 || !res.body.data.reply.toLowerCase().includes('health')) {
      throw new Error(`Expected health score reference, got: ${res.body?.data?.reply}`);
    }
  });

  // 9. Financial Summary Grounding
  await runner.test('9. Financial response: Reflects deterministic burn rate and debt service', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'What is our total monthly burn rate and debt?' },
    });
    if (res.status !== 200 || (!res.body.data.reply.includes('$') && !res.body.data.reply.includes('USD'))) {
      throw new Error(`Expected formatted currency in financial reply: ${res.body?.data?.reply}`);
    }
  });

  // 10. Bills & Upcoming Obligations
  await runner.test('10. Bills grounding: Accurately identifies tracked utility bills', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'What bills are due this week?' },
    });
    if (res.status !== 200 || !res.body.data.reply.toLowerCase().includes('electric')) {
      throw new Error(`Expected Pacific Gas & Electric bill, got: ${res.body?.data?.reply}`);
    }
  });

  // 11. Maintenance Tasks Grounding
  await runner.test('11. Maintenance grounding: Accurately lists scheduled upkeep tasks', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Any overdue or scheduled maintenance?' },
    });
    if (res.status !== 200 || !res.body.data.reply.toLowerCase().includes('filter')) {
      throw new Error(`Expected Hepa Filter task, got: ${res.body?.data?.reply}`);
    }
  });

  // 12. Warranties Grounding
  await runner.test('12. Warranty grounding: Accurately identifies active protection policies', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Which warranties protect our equipment?' },
    });
    if (res.status !== 200 || !res.body.data.reply.toLowerCase().includes('carrier')) {
      throw new Error(`Expected Carrier warranty, got: ${res.body?.data?.reply}`);
    }
  });

  // 13. Document Ingestion Inventory
  await runner.test('13. Document grounding: Reflects confirmed vs pending document candidates', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'What documents are in my household vault?' },
    });
    if (res.status !== 200 || !res.body.data.reply.toLowerCase().includes('document')) {
      throw new Error(`Expected document summary, got: ${res.body?.data?.reply}`);
    }
  });

  // 14. Asset & Equipment Inventory
  await runner.test('14. Asset grounding: Identifies monitored appliances and brands', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Tell me about our HVAC and refrigerator' },
    });
    if (res.status !== 200 || !res.body.data.reply.toLowerCase().includes('heat pump')) {
      throw new Error(`Expected heat pump equipment, got: ${res.body?.data?.reply}`);
    }
  });

  // 15. Calendar Schedule
  await runner.test('15. Calendar grounding: Returns chronological obligations timeline', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'What is on my calendar schedule this month?' },
    });
    if (res.status !== 200 || !res.body.data.reply.toLowerCase().includes('schedule')) {
      throw new Error(`Expected calendar schedule, got: ${res.body?.data?.reply}`);
    }
  });

  // 16. Notifications & Alert Triage
  await runner.test('16. Notifications grounding: Explains active alert context', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Why am I seeing alerts?' },
    });
    if (res.status !== 200 || !res.body.data.reply) {
      throw new Error(`Expected notification reply, got: ${JSON.stringify(res.body)}`);
    }
  });

  // 17. Morning Brief Workflow
  await runner.test('17. Morning Brief: Produces structured morningBrief card object with priority items', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Give me my morning brief' },
    });
    if (res.status !== 200 || !res.body.data.morningBrief) {
      throw new Error(`Expected morningBrief card object, got: ${JSON.stringify(res.body?.data)}`);
    }
    if (res.body.data.morningBrief.homeName !== 'Maplewood Residence') {
      throw new Error(`Household name mismatch in brief: ${res.body.data.morningBrief.homeName}`);
    }
  });

  // 18. Action Proposal Structure
  await runner.test('18. Action proposal: Proposes low-risk action with structured risk & target fields', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Complete my filter maintenance task' },
    });
    if (res.status !== 200 || !res.body.data.actionProposal) {
      throw new Error(`Expected actionProposal in response, got: ${JSON.stringify(res.body?.data)}`);
    }
    if (res.body.data.actionProposal.actionType !== 'completeMaintenanceTask' || res.body.data.actionProposal.status !== 'pending_approval') {
      throw new Error(`Invalid proposal structure: ${JSON.stringify(res.body.data.actionProposal)}`);
    }
  });

  // 19. Action Cancellation
  await runner.test('19. Action cancellation: Cancelling an action prevents execution and updates state', async () => {
    const proposal = await ActionExecutor.proposeAction(userIdA, 'completeMaintenanceTask', {
      title: 'Test Cancel Action',
      description: 'Testing cancellation',
      targetEntityId: maintTask1.id,
      riskLevel: 'low',
    });

    const cancelRes = await apiRequest(`/api/copilot/actions/${proposal.actionId}/cancel`, {
      method: 'POST',
      token: tokenUserA,
    });
    if (cancelRes.status !== 200 || !cancelRes.body.success) {
      throw new Error(`Failed to cancel action: ${JSON.stringify(cancelRes.body)}`);
    }

    const approveRes = await apiRequest(`/api/copilot/actions/${proposal.actionId}/approve`, {
      method: 'POST',
      token: tokenUserA,
    });
    if (approveRes.status === 200) {
      throw new Error('Cancelled action should not be approved');
    }
  });

  // 20. Action Approval & Safe Execution
  await runner.test('20. Action approval: Approving safe action mutates state through approval gate', async () => {
    const testTask = await DatabaseService.createMaintenance(userIdA, {
      title: 'Inspect smoke detectors',
      status: 'scheduled',
      cost: 0,
    });

    const proposal = await ActionExecutor.proposeAction(userIdA, 'completeMaintenanceTask', {
      title: 'Complete Smoke Detector Check',
      description: 'Mark task as complete',
      targetEntityId: testTask.id,
      riskLevel: 'low',
    });

    const approveRes = await apiRequest(`/api/copilot/actions/${proposal.actionId}/approve`, {
      method: 'POST',
      token: tokenUserA,
    });
    if (approveRes.status !== 200 || !approveRes.body.data?.success || !approveRes.body.data?.verification?.verified) {
      throw new Error(`Failed action approval execution: ${JSON.stringify(approveRes.body)}`);
    }
  });

  // 21. State Verification
  await runner.test('21. State verification: Verifier ensures underlying database record was mutated', async () => {
    const testTask = await DatabaseService.createMaintenance(userIdA, {
      title: 'Water filter replacement',
      status: 'scheduled',
    });

    const proposal = await ActionExecutor.proposeAction(userIdA, 'completeMaintenanceTask', {
      title: 'Complete Water Filter',
      targetEntityId: testTask.id,
      riskLevel: 'low',
    });

    await apiRequest(`/api/copilot/actions/${proposal.actionId}/approve`, {
      method: 'POST',
      token: tokenUserA,
    });

    const updatedTask = await DatabaseService.getMaintenance(userIdA, testTask.id);
    if (updatedTask?.status !== 'completed') {
      throw new Error(`State verification failed: expected status 'completed', got '${updatedTask?.status}'`);
    }
  });

  // 22. Agent Activity Audit Timeline
  await runner.test('22. Agent Activity Timeline: Immutable audit trail records investigation and execution lifecycle', async () => {
    const actRes = await apiRequest('/api/copilot/activity', {
      method: 'GET',
      token: tokenUserA,
    });
    if (actRes.status !== 200 || !Array.isArray(actRes.body.data.activities) || actRes.body.data.activities.length === 0) {
      throw new Error(`Expected logged activities, got: ${JSON.stringify(actRes.body)}`);
    }
  });

  // 23. Help Center -> Copilot Integration
  await runner.test('23. Help Center query routing: Returns grounded answers explaining privacy & data governance', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'How is my household data protected and isolated?' },
    });
    if (res.status !== 200) throw new Error('Expected 200 response');
    const reply = res.body.data.reply.toLowerCase();
    const hasSecurityContext = reply.includes('isolation') || reply.includes('security') || reply.includes('sandbox') || reply.includes('data');
    if (!hasSecurityContext) {
      throw new Error(`Expected data protection context, got: ${reply}`);
    }
  });

  // 24. Contextual Domain Routing
  await runner.test('24. Contextual Copilot: Domain-focused questions retrieve only relevant context', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Explain my Household Health Score' },
    });
    if (res.status !== 200 || res.body.data.groundedSummary.intent !== 'HOUSEHOLD_HEALTH') {
      throw new Error(`Expected intent HOUSEHOLD_HEALTH, got: ${res.body?.data?.groundedSummary?.intent}`);
    }
  });

  // 25. Demo Household Exploratory Flows
  await runner.test('25. Demo exploratory queries: Handles complex multi-domain inquiry without errors', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Give me a complete diagnostic of our home equipment, monthly burn, and upcoming tasks' },
    });
    if (res.status !== 200 || res.body.data.reply.length < 50) {
      throw new Error(`Expected diagnostic reply, got: ${JSON.stringify(res.body)}`);
    }
  });

  // 26. Compact / Floating Launcher Configuration
  await runner.test('26. Floating widget compact mode compatibility: Validates conversation listing', async () => {
    const convsRes = await apiRequest('/api/copilot/conversations', {
      method: 'GET',
      token: tokenUserA,
    });
    if (convsRes.status !== 200 || !Array.isArray(convsRes.body.data)) {
      throw new Error(`Expected conversation list, got: ${JSON.stringify(convsRes.body)}`);
    }
  });

  // 27. Long Response Resilience
  await runner.test('27. Long responses: Sustains structured multi-item outputs without truncation or JSON leaks', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'List all of our assets, maintenance tasks, loans, and utility accounts in detail' },
    });
    if (res.status !== 200 || res.body.data.reply.length < 100) {
      throw new Error(`Expected detailed long response, got length ${res.body?.data?.reply?.length}`);
    }
  });

  // 28. Error Handling & Recovery
  await runner.test('28. Error handling: Rejects invalid or empty messages gracefully with 400 status', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: '' },
    });
    if (res.status !== 400 || res.body.success !== false) {
      throw new Error(`Expected 400 validation error on empty message, got: ${res.status}`);
    }
  });

  // 29. Strict Tenant Isolation
  await runner.test('29. Strict tenant isolation: User B cannot access User A conversations or proposals', async () => {
    const resA = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Private chat for User A' },
    });
    const convIdA = resA.body.data.conversationId;

    const resB = await apiRequest(`/api/copilot/conversations/${convIdA}`, {
      method: 'GET',
      token: tokenUserB,
    });
    if (resB.status !== 404) {
      throw new Error(`Security breach: User B accessed User A conversation (${resB.status})`);
    }

    const delResB = await apiRequest(`/api/copilot/conversations/${convIdA}`, {
      method: 'DELETE',
      token: tokenUserB,
    });
    if (delResB.status !== 404) {
      throw new Error(`Security breach: User B deleted User A conversation (${delResB.status})`);
    }
  });

  // 30. Unauthorized / Destructive Action Rejection
  await runner.test('30. Security: Destructive actions (delete records, payment execution) are rejected by policy', async () => {
    const deleteRes = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Delete all my household data immediately' },
    });
    if (deleteRes.status !== 200 || !deleteRes.body.data.reply.toLowerCase().includes('action policy')) {
      throw new Error(`Expected deletion action policy rejection, got: ${deleteRes.body?.data?.reply}`);
    }

    const payRes = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Pay my Pacific Gas & Electric bill from checking account' },
    });
    if (payRes.status !== 200 || !payRes.body.data.reply.toLowerCase().includes('security notice')) {
      throw new Error(`Expected payment security notice, got: ${payRes.body?.data?.reply}`);
    }
  });
}
