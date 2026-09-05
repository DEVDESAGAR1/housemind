import { AgentActionCategory, AgentToolName, AgentActionType, AgentActionRiskLevel } from '../../../src/types';

export interface PermissionDecision {
  allowed: boolean;
  category: AgentActionCategory;
  toolName?: string;
  actionType?: AgentActionType | string;
  requiresApproval?: boolean;
  riskLevel?: AgentActionRiskLevel;
  reason?: string;
  policy: 'ALLOW' | 'DENY';
}

/**
 * Deterministic Permission Policy Matrix
 * Explicitly governs allowable tool and action operations.
 */
export const PERMISSION_POLICY_MATRIX: Record<
  AgentActionCategory,
  { allowed: boolean; requiresApproval?: boolean; reason?: string }
> = {
  READ: { allowed: true, requiresApproval: false },
  RECOMMEND: { allowed: true, requiresApproval: false },
  NAVIGATE: { allowed: true, requiresApproval: false },
  SAFE_ACTION: { allowed: true, requiresApproval: true },
  WRITE: { allowed: false, reason: 'Direct unapproved data mutations are restricted.' },
  DELETE: { allowed: false, reason: 'Autonomous record deletions are permanently forbidden.' },
  PAYMENT: { allowed: false, reason: 'Autonomous payment execution is strictly forbidden. Use manual UI.' },
  TRANSFER: { allowed: false, reason: 'Fund transfers are strictly forbidden. Use banking interface.' },
  AUTH: { allowed: false, reason: 'Authentication and session state cannot be altered by agents.' },
  SECURITY: { allowed: false, reason: 'Security configurations and role adjustments are restricted.' },
  PERMISSION: { allowed: false, reason: 'Permission engine policies are immutable at runtime.' },
};

/**
 * Allowlisted Read-Only Agent Tools
 */
export const ALLOWED_READ_TOOLS: Record<AgentToolName, AgentActionCategory> = {
  getHouseholdHealth: 'READ',
  getUpcomingObligations: 'READ',
  getOverdueMaintenance: 'READ',
  getFinancialSummary: 'READ',
  getExpiringWarrantiesAndDocuments: 'READ',
  getRecentNotifications: 'READ',
  getHouseholdIssues: 'READ',
  getCrossDomainInsights: 'READ',
  getHouseholdTimeline: 'READ',
  getUnifiedHouseholdActions: 'READ',
};

/**
 * Allowlisted Executable Safe Actions (Phase 18)
 * Every safe action strictly requires deterministic human approval before execution.
 */
export const ALLOWED_SAFE_ACTIONS: Record<
  AgentActionType,
  { category: AgentActionCategory; requiresApproval: boolean; riskLevel: AgentActionRiskLevel; description: string }
> = {
  markNotificationRead: {
    category: 'SAFE_ACTION',
    requiresApproval: true,
    riskLevel: 'low',
    description: 'Marks an unread notification alert as read',
  },
  markAllNotificationsRead: {
    category: 'SAFE_ACTION',
    requiresApproval: true,
    riskLevel: 'low',
    description: 'Marks all current unread notifications as read',
  },
  completeMaintenanceTask: {
    category: 'SAFE_ACTION',
    requiresApproval: true,
    riskLevel: 'low',
    description: 'Marks a scheduled maintenance task as completed',
  },
  dismissInsight: {
    category: 'SAFE_ACTION',
    requiresApproval: true,
    riskLevel: 'low',
    description: 'Dismisses an intelligence insight recommendation',
  },
  navigateTab: {
    category: 'SAFE_ACTION',
    requiresApproval: true,
    riskLevel: 'low',
    description: 'Navigates the user to a specific household view tab',
  },
};

export class PermissionEngine {
  /**
   * Evaluates if a given action category is permitted by system policy
   */
  public static evaluateAction(category: AgentActionCategory): PermissionDecision {
    const policy = PERMISSION_POLICY_MATRIX[category];
    if (!policy) {
      return {
        allowed: false,
        category,
        policy: 'DENY',
        reason: `Action category '${category}' is unrecognized (deny-by-default).`,
      };
    }

    return {
      allowed: policy.allowed,
      category,
      requiresApproval: policy.requiresApproval || false,
      policy: policy.allowed ? 'ALLOW' : 'DENY',
      reason: policy.reason,
    };
  }

