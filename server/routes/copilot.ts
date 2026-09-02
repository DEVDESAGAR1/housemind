import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { chatMessageSchema, idParamSchema } from '../schemas';
import { executeCopilotChat } from '../services/copilotService';
import { DatabaseService } from '../services/dbService';

const router = Router();

// Enforce authentication on all Copilot endpoints
router.use(requireAuth);

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

export default router;
