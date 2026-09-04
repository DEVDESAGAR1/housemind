import { apiRequest, TestRunner } from '../test-helper';
import { PermissionEngine } from '../../server/services/agent/permissionEngine';
import { ActionExecutor } from '../../server/services/agent/actionExecutor';
import { HouseholdAgentOrchestrator } from '../../server/services/agent/householdAgentOrchestrator';
import { DatabaseService } from '../../server/services/dbService';
import { NotificationService } from '../../server/services/notificationService';
import { AgentActionType } from '../../src/types';

export async function runAgentActionApprovalTests(runner: TestRunner) {
  runner.setSuite('Phase 18: Human Approval + Safe Action Execution');

  const tokenUserA = 'test-token-action-user-a';
  const tokenUserB = 'test-token-action-user-b';
  const userIdA = 'action-user-a';
  const userIdB = 'action-user-b';

  // 1. Permission Engine & Safe Action Allowlist
  await runner.test('Permission Engine: Safe action category requires explicit human approval', async () => {
    const decision = PermissionEngine.evaluateAction('SAFE_ACTION');
    if (!decision.allowed || decision.policy !== 'ALLOW') {
      throw new Error(`Expected SAFE_ACTION category to be ALLOW, got: ${JSON.stringify(decision)}`);
    }
    if (!decision.requiresApproval) {
      throw new Error('SAFE_ACTION must require human approval');
    }
  });

  await runner.test('Permission Engine: All safe action types in allowlist are valid and require approval', async () => {
    const safeActions: AgentActionType[] = [
      'markNotificationRead',
      'markAllNotificationsRead',
      'completeMaintenanceTask',
      'dismissInsight',
      'navigateTab',
    ];

    for (const action of safeActions) {
      const isAllowed = PermissionEngine.isActionAllowed(action);
      if (!isAllowed) {
        throw new Error(`Expected safe action '${action}' to be allowed in allowlist`);
      }

      const decision = PermissionEngine.evaluateActionPermission(action);
      if (!decision.allowed || !decision.requiresApproval) {
        throw new Error(`Expected action '${action}' to be allowed with requiresApproval=true`);
      }
    }
  });

  await runner.test('Permission Engine: Non-allowlisted or destructive actions are denied', async () => {
    const unlistedAction = 'transferMoney' as AgentActionType;
    const isAllowed = PermissionEngine.isActionAllowed(unlistedAction);
    if (isAllowed) {
      throw new Error('Expected arbitrary action to be disallowed');
    }

    const decision = PermissionEngine.evaluateActionPermission(unlistedAction);
    if (decision.allowed || decision.policy !== 'DENY') {
      throw new Error('Expected unlisted action to have policy DENY');
    }
  });

  // 2. Proposal Lifecycle: Propose, Retrieve, and Cancel
  await runner.test('ActionExecutor: Creates proposal in pending_approval state with expiry', async () => {
    const proposal = await ActionExecutor.proposeAction(userIdA, 'navigateTab', {
      title: 'Navigate to Maintenance',
      targetEntityName: 'maintenance',
      parameters: { tab: 'maintenance' },
      expectedOutcome: 'Interface navigates to Maintenance tab',
    });

    if (!proposal.actionId || !proposal.actionId.startsWith('act_')) {
      throw new Error(`Expected actionId starting with act_, got: ${proposal.actionId}`);
    }
    if (proposal.status !== 'pending_approval') {
      throw new Error(`Expected status pending_approval, got: ${proposal.status}`);
    }
    if (!proposal.expiresAt) {
      throw new Error('Proposal must have an expiresAt timestamp');
    }

    const retrieved = ActionExecutor.getProposal(userIdA, proposal.actionId);
    if (!retrieved || retrieved.actionId !== proposal.actionId) {
      throw new Error('Failed to retrieve proposed action');
    }
  });

  await runner.test('ActionExecutor: Cross-user tenant isolation on proposals', async () => {
    const proposal = await ActionExecutor.proposeAction(userIdA, 'dismissInsight', {
      targetEntityId: 'insight-123',
    });

    // User B should not see or execute User A's proposal
    const userBProposal = ActionExecutor.getProposal(userIdB, proposal.actionId);
    if (userBProposal !== null) {
      throw new Error('Tenant isolation failure: User B retrieved User A proposal');
    }

    const execResult = await ActionExecutor.executeApprovedAction(userIdB, proposal.actionId);
    if (execResult.success || execResult.status !== 'failed') {
      throw new Error('Tenant isolation failure: User B was able to execute User A proposal');
    }
  });

  await runner.test('ActionExecutor: Proposal cancellation transitions status and prevents execution', async () => {
    const proposal = await ActionExecutor.proposeAction(userIdA, 'navigateTab', {
      targetEntityName: 'finances',
    });

    const cancelRes = ActionExecutor.cancelProposal(userIdA, proposal.actionId);
    if (!cancelRes.success || cancelRes.proposal?.status !== 'cancelled') {
      throw new Error('Failed to cancel action proposal');
    }

    // Attempting execution on cancelled proposal should be rejected
    const execResult = await ActionExecutor.executeApprovedAction(userIdA, proposal.actionId);
    if (execResult.success || execResult.status !== 'denied') {
      throw new Error(`Cancelled action should not execute, got status: ${execResult.status}`);
    }
  });

  // 3. Approved Execution & Verification: Notifications
  await runner.test('ActionExecutor: markNotificationRead executes and verifies post-state', async () => {
    // Seed an expense due today to trigger an unread notification for User A
    await DatabaseService.createExpense(userIdA, {
      name: 'HVAC Seasonal Filter Payment',
      amount: 45,
      category: 'maintenance',
      frequency: 'quarterly',
      dueDate: new Date().toISOString().split('T')[0],
      paymentStatus: 'pending',
    });

    // Pre-check
    const preCheck = await NotificationService.getNotifications(userIdA);
    const targetNotif = preCheck.notifications[0];
    if (!targetNotif || targetNotif.isRead) {
      throw new Error('Pre-check failed: notification should exist and be unread');
    }

    // Propose action
    const proposal = await ActionExecutor.proposeAction(userIdA, 'markNotificationRead', {
      targetEntityId: targetNotif.id,
      targetEntityName: targetNotif.title,
    });

    // Execute approved action
    const result = await ActionExecutor.executeApprovedAction(userIdA, proposal.actionId);
    if (!result.success || result.status !== 'executed') {
      throw new Error(`Execution failed: ${result.message}`);
    }
    if (!result.verification.verified) {
      throw new Error('State verification failed for markNotificationRead');
    }

    // Post-check verification in notification store
    const postCheck = await NotificationService.getNotifications(userIdA);
    const updatedNotif = postCheck.notifications.find((n) => n.id === targetNotif.id);
    if (!updatedNotif || !updatedNotif.isRead) {
      throw new Error('Post-check failed: notification was not marked as read');
    }
    const audit = result.audit || result.auditRecord;
    if (!audit || audit.status !== 'success') {
      throw new Error('Audit record missing or not marked success');
    }
  });

  // 4. Approved Execution & Verification: Maintenance Task
  await runner.test('ActionExecutor: completeMaintenanceTask executes, verifies status, and updates completedDate', async () => {
    // Seed a maintenance task for User A
    const createdTask = await DatabaseService.createMaintenance(userIdA, {
      title: 'Water Heater Flush',
      frequency: 'annual',
      scheduledDate: new Date().toISOString(),
      priority: 'medium',
      category: 'plumbing',
      status: 'pending',
    });

    // Propose completion
    const proposal = await ActionExecutor.proposeAction(userIdA, 'completeMaintenanceTask', {
      targetEntityId: createdTask.id,
      targetEntityName: createdTask.title,
      targetEntityType: 'maintenance_task',
    });

    // Execute with approval
    const execResult = await ActionExecutor.executeApprovedAction(userIdA, proposal.actionId);
    if (!execResult.success || execResult.status !== 'executed') {
      throw new Error(`Execution failed: ${execResult.message}`);
    }
    if (!execResult.verification.verified) {
      throw new Error('Post-execution verification failed for completeMaintenanceTask');
    }

    // Verify entity in DatabaseService
    const updatedTask = await DatabaseService.getMaintenance(userIdA, createdTask.id);
    if (!updatedTask || updatedTask.status !== 'completed') {
      throw new Error(`Task status in database should be 'completed', got: ${updatedTask?.status}`);
    }
    if (!updatedTask.lastCompletedDate && !updatedTask.completedDate) {
      throw new Error('completedDate was not set on completed maintenance task');
    }
  });

  // 5. Target Entity Ownership & Security Verification
  await runner.test('ActionExecutor: Rejects execution if target entity belongs to another tenant', async () => {
    // Create maintenance task for User B
    const userBTask = await DatabaseService.createMaintenance(userIdB, {
      title: 'User B Private Roof Inspection',
      frequency: 'semi-annual',
      scheduledDate: new Date().toISOString(),
      priority: 'high',
      status: 'pending',
    });

    // User A tries to propose/execute completion of User B's task
    const proposal = await ActionExecutor.proposeAction(userIdA, 'completeMaintenanceTask', {
      targetEntityId: userBTask.id,
      targetEntityName: userBTask.title,
    });

    const execResult = await ActionExecutor.executeApprovedAction(userIdA, proposal.actionId);
    if (execResult.success || execResult.status !== 'failed') {
      throw new Error('Security failure: User A executed action on User B task');
    }
    if (!execResult.message.includes('not found')) {
      throw new Error(`Expected not found / ownership failure, got: ${execResult.message}`);
    }
  });

  // 6. Agent Orchestrator Intent Handling & Approval Proposal Flow
  await runner.test('HouseholdAgentOrchestrator: Generates approval proposal for actionable intent without auto-executing', async () => {
    // Seed an unread notification via expense
    await DatabaseService.createExpense(userIdA, {
      name: 'Quarterly Water Utility Bill',
      amount: 60,
      category: 'utilities',
      frequency: 'quarterly',
      dueDate: new Date().toISOString().split('T')[0],
      paymentStatus: 'pending',
    });

    // Chat query requesting action
    const chatRes = await HouseholdAgentOrchestrator.handleChat(
      userIdA,
      'Can you please mark my notifications as read?'
    );

    if (!chatRes.actionProposal) {
      throw new Error('Expected actionProposal in chat response');
    }
    if (chatRes.actionProposal.status !== 'pending_approval') {
      throw new Error(`Expected pending_approval, got: ${chatRes.actionProposal.status}`);
    }
    if (!chatRes.reply.toLowerCase().includes('approval') && !chatRes.reply.toLowerCase().includes('approve') && !chatRes.reply.toLowerCase().includes('confirm') && !chatRes.reply.toLowerCase().includes('permission')) {
      throw new Error('Reply should explain that human approval is required');
    }

    // Verify the action was NOT auto-executed
    const notifs = await NotificationService.getNotifications(userIdA);
    const unread = notifs.notifications.some((n) => !n.isRead);
    if (!unread) {
      throw new Error('Action was auto-executed before approval! Autonomous mutation policy violated.');
    }
  });

  await runner.test('HouseholdAgentOrchestrator: Blocks autonomous payments/destructive actions with security explanation', async () => {
    const paymentQueries = [
      'Pay my electric bill of $140 immediately',
      'Transfer $500 to my savings account',
      'Delete my primary property record and all its data',
    ];

    for (const query of paymentQueries) {
      const chatRes = await HouseholdAgentOrchestrator.handleChat(userIdA, query);
      if (chatRes.actionProposal && chatRes.actionProposal.status === 'approved') {
        throw new Error(`Security violation: High-risk action was approved for: ${query}`);
      }
      const replyLower = chatRes.reply.toLowerCase();
      const mentionsPolicy =
        replyLower.includes('policy') ||
        replyLower.includes('manual') ||
        replyLower.includes('direct') ||
        replyLower.includes('payment') ||
        replyLower.includes('delete') ||
        replyLower.includes('safe') ||
        replyLower.includes('cannot');

      if (!mentionsPolicy) {
        throw new Error(`Expected security explanation in response for query: "${query}", got: ${chatRes.reply}`);
      }
    }
  });

  // 7. REST API Endpoints: Proposal, Approval, Cancellation
  await runner.test('REST API: GET /api/copilot/actions/:actionId retrieves proposal', async () => {
    const proposal = await ActionExecutor.proposeAction(userIdA, 'navigateTab', {
      title: 'Navigate to Documents',
      targetEntityName: 'documents',
      parameters: { tab: 'documents' },
    });

    const res = await apiRequest(`/api/copilot/actions/${proposal.actionId}`, {
      method: 'GET',
      token: tokenUserA,
    });

    if (res.status !== 200 || !res.body?.success) {
      throw new Error(`GET action endpoint failed: ${JSON.stringify(res.body)}`);
    }
    if (res.body.data.actionId !== proposal.actionId) {
      throw new Error('Mismatched actionId in API response');
    }
  });

  await runner.test('REST API: POST /api/copilot/actions/:actionId/approve executes and returns verification', async () => {
    await DatabaseService.createExpense(userIdA, {
      name: 'Microwave Extended Warranty Renewal',
      amount: 30,
      category: 'services',
      frequency: 'annual',
      dueDate: new Date().toISOString().split('T')[0],
      paymentStatus: 'pending',
    });

    const preNotifs = await NotificationService.getNotifications(userIdA);
    const targetNotif = preNotifs.notifications[0];

    const proposal = await ActionExecutor.proposeAction(userIdA, 'markNotificationRead', {
      targetEntityId: targetNotif.id,
      targetEntityName: targetNotif.title,
    });

    const approveRes = await apiRequest(`/api/copilot/actions/${proposal.actionId}/approve`, {
      method: 'POST',
      token: tokenUserA,
    });

    if (approveRes.status !== 200 || !approveRes.body?.success) {
      throw new Error(`Approval API failed: ${JSON.stringify(approveRes.body)}`);
    }
    if (!approveRes.body.data.verification?.verified) {
      throw new Error('Approval API did not return verified state verification');
    }
  });

  await runner.test('REST API: POST /api/copilot/actions/:actionId/cancel cancels proposal', async () => {
    const proposal = await ActionExecutor.proposeAction(userIdA, 'dismissInsight', {
      targetEntityId: 'ins-cancel-test',
    });

    const cancelRes = await apiRequest(`/api/copilot/actions/${proposal.actionId}/cancel`, {
      method: 'POST',
      token: tokenUserA,
    });

    if (cancelRes.status !== 200 || !cancelRes.body?.success) {
      throw new Error(`Cancel API failed: ${JSON.stringify(cancelRes.body)}`);
    }
    if (cancelRes.body.data.proposal.status !== 'cancelled') {
      throw new Error(`Expected cancelled status, got: ${cancelRes.body.data.proposal.status}`);
    }
  });

  await runner.test('REST API: Returns 404 for non-existent action proposal', async () => {
    const res = await apiRequest('/api/copilot/actions/act_non_existent_id', {
      method: 'GET',
      token: tokenUserA,
    });

    if (res.status !== 404) {
      throw new Error(`Expected 404 for non-existent actionId, got: ${res.status}`);
    }
  });
}
