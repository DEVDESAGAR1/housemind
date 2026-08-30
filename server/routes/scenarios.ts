import { Router, Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { DatabaseService } from '../services/dbService';
import {
  idParamSchema,
  createScenarioSchema,
  updateScenarioSchema,
  simulateScenarioSchema,
  compareScenariosSchema,
} from '../schemas';
import {
  calculateBaselineMetrics,
  calculateScenarioProjection,
  runFullSimulation,
  explainScenarioWithGemini,
} from '../services/scenarioEngine';
import { Scenario, ScenarioComparison } from '../../src/types';

export const scenariosRouter = Router();

// Enforce authentication on all scenario endpoints
scenariosRouter.use(requireAuth);

/**
 * GET /api/scenarios/baseline
 * Retrieves the current household baseline metrics for scenario modeling
 */
scenariosRouter.get('/baseline', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  try {
    const baseline = await calculateBaselineMetrics(userId, req.userToken);
    res.status(200).json({
      success: true,
      data: baseline,
    });
  } catch (error: any) {
    console.error(`[SCENARIOS] Failed to compute baseline for ${userId}:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BASELINE_CALCULATION_ERROR',
        message: error.message || 'Failed to compute baseline metrics.',
      },
    });
  }
});

/**
 * POST /api/scenarios/simulate
 * Runs an instant deterministic simulation without saving
 */
scenariosRouter.post('/simulate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const parseResult = simulateScenarioSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid simulation payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const { type, inputs } = parseResult.data;
    const baseline = await calculateBaselineMetrics(userId, req.userToken);
    const { projected, affordability } = calculateScenarioProjection(baseline, inputs, type);

    res.status(200).json({
      success: true,
      data: {
        type,
        inputs,
        baselineMetrics: baseline,
        projectedMetrics: projected,
        affordability,
      },
    });
  } catch (error: any) {
    console.error(`[SCENARIOS] Simulation error for ${userId}:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SIMULATION_ERROR',
        message: error.message || 'Failed to run scenario simulation.',
      },
    });
  }
});

/**
 * GET /api/scenarios
 * Lists all saved scenarios for the user
 */
scenariosRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  try {
    const scenarios = await DatabaseService.listScenarios(userId, req.userToken);
    res.status(200).json({
      success: true,
      data: scenarios,
    });
  } catch (error: any) {
    console.error(`[SCENARIOS] Failed to list scenarios for ${userId}:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve scenarios.',
      },
    });
  }
});

/**
 * POST /api/scenarios
 * Creates, simulates, and saves a new scenario
 */
scenariosRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const parseResult = createScenarioSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid scenario creation payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const { title, description, type, inputs, isPinned } = parseResult.data;
    const scenario = await runFullSimulation(
      userId,
      title,
      type,
      inputs,
      description || undefined,
      undefined,
      req.userToken
    );

    if (isPinned !== undefined) {
      scenario.isPinned = isPinned;
    }

    const saved = await DatabaseService.createScenario(userId, scenario, scenario.id, req.userToken);

    res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (error: any) {
    console.error(`[SCENARIOS] Failed to create scenario for ${userId}:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SCENARIO_CREATION_FAILED',
        message: error.message || 'Failed to create scenario.',
      },
    });
  }
});

/**
 * GET /api/scenarios/:id
 * Retrieves a single scenario
 */
scenariosRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const idResult = idParamSchema.safeParse(req.params);
  if (!idResult.success) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: 'Invalid scenario ID.' },
    });
    return;
  }

  try {
    const scenario = await DatabaseService.getScenario(userId, idResult.data.id, req.userToken);
    if (!scenario) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Scenario not found.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: scenario,
    });
  } catch (error: any) {
    console.error(`[SCENARIOS] Failed to get scenario ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch scenario.' },
    });
  }
});

/**
 * PUT /api/scenarios/:id
 * Updates scenario details, inputs, or notes and recomputes the projection
 */
scenariosRouter.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const idResult = idParamSchema.safeParse(req.params);
  if (!idResult.success) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: 'Invalid scenario ID.' },
    });
    return;
  }

  const parseResult = updateScenarioSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid update payload.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const existing = await DatabaseService.getScenario(userId, idResult.data.id, req.userToken);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Scenario not found.' },
      });
      return;
    }

    const newTitle = parseResult.data.title || existing.title;
    const newDescription = parseResult.data.description !== undefined ? parseResult.data.description : existing.description;
    const newType = parseResult.data.type || existing.type;
    const newInputs = parseResult.data.inputs
      ? { ...existing.inputs, ...parseResult.data.inputs }
      : existing.inputs;
    const newIsPinned = parseResult.data.isPinned !== undefined ? parseResult.data.isPinned : existing.isPinned;

    // Recalculate deterministic metrics
    const baseline = await calculateBaselineMetrics(userId, req.userToken);
    const { projected, affordability } = calculateScenarioProjection(baseline, newInputs, newType);

    const updated = await DatabaseService.updateScenario(
      userId,
      idResult.data.id,
      {
        title: newTitle,
        description: newDescription || undefined,
        type: newType,
        inputs: newInputs,
        baselineMetrics: baseline,
        projectedMetrics: projected,
        affordability,
        isPinned: newIsPinned,
        // Reset gemini explanation on input change so it reflects the new numbers
        geminiExplanation: null,
      },
      req.userToken
    );

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error(`[SCENARIOS] Failed to update scenario ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message || 'Failed to update scenario.' },
    });
  }
});

/**
 * POST /api/scenarios/:id/duplicate
 * Clones a scenario
 */
scenariosRouter.post('/:id/duplicate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const idResult = idParamSchema.safeParse(req.params);
  if (!idResult.success) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: 'Invalid scenario ID.' },
    });
    return;
  }

  try {
    const existing = await DatabaseService.getScenario(userId, idResult.data.id, req.userToken);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Scenario not found.' },
      });
      return;
    }

    const clonedTitle = `${existing.title} (Copy)`;
    const newScenario = await runFullSimulation(
      userId,
      clonedTitle,
      existing.type,
      existing.inputs,
      existing.description,
      undefined,
      req.userToken
    );

    const saved = await DatabaseService.createScenario(userId, newScenario, newScenario.id, req.userToken);

    res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (error: any) {
    console.error(`[SCENARIOS] Failed to duplicate scenario ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: { code: 'DUPLICATION_FAILED', message: error.message || 'Failed to duplicate scenario.' },
    });
  }
});

/**
 * POST /api/scenarios/:id/recalculate
 * Re-runs simulation against fresh baseline data
 */
scenariosRouter.post('/:id/recalculate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const idResult = idParamSchema.safeParse(req.params);
  if (!idResult.success) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: 'Invalid scenario ID.' },
    });
    return;
  }

  try {
    const existing = await DatabaseService.getScenario(userId, idResult.data.id, req.userToken);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Scenario not found.' },
      });
      return;
    }

    const baseline = await calculateBaselineMetrics(userId, req.userToken);
    const { projected, affordability } = calculateScenarioProjection(
      baseline,
      existing.inputs,
      existing.type
    );

    const updated = await DatabaseService.updateScenario(
      userId,
      idResult.data.id,
      {
        baselineMetrics: baseline,
        projectedMetrics: projected,
        affordability,
      },
      req.userToken
    );

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error(`[SCENARIOS] Failed to recalculate scenario ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: { code: 'RECALCULATION_FAILED', message: error.message || 'Failed to recalculate.' },
    });
  }
});

/**
 * POST /api/scenarios/:id/explain
 * Generates an objective, grounded Gemini explanation
 */
