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
  createPropertySchema,
  updatePropertySchema,
  propertyIdParamSchema,
  createRoomSchema,
  updateRoomSchema,
  roomIdParamSchema,
  createWarrantySchema,
  updateWarrantySchema,
  warrantyIdParamSchema,
  createMaintenanceSchema,
  updateMaintenanceSchema,
  maintenanceIdParamSchema,
  createUtilitySchema,
  updateUtilitySchema,
  utilityIdParamSchema,
  createLoanSchema,
  updateLoanSchema,
  loanIdParamSchema,
  createCreditCardSchema,
  updateCreditCardSchema,
  creditCardIdParamSchema,
  extractEntityFromDocSchema,
  saveExtractedEntitySchema,
} from '../schemas';
import {
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
  getCountryConfig,
} from '../../src/config/locationCurrencyConfig';
import { HouseholdDataSourcesSummary } from '../../src/types';
import {
  extractEntityFromDocument,
  saveExtractedEntity,
} from '../services/entityExtractionService';

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
    console.error('[DATA_SOURCES] Failed to compile data sources summary:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
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
    console.error('[PROFILE] Failed to fetch profile:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
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
    console.error('[PROFILE] Failed to save profile:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
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
    console.error('[EXPENSES] Failed to retrieve expenses:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
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
    console.error('[EXPENSES] Failed to create expense:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
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
    console.error('[EXPENSES] Failed to update expense:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
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
    console.error('[EXPENSES] Failed to delete expense:', {
      id,
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
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
    console.error('[ASSETS] Failed to retrieve assets:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
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
    console.error('[ASSETS] Failed to create asset:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
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
    console.error('[ASSETS] Failed to update asset:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
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
    console.error('[ASSETS] Failed to delete asset:', {
      id,
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
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
// 4. HOME COMMAND CENTER SUMMARY
// ==========================================

/**
 * GET /api/household/command-center
 * Returns aggregated Home Command Center summary metrics and action items
 */
router.get(['/command-center', '/home-command-center', '/command-center-summary'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const summary = await DatabaseService.getHomeCommandCenterSummary(userId);
    res.status(200).json({
      success: true,
      data: summary,
      summary,
    });
  } catch (error: unknown) {
    console.error('[COMMAND_CENTER] Failed to fetch command center summary:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve household command center summary.',
      },
    });
  }
});

// ==========================================
// 5. PROPERTIES CRUD
// ==========================================

/**
 * GET /api/household/properties
 */
router.get('/properties', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  try {
    const properties = await DatabaseService.listProperties(userId);
    res.status(200).json({
      success: true,
      data: properties,
      properties,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list properties.' },
    });
  }
});

/**
 * GET /api/household/properties/:id
 */
router.get('/properties/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const prop = await DatabaseService.getProperty(userId, id);
  if (!prop) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Property not found.' },
    });
    return;
  }

  res.status(200).json({ success: true, data: prop, property: prop });
});

/**
 * POST /api/household/properties
 */
router.post('/properties', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const parseResult = createPropertySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid property payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const property = await DatabaseService.createProperty(userId, parseResult.data);
    res.status(201).json({ success: true, data: property, property });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create property.' },
    });
  }
});

/**
 * PUT /api/household/properties/:id
 */
router.put('/properties/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = updatePropertySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid property update payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const updated = await DatabaseService.updateProperty(userId, id, parseResult.data);
    if (!updated) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Property not found.' },
      });
      return;
    }
    res.status(200).json({ success: true, data: updated, property: updated });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update property.' },
    });
  }
});

/**
 * DELETE /api/household/properties/:id
 */
router.delete('/properties/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const deleted = await DatabaseService.deleteProperty(userId, id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Property not found.' },
      });
      return;
    }
    res.status(200).json({ success: true, data: { id, deleted: true } });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete property.' },
    });
  }
});

// ==========================================
// 6. ROOMS & AREAS CRUD
// ==========================================

/**
 * GET /api/household/rooms
 */
router.get('/rooms', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const propertyId = req.query.propertyId as string | undefined;

  try {
    const rooms = await DatabaseService.listRooms(userId, propertyId);
    res.status(200).json({ success: true, data: rooms, rooms });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list rooms.' },
    });
  }
});

/**
 * GET /api/household/rooms/:id
 */
router.get('/rooms/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const room = await DatabaseService.getRoom(userId, id);
  if (!room) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Room not found.' } });
    return;
  }
  res.status(200).json({ success: true, data: room, room });
});

/**
 * POST /api/household/rooms
 */
router.post('/rooms', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const parseResult = createRoomSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid room payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const room = await DatabaseService.createRoom(userId, parseResult.data);
    res.status(201).json({ success: true, data: room, room });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create room.' },
    });
  }
});

/**
 * PUT /api/household/rooms/:id
 */
router.put('/rooms/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = updateRoomSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid room update payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const updated = await DatabaseService.updateRoom(userId, id, parseResult.data);
    if (!updated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Room not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: updated, room: updated });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update room.' },
    });
  }
});

