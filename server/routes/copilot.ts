import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { chatMessageSchema, idParamSchema } from '../schemas';
import { executeCopilotChat } from '../services/copilotService';
import { DatabaseService } from '../services/dbService';
import { HouseholdMorningBriefService } from '../services/agent/householdMorningBrief';
import { ActionExecutor } from '../services/agent/actionExecutor';
import { AgentActivityService } from '../services/agent/agentActivityService';

const router = Router();

// Enforce authentication on all Copilot endpoints
router.use(requireAuth);

/**
 * GET /api/copilot/morning-brief
 * Returns the comprehensive daily household morning brief
 */
router.get('/morning-brief', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const brief = await HouseholdMorningBriefService.generateMorningBrief(userId);

    res.status(200).json({
      success: true,
      data: brief,
    });
  } catch (error: any) {
    console.error('[COPILOT ROUTE] Error generating morning brief:', {
      userId,
      message: error?.message || 'Failed to generate morning brief',
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'MORNING_BRIEF_ERROR',
        message: error?.message || 'Failed to generate morning brief.',
      },
    });
  }
});

/**
 * POST /api/copilot/chat
 * Handles Gemini conversational queries grounded in the user's household data
 */
router.post('/chat', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const parseResult = chatMessageSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid chat message payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const { message, conversationId } = parseResult.data;

  try {
    const result = await executeCopilotChat(userId, message, conversationId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[COPILOT ROUTE] Error handling chat:', {
      userId,
      message: error?.message || 'Failed to process copilot query',
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'COPILOT_ERROR',
        message: error.message || 'Failed to process copilot query.',
      },
    });
  }
});

/**
 * GET /api/copilot/conversations
 * Lists all conversations for the authenticated user
 */
router.get('/conversations', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const conversations = await DatabaseService.listConversations(userId);

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error: unknown) {
    console.error('[COPILOT] Failed to retrieve conversations:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve conversation history.',
      },
    });
  }
});

/**
 * GET /api/copilot/conversations/:id
 * Retrieves messages for a specific conversation
 */
router.get('/conversations/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid conversation ID parameter.',
      },
    });
    return;
  }

  const { id } = paramResult.data;

  try {
    const conversation = await DatabaseService.getConversation(userId, id);
    if (!conversation) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation not found.',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages || [],
      },
    });
  } catch (error: unknown) {
    console.error('[COPILOT] Failed to fetch conversation:', {
      id,
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve conversation messages.',
      },
    });
  }
});

/**
 * DELETE /api/copilot/conversations/:id
 * Deletes a conversation for the authenticated user
 */
router.delete('/conversations/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid conversation ID parameter.',
      },
    });
    return;
  }

  const { id } = paramResult.data;

  try {
    const deleted = await DatabaseService.deleteConversation(userId, id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation not found or already removed.',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id,
        deleted: true,
      },
    });
  } catch (error: unknown) {
    console.error('[COPILOT] Failed to delete conversation:', {
      id,
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete conversation.',
      },
    });
  }
});

/**
 * GET /api/copilot/actions/:actionId
 * Retrieves an action proposal details for the authenticated user
 */
router.get('/actions/:actionId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { actionId } = req.params;

  try {
    const proposal = ActionExecutor.getProposal(userId, actionId);
    if (!proposal) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ACTION_NOT_FOUND',
          message: `Action proposal '${actionId}' not found for user.`,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: proposal,
    });
  } catch (error: any) {
    console.error('[COPILOT ROUTE] Error retrieving action proposal:', {
      userId,
      actionId,
      message: error?.message,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'ACTION_RETRIEVAL_ERROR',
        message: error?.message || 'Failed to retrieve action proposal.',
      },
    });
  }
});

/**
 * POST /api/copilot/actions/:actionId/approve
 * Executes an approved safe action with verification
 */
router.post('/actions/:actionId/approve', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { actionId } = req.params;

  try {
    const result = await ActionExecutor.executeApprovedAction(userId, actionId);

    if (!result.success) {
      res.status(400).json({
        success: false,
        data: result,
        error: {
          code: 'ACTION_EXECUTION_FAILED',
          message: result.message,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[COPILOT ROUTE] Error executing action proposal:', {
      userId,
      actionId,
      message: error?.message,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'ACTION_EXECUTION_ERROR',
        message: error?.message || 'Failed to execute action proposal.',
      },
    });
  }
});

/**
 * POST /api/copilot/actions/:actionId/cancel
 * Cancels a pending action proposal
 */
router.post('/actions/:actionId/cancel', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { actionId } = req.params;

  try {
    const cancelResult = ActionExecutor.cancelProposal(userId, actionId);

    if (!cancelResult.success) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ACTION_NOT_FOUND',
          message: cancelResult.message,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: cancelResult,
    });
  } catch (error: any) {
    console.error('[COPILOT ROUTE] Error cancelling action proposal:', {
      userId,
      actionId,
      message: error?.message,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'ACTION_CANCEL_ERROR',
        message: error?.message || 'Failed to cancel action proposal.',
      },
    });
  }
});

/**
 * GET /api/copilot/activity
 * Retrieves the agent activity timeline for the authenticated user
 */
router.get('/activity', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
  const eventType = req.query.eventType as string | undefined;

  try {
    const timeline = AgentActivityService.getActivityTimeline(userId, { limit, offset, eventType });

    res.status(200).json({
      success: true,
      data: timeline,
    });
  } catch (error: any) {
    console.error('[COPILOT ROUTE] Error retrieving agent activity timeline:', {
      userId,
      message: error?.message,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'ACTIVITY_TIMELINE_ERROR',
        message: error?.message || 'Failed to retrieve agent activity timeline.',
      },
    });
  }
});

export default router;