scenariosRouter.post('/:id/explain', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const idResult = idParamSchema.safeParse(req.params);
  if (!idResult.success) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: 'Invalid scenario ID.' },
    });
    return;
  }

  try {
    const explanation = await explainScenarioWithGemini(userId, idResult.data.id, req.userToken);
    res.status(200).json({
      success: true,
      data: explanation,
    });
  } catch (error: any) {
    console.error(`[SCENARIOS] Failed to explain scenario ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXPLANATION_FAILED',
        message: error.message || 'Failed to generate explanation.',
      },
    });
  }
});

/**
 * DELETE /api/scenarios/:id
 * Deletes a scenario
 */
scenariosRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const idResult = idParamSchema.safeParse(req.params);
  if (!idResult.success) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: 'Invalid scenario ID.' },
    });
    return;
  }

  try {
    const deleted = await DatabaseService.deleteScenario(userId, idResult.data.id, req.userToken);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Scenario not found or already deleted.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { id: idResult.data.id, deleted: true },
    });
  } catch (error: any) {
    console.error(`[SCENARIOS] Failed to delete scenario ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: error.message || 'Failed to delete scenario.' },
    });
  }
});

/**
 * POST /api/scenarios/compare
 * Compares 2 to 5 scenarios side by side in a structured comparison matrix
 */
scenariosRouter.post('/compare', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  const parseResult = compareScenariosSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid comparison request.',
        details: parseResult.error.flatten().fieldErrors,
      },
    });
    return;
  }

  try {
    const { scenarioIds } = parseResult.data;
    const scenarios: Scenario[] = [];

    for (const id of scenarioIds) {
      const scen = await DatabaseService.getScenario(userId, id, req.userToken);
      if (scen) {
        scenarios.push(scen);
      }
    }

    if (scenarios.length < 2) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_SCENARIOS',
          message: 'At least 2 valid scenarios must be found for comparison.',
        },
      });
      return;
    }

    // Build comparison matrix
    const labels = scenarios.map((s) => s.title);
    const monthlyIncomes = scenarios.map((s) => s.projectedMetrics.projectedMonthlyIncome);
    const monthlyExpenses = scenarios.map((s) => s.projectedMetrics.projectedMonthlyExpenses);
    const netMonthlySurpluses = scenarios.map((s) => s.projectedMetrics.projectedNetSurplus);
    const savingsRates = scenarios.map((s) => s.projectedMetrics.projectedSavingsRate);
    const surplusDeltas = scenarios.map((s) => s.projectedMetrics.surplusDelta);
    const pressureScores = scenarios.map((s) => s.affordability.financialPressureScore);
    const affordabilityStatuses = scenarios.map((s) => s.affordability.status);
    const oneTimeCosts = scenarios.map((s) => s.projectedMetrics.oneTimeCashImpact || 0);
    const totalLoanCosts = scenarios.map((s) => s.projectedMetrics.totalLoanCost || 0);

    // Deterministically recommend the optimal scenario (lowest pressure score / highest surplus)
    let bestScenario = scenarios[0];
    for (let i = 1; i < scenarios.length; i++) {
      if (
        scenarios[i].affordability.financialPressureScore <
          bestScenario.affordability.financialPressureScore ||
        (scenarios[i].affordability.financialPressureScore ===
          bestScenario.affordability.financialPressureScore &&
          scenarios[i].projectedMetrics.projectedNetSurplus >
            bestScenario.projectedMetrics.projectedNetSurplus)
      ) {
        bestScenario = scenarios[i];
      }
    }

    const comparisonResult: ScenarioComparison = {
      scenarios,
      comparisonMatrix: {
        labels,
        monthlyIncomes,
        monthlyExpenses,
        netMonthlySurpluses,
        savingsRates,
        surplusDeltas,
        pressureScores,
        affordabilityStatuses,
        oneTimeCosts,
        totalLoanCosts,
      },
      recommendedScenarioId: bestScenario.id,
      recommendationReason: `"${bestScenario.title}" preserves the strongest financial buffer (${bestScenario.projectedMetrics.projectedSavingsRate}% savings rate with a pressure score of ${bestScenario.affordability.financialPressureScore}/100).`,
    };

    res.status(200).json({
      success: true,
      data: comparisonResult,
    });
  } catch (error: any) {
    console.error(`[SCENARIOS] Comparison error for ${userId}:`, error);
    res.status(500).json({
      success: false,
      error: { code: 'COMPARISON_ERROR', message: error.message || 'Failed to compare scenarios.' },
    });
  }
});
