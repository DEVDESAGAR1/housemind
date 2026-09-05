import { AgentActionCategory, AgentToolAuditRecord, AgentToolName } from '../../../src/types';
import { PermissionEngine } from './permissionEngine';
import { HouseholdTools } from './tools/householdTools';

export interface ToolExecutionResult {
  toolName: string;
  category: AgentActionCategory;
  status: 'success' | 'denied' | 'error';
  data?: any;
  error?: string;
  auditRecord: AgentToolAuditRecord;
}

export interface AgentToolDeclaration {
  name: AgentToolName;
  description: string;
  category: AgentActionCategory;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

export const AGENT_TOOL_DECLARATIONS: AgentToolDeclaration[] = [
  {
    name: 'getHouseholdHealth',
    description: 'Retrieves current Household Health Score (0–100), vitality pillar ratings, and recommendations.',
    category: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'getUpcomingObligations',
    description: 'Retrieves unified calendar obligations, utility due dates, and maintenance deadlines within N days.',
    category: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {
        days: {
          type: 'INTEGER',
          description: 'Number of forward days to inspect (default: 30, max: 90).',
        },
      },
    },
  },
  {
    name: 'getOverdueMaintenance',
    description: 'Retrieves all overdue maintenance tasks, estimated costs, and service providers.',
    category: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'getFinancialSummary',
    description: 'Computes total monthly operating burn rate, debt balances (mortgages + credit cards), and cash obligations.',
    category: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'getExpiringWarrantiesAndDocuments',
    description: 'Retrieves active warranties nearing expiration and documents requiring audit.',
    category: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {
        daysAhead: {
          type: 'INTEGER',
          description: 'Number of forward days to check for warranty expiration (default: 60, max: 180).',
        },
      },
    },
  },
  {
    name: 'getRecentNotifications',
    description: 'Retrieves recent alerts and notifications with unread counts and priority tags.',
    category: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {
        unreadOnly: {
          type: 'BOOLEAN',
          description: 'If true, filters to only unread notifications.',
        },
      },
    },
  },
  {
    name: 'getHouseholdIssues',
    description: 'Retrieves household issues, open/historical tickets, severity levels, and recurrence intelligence.',
    category: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description: 'Filter by ticket status (e.g. "open", "reported", "in_progress", "resolved").',
        },
        severity: {
          type: 'STRING',
          description: 'Filter by severity ("critical", "high", "medium", "low").',
        },
        assetId: {
          type: 'STRING',
          description: 'Optional asset ID to check issues for a specific appliance.',
        },
      },
    },
  },
  {
    name: 'getCrossDomainInsights',
    description: 'Derives cross-domain household insights connecting assets, warranties, maintenance, issues, and finance.',
    category: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {
        priority: {
          type: 'STRING',
          description: 'Filter by priority ("critical", "overdue", "due_today", "warning", "due_soon").',
        },
        type: {
          type: 'STRING',
          description: 'Filter by insight type ("risk", "recurrence", "opportunity", "deadline", "cost", "missing_info", "positive_signal").',
        },
      },
    },
  },
  {
    name: 'getHouseholdTimeline',
    description: 'Retrieves operational timeline of household events (repairs, maintenance, warranty changes, bills, documents).',
    category: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {
        domain: {
          type: 'STRING',
          description: 'Filter timeline by domain ("assets", "issues", "maintenance", "warranties", "finance", "documents").',
        },
      },
    },
  },
  {
    name: 'getUnifiedHouseholdActions',
    description: 'Retrieves consolidated, prioritized, and deduplicated action recommendations answering "What should I do next?".',
    category: 'READ',
    parameters: {
      type: 'OBJECT',
      properties: {
        priority: {
          type: 'STRING',
          description: 'Filter by priority ("critical", "overdue", "due_today", "warning", "due_soon").',
        },
        domain: {
          type: 'STRING',
          description: 'Filter by household domain.',
        },
      },
    },
  },
];

export class ToolExecutor {
  /**
   * Returns metadata declarations for all allowlisted tools
   */
  public static getDeclarations(): AgentToolDeclaration[] {
    return AGENT_TOOL_DECLARATIONS;
  }

