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
  memoryIdParamSchema,
  createHouseholdMemorySchema,
  updateHouseholdMemorySchema,
  createIssueSchema,
  updateIssueSchema,
  transitionIssueStatusSchema,
  addIssueActivitySchema,
  extractIssueSchema,
} from '../schemas';
import { HouseholdMemoryService } from '../services/agent/householdMemoryService';
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
import { extractIssueCandidateFromNaturalLanguage } from '../services/issueExtractionService';
import { evaluateIssueSafety } from '../services/issueSafetyService';
import { IssueIntelligenceService } from '../services/issueIntelligenceService';
import { searchHousehold } from '../services/searchService';
import { CalendarService } from '../services/calendarService';
import { NotificationService } from '../services/notificationService';
import { CrossDomainIntelligenceService } from '../services/crossDomainIntelligenceService';
import { UnifiedHouseholdActionService } from '../services/unifiedHouseholdActionService';

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
  const assetId = typeof req.query.assetId === 'string' ? req.query.assetId : undefined;

  try {
    const expenses = await DatabaseService.listExpenses(userId, req.userToken, assetId);
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
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;

  try {
    const assets = await DatabaseService.listAssets(userId, category);
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
 * Retrieves a single asset with optional relationships
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

  if (req.query.include === 'relationships' || req.query.include === 'true') {
    const relationships = await DatabaseService.getAssetRelationships(userId, paramResult.data.id);
    res.status(200).json({ success: true, data: asset, relationships });
    return;
  }

  res.status(200).json({ success: true, data: asset });
});

/**
 * GET /api/household/assets/:id/relationships
 * Retrieves all connected records (warranties, maintenance, expenses, documents, calendar, notifications)
 */
router.get('/assets/:id/relationships', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  const relationships = await DatabaseService.getAssetRelationships(userId, paramResult.data.id);
  if (!relationships) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Asset not found.',
      },
    });
    return;
  }

  res.status(200).json({ success: true, data: relationships });
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

/**
 * GET /api/household/search
 * Fast, deterministic, tenant-isolated global search across all household domains
 */
router.get('/search', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const category = typeof req.query.category === 'string' ? req.query.category : 'all';
  const limit = req.query.limit ? Math.min(Math.max(parseInt(req.query.limit as string, 10) || 40, 1), 100) : 40;

  try {
    const searchResponse = await searchHousehold(userId, q, category, limit);

    res.status(200).json({
      success: true,
      data: searchResponse,
      ...searchResponse,
    });
  } catch (error: unknown) {
    console.error('[SEARCH ROUTE] Failed to execute household search:', {
      userId,
      queryLength: q.length,
      category,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'Failed to execute household search. Please try again.',
      },
    });
  }
});

// ==========================================
// 4B. HOUSEHOLD CALENDAR & NOTIFICATIONS
// ==========================================

/**
 * GET /api/household/calendar/events (or /api/calendar/events)
 * Derives dynamic calendar events from all household records
 */
router.get(['/calendar/events', '/calendar'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
  const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;

  try {
    const calendarData = await CalendarService.getCalendarEvents(userId, {
      startDate,
      endDate,
      category,
      searchQuery: q,
    });

    res.status(200).json({
      success: true,
      data: calendarData,
      ...calendarData,
    });
  } catch (error: unknown) {
    console.error('[CALENDAR] Failed to retrieve household calendar events:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'CALENDAR_ERROR',
        message: 'Failed to load household calendar events.',
      },
    });
  }
});

/**
 * GET /api/household/notifications (or /api/notifications)
 * Retrieves active household notifications, unread counts, and user preferences
 */
router.get('/notifications', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const notificationsData = await NotificationService.getNotifications(userId);

    res.status(200).json({
      success: true,
      data: notificationsData,
      ...notificationsData,
    });
  } catch (error: unknown) {
    console.error('[NOTIFICATIONS] Failed to retrieve notifications:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'NOTIFICATIONS_ERROR',
        message: 'Failed to load household notifications.',
      },
    });
  }
});

/**
 * PUT /api/household/notifications/read-all
 */
router.put('/notifications/read-all', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const count = await NotificationService.markAllRead(userId);
    res.status(200).json({
      success: true,
      data: { markedCount: count },
      markedCount: count,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to mark all notifications as read.' },
    });
  }
});

