import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { idParamSchema, updateInsightStatusSchema, queryInsightSchema } from '../schemas';
import { DatabaseService } from '../services/dbService';
import {
  refreshUserInsights,
  explainInsight,
  normalizeToMonthly,
} from '../services/intelligenceService';
import { HouseholdInsight } from '../../src/types';

const router = Router();

// Enforce authentication on all intelligence/investigator endpoints
router.use(requireAuth);

/**
 * GET /api/intelligence/summary
 * Calculates deterministic high-level household metrics: monthly burn rate, annual spend, asset counts
 */
router.get('/summary', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const [expenses, assets] = await Promise.all([
      DatabaseService.listExpenses(userId),
      DatabaseService.listAssets(userId),
    ]);

    let monthlyBurnRate = 0;
    expenses.forEach((e) => {
      monthlyBurnRate += normalizeToMonthly(Number(e.amount) || 0, e.frequency);
    });

    const totalAnnualExpense = monthlyBurnRate * 12;

    res.status(200).json({
      success: true,
      data: {
        monthlyBurnRate: Number(monthlyBurnRate.toFixed(2)),
        totalAnnualExpense: Number(totalAnnualExpense.toFixed(2)),
        activeExpensesCount: expenses.length,
        totalAssetsCount: assets.length,
        upcomingDueCount: expenses.filter((e) => e.dueDate).length,
      },
    });
  } catch (error: unknown) {
    console.error('[INTELLIGENCE] Error computing summary:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to calculate financial intelligence summary.',
      },
    });
  }
});

/**
 * GET /api/intelligence/insights
 * Retrieves all insights for the authenticated user with optional filtering
 */
router.get('/insights', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const queryResult = queryInsightSchema.safeParse(req.query);
  const statusFilter = queryResult.success ? queryResult.data.status : undefined;
  const severityFilter = queryResult.success ? queryResult.data.severity : undefined;

  try {
    let insights = await DatabaseService.listInsights(userId);

    // Auto-refresh if no insights have ever been generated for this user
    if (insights.length === 0) {
      insights = await refreshUserInsights(userId);
    }

    // Apply optional memory filters
    if (statusFilter && statusFilter !== 'all') {
      insights = insights.filter((i) => i.status === statusFilter);
    }
    if (severityFilter && severityFilter !== 'all') {
      insights = insights.filter((i) => i.severity === severityFilter);
    }

    res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (error: unknown) {
    console.error('[INTELLIGENCE] Failed to retrieve insights', { userId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve household insights.',
      },
    });
  }
});

/**
 * POST /api/intelligence/insights/refresh
 * Deterministically scans the user's latest expenses, assets, and profile to update findings
 */
router.post('/insights/refresh', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const insights = await refreshUserInsights(userId);

    res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
    console.error('[INTELLIGENCE] Error refreshing insights', { userId, message: error?.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTELLIGENCE_ERROR',
        message: error.message || 'Failed to refresh household insights.',
      },
    });
  }
});

/**
 * POST /api/intelligence/insights/:id/explain
 * Generates an objective, structured Gemini explanation for a specific insight finding
 */
router.post('/insights/:id/explain', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid insight ID parameter.',
      },
    });
    return;
  }

  const { id } = paramResult.data;

  try {
    const explanation = await explainInsight(userId, id);

    res.status(200).json({
      success: true,
      data: explanation,
    });
  } catch (error: any) {
    console.error('[INTELLIGENCE] Error explaining insight', { id, userId, message: error?.message });
    if (error.message === 'Insight record not found.') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Insight record not found.',
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'EXPLANATION_ERROR',
        message: error.message || 'Failed to generate explanation.',
      },
    });
  }
});

/**
 * PATCH /api/intelligence/insights/:id/status
 * Updates the lifecycle status of an insight (new, viewed, dismissed, resolved)
 */
router.patch('/insights/:id/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid insight ID parameter.',
      },
    });
    return;
  }

  const bodyResult = updateInsightStatusSchema.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid status update payload.',
        details: bodyResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const { id } = paramResult.data;
  const { status } = bodyResult.data;

  try {
    const updated = await DatabaseService.updateInsight(userId, id, { status });
    if (!updated) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Insight record not found.',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error: unknown) {
    console.error('[INTELLIGENCE] Error updating status for insight', { id, userId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update insight status.',
      },
    });
  }
});

export default router;
