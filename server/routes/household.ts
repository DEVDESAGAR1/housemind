import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { DatabaseService } from '../services/dbService';
import {
  idParamSchema,
  householdProfileSchema,
  createExpenseSchema,
  updateExpenseSchema,
  createAssetSchema,
  updateAssetSchema,
} from '../schemas';

const router = Router();

// Enforce authentication on all household routes
router.use(requireAuth);

// ==========================================
// 1. HOUSEHOLD PROFILE ENDPOINTS
// ==========================================

/**
 * GET /api/household/profile
 * Retrieves the current household profile for the authenticated user
 */
router.get('/profile', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const profile = await DatabaseService.getProfile(userId, req.userToken);
    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error: unknown) {
    console.error(`[PROFILE] Failed to fetch profile for user: ${userId}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve household profile.',
      },
    });
  }
});

/**
 * PUT /api/household/profile
 * Updates or creates the household profile for the authenticated user
 */
router.put('/profile', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const parseResult = householdProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid household profile payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const updated = await DatabaseService.setProfile(userId, parseResult.data, req.userToken);
    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error: unknown) {
    console.error(`[PROFILE] Failed to save profile for user: ${userId}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to save household profile.',
      },
    });
  }
});

// ==========================================
// 2. EXPENSES ENDPOINTS
// ==========================================

/**
 * GET /api/household/expenses
 * Lists all expenses for the authenticated user
 */
router.get('/expenses', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const expenses = await DatabaseService.listExpenses(userId, req.userToken);
    res.status(200).json({
      success: true,
      data: expenses,
    });
  } catch (error: unknown) {
    console.error(`[EXPENSES] Failed to retrieve expenses for user: ${userId}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve household expenses.',
      },
    });
  }
});

/**
 * POST /api/household/expenses
 * Creates a new expense for the authenticated user
 */
router.post('/expenses', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const parseResult = createExpenseSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid expense payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const newExpense = await DatabaseService.createExpense(userId, parseResult.data);
    res.status(201).json({
      success: true,
      data: newExpense,
    });
  } catch (error: unknown) {
    console.error(`[EXPENSES] Failed to create expense for user: ${userId}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create expense record.',
      },
    });
  }
});

/**
 * GET /api/household/expenses/:id
 * Retrieves a single expense
 */
router.get('/expenses/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid expense ID parameter.',
      },
    });
    return;
  }

  const expense = await DatabaseService.getExpense(userId, paramResult.data.id);
  if (!expense) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Expense not found.',
      },
    });
    return;
  }

  res.status(200).json({ success: true, data: expense });
});

/**
 * PUT /api/household/expenses/:id
 * Updates an existing expense owned by the authenticated user
 */
router.put('/expenses/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid expense ID parameter.',
      },
    });
    return;
  }

  const parseResult = updateExpenseSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid update payload for expense.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const updated = await DatabaseService.updateExpense(userId, paramResult.data.id, parseResult.data);
    if (!updated) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Expense not found.',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error: unknown) {
    console.error(`[EXPENSES] Failed to update expense for user: ${userId}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update expense record.',
      },
    });
  }
});

/**
 * DELETE /api/household/expenses/:id
 * Deletes an expense owned by the authenticated user
 */
router.delete('/expenses/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid expense ID parameter.',
      },
    });
    return;
  }

  const { id } = paramResult.data;

  try {
    const deleted = await DatabaseService.deleteExpense(userId, id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Expense not found.',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { id, deleted: true },
    });
  } catch (error: unknown) {
    console.error(`[EXPENSES] Failed to delete expense ${id} for user: ${userId}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete expense record.',
      },
    });
  }
});

// ==========================================
// 3. HOME ASSETS ENDPOINTS
// ==========================================

/**
 * GET /api/household/assets
 * Lists all home assets for the authenticated user
 */
router.get('/assets', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const assets = await DatabaseService.listAssets(userId);
    res.status(200).json({
      success: true,
      data: assets,
    });
  } catch (error: unknown) {
    console.error(`[ASSETS] Failed to retrieve assets for user: ${userId}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve home assets.',
      },
    });
  }
});

/**
 * POST /api/household/assets
 * Creates a new home asset for the authenticated user
 */
router.post('/assets', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const parseResult = createAssetSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid asset payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const newAsset = await DatabaseService.createAsset(userId, parseResult.data);
    res.status(201).json({
      success: true,
      data: newAsset,
    });
  } catch (error: unknown) {
    console.error(`[ASSETS] Failed to create asset for user: ${userId}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create asset record.',
      },
    });
  }
});

/**
 * GET /api/household/assets/:id
 * Retrieves a single asset
 */
router.get('/assets/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid asset ID parameter.',
      },
    });
    return;
  }

  const asset = await DatabaseService.getAsset(userId, paramResult.data.id);
  if (!asset) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Asset not found.',
      },
    });
    return;
  }

  res.status(200).json({ success: true, data: asset });
});

/**
 * PUT /api/household/assets/:id
 * Updates an asset owned by the authenticated user
 */
router.put('/assets/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid asset ID parameter.',
      },
    });
    return;
  }

  const parseResult = updateAssetSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid update payload for asset.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const updated = await DatabaseService.updateAsset(userId, paramResult.data.id, parseResult.data);
    if (!updated) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Asset not found.',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error: unknown) {
    console.error(`[ASSETS] Failed to update asset for user: ${userId}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update asset record.',
      },
    });
  }
});

/**
 * DELETE /api/household/assets/:id
 * Deletes an asset owned by the authenticated user
 */
router.delete('/assets/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid asset ID parameter.',
      },
    });
    return;
  }

  const { id } = paramResult.data;

  try {
    const deleted = await DatabaseService.deleteAsset(userId, id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Asset not found.',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { id, deleted: true },
    });
  } catch (error: unknown) {
    console.error(`[ASSETS] Failed to delete asset ${id} for user: ${userId}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete asset record.',
      },
    });
  }
});

// ==========================================
// 4. DEMO SEED ENDPOINT (IDEMPOTENT)
// ==========================================

/**
 * POST /api/household/demo-seed
 * Seeds realistic starter household dataset for the authenticated user idempotently
 */
router.post(['/demo-seed', '/seed-demo'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const counts = await DatabaseService.seedDemoData(userId);

    res.status(200).json({
      success: true,
      message: 'Demo household data successfully seeded.',
      data: counts,
    });
  } catch (error: unknown) {
    console.error(`[DEMO-SEED] Failed to seed demo data for user: ${userId}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to seed demo household data.',
      },
    });
  }
});

export default router;