/**
 * PUT /api/household/notifications/:id/read
 */
router.put('/notifications/:id/read', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    NotificationService.markRead(userId, id);
    res.status(200).json({
      success: true,
      data: { id, isRead: true },
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to mark notification as read.' },
    });
  }
});

/**
 * PUT /api/household/notifications/:id/unread
 */
router.put('/notifications/:id/unread', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    NotificationService.markUnread(userId, id);
    res.status(200).json({
      success: true,
      data: { id, isRead: false },
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to mark notification as unread.' },
    });
  }
});

/**
 * DELETE /api/household/notifications/:id
 */
router.delete('/notifications/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    NotificationService.dismiss(userId, id);
    res.status(200).json({
      success: true,
      data: { id, dismissed: true },
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to dismiss notification.' },
    });
  }
});

/**
 * GET /api/household/notifications/preferences
 */
router.get('/notifications/preferences', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const preferences = NotificationService.getPreferences(userId);
    res.status(200).json({
      success: true,
      data: preferences,
      preferences,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load notification preferences.' },
    });
  }
});

/**
 * PUT /api/household/notifications/preferences
 */
router.put('/notifications/preferences', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const body = req.body || {};

  try {
    const updated = NotificationService.updatePreferences(userId, body);
    res.status(200).json({
      success: true,
      data: updated,
      preferences: updated,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update notification preferences.' },
    });
  }
});

/**
 * POST /api/household/notifications/email-digest-test
 * Tests email delivery readiness architecture
 */
router.post('/notifications/email-digest-test', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const result = await NotificationService.simulateEmailDigest(userId);
    res.status(200).json({
      success: true,
      data: result,
      ...result,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'EMAIL_ERROR', message: 'Failed to test email notification service.' },
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
// 8b. UNIVERSAL HOUSEHOLD ISSUES / TICKETS (PHASE 24.2)
// ==========================================

/**
 * GET /api/household/issues
 */
router.get('/issues', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { assetId, propertyId, roomId, status, severity, category } = req.query;

  try {
    const issues = await DatabaseService.listIssues(userId, {
      assetId: assetId as string | undefined,
      propertyId: propertyId as string | undefined,
      roomId: roomId as string | undefined,
      status: status as any,
      severity: severity as any,
      category: category as string | undefined,
    });
    res.status(200).json({ success: true, data: issues, issues });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list household issues.' },
    });
  }
});

/**
 * GET /api/household/issues/recurring-insights
 * Aggregates recurring issue and failure patterns across the household
 */
router.get('/issues/recurring-insights', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  try {
    const patterns = await IssueIntelligenceService.getHouseholdRecurringPatterns(userId);
    res.status(200).json({ success: true, data: patterns, patterns });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch recurring insights.' },
    });
  }
});

/**
 * GET /api/household/issues/:id
 */
router.get('/issues/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const issue = await DatabaseService.getIssue(userId, id);
  if (!issue) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Household issue not found.' } });
    return;
  }
  res.status(200).json({ success: true, data: issue, issue });
});

/**
 * POST /api/household/issues
 */
router.post('/issues', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const parseResult = createIssueSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid household issue payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const issue = await DatabaseService.createIssue(userId, parseResult.data);
    res.status(201).json({ success: true, data: issue, issue });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create household issue.' },
    });
  }
});

/**
 * PUT /api/household/issues/:id
 */
router.put('/issues/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = updateIssueSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid household issue update payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const updated = await DatabaseService.updateIssue(userId, id, parseResult.data);
    if (!updated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Household issue not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: updated, issue: updated });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update household issue.' },
    });
  }
});

/**
 * POST /api/household/issues/:id/transition
 */
router.post('/issues/:id/transition', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = transitionIssueStatusSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid issue status transition payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const targetStatus = (parseResult.data.newStatus || parseResult.data.status)!;
    const updated = await DatabaseService.transitionIssueStatus(
      userId,
      id,
      targetStatus,
      {
        note: parseResult.data.note,
        resolution: parseResult.data.resolution,
        actualCost: parseResult.data.actualCost,
      }
    );
    res.status(200).json({ success: true, data: updated, issue: updated });
  } catch (error: any) {
    const isNotFound = error.message?.includes('not found');
    const isInvalid = error.message?.includes('Invalid status transition');
    res.status(isNotFound ? 404 : isInvalid ? 400 : 500).json({
      success: false,
      error: {
        code: isNotFound ? 'NOT_FOUND' : isInvalid ? 'INVALID_TRANSITION' : 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to transition issue status.',
      },
    });
  }
});

