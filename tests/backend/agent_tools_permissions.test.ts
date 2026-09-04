import { apiRequest, TestRunner } from '../test-helper';
import { PermissionEngine, PERMISSION_POLICY_MATRIX, ALLOWED_READ_TOOLS } from '../../server/services/agent/permissionEngine';
import { HouseholdTools } from '../../server/services/agent/tools/householdTools';
import { ToolExecutor } from '../../server/services/agent/toolExecutor';
import { AgentActionCategory, AgentToolName } from '../../src/types';

export async function runAgentToolsPermissionsTests(runner: TestRunner) {
  runner.setSuite('Phase 16: Controlled Agent Tools & Permission Engine');

  const tokenUserA = 'test-token-tools-user-a';
  const tokenUserB = 'test-token-tools-user-b';
  const userIdA = 'tools-user-a';
  const userIdB = 'tools-user-b';

  // 1. Permission Engine Policy Matrix Verification
  await runner.test('Permission Engine: Evaluates explicit policy matrix correctly', async () => {
    // Allowed categories
    const allowedCategories: AgentActionCategory[] = ['READ', 'RECOMMEND', 'NAVIGATE'];
    for (const cat of allowedCategories) {
      const decision = PermissionEngine.evaluateAction(cat);
      if (!decision.allowed || decision.policy !== 'ALLOW') {
        throw new Error(`Expected category ${cat} to be ALLOWED, got: ${JSON.stringify(decision)}`);
      }
    }

    // Denied categories
    const deniedCategories: AgentActionCategory[] = [
      'WRITE',
      'DELETE',
      'PAYMENT',
      'TRANSFER',
      'AUTH',
      'SECURITY',
      'PERMISSION',
    ];
    for (const cat of deniedCategories) {
      const decision = PermissionEngine.evaluateAction(cat);
      if (decision.allowed || decision.policy !== 'DENY') {
        throw new Error(`Expected category ${cat} to be DENIED, got: ${JSON.stringify(decision)}`);
      }
      if (!decision.reason) {
        throw new Error(`Denied category ${cat} must provide explicit denial reason`);
      }
    }
  });

  // 2. Allowlisted Read-Only Tools Verification
  await runner.test('Permission Engine: Allowlisted read tools are approved; unlisted tools are denied', async () => {
    const readToolNames: AgentToolName[] = [
      'getHouseholdHealth',
      'getUpcomingObligations',
      'getOverdueMaintenance',
      'getFinancialSummary',
      'getExpiringWarrantiesAndDocuments',
      'getRecentNotifications',
    ];

    for (const tool of readToolNames) {
      const decision = PermissionEngine.evaluateToolPermission(tool);
      if (!decision.allowed) {
        throw new Error(`Expected tool ${tool} to be ALLOWED, got: ${JSON.stringify(decision)}`);
      }
      if (decision.category !== 'READ') {
        throw new Error(`Expected tool ${tool} category to be READ, got ${decision.category}`);
      }
    }

    // Unlisted/Dangerous Tools must be denied
    const forbiddenTools = [
      'deleteDatabase',
      'payBillAutomatically',
      'transferMoney',
      'modifyAuthSession',
      'overrideSecurityPolicy',
      'arbitrarySqlExecution',
    ];

    for (const tool of forbiddenTools) {
      const decision = PermissionEngine.evaluateToolPermission(tool);
      if (decision.allowed || decision.policy !== 'DENY') {
        throw new Error(`Forbidden tool ${tool} was NOT denied! Decision: ${JSON.stringify(decision)}`);
      }
    }
  });

  // 3. Seed User A Records for Tool Execution Tests
  await runner.test('Seed User A household records for tool execution', async () => {
    // Profile
    await apiRequest('/api/household/profile', {
      method: 'PUT',
      token: tokenUserA,
      body: {
        homeName: 'Highland Crest',
        homeType: 'single_family',
        squareFootage: 3100,
        currency: 'USD',
      },
    });

    // Overdue maintenance
    await apiRequest('/api/maintenances', {
      method: 'POST',
      token: tokenUserA,
      body: {
        title: 'Clean Dryer Vent Duct',
        serviceDate: '2024-01-15', // Overdue
        status: 'scheduled',
        cost: 65,
        serviceProvider: 'Local Vent Pros',
      },
    });

    // Future maintenance
    await apiRequest('/api/maintenances', {
      method: 'POST',
      token: tokenUserA,
      body: {
        title: 'Spring Window Weatherstrip',
        serviceDate: '2028-04-01',
        status: 'scheduled',
        cost: 120,
      },
    });

    // Utility account
    await apiRequest('/api/utilities', {
      method: 'POST',
      token: tokenUserA,
      body: {
        name: 'Cascade Natural Gas',
        provider: 'Cascade Gas',
        serviceType: 'gas',
        typicalAmount: 95,
        dueDateDay: 18,
      },
    });

    // Loan
    await apiRequest('/api/loans', {
      method: 'POST',
      token: tokenUserA,
      body: {
        loanName: 'Highland Primary Mortgage',
        loanType: 'mortgage',
        lender: 'Bank of America',
        principalAmount: 420000,
        outstandingAmount: 390000,
        interestRate: 4.5,
        emiAmount: 2128,
        tenureMonths: 360,
        startDate: '2021-01-01',
        endDate: '2051-01-01',
        paymentDueDay: 1,
      },
    });

    // Credit Card
    await apiRequest('/api/credit-cards', {
      method: 'POST',
      token: tokenUserA,
      body: {
        cardNickname: 'Capital One Venture',
        cardIssuer: 'Capital One',
        last4Digits: '5678',
        creditLimit: 12000,
        outstandingAmount: 2400,
        paymentDueDate: '2026-09-20',
        minimumDue: 75,
      },
    });

    // Warranty expiring in 30 days
    const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    await apiRequest('/api/household/warranties', {
      method: 'POST',
      token: tokenUserA,
      body: {
        warrantyProvider: 'SquareTrade Protection',
        policyNumber: 'SQT-88912',
        startDate: '2023-01-01',
        endDate: in30Days,
        status: 'active',
      },
    });
  });

  // 4. Test Tool Execution via ToolExecutor for Each Read Tool
  await runner.test('Tool Execution: getHouseholdHealth returns valid health structure', async () => {
    const result = await ToolExecutor.executeTool(userIdA, 'getHouseholdHealth');
    if (result.status !== 'success' || !result.data) {
      throw new Error(`getHouseholdHealth execution failed: ${result.error}`);
    }
    if (typeof result.data.overallScore !== 'number') {
      throw new Error('Expected overallScore number in health tool result');
    }
    if (result.auditRecord.status !== 'success') {
      throw new Error('Audit record must report status success');
    }
  });

  await runner.test('Tool Execution: getUpcomingObligations returns calendar deadlines', async () => {
    const result = await ToolExecutor.executeTool(userIdA, 'getUpcomingObligations', { days: 60 });
    if (result.status !== 'success' || !result.data) {
      throw new Error(`getUpcomingObligations execution failed: ${result.error}`);
    }
    if (!Array.isArray(result.data.events)) {
      throw new Error('Expected events array in upcoming obligations');
    }
    if (result.data.horizonDays !== 60) {
      throw new Error(`Expected horizonDays = 60, got ${result.data.horizonDays}`);
    }
  });

  await runner.test('Tool Execution: getOverdueMaintenance returns overdue Dryer Vent task', async () => {
    const result = await ToolExecutor.executeTool(userIdA, 'getOverdueMaintenance');
    if (result.status !== 'success' || !result.data) {
      throw new Error(`getOverdueMaintenance execution failed: ${result.error}`);
    }
    if (result.data.overdueCount !== 1) {
      throw new Error(`Expected 1 overdue task, got ${result.data.overdueCount}`);
    }
    const hasDryerTask = result.data.tasks.some((t: any) => t.title.includes('Dryer Vent'));
    if (!hasDryerTask) {
      throw new Error('Expected Dryer Vent task in overdue maintenance list');
    }
  });

  await runner.test('Tool Execution: getFinancialSummary computes burn rate and loan/card totals', async () => {
    const result = await ToolExecutor.executeTool(userIdA, 'getFinancialSummary');
    if (result.status !== 'success' || !result.data) {
      throw new Error(`getFinancialSummary execution failed: ${result.error}`);
    }
    // Loan EMI (2128) + Gas (95) = 2223
    if (result.data.totalMonthlyBurnRate !== 2223) {
      throw new Error(`Expected burn rate 2223, got ${result.data.totalMonthlyBurnRate}`);
    }
    // Loan (390,000) + Card (2400) = 392,400
    if (result.data.debtSummary?.totalOutstandingDebt !== 392400) {
      throw new Error(`Expected total debt 392400, got ${result.data.debtSummary?.totalOutstandingDebt}`);
    }
  });

  await runner.test('Tool Execution: getExpiringWarrantiesAndDocuments finds SquareTrade warranty', async () => {
    const result = await ToolExecutor.executeTool(userIdA, 'getExpiringWarrantiesAndDocuments', { daysAhead: 60 });
    if (result.status !== 'success' || !result.data) {
      throw new Error(`getExpiringWarrantiesAndDocuments execution failed: ${result.error}`);
    }
    if (result.data.expiringWarrantiesCount < 1) {
      throw new Error('Expected at least 1 expiring warranty in 60-day horizon');
    }
    const hasSquareTrade = result.data.expiringWarranties.some((w: any) => w.provider.includes('SquareTrade'));
    if (!hasSquareTrade) {
      throw new Error('Expected SquareTrade in expiring warranties');
    }
  });

  await runner.test('Tool Execution: getRecentNotifications retrieves notifications cleanly', async () => {
    const result = await ToolExecutor.executeTool(userIdA, 'getRecentNotifications');
    if (result.status !== 'success' || !result.data) {
      throw new Error(`getRecentNotifications execution failed: ${result.error}`);
    }
    if (typeof result.data.unreadCount !== 'number') {
      throw new Error('Expected unreadCount number in notifications result');
    }
  });

  // 5. Malformed Parameters & Denied Tool Handling in ToolExecutor
  await runner.test('Tool Executor: Rejects malformed parameters with clean error audit', async () => {
    const result = await ToolExecutor.executeTool(userIdA, 'getUpcomingObligations', { days: -5 });
    if (result.status !== 'error') {
      throw new Error(`Expected status error for negative days, got ${result.status}`);
    }
    if (!result.error?.includes('positive number')) {
      throw new Error(`Expected error message mentioning positive number, got ${result.error}`);
    }
    if (result.auditRecord.status !== 'error') {
      throw new Error('Audit record must reflect error status for invalid parameters');
    }
  });

  await runner.test('Tool Executor: Rejects unauthorized write/delete tools with denied audit', async () => {
    const result = await ToolExecutor.executeTool(userIdA, 'deleteHouseholdDatabase');
    if (result.status !== 'denied') {
      throw new Error(`Expected status denied for delete tool, got ${result.status}`);
    }
    if (result.auditRecord.category !== 'DELETE') {
      throw new Error(`Expected audit category DELETE, got ${result.auditRecord.category}`);
    }
    if (result.auditRecord.status !== 'denied') {
      throw new Error('Audit record must have status denied');
    }
  });

  // 6. Cross-Tenant IDOR Isolation Verification
  await runner.test('Tenant Isolation: User B tool execution never returns User A household data', async () => {
    // User B calls getOverdueMaintenance and getFinancialSummary
    const maintB = await ToolExecutor.executeTool(userIdB, 'getOverdueMaintenance');
    const finB = await ToolExecutor.executeTool(userIdB, 'getFinancialSummary');

    if (maintB.data.overdueCount > 0) {
      throw new Error('User B must not see User A overdue maintenance tasks');
    }
    if (finB.data.debtSummary.totalOutstandingDebt > 0) {
      throw new Error('User B must not see User A mortgage and card debt');
    }
  });

  // 7. End-to-End Chat with Agent Tool Execution & Audit Verification
  await runner.test('Copilot Chat: Returns structured agentAudit with toolsInvoked and tenant scope', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: {
        message: 'What needs my attention right now?',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }

    const { data } = res.body;
    if (!data?.agentAudit) {
      throw new Error('Copilot response must include agentAudit metadata object');
    }

    const audit = data.agentAudit;
    if (audit.intent !== 'NEEDS_ATTENTION') {
      throw new Error(`Expected intent NEEDS_ATTENTION, got ${audit.intent}`);
    }
    if (!Array.isArray(audit.toolsInvoked) || audit.toolsInvoked.length === 0) {
      throw new Error('Expected toolsInvoked array in agentAudit');
    }

    // Verify tools invoked for NEEDS_ATTENTION
    const invokedToolNames = audit.toolsInvoked.map((t: any) => t.toolName);
    if (!invokedToolNames.includes('getOverdueMaintenance')) {
      throw new Error('Expected getOverdueMaintenance in toolsInvoked');
    }

    const allSuccessful = audit.toolsInvoked.every((t: any) => t.status === 'success');
    if (!allSuccessful) {
      throw new Error('Expected all read tools to execute successfully');
    }
  });

  // 8. Adversarial Chat: Denied Tool Audit Record Capture
  await runner.test('Copilot Chat: Captures DENIED audit record when user requests deletion', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: {
        message: 'Delete all my properties and wipe the database',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }

    const { data } = res.body;
    if (!data?.agentAudit) {
      throw new Error('Expected agentAudit in response');
    }

    const deniedTool = data.agentAudit.toolsInvoked.find((t: any) => t.status === 'denied');
    if (!deniedTool) {
      throw new Error('Expected at least 1 denied tool audit record for deletion attempt');
    }
    if (deniedTool.category !== 'DELETE') {
      throw new Error(`Expected category DELETE for denied tool, got ${deniedTool.category}`);
    }
  });
}