  /**
   * Sanitizes parameter values for audit logs (preventing sensitive leaks)
   */
  private static sanitizeAuditParams(params?: Record<string, any>): Record<string, string | number | boolean> {
    if (!params || typeof params !== 'object') return {};
    const sanitized: Record<string, string | number | boolean> = {};

    for (const [key, val] of Object.entries(params)) {
      // Omit any unexpected large objects or sensitive fields
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }

  /**
   * Validates tool parameters against expected types
   */
  private static validateParams(toolName: AgentToolName, params: any): { valid: boolean; error?: string } {
    if (params === undefined || params === null) return { valid: true };
    if (typeof params !== 'object' || Array.isArray(params)) {
      return { valid: false, error: 'Tool parameters must be an object.' };
    }

    if (toolName === 'getUpcomingObligations') {
      if (params.days !== undefined && (typeof params.days !== 'number' || isNaN(params.days) || params.days < 0)) {
        return { valid: false, error: 'Parameter "days" must be a positive number.' };
      }
    }

    if (toolName === 'getExpiringWarrantiesAndDocuments') {
      if (params.daysAhead !== undefined && (typeof params.daysAhead !== 'number' || isNaN(params.daysAhead) || params.daysAhead < 0)) {
        return { valid: false, error: 'Parameter "daysAhead" must be a positive number.' };
      }
    }

    if (toolName === 'getRecentNotifications') {
      if (params.unreadOnly !== undefined && typeof params.unreadOnly !== 'boolean') {
        return { valid: false, error: 'Parameter "unreadOnly" must be a boolean.' };
      }
    }

    return { valid: true };
  }

  /**
   * Executes a tool under deterministic permission governance and authenticated tenant context.
   */
  public static async executeTool(
    userId: string,
    toolName: string,
    params?: Record<string, any>
  ): Promise<ToolExecutionResult> {
    const startTime = performance.now();
    const sanitizedParams = this.sanitizeAuditParams(params);

    // 1. Permission Engine Evaluation
    const permission = PermissionEngine.evaluateToolPermission(toolName);

    if (!permission.allowed) {
      const durationMs = Math.round(performance.now() - startTime);
      const auditRecord: AgentToolAuditRecord = {
        toolName,
        category: permission.category,
        status: 'denied',
        executionTimeMs: durationMs,
        denialReason: permission.reason || 'Operation denied by permission policy.',
        paramsSummary: sanitizedParams,
      };

      return {
        toolName,
        category: permission.category,
        status: 'denied',
        error: auditRecord.denialReason,
        auditRecord,
      };
    }

    const castToolName = toolName as AgentToolName;

    // 2. Parameter Validation
    const validation = this.validateParams(castToolName, params);
    if (!validation.valid) {
      const durationMs = Math.round(performance.now() - startTime);
      const auditRecord: AgentToolAuditRecord = {
        toolName,
        category: permission.category,
        status: 'error',
        executionTimeMs: durationMs,
        denialReason: validation.error,
        paramsSummary: sanitizedParams,
      };

      return {
        toolName,
        category: permission.category,
        status: 'error',
        error: validation.error,
        auditRecord,
      };
    }

    // 3. Tool Dispatch with Injected Trusted UserId
    try {
      let data: any;

      switch (castToolName) {
        case 'getHouseholdHealth':
          data = await HouseholdTools.getHouseholdHealth(userId);
          break;
        case 'getUpcomingObligations':
          data = await HouseholdTools.getUpcomingObligations(userId, params);
          break;
        case 'getOverdueMaintenance':
          data = await HouseholdTools.getOverdueMaintenance(userId);
          break;
        case 'getFinancialSummary':
          data = await HouseholdTools.getFinancialSummary(userId);
          break;
        case 'getExpiringWarrantiesAndDocuments':
          data = await HouseholdTools.getExpiringWarrantiesAndDocuments(userId, params);
          break;
        case 'getRecentNotifications':
          data = await HouseholdTools.getRecentNotifications(userId, params);
          break;
        case 'getHouseholdIssues':
          data = await HouseholdTools.getHouseholdIssues(userId, params);
          break;
        case 'getCrossDomainInsights':
          data = await HouseholdTools.getCrossDomainInsights(userId, params);
          break;
        case 'getHouseholdTimeline':
          data = await HouseholdTools.getHouseholdTimeline(userId, params);
          break;
        case 'getUnifiedHouseholdActions':
          data = await HouseholdTools.getUnifiedHouseholdActions(userId, params);
          break;
        default:
          throw new Error(`Unhandled allowlisted tool: ${toolName}`);
      }

      const durationMs = Math.round(performance.now() - startTime);
      const auditRecord: AgentToolAuditRecord = {
        toolName,
        category: permission.category,
        status: 'success',
        executionTimeMs: durationMs,
        paramsSummary: sanitizedParams,
      };

      return {
        toolName,
        category: permission.category,
        status: 'success',
        data,
        auditRecord,
      };
    } catch (toolError: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const errorMsg = toolError?.message || 'Tool execution encountered an internal error.';

      const auditRecord: AgentToolAuditRecord = {
        toolName,
        category: permission.category,
        status: 'error',
        executionTimeMs: durationMs,
        denialReason: errorMsg,
        paramsSummary: sanitizedParams,
      };

      return {
        toolName,
        category: permission.category,
        status: 'error',
        error: errorMsg,
        auditRecord,
      };
    }
  }
}