/**
 * POST /api/household/issues/:id/activity
 */
router.post('/issues/:id/activity', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  const parseResult = addIssueActivitySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid activity history payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const updated = await DatabaseService.addIssueActivity(
      userId,
      id,
      parseResult.data.action,
      parseResult.data.note
    );
    res.status(200).json({ success: true, data: updated, issue: updated });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to add activity.' },
    });
  }
});

/**
 * DELETE /api/household/issues/:id
 */
router.delete('/issues/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const deleted = await DatabaseService.deleteIssue(userId, id);
    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Household issue not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: { id, deleted: true } });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete household issue.' },
    });
  }
});

/**
 * GET /api/household/issues/:id/intelligence
 * Returns rich deterministic and synthesized intelligence for a single issue
 */
router.get('/issues/:id/intelligence', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const report = await IssueIntelligenceService.analyzeIssue(userId, id);
    res.status(200).json({ success: true, data: report, report });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: { code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to analyze issue.' },
    });
  }
});

/**
 * POST /api/household/issues/:id/link-related
 * Explicit user confirmation to link another issue as related/duplicate
 */
router.post('/issues/:id/link-related', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;
  const { targetIssueId } = req.body;

  if (!targetIssueId || typeof targetIssueId !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'targetIssueId is required.' },
    });
    return;
  }

  try {
    const result = await IssueIntelligenceService.linkRelatedIssues(userId, id, targetIssueId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: { code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to link issues.' },
    });
  }
});

/**
 * POST /api/household/issues/:id/unlink-related
 * Explicit user confirmation to unlink a related issue
 */
router.post('/issues/:id/unlink-related', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;
  const { targetIssueId } = req.body;

  if (!targetIssueId || typeof targetIssueId !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'targetIssueId is required.' },
    });
    return;
  }

  try {
    const result = await IssueIntelligenceService.unlinkRelatedIssue(userId, id, targetIssueId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: { code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to unlink issue.' },
    });
  }
});

/**
 * PUT /api/household/issues/:id/checklist
 * Updates user toggled checklist items for the issue resolution lifecycle
 */
router.put('/issues/:id/checklist', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;
  const { checklist } = req.body;

  if (!Array.isArray(checklist)) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Checklist array is required.' },
    });
    return;
  }

  try {
    const result = await IssueIntelligenceService.updateResolutionChecklist(userId, id, checklist);
    res.status(200).json({ success: true, data: result.checklist });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: { code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update checklist.' },
    });
  }
});

/**
 * PUT /api/household/issues/:id/root-cause
 * Updates the recorded root cause of the issue
 */
router.put('/issues/:id/root-cause', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { id } = req.params;
  const { rootCause } = req.body;

  try {
    const updated = await DatabaseService.updateIssue(userId, id, { rootCause: rootCause || '' });
    if (!updated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Issue not found.' } });
      return;
    }
    res.status(200).json({ success: true, data: updated, issue: updated });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update root cause.' },
    });
  }
});

/**
 * POST /api/household/issues/extract
 * Extracts a structured issue candidate from natural language input (with deterministic safety checks)
 */