/**
 * DELETE /api/household/rooms/:id
 */
router.delete('/rooms/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const deleted = await DatabaseService.deleteRoom(userId, id);
    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Room not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: { id, deleted: true } });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete room.' },
    });
  }
});

// ==========================================
// 7. WARRANTIES CRUD
// ==========================================

/**
 * GET /api/household/warranties
 */
router.get('/warranties', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const assetId = req.query.assetId as string | undefined;

  try {
    const warranties = await DatabaseService.listWarranties(userId, assetId);
    res.status(200).json({ success: true, data: warranties, warranties });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list warranties.' },
    });
  }
});

/**
 * GET /api/household/warranties/:id
 */
router.get('/warranties/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const warranty = await DatabaseService.getWarranty(userId, id);
  if (!warranty) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Warranty not found.' } });
    return;
  }
  res.status(200).json({ success: true, data: warranty, warranty });
});

/**
 * POST /api/household/warranties
 */
router.post('/warranties', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const parseResult = createWarrantySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid warranty payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const warranty = await DatabaseService.createWarranty(userId, parseResult.data);
    res.status(201).json({ success: true, data: warranty, warranty });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create warranty.' },
    });
  }
});

/**
 * PUT /api/household/warranties/:id
 */
router.put('/warranties/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = updateWarrantySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid warranty update payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const updated = await DatabaseService.updateWarranty(userId, id, parseResult.data);
    if (!updated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Warranty not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: updated, warranty: updated });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update warranty.' },
    });
  }
});

/**
 * DELETE /api/household/warranties/:id
 */
router.delete('/warranties/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const deleted = await DatabaseService.deleteWarranty(userId, id);
    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Warranty not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: { id, deleted: true } });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete warranty.' },
    });
  }
});

// ==========================================
// 8. MAINTENANCE TASKS CRUD
// ==========================================

/**
 * GET /api/household/maintenances
 */
router.get(['/maintenances', '/maintenance', '/maintenance-tasks'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const assetId = req.query.assetId as string | undefined;
  const propertyId = req.query.propertyId as string | undefined;

  try {
    const tasks = await DatabaseService.listMaintenances(userId, assetId, propertyId);
    res.status(200).json({ success: true, data: tasks, tasks });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list maintenance tasks.' },
    });
  }
});

/**
 * GET /api/household/maintenances/:id
 */
router.get(['/maintenances/:id', '/maintenance/:id', '/maintenance-tasks/:id'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const task = await DatabaseService.getMaintenance(userId, id);
  if (!task) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Maintenance task not found.' } });
    return;
  }
  res.status(200).json({ success: true, data: task, task });
});

/**
 * POST /api/household/maintenances
 */
router.post(['/maintenances', '/maintenance', '/maintenance-tasks'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const parseResult = createMaintenanceSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid maintenance task payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const task = await DatabaseService.createMaintenance(userId, parseResult.data);
    res.status(201).json({ success: true, data: task, task });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create maintenance task.' },
    });
  }
});

/**
 * PUT /api/household/maintenances/:id
 */
router.put(['/maintenances/:id', '/maintenance/:id', '/maintenance-tasks/:id'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = updateMaintenanceSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid maintenance update payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const updated = await DatabaseService.updateMaintenance(userId, id, parseResult.data);
    if (!updated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Maintenance task not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: updated, task: updated });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update maintenance task.' },
    });
  }
});

/**
 * DELETE /api/household/maintenances/:id
 */
router.delete(['/maintenances/:id', '/maintenance/:id', '/maintenance-tasks/:id'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const deleted = await DatabaseService.deleteMaintenance(userId, id);
    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Maintenance task not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: { id, deleted: true } });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete maintenance task.' },
    });
  }
});

// ==========================================
// 9. UTILITIES CRUD
// ==========================================

/**
 * GET /api/household/utilities
 */
router.get('/utilities', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const propertyId = req.query.propertyId as string | undefined;

  try {
    const utilities = await DatabaseService.listUtilities(userId, propertyId);
    res.status(200).json({ success: true, data: utilities, utilities });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list utility accounts.' },
    });
  }
});

/**
 * GET /api/household/utilities/:id
 */
router.get('/utilities/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const util = await DatabaseService.getUtility(userId, id);
  if (!util) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utility account not found.' } });
    return;
  }
  res.status(200).json({ success: true, data: util, utility: util });
});

/**
 * POST /api/household/utilities
 */
router.post('/utilities', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const parseResult = createUtilitySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid utility account payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const util = await DatabaseService.createUtility(userId, parseResult.data);
    res.status(201).json({ success: true, data: util, utility: util });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create utility account.' },
    });
  }
});

/**
 * PUT /api/household/utilities/:id
 */
router.put('/utilities/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = updateUtilitySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid utility update payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const updated = await DatabaseService.updateUtility(userId, id, parseResult.data);
    if (!updated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utility account not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: updated, utility: updated });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update utility account.' },
    });
  }
});

/**
 * DELETE /api/household/utilities/:id
 */
