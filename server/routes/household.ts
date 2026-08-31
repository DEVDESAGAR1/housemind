import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { DatabaseService } from '../services/dbService';
import {
  idParamSchema,
  householdProfileSchema,
  updateHouseholdProfileSchema,
  createExpenseSchema,
  updateExpenseSchema,
  createAssetSchema,
  updateAssetSchema,
} from '../schemas';
import {
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
  getCountryConfig,
} from '../../src/config/locationCurrencyConfig';
import { HouseholdDataSourcesSummary } from '../../src/types';

const router = Router();

// Enforce authentication on all household routes
router.use(requireAuth);

// ==========================================
// 1. GLOBAL LOCATION & CURRENCY CONFIGURATION
// ==========================================

/**
 * GET /api/household/config/location
 * Returns supported countries, localized categories, payment rails, and default regional settings
 */
router.get('/config/location', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: {
      countries: SUPPORTED_COUNTRIES,
    },
  });
});

/**
 * GET /api/household/config/currencies
 * Returns supported currencies registry
 */
router.get('/config/currencies', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: {
      currencies: SUPPORTED_CURRENCIES,
    },
  });
});

/**
 * GET /api/household/data-sources
 * Returns transparent summary of data sources, grounding guarantees, and strict user isolation
 */
router.get('/data-sources', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const [profile, expenses, assets, transactions, documents, scenarios, conversations] =
      await Promise.all([
        DatabaseService.getProfile(userId, req.userToken),
        DatabaseService.listExpenses(userId, req.userToken),
        DatabaseService.listAssets(userId),
        DatabaseService.listTransactions(userId),
        DatabaseService.listDocuments(userId),
        DatabaseService.listScenarios(userId, req.userToken),
        DatabaseService.listConversations(userId),
      ]);

    const manualTransactionsCount = transactions.filter((t) => t.source === 'manual').length;
    const importedTransactionsCount = transactions.filter((t) => t.source === 'statement_import').length;

    const countryCfg = getCountryConfig(profile?.country);

    const summary: HouseholdDataSourcesSummary = {
      userId,
      householdProfile: {
        homeName: profile?.homeName || 'My Household',
        country: profile?.country || countryCfg.name,
        region: profile?.region || undefined,
        city: profile?.city || undefined,
        currency: profile?.currency || countryCfg.defaultCurrency,
        locale: profile?.locale || countryCfg.defaultLocale,
        timezone: profile?.timezone || countryCfg.defaultTimezone,
      },
      dataCounts: {
        manualTransactions: manualTransactionsCount,
        importedDocuments: documents.length,
        confirmedTransactions: transactions.length,
        recurringExpenses: expenses.length,
        registeredAssets: assets.length,
        whatIfScenarios: scenarios.length,
        copilotConversations: conversations.length,
      },
      isolationStatus: 'STRICT_USER_ISOLATED',
      aiContextGrounding: {
        groundedSources: [
          'User-confirmed Household Profile & Location Settings',
          'User-confirmed Recurring Household Expenses & Bills',
          'User-registered Home Assets, Appliances & Warranties',
          'User-confirmed Financial Transactions Ledger (Bank & Card)',
          'User-created What-If Financial Decision Scenarios',
        ],
        excludedSensitiveData: [
          'Raw Bank Account & Routing Numbers',
          'Credit & Debit Card Numbers (PANs / CVVs / Expiry Dates)',
          'Personal Identification Numbers (SSN / Aadhaar / Passwords / OTPs)',
          'Server Secrets, Firebase Auth Credentials & Gemini API Keys',
        ],
      },
    };

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: unknown) {
    console.error(`[DATA_SOURCES] Failed to compile data sources summary for user: ${userId}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve household data sources summary.',
      },
    });
  }
});

// ==========================================
// 2. HOUSEHOLD PROFILE ENDPOINTS
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

  const parseResult = updateHouseholdProfileSchema.safeParse(req.body);
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
    const existing = await DatabaseService.getProfile(userId, req.userToken);
    const merged = { ...existing, ...parseResult.data };
    const updated = await DatabaseService.setProfile(userId, merged, req.userToken);
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
// 4. DEMO SEED & REMOVAL ENDPOINTS
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
    console.error('[DEMO-SEED] Failed to seed demo data', { userId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to seed demo household data.',
      },
    });
  }
});

/**
 * GET /api/household/privacy-summary & /api/household/privacy-center
 * Returns privacy center metrics, data source connections, isolation status, and AI boundary rules
 */
router.get(['/privacy-summary', '/privacy-center', '/data-sources-summary'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const summary = DatabaseService.getPrivacySummary(userId);
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: unknown) {
    console.error('[PRIVACY-SUMMARY] Failed to get privacy summary', { userId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve privacy summary.',
      },
    });
  }
});

/**
 * POST /api/household/demo-remove (or /clear-demo)
 * Safely purges ONLY demo records for the authenticated user without affecting real user records
 */
router.post(['/demo-remove', '/clear-demo', '/remove-demo'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const result = DatabaseService.clearDemoData(userId);

    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      remainingCount: result.remainingCount,
      userRecordsCount: result.userRecordsCount,
      message: `Successfully removed ${result.deletedCount} demo record(s). Your real user data remains intact.`,
      data: result,
    });
  } catch (error: unknown) {
    console.error('[DEMO-REMOVE] Failed to remove demo data', { userId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to remove demo data.',
      },
    });
  }
});

/**
 * POST /api/household/reset-data
 * Completely resets user data for the authenticated user only (requires explicit confirmation)
 */
router.post('/reset-data', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { confirm, confirmPhrase } = req.body || {};

  if (confirm !== true && confirmPhrase !== 'DELETE MY DATA') {
    res.status(400).json({
      success: false,
      error: {
        code: 'CONFIRMATION_REQUIRED',
        message: 'Explicit confirmation { confirm: true } or confirmPhrase: "DELETE MY DATA" required to reset household data.',
      },
    });
    return;
  }

  try {
    const result = DatabaseService.clearUserData(userId);
    res.status(200).json({
      success: true,
      message: 'All household data for your account has been safely reset.',
      data: result,
    });
  } catch (error: unknown) {
    console.error('[RESET-DATA] Failed to reset data', { userId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to reset household data.',
      },
    });
  }
});

export default router;