router.post('/issues/extract', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const parseResult = extractIssueSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid extraction payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const assets = await DatabaseService.listAssets(userId);
    const properties = await DatabaseService.listProperties(userId);
    const rooms = await DatabaseService.listRooms(userId);

    const contextAssets = assets.map((a) => ({ id: a.id, name: a.name, category: a.category }));
    const contextProperties = properties.map((p) => ({ id: p.id, name: p.name }));
    const contextRooms = rooms.map((r) => ({ id: r.id, name: r.name, propertyId: r.propertyId }));

    const candidate = await extractIssueCandidateFromNaturalLanguage(
      userId,
      (parseResult.data.input || parseResult.data.text)!,
      parseResult.data.contextAssetId
    );

    res.status(200).json({
      success: true,
      data: candidate,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to extract issue candidate.' },
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

/**
 * GET /api/household/export
 * Generates an authoritative full JSON vault export of all household data
 */
router.get('/export', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  try {
    const profile = await DatabaseService.getProfile(userId, req.userToken);
    const properties = await DatabaseService.listProperties(userId);
    const rooms = await DatabaseService.listRooms(userId);
    const assets = await DatabaseService.listAssets(userId);
    const maintenances = await DatabaseService.listMaintenances(userId);
    const warranties = await DatabaseService.listWarranties(userId);
    const utilities = await DatabaseService.listUtilities(userId);
    const loans = await DatabaseService.listLoans(userId);
    const creditCards = await DatabaseService.listCreditCards(userId);
    const expenses = await DatabaseService.listExpenses(userId, req.userToken);
    const transactions = await DatabaseService.listTransactions(userId);
    const documents = await DatabaseService.listDocuments(userId);
    const scenarios = await DatabaseService.listScenarios(userId);
    const insights = await DatabaseService.listInsights(userId);

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId,
      householdProfile: profile,
      dataInventory: {
        propertiesCount: properties.length,
        roomsCount: rooms.length,
        assetsCount: assets.length,
        maintenancesCount: maintenances.length,
        warrantiesCount: warranties.length,
        utilitiesCount: utilities.length,
        loansCount: loans.length,
        creditCardsCount: creditCards.length,
        expensesCount: expenses.length,
        transactionsCount: transactions.length,
        documentsCount: documents.length,
        scenariosCount: scenarios.length,
        insightsCount: insights.length,
      },
      properties,
      rooms,
      assets,
      maintenances,
      warranties,
      utilities,
      loans,
      creditCards,
      expenses,
      transactions,
      documents,
      scenarios,
      insights,
    };

    res.status(200).json({
      success: true,
      data: exportData,
    });
  } catch (error: unknown) {
    console.error('[EXPORT] Failed to generate household export:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'EXPORT_FAILED',
        message: 'Failed to generate household data export package.',
      },
    });
  }
});

// ==========================================
// Phase 3: Household Health Intelligence Routes
// ==========================================

/**
 * GET /api/household/health
 * Returns complete deterministic Household Health Report
 */
router.get('/health', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const includeAiExplanation = req.query.includeAiExplanation === 'true';

  try {
    const { HouseholdHealthService } = await import('../services/householdHealthService');
    const report = await HouseholdHealthService.getHouseholdHealth(userId, {
      includeAiExplanation,
    });

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('[HOUSEHOLD] Error computing health intelligence:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to calculate household health intelligence.',
      },
    });
  }
});

/**
 * POST /api/household/health/explain
 * Generates an on-demand AI explanation and prioritized roadmap for household health
 */
router.post('/health/explain', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const { HouseholdHealthService } = await import('../services/householdHealthService');
    const explanation = await HouseholdHealthService.explainHouseholdHealth(userId);

    res.status(200).json({
      success: true,
      data: explanation,
    });
  } catch (error: any) {
    console.error('[HOUSEHOLD] Error generating health AI explanation:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate health explanation.',
      },
    });
  }
});

// ==========================================
// 19. CONTROLLED HOUSEHOLD MEMORY (PHASE 20)
// ==========================================

/**
 * GET /api/household/memory
 * Retrieves tenant-isolated confirmed/all household memories
 */
router.get('/memory', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const confirmedOnly = req.query.confirmedOnly === 'true';

  try {
    const memories = await HouseholdMemoryService.getMemories(userId, confirmedOnly);
    res.status(200).json({
      success: true,
      data: {
        total: memories.length,
        memories,
      },
    });
  } catch (error: any) {
    console.error('[HOUSEHOLD] Error retrieving memories:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve household memories.',
      },
    });
  }
});

/**
 * POST /api/household/memory
 * Creates a new confirmed or proposed household memory item with privacy validation
 */