router.delete('/utilities/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const deleted = await DatabaseService.deleteUtility(userId, id);
    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utility account not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: { id, deleted: true } });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete utility account.' },
    });
  }
});

// ==========================================
// 10. HOUSEHOLD LOANS CRUD
// ==========================================

/**
 * GET /api/household/loans
 */
router.get('/loans', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const propertyId = req.query.propertyId as string | undefined;

  try {
    const loans = await DatabaseService.listLoans(userId, propertyId);
    res.status(200).json({ success: true, data: loans, loans });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list loans.' },
    });
  }
});

/**
 * GET /api/household/loans/:id
 */
router.get('/loans/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const loan = await DatabaseService.getLoan(userId, id);
  if (!loan) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Loan not found.' } });
    return;
  }
  res.status(200).json({ success: true, data: loan, loan });
});

/**
 * POST /api/household/loans
 */
router.post('/loans', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const parseResult = createLoanSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid loan payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const loan = await DatabaseService.createLoan(userId, parseResult.data);
    res.status(201).json({ success: true, data: loan, loan });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create loan.' },
    });
  }
});

/**
 * PUT /api/household/loans/:id
 */
router.put('/loans/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = updateLoanSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid loan update payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const updated = await DatabaseService.updateLoan(userId, id, parseResult.data);
    if (!updated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Loan not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: updated, loan: updated });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update loan.' },
    });
  }
});

/**
 * DELETE /api/household/loans/:id
 */
router.delete('/loans/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const deleted = await DatabaseService.deleteLoan(userId, id);
    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Loan not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: { id, deleted: true } });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete loan.' },
    });
  }
});

// ==========================================
// 11. CREDIT CARDS CRUD
// ==========================================

/**
 * GET /api/household/credit-cards
 */
router.get(['/credit-cards', '/cards'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const cards = await DatabaseService.listCreditCards(userId);
    res.status(200).json({ success: true, data: cards, creditCards: cards });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list credit card accounts.' },
    });
  }
});

/**
 * GET /api/household/credit-cards/:id
 */
router.get(['/credit-cards/:id', '/cards/:id'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const card = await DatabaseService.getCreditCard(userId, id);
  if (!card) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Credit card not found.' } });
    return;
  }
  res.status(200).json({ success: true, data: card, creditCard: card });
});

/**
 * POST /api/household/credit-cards
 */
router.post(['/credit-cards', '/cards'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const parseResult = createCreditCardSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid credit card payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const card = await DatabaseService.createCreditCard(userId, parseResult.data);
    res.status(201).json({ success: true, data: card, creditCard: card });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create credit card.' },
    });
  }
});

/**
 * PUT /api/household/credit-cards/:id
 */
router.put(['/credit-cards/:id', '/cards/:id'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = updateCreditCardSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid credit card update payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const updated = await DatabaseService.updateCreditCard(userId, id, parseResult.data);
    if (!updated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Credit card not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: updated, creditCard: updated });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update credit card.' },
    });
  }
});

/**
 * DELETE /api/household/credit-cards/:id
 */
router.delete(['/credit-cards/:id', '/cards/:id'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const deleted = await DatabaseService.deleteCreditCard(userId, id);
    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Credit card not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: { id, deleted: true } });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete credit card.' },
    });
  }
});

// ==========================================
// 12. IMAGE/PDF FIRST AI ENTITY EXTRACTION & SAVE
// ==========================================

/**
 * POST /api/household/extract-entity-from-doc
 * Extracts structured Property, Asset, Warranty, Maintenance, Utility, Loan, or Card data
 * from an uploaded document for user review.
 */
router.post('/extract-entity-from-doc', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const parseResult = extractEntityFromDocSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid entity extraction request payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const { documentId, targetEntityType, targetEntityHint, notes } = parseResult.data;

  try {
    const docParam = documentId || (parseResult.data as any);
    const targetType = (targetEntityType || targetEntityHint) as any;
    const reviewData = await extractEntityFromDocument(userId, docParam, targetType, notes || undefined);
    res.status(200).json({
      success: true,
      data: reviewData,
    });
  } catch (error: unknown) {
    console.error('[EXTRACT_ENTITY] Failed to extract entity from doc:', {
      userId,
      documentId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to extract entity from document.',
      },
    });
  }
});

/**
 * POST /api/household/save-extracted-entity
 * Persists the user-reviewed and approved entity into the database.
 */
router.post('/save-extracted-entity', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const parseResult = saveExtractedEntitySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid extracted entity save payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const { entityType, entityData, sourceDocumentId } = parseResult.data;

  try {
    const result = await saveExtractedEntity(userId, entityType, entityData, sourceDocumentId);
    res.status(201).json({
      success: true,
      message: `Successfully created and saved ${entityType} record with document link.`,
      data: result,
    });
  } catch (error: unknown) {
    console.error('[SAVE_EXTRACTED_ENTITY] Failed to save entity:', {
      userId,
      entityType,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'SAVE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to save extracted entity.',
      },
    });
  }
});

// ==========================================
// 13. DEMO SEED & REMOVAL ENDPOINTS
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
