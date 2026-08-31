import express, { Express } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  helmetMiddleware,
  corsMiddleware,
  apiLimiter,
  uploadLimiter,
  aiLimiter,
  requestLogger,
  errorHandler,
} from './server/middleware/security';
import healthRouter from './server/routes/health';
import householdRouter from './server/routes/household';
import copilotRouter from './server/routes/copilot';
import intelligenceRouter from './server/routes/intelligence';
import { documentsRouter, importsRouter } from './server/routes/documents';
import { transactionsRouter } from './server/routes/transactions';
import { scenariosRouter } from './server/routes/scenarios';

export function buildExpressApp(): Express {
  const app = express();

  // Cloud Run / Reverse Proxy Configuration
  app.set('trust proxy', 1);

  // 1. Basic Security & Parsing Middleware
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestLogger);

  // 2. API Routes (Mounted BEFORE Vite or Static Handlers)
  app.use('/api', apiLimiter);
  app.use('/api/health', healthRouter);
  app.use('/api/household', householdRouter);
  app.use('/api/copilot', aiLimiter, copilotRouter);
  app.use('/api/intelligence', aiLimiter, intelligenceRouter);
  app.use('/api/documents', uploadLimiter, documentsRouter);
  app.use('/api/imports', uploadLimiter, importsRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/scenarios', scenariosRouter);

  // 3. API Error Handler
  app.use('/api', errorHandler);

  return app;
}

async function startServer() {
  const app = buildExpressApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // 4. Vite Middleware (Dev) or Static Assets (Prod)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 5. Final fallback error handler
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HOUSEMIND SERVER] Running on port ${PORT} (host: 0.0.0.0, mode: ${process.env.NODE_ENV || 'development'})`);
  });
}

// Start server when executed directly as entrypoint
const isDirectEntry =
  process.env.NODE_ENV !== 'test' &&
  typeof process.argv[1] === 'string' &&
  (/server\.(ts|cjs|js)$/.test(process.argv[1]) ||
    process.env.npm_lifecycle_event === 'dev' ||
    process.env.npm_lifecycle_event === 'start');

if (isDirectEntry) {
  startServer().catch((err) => {
    console.error('[HOUSEMIND SERVER] Fatal startup failure:', err);
    process.exit(1);
  });
}