router.post('/memory', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const parsed = createHouseholdMemorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message || 'Invalid memory payload.',
        details: parsed.error.issues,
      },
    });
    return;
  }

  try {
    const memory = await HouseholdMemoryService.addMemory(userId, parsed.data);
    res.status(201).json({
      success: true,
      data: memory,
    });
  } catch (error: any) {
    console.warn('[HOUSEHOLD] Memory creation rejected:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(400).json({
      success: false,
      error: {
        code: 'MEMORY_REJECTED',
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

/**
 * PUT /api/household/memory/:id/confirm
 * Explicitly confirms a suggested household memory item
 */
router.put('/memory/:id/confirm', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const paramCheck = memoryIdParamSchema.safeParse(req.params);
  if (!paramCheck.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid memory ID format.',
      },
    });
    return;
  }

  try {
    const memory = await HouseholdMemoryService.confirmMemory(userId, req.params.id);
    if (!memory) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Household memory '${req.params.id}' not found.`,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: memory,
    });
  } catch (error: any) {
    console.error('[HOUSEHOLD] Error confirming memory:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to confirm household memory.',
      },
    });
  }
});

/**
 * DELETE /api/household/memory/:id
 * Deletes a household memory item
 */
router.delete('/memory/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  const paramCheck = memoryIdParamSchema.safeParse(req.params);
  if (!paramCheck.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid memory ID format.',
      },
    });
    return;
  }

  try {
    const deleted = await HouseholdMemoryService.deleteMemory(userId, req.params.id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Household memory '${req.params.id}' not found.`,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Household memory deleted successfully.',
    });
  } catch (error: any) {
    console.error('[HOUSEHOLD] Error deleting memory:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete household memory.',
      },
    });
  }
});

// ==========================================
// 12. PHASE 24.4: CROSS-DOMAIN HOUSEHOLD INTELLIGENCE
// ==========================================

/**
 * GET /api/household/cross-domain-insights
 * Derives deterministic, cross-domain insights linking Assets, Issues, Warranties, Maintenance, Finance, and Documents
 */
router.get('/cross-domain-insights', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const priority = typeof req.query.priority === 'string' ? req.query.priority : undefined;
  const type = typeof req.query.type === 'string' ? req.query.type : undefined;
  const includeDismissed = req.query.includeDismissed === 'true';
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

  try {
    const result = await CrossDomainIntelligenceService.generateCrossDomainInsights(userId, {
      priority,
      type,
      includeDismissed,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result,
      ...result,
    });
  } catch (error: any) {
    console.error('[CROSS_DOMAIN] Error generating cross-domain insights:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to derive cross-domain household insights.',
      },
    });
  }
});

/**
 * POST /api/household/cross-domain-insights/dismiss
 * Acknowledges or dismisses a cross-domain insight without mutating source entities
 */
router.post('/cross-domain-insights/dismiss', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { insightId, fingerprint } = req.body;
  const targetId = fingerprint || insightId;

  if (!targetId || typeof targetId !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PARAMETERS',
        message: 'insightId or fingerprint is required to dismiss insight.',
      },
    });
    return;
  }

  try {
    await CrossDomainIntelligenceService.dismissCrossDomainInsight(userId, targetId);

    res.status(200).json({
      success: true,
      message: 'Insight dismissed successfully.',
    });
  } catch (error: any) {
    console.error('[CROSS_DOMAIN] Error dismissing insight:', {
      userId,
      targetId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to dismiss cross-domain insight.',
      },
    });
  }
});

/**
 * GET /api/household/timeline
 * Aggregates all operational events across all domains into a unified chronological stream
 */
router.get('/timeline', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const domain = typeof req.query.domain === 'string' ? req.query.domain : undefined;
  const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
  const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

  try {
    const timeline = await CrossDomainIntelligenceService.generateHouseholdTimeline(userId, {
      domain,
      startDate,
      endDate,
      limit,
    });

    res.status(200).json({
      success: true,
      data: timeline,
      ...timeline,
    });
  } catch (error: any) {
    console.error('[TIMELINE] Error generating operational timeline:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve household operational timeline.',
      },
    });
  }
});

/**
 * GET /api/household/graph
 * Returns lightweight entity relationship graph for the authenticated household
 */
router.get('/graph', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    const graph = await CrossDomainIntelligenceService.buildHouseholdGraph(userId);

    res.status(200).json({
      success: true,
      data: graph,
      ...graph,
    });
  } catch (error: any) {
    console.error('[GRAPH] Error building household graph:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to construct household relationship graph.',
      },
    });
  }
});