  /**
   * Evaluates permission for a specific tool by name
   */
  public static evaluateToolPermission(toolName: string): PermissionDecision {
    const trimmed = (toolName || '').trim() as AgentToolName;
    const category = ALLOWED_READ_TOOLS[trimmed];

    if (!category) {
      // Check if it matches known forbidden tool patterns
      const lower = toolName.toLowerCase();
      let detectedCategory: AgentActionCategory = 'WRITE';

      if (lower.includes('delete') || lower.includes('wipe') || lower.includes('drop') || lower.includes('remove')) {
        detectedCategory = 'DELETE';
      } else if (lower.includes('pay') || lower.includes('bill_pay')) {
        detectedCategory = 'PAYMENT';
      } else if (lower.includes('transfer') || lower.includes('send_money')) {
        detectedCategory = 'TRANSFER';
      } else if (lower.includes('auth') || lower.includes('login') || lower.includes('token')) {
        detectedCategory = 'AUTH';
      } else if (lower.includes('security') || lower.includes('bypass') || lower.includes('admin')) {
        detectedCategory = 'SECURITY';
      } else if (lower.includes('permission') || lower.includes('policy')) {
        detectedCategory = 'PERMISSION';
      }

      const policyDecision = this.evaluateAction(detectedCategory);
      return {
        allowed: false,
        toolName,
        category: detectedCategory,
        policy: 'DENY',
        reason: policyDecision.reason || `Tool '${toolName}' is not in the allowed tool registry (deny-by-default).`,
      };
    }

    const decision = this.evaluateAction(category);
    return {
      ...decision,
      toolName: trimmed,
    };
  }

  /**
   * Evaluates permission for an action execution request (Phase 18)
   */
  public static evaluateActionPermission(actionType: string): PermissionDecision {
    const trimmed = (actionType || '').trim() as AgentActionType;
    const actionConfig = ALLOWED_SAFE_ACTIONS[trimmed];

    if (!actionConfig) {
      const lower = actionType.toLowerCase();
      let detectedCategory: AgentActionCategory = 'WRITE';

      if (lower.includes('delete') || lower.includes('wipe') || lower.includes('drop') || lower.includes('remove')) {
        detectedCategory = 'DELETE';
      } else if (lower.includes('pay') || lower.includes('bill_pay') || lower.includes('charge')) {
        detectedCategory = 'PAYMENT';
      } else if (lower.includes('transfer') || lower.includes('wire') || lower.includes('send_money')) {
        detectedCategory = 'TRANSFER';
      } else if (lower.includes('auth') || lower.includes('login') || lower.includes('password')) {
        detectedCategory = 'AUTH';
      } else if (lower.includes('security') || lower.includes('admin') || lower.includes('role')) {
        detectedCategory = 'SECURITY';
      } else if (lower.includes('permission')) {
        detectedCategory = 'PERMISSION';
      }

      const policyDecision = this.evaluateAction(detectedCategory);
      return {
        allowed: false,
        actionType,
        category: detectedCategory,
        policy: 'DENY',
        reason: policyDecision.reason || `Action '${actionType}' is not in the allowed safe action registry (deny-by-default).`,
      };
    }

    return {
      allowed: true,
      actionType: trimmed,
      category: actionConfig.category,
      requiresApproval: actionConfig.requiresApproval,
      riskLevel: actionConfig.riskLevel,
      policy: 'ALLOW',
    };
  }

  /**
   * Fast boolean check for tool allowability
   */
  public static isToolAllowed(toolName: string): boolean {
    return this.evaluateToolPermission(toolName).allowed;
  }

  /**
   * Fast boolean check for safe action allowability
   */
  public static isActionAllowed(actionType: string): boolean {
    return this.evaluateActionPermission(actionType).allowed;
  }
}
