import crypto from 'crypto';
import { DatabaseService } from '../dbService';
import { NotificationService } from '../notificationService';
import { PermissionEngine } from './permissionEngine';
import { AgentActivityService } from './agentActivityService';
import {
  AgentActionType,
  AgentActionProposal,
  AgentActionExecutionResult,
  AgentActionRiskLevel,
  AgentToolAuditRecord,
} from '../../../src/types';

// In-memory proposal storage (per-tenant isolated)
const proposalStore = new Map<string, Map<string, AgentActionProposal>>();

function getUserProposals(userId: string): Map<string, AgentActionProposal> {
  if (!proposalStore.has(userId)) {
    proposalStore.set(userId, new Map());
  }
  return proposalStore.get(userId)!;
}

export class ActionExecutor {
  /**
   * Generates a pending action proposal that requires explicit human approval.
   */
  public static async proposeAction(
    userId: string,
    actionType: AgentActionType,
    options: {
      title?: string;
      description?: string;
      targetEntityId?: string;
      targetEntityType?: string;
      targetEntityName?: string;
      parameters?: Record<string, any>;
      expectedOutcome?: string;
      riskLevel?: AgentActionRiskLevel;
    } = {}
  ): Promise<AgentActionProposal> {
    const permission = PermissionEngine.evaluateActionPermission(actionType);
    if (!permission.allowed || permission.policy !== 'ALLOW') {
      throw new Error(permission.reason || `Action type '${actionType}' is denied by system policy.`);
    }

    const actionId = `act_${crypto.randomUUID()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 minute expiry

    let defaultTitle = 'Execute Action';
    let defaultDescription = 'Perform household operation';
    let defaultOutcome = 'State will be updated';
    let riskLevel: AgentActionRiskLevel = options.riskLevel || permission.riskLevel || 'low';

    switch (actionType) {
      case 'markNotificationRead':
        defaultTitle = 'Mark Notification as Read';
        defaultDescription = `Mark notification "${options.targetEntityName || options.targetEntityId || 'alert'}" as read.`;
        defaultOutcome = 'Notification will be archived from active unread inbox.';
        break;
      case 'markAllNotificationsRead':
        defaultTitle = 'Mark All Notifications as Read';
        defaultDescription = 'Clear and mark all current active household notifications as read.';
        defaultOutcome = 'All active alerts will be marked read in notification center.';
        break;
      case 'completeMaintenanceTask':
        defaultTitle = 'Mark Maintenance Task as Completed';
        defaultDescription = `Mark maintenance task "${options.targetEntityName || options.targetEntityId || 'task'}" as completed.`;
        defaultOutcome = 'Task status updated to completed; scheduled next service date recalculated.';
        break;
      case 'dismissInsight':
        defaultTitle = 'Dismiss Intelligence Insight';
        defaultDescription = `Dismiss insight "${options.targetEntityName || options.targetEntityId || 'recommendation'}".`;
        defaultOutcome = 'Insight recommendation hidden from active dashboard feed.';
        break;
      case 'navigateTab':
        defaultTitle = `Navigate to ${options.targetEntityName || 'Tab'}`;
        defaultDescription = `Redirect to ${options.targetEntityName || 'relevant tab'}.`;
        defaultOutcome = 'Active view switched in interface.';
        break;
    }

    const proposal: AgentActionProposal = {
      actionId,
      actionType,
      title: options.title || defaultTitle,
      description: options.description || defaultDescription,
      targetEntityId: options.targetEntityId,
      targetEntityType: options.targetEntityType,
      targetEntityName: options.targetEntityName,
      parameters: options.parameters,
      riskLevel,
      expectedOutcome: options.expectedOutcome || defaultOutcome,
      status: 'pending_approval',
      createdAt: now.toISOString(),
      expiresAt,
    };

    const userMap = getUserProposals(userId);
    userMap.set(actionId, proposal);

    // Record timeline activity events
    AgentActivityService.recordActivity(userId, {
      eventType: 'ACTION_PROPOSED',
      title: `Action Proposed: ${proposal.title}`,
      description: proposal.description,
      actionType: proposal.actionType,
      actionId: proposal.actionId,
      targetDomain: proposal.targetEntityType || 'household',
      targetEntityId: proposal.targetEntityId,
      targetEntityName: proposal.targetEntityName,
      status: 'pending',
    });

    AgentActivityService.recordActivity(userId, {
      eventType: 'APPROVAL_REQUESTED',
      title: `Approval Required: ${proposal.title}`,
      description: `Pending homeowner authorization. Expected outcome: ${proposal.expectedOutcome}`,
      actionType: proposal.actionType,
      actionId: proposal.actionId,
      targetDomain: proposal.targetEntityType || 'household',
      targetEntityId: proposal.targetEntityId,
      targetEntityName: proposal.targetEntityName,
      status: 'pending',
    });

    return proposal;
  }

  /**
   * Retrieves an existing action proposal for the authenticated user
   */
  public static getProposal(userId: string, actionId: string): AgentActionProposal | null {
    const userMap = getUserProposals(userId);
    const proposal = userMap.get(actionId);
    if (!proposal) return null;

    // Check expiry
    if (new Date(proposal.expiresAt).getTime() < Date.now() && proposal.status === 'pending_approval') {
      proposal.status = 'failed';
    }

    return proposal;
  }

  /**
   * Cancels a pending action proposal
   */
  public static cancelProposal(
    userId: string,
    actionId: string
  ): { success: boolean; message: string; proposal?: AgentActionProposal } {
    const proposal = this.getProposal(userId, actionId);
    if (!proposal) {
      return { success: false, message: `Action proposal '${actionId}' not found for user.` };
    }

    proposal.status = 'cancelled';

    AgentActivityService.recordActivity(userId, {
      eventType: 'ACTION_CANCELLED',
      title: `Action Cancelled: ${proposal.title}`,
      description: `Homeowner cancelled execution of "${proposal.title}".`,
      actionType: proposal.actionType,
      actionId: proposal.actionId,
      targetDomain: proposal.targetEntityType || 'household',
      targetEntityId: proposal.targetEntityId,
      targetEntityName: proposal.targetEntityName,
      status: 'cancelled',
    });

    return {
      success: true,
      message: `Action '${proposal.title}' was cancelled by the homeowner.`,
      proposal,
    };
  }

  /**
   * Executes a human-approved safe action with strict ownership check and post-execution verification.
   */
  public static async executeApprovedAction(
    userId: string,
    actionId: string
  ): Promise<AgentActionExecutionResult> {
    const startTime = performance.now();
    const executedAt = new Date().toISOString();

    const proposal = this.getProposal(userId, actionId);
    if (!proposal) {
      return {
        actionId,
        actionType: 'navigateTab',
        status: 'failed',
        success: false,
        message: `Action proposal '${actionId}' not found for user context.`,
        executedAt,
        verification: {
          verified: false,
          checkedCondition: 'Proposal existence and tenant authorization check',
        },
      };
    }

    // Enforce approval state
    if (proposal.status !== 'pending_approval' && proposal.status !== 'approved') {
      return {
        actionId,
        actionType: proposal.actionType,
        status: 'denied',
        success: false,
        message: `Action '${actionId}' is in '${proposal.status}' state and cannot be executed.`,
        executedAt,
        verification: {
          verified: false,
          checkedCondition: 'Valid pending_approval state gate',
        },
      };
    }

    // Enforce permission engine policy gate
    const permission = PermissionEngine.evaluateActionPermission(proposal.actionType);
    if (!permission.allowed || permission.policy !== 'ALLOW') {
      proposal.status = 'denied';
      return {
        actionId,
        actionType: proposal.actionType,
        status: 'denied',
        success: false,
        message: permission.reason || 'Action denied by Permission Engine policy.',
        executedAt,
        verification: {
          verified: false,
          checkedCondition: 'Permission Engine policy authorization',
        },
      };
    }

    try {
      let verified = false;
      let checkedCondition = '';
      let postState: Record<string, any> | undefined;
      let successMessage = '';

      switch (proposal.actionType) {
        // 1. Mark Notification as Read
        case 'markNotificationRead': {
          const notifId = proposal.targetEntityId;
          if (!notifId) throw new Error('Missing target notification ID.');

          // Verify ownership: Check notification existence in user's notification list
          const preCheck = await NotificationService.getNotifications(userId);
          const exists = preCheck.notifications.some((n) => n.id === notifId);
          if (!exists) throw new Error(`Notification '${notifId}' not found in user account.`);

          // Execute trusted service
          NotificationService.markRead(userId, notifId);

          // Verification Step: Re-read notifications and verify isRead === true
          const postCheck = await NotificationService.getNotifications(userId);
          const updatedNotif = postCheck.notifications.find((n) => n.id === notifId);
          checkedCondition = `Notification '${notifId}' isRead === true`;

          if (updatedNotif && updatedNotif.isRead) {
            verified = true;
            postState = { id: updatedNotif.id, isRead: updatedNotif.isRead, readAt: updatedNotif.readAt };
            successMessage = `Notification "${updatedNotif.title}" marked as read.`;
          } else {
            verified = false;
          }
          break;
        }

        // 2. Mark All Notifications as Read
        case 'markAllNotificationsRead': {
          const count = await NotificationService.markAllRead(userId);
          const postCheck = await NotificationService.getNotifications(userId);
          checkedCondition = 'Unread notifications count === 0';

          if (postCheck.unreadCount === 0) {
            verified = true;
            postState = { unreadCount: 0, clearedCount: count };
            successMessage = `Cleared ${count} active notification(s). Inbox is now up to date.`;
          } else {
            verified = false;
          }
          break;
        }

        // 3. Complete Maintenance Task
        case 'completeMaintenanceTask': {
          const taskId = proposal.targetEntityId;
          if (!taskId) throw new Error('Missing target maintenance task ID.');

          // Verify ownership: Re-read task from database
          const existingTask = await DatabaseService.getMaintenance(userId, taskId);
          if (!existingTask) throw new Error(`Maintenance task '${taskId}' not found for user.`);

          // Execute trusted service
          const completedAt = new Date().toISOString().split('T')[0];
          await DatabaseService.updateMaintenance(userId, taskId, {
            status: 'completed',
            completedDate: completedAt,
          });

          // Verification Step: Re-read task and verify status === 'completed'
          const updatedTask = await DatabaseService.getMaintenance(userId, taskId);
          checkedCondition = `MaintenanceTask '${taskId}' status === 'completed'`;

          if (updatedTask && updatedTask.status === 'completed') {
            verified = true;
            postState = { id: updatedTask.id, title: updatedTask.title, status: updatedTask.status, completedDate: updatedTask.completedDate };
            successMessage = `Maintenance task "${updatedTask.title}" has been completed.`;
          } else {
            verified = false;
          }
          break;
        }

        // 4. Dismiss Insight
        case 'dismissInsight': {
          const insightId = proposal.targetEntityId;
          if (!insightId) throw new Error('Missing target insight ID.');

          const existingInsight = await DatabaseService.getInsight(userId, insightId);
          if (!existingInsight) throw new Error(`Insight '${insightId}' not found for user.`);

          await DatabaseService.updateInsight(userId, insightId, { status: 'dismissed' });

          const updatedInsight = await DatabaseService.getInsight(userId, insightId);
          checkedCondition = `Insight '${insightId}' status === 'dismissed'`;

          if (updatedInsight && updatedInsight.status === 'dismissed') {
            verified = true;
            postState = { id: updatedInsight.id, status: updatedInsight.status };
            successMessage = `Insight "${updatedInsight.title}" dismissed from active feed.`;
          } else {
            verified = false;
          }
          break;
        }

        // 5. Navigate Tab (Client routing)
        case 'navigateTab': {
          verified = true;
          checkedCondition = 'Navigation target confirmed';
          postState = { targetTab: proposal.parameters?.tab || 'dashboard' };
          successMessage = `Switched view to ${proposal.parameters?.tab || 'dashboard'}.`;
          break;
        }

        default:
          throw new Error(`Unsupported action type '${proposal.actionType}'.`);
      }

      const executionDurationMs = Math.round(performance.now() - startTime);
      proposal.status = verified ? 'executed' : 'failed';

      // Record timeline activity events
      AgentActivityService.recordActivity(userId, {
        eventType: 'ACTION_APPROVED',
        title: `Action Approved: ${proposal.title}`,
        description: `Homeowner authorized execution of "${proposal.title}".`,
        actionType: proposal.actionType,
        actionId: proposal.actionId,
        targetDomain: proposal.targetEntityType || 'household',
        targetEntityId: proposal.targetEntityId,
        targetEntityName: proposal.targetEntityName,
        status: 'info',
      });

      AgentActivityService.recordActivity(userId, {
        eventType: 'ACTION_EXECUTED',
        title: `Action Executed: ${proposal.title}`,
        description: successMessage || proposal.description,
        actionType: proposal.actionType,
        actionId: proposal.actionId,
        targetDomain: proposal.targetEntityType || 'household',
        targetEntityId: proposal.targetEntityId,
        targetEntityName: proposal.targetEntityName,
        status: verified ? 'success' : 'error',
      });

      AgentActivityService.recordActivity(userId, {
        eventType: verified ? 'VERIFICATION_PASSED' : 'VERIFICATION_FAILED',
        title: verified ? 'Verification Succeeded' : 'Verification Failed',
        description: checkedCondition,
        actionType: proposal.actionType,
        actionId: proposal.actionId,
        targetDomain: proposal.targetEntityType || 'household',
        targetEntityId: proposal.targetEntityId,
        targetEntityName: proposal.targetEntityName,
        status: verified ? 'success' : 'error',
        verification: {
          verified,
          checkedCondition,
        },
      });

      const auditRecord: AgentToolAuditRecord = {
        toolName: proposal.actionType,
        category: 'SAFE_ACTION',
        status: verified ? 'success' : 'error',
        executionTimeMs: executionDurationMs,
        paramsSummary: {
          actionId,
          targetEntityId: proposal.targetEntityId || 'N/A',
          verified,
        },
      };

      return {
        actionId,
        actionType: proposal.actionType,
        status: verified ? 'executed' : 'failed',
        success: verified,
        message: successMessage || (verified ? 'Action completed and verified.' : 'Execution failed verification.'),
        executedAt,
        verification: {
          verified,
          verifiedAt: executedAt,
          checkedCondition,
          postState,
        },
        auditRecord,
      };
    } catch (err: any) {
      proposal.status = 'failed';
      const executionDurationMs = Math.round(performance.now() - startTime);

      AgentActivityService.recordActivity(userId, {
        eventType: 'VERIFICATION_FAILED',
        title: `Execution Failed: ${proposal.title}`,
        description: err?.message || 'Error occurred during action dispatch.',
        actionType: proposal.actionType,
        actionId: proposal.actionId,
        targetDomain: proposal.targetEntityType || 'household',
        targetEntityId: proposal.targetEntityId,
        targetEntityName: proposal.targetEntityName,
        status: 'error',
        verification: {
          verified: false,
          checkedCondition: 'Execution error occurred during trusted service dispatch',
        },
      });

      return {
        actionId,
        actionType: proposal.actionType,
        status: 'failed',
        success: false,
        message: err?.message || 'Failed to execute approved action.',
        executedAt,
        verification: {
          verified: false,
          checkedCondition: 'Execution error occurred during trusted service dispatch',
        },
        auditRecord: {
          toolName: proposal.actionType,
          category: 'SAFE_ACTION',
          status: 'error',
          executionTimeMs: executionDurationMs,
          denialReason: err?.message || String(err),
        },
      };
    }
  }

  /**
   * Lists all active action proposals pending approval for the user
   */
  public static listPendingProposals(userId: string): AgentActionProposal[] {
    const userMap = getUserProposals(userId);
    const now = Date.now();
    const results: AgentActionProposal[] = [];

    for (const proposal of userMap.values()) {
      if (proposal.status === 'pending_approval') {
        if (new Date(proposal.expiresAt).getTime() >= now) {
          results.push(proposal);
        } else {
          proposal.status = 'failed';
        }
      }
    }

    return results;
  }

  /**
   * Test helper to clear proposals
   */
  public static clearProposalsForTest(userId?: string): void {
    if (userId) {
      proposalStore.delete(userId);
    } else {
      proposalStore.clear();
    }
  }
}