// ==========================================
// 13. PHASE 24.5: UNIFIED HOUSEHOLD ACTIONS
// ==========================================

/**
 * GET /api/household/unified-actions
 * Retrieves consolidated, prioritized, and deduplicated action recommendations
 */
router.get('/unified-actions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const priority = typeof req.query.priority === 'string' ? req.query.priority : undefined;
  const domain = typeof req.query.domain === 'string' ? req.query.domain : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

  try {
    const result = await UnifiedHouseholdActionService.getUnifiedActions(userId, {
      priority,
      domain,
      status,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result,
      ...result,
    });
  } catch (error: any) {
    console.error('[UNIFIED_ACTIONS] Error generating unified actions:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to derive unified household action recommendations.',
      },
    });
  }
});

/**
 * POST /api/household/unified-actions/:id/dismiss
 * Non-destructively dismisses an action recommendation
 */
router.post('/unified-actions/:id/dismiss', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const actionId = req.params.id;
  const { fingerprint } = req.body || {};

  if (!actionId) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PARAMETERS', message: 'Action ID is required.' },
    });
    return;
  }

  try {
    const result = await UnifiedHouseholdActionService.dismissAction(userId, actionId, fingerprint);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Action recommendation dismissed.',
    });
  } catch (error: any) {
    console.error('[UNIFIED_ACTIONS] Error dismissing action:', {
      userId,
      actionId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to dismiss action recommendation.' },
    });
  }
});

/**
 * POST /api/household/unified-actions/:id/snooze
 * Snoozes an action recommendation for N days
 */
router.post('/unified-actions/:id/snooze', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const actionId = req.params.id;
  const { durationDays, fingerprint } = req.body || {};

  if (!actionId) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PARAMETERS', message: 'Action ID is required.' },
    });
    return;
  }

  try {
    const result = await UnifiedHouseholdActionService.snoozeAction(
      userId,
      actionId,
      Number(durationDays) || 7,
      fingerprint
    );
    res.status(200).json({
      success: true,
      data: result,
      message: 'Action recommendation snoozed.',
    });
  } catch (error: any) {
    console.error('[UNIFIED_ACTIONS] Error snoozing action:', {
      userId,
      actionId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to snooze action recommendation.' },
    });
  }
});

/**
 * POST /api/household/unified-actions/:id/complete
 * Marks an action recommendation completed
 */
router.post('/unified-actions/:id/complete', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const actionId = req.params.id;
  const { fingerprint } = req.body || {};

  if (!actionId) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PARAMETERS', message: 'Action ID is required.' },
    });
    return;
  }

  try {
    const result = await UnifiedHouseholdActionService.completeAction(userId, actionId, fingerprint);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Action recommendation marked completed.',
    });
  } catch (error: any) {
    console.error('[UNIFIED_ACTIONS] Error completing action:', {
      userId,
      actionId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to complete action recommendation.' },
    });
  }
});

// ==========================================
// Phase 24.6: Morning Brief UX Endpoints
// ==========================================

/**
 * GET /api/household/morning-brief
 * Returns comprehensive daily household morning brief
 */
router.get('/morning-brief', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  try {
    const { HouseholdMorningBriefService } = await import('../services/agent/householdMorningBrief');
    const brief = await HouseholdMorningBriefService.generateMorningBrief(userId);
    res.status(200).json({
      success: true,
      data: brief,
    });
  } catch (error: any) {
    console.error('[HOUSEHOLD] Error generating morning brief:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: { code: 'MORNING_BRIEF_ERROR', message: 'Failed to generate morning brief.' },
    });
  }
});

/**
 * POST /api/household/morning-brief/dismiss-today
 * Records dismissal timestamp for today's morning brief so it does not pop up repeatedly
 */
router.post('/morning-brief/dismiss-today', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    await DatabaseService.setProfile(userId, { lastDismissedBriefDate: todayStr }, req.userToken);
    res.status(200).json({
      success: true,
      data: { dismissedDate: todayStr, isDismissedToday: true },
      message: "Today's morning brief dismissed from auto-presentation.",
    });
  } catch (error: any) {
    console.error('[HOUSEHOLD] Error dismissing morning brief:', {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to record morning brief dismissal.' },
    });
  }
});

export default router;

