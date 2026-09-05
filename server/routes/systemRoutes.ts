import express, { Request, Response } from 'express';
import { isGeminiConfigured, getGeminiModel } from '../config/secrets';

const router = express.Router();

/**
 * GET /api/system/ai-status
 * Safe authenticated status endpoint reporting current AI assistance availability.
 * Strictly avoids exposing any secret material, API keys, or stack traces.
 */
router.get('/ai-status', (req: Request, res: Response) => {
  const configured = isGeminiConfigured();
  
  // High-level safe status representation
  const status: 'available' | 'unavailable' | 'not_configured' = configured
    ? 'available'
    : 'not_configured';

  res.json({
    success: true,
    data: {
      status,
      model: configured ? getGeminiModel() : 'none',
      fallbackMode: 'deterministic_household_intelligence',
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
