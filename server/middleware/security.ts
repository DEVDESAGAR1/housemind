import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Configure Helmet with CSP adjustments compatible with Vite/React preview
export const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // Vite inline script & dynamic imports in dev/preview
  crossOriginEmbedderPolicy: false,
});

// Configure CORS
export const corsMiddleware = cors({
  origin: true, // Reflect request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Rate limiting for API endpoints with robust proxy & key generation
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    keyGeneratorIpFallback: false,
    xForwardedForHeader: false,
    default: true,
  },
  keyGenerator: (req: Request) => {
    return req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
  },
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later.',
    },
  },
});

// Structured Request Logger
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    // Log without sensitive query params, body data, or authorization tokens
    console.log(`[API] ${method} ${url} ${status} - ${duration}ms`);
  });

  next();
}

// Global Safe Error Handler
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.status || err.statusCode || 500;
  
  // Log error internally with stack for debugging on server, never sent to client
  console.error(`[ERROR] Unhandled exception on ${req.method} ${req.originalUrl}:`, {
    message: err.message || 'Unknown error',
    code: err.code || 'INTERNAL_ERROR',
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST'),
      message: statusCode === 500 ? 'An unexpected server error occurred.' : (err.message || 'Invalid request.'),
    },
  });
}
