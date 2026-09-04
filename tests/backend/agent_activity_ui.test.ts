import { apiRequest, TestRunner } from '../test-helper';
import { AgentActivityService } from '../../server/services/agent/agentActivityService';
import { ActionExecutor } from '../../server/services/agent/actionExecutor';
import { HouseholdAgentOrchestrator } from '../../server/services/agent/householdAgentOrchestrator';
import { DatabaseService } from '../../server/services/dbService';
import { NotificationService } from '../../server/services/notificationService';

export async function runAgentActivityUITests(runner: TestRunner) {
  runner.setSuite('Phase 19: Agent Activity Timeline + Copilot UI Polish');

  const tokenUserA = 'test-token-activity-user-a';
  const tokenUserB = 'test-token-activity-user-b';
  const userIdA = 'activity-user-a';
  const userIdB = 'activity-user-b';

  // Clear previous test activities
  AgentActivityService.clearActivityForTest();

  // 1. Conversational Greeting Fast-Path
  await runner.test('Copilot Greeting: Simple greetings return instant conversational reply without full DB dump', async () => {
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'thanks'];

    for (const g of greetings) {
      const res = await apiRequest('/api/copilot/chat', {
        method: 'POST',
        token: tokenUserA,
        body: { message: g },
      });

      if (res.status !== 200 || !res.body?.success) {
        throw new Error(`Failed greeting request for "${g}": ${JSON.stringify(res.body)}`);
      }

      const reply = res.body.data.reply || '';
      if (!reply.includes('Hi! 👋') && !reply.includes('Copilot')) {
        throw new Error(`Expected clean greeting response for "${g}", got: ${reply}`);
      }

      // Verify that full data retrieval wasn't triggered
      if (res.body.data.groundedSummary?.expensesCount > 0) {
        throw new Error('Greeting should not fetch full expenses list');
      }
    }
  });

  // 2. Empty Activity State
  await runner.test('Agent Activity: Returns empty list cleanly on fresh account', async () => {
    const res = await apiRequest('/api/copilot/activity', {
      method: 'GET',
      token: tokenUserA,
    });

    if (res.status !== 200 || !res.body?.success) {
      throw new Error(`Failed to retrieve activity: ${JSON.stringify(res.body)}`);
    }

    if (!Array.isArray(res.body.data.activities) || res.body.data.total !== 0) {
      throw new Error(`Expected 0 initial activities, got: ${res.body.data.total}`);
    }
  });

  // 3. Action Proposal Records Activity Timeline Event
  await runner.test('Agent Activity: Action proposal automatically logs ACTION_PROPOSED & APPROVAL_REQUESTED', async () => {
    const proposal = await ActionExecutor.proposeAction(userIdA, 'navigateTab', {
      title: 'Navigate to Maintenance Tab',
      targetEntityName: 'maintenance',
      parameters: { tab: 'maintenance' },
    });

    const res = await apiRequest('/api/copilot/activity', {
      method: 'GET',
      token: tokenUserA,
    });

    if (res.status !== 200 || !res.body?.success) {
      throw new Error(`Failed to retrieve activity: ${JSON.stringify(res.body)}`);
    }

    const { activities } = res.body.data;
    const proposedEvent = activities.find((a: any) => a.eventType === 'ACTION_PROPOSED');
    const approvalReqEvent = activities.find((a: any) => a.eventType === 'APPROVAL_REQUESTED');

    if (!proposedEvent || !approvalReqEvent) {
      throw new Error('Expected ACTION_PROPOSED and APPROVAL_REQUESTED events in activity timeline');
    }

    if (proposedEvent.actionId !== proposal.actionId) {
      throw new Error('Mismatched actionId in activity event');
    }
  });

  // 4. Action Cancellation Records Activity Event
  await runner.test('Agent Activity: Action cancellation logs ACTION_CANCELLED event', async () => {
    const proposal = await ActionExecutor.proposeAction(userIdA, 'dismissInsight', {
      targetEntityId: 'ins-test-cancel',
    });

    await ActionExecutor.cancelProposal(userIdA, proposal.actionId);

    const res = await apiRequest('/api/copilot/activity', {
      method: 'GET',
      token: tokenUserA,
    });

    const { activities } = res.body.data;
    const cancelEvent = activities.find((a: any) => a.eventType === 'ACTION_CANCELLED' && a.actionId === proposal.actionId);

    if (!cancelEvent || cancelEvent.status !== 'cancelled') {
      throw new Error('Expected ACTION_CANCELLED event in activity timeline');
    }
  });

  // 5. Approved Execution & Verification Succeeded Activity
  await runner.test('Agent Activity: Approved execution logs ACTION_APPROVED, ACTION_EXECUTED & VERIFICATION_PASSED', async () => {
    // Seed maintenance task
    const task = await DatabaseService.createMaintenance(userIdA, {
      title: 'Smoke Detector Battery Test',
      frequency: 'semi-annual',
      scheduledDate: new Date().toISOString(),
      status: 'pending',
    });

    const proposal = await ActionExecutor.proposeAction(userIdA, 'completeMaintenanceTask', {
      targetEntityId: task.id,
      targetEntityName: task.title,
    });

    const execRes = await ActionExecutor.executeApprovedAction(userIdA, proposal.actionId);
    if (!execRes.success) {
      throw new Error(`Execution failed: ${execRes.message}`);
    }

    const res = await apiRequest('/api/copilot/activity', {
      method: 'GET',
      token: tokenUserA,
    });

    const { activities } = res.body.data;
    const approvedEvent = activities.find((a: any) => a.eventType === 'ACTION_APPROVED' && a.actionId === proposal.actionId);
    const executedEvent = activities.find((a: any) => a.eventType === 'ACTION_EXECUTED' && a.actionId === proposal.actionId);
    const verifiedEvent = activities.find((a: any) => a.eventType === 'VERIFICATION_PASSED' && a.actionId === proposal.actionId);

    if (!approvedEvent || !executedEvent || !verifiedEvent) {
      throw new Error('Expected ACTION_APPROVED, ACTION_EXECUTED, and VERIFICATION_PASSED in timeline');
    }

    if (!verifiedEvent.verification?.verified) {
      throw new Error('Verification event must have verification.verified === true');
    }
  });

  // 6. Security Policy Denials Logged in Activity
  await runner.test('Agent Activity: Forbidden payment/deletion queries log ACTION_DENIED event', async () => {
    await HouseholdAgentOrchestrator.handleChat(userIdA, 'Delete my entire property record now');
    await HouseholdAgentOrchestrator.handleChat(userIdA, 'Transfer $500 to my bank account');

    const res = await apiRequest('/api/copilot/activity', {
      method: 'GET',
      token: tokenUserA,
    });

    const { activities } = res.body.data;
    const deniedEvents = activities.filter((a: any) => a.eventType === 'ACTION_DENIED');

    if (deniedEvents.length < 2) {
      throw new Error(`Expected at least 2 ACTION_DENIED events, got ${deniedEvents.length}`);
    }
  });

  // 7. Tenant Isolation for Agent Activity
  await runner.test('Agent Activity: Strict tenant isolation (User B cannot see User A activity)', async () => {
    // User A has multiple activities logged above
    const resA = await apiRequest('/api/copilot/activity', {
      method: 'GET',
      token: tokenUserA,
    });

    // User B should have 0 activities
    const resB = await apiRequest('/api/copilot/activity', {
      method: 'GET',
      token: tokenUserB,
    });

    if (resA.body.data.total === 0) {
      throw new Error('User A should have activity records');
    }

    if (resB.body.data.total !== 0) {
      throw new Error(`Tenant leak: User B sees ${resB.body.data.total} records from User A!`);
    }
  });

  // 8. Bounded Pagination / Limits
  await runner.test('Agent Activity: Honors limit and offset query parameters', async () => {
    const resLimit = await apiRequest('/api/copilot/activity?limit=2&offset=0', {
      method: 'GET',
      token: tokenUserA,
    });

    if (resLimit.status !== 200 || resLimit.body.data.activities.length > 2) {
      throw new Error(`Expected at most 2 items when limit=2, got: ${resLimit.body.data.activities.length}`);
    }

    if (resLimit.body.data.limit !== 2) {
      throw new Error(`Expected limit=2 in response metadata, got: ${resLimit.body.data.limit}`);
    }
  });

  // 9. Structured Response & Morning Brief Extraction
  await runner.test('Copilot Response: Morning Brief queries return structured morningBrief with priority items', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'Give me my morning brief' },
    });

    if (res.status !== 200 || !res.body?.data) {
      throw new Error(`Morning brief chat query failed: ${JSON.stringify(res.body)}`);
    }

    const { morningBrief, reply } = res.body.data;
    if (!morningBrief) {
      throw new Error('Expected structured morningBrief in chat response');
    }

    if (!Array.isArray(morningBrief.itemsNeedingAttention)) {
      throw new Error('Expected itemsNeedingAttention array in morningBrief');
    }

    if (!reply || reply.length < 10) {
      throw new Error('Expected non-empty synthesized reply in chat response');
    }
  });
}
