import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Production-hardened Helmet with CSP configured for Google AI Studio and Firebase
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://*.firebaseapp.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.googleusercontent.com", "https://*.gstatic.com", "https://*.firebasestorage.app"],
      connectSrc: [
        "'self'",
        "https://*.googleapis.com",
        "https://*.firebaseio.com",
        "https://*.cloudfunctions.net",
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com",
        "https://firestore.googleapis.com",
        "https://generativelanguage.googleapis.com",
        "wss:",
      ],
      frameSrc: ["'self'", "https://*.firebaseapp.com", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'sameorigin' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

// Trusted Origin regex patterns for production & local development
const TRUSTED_ORIGIN_PATTERNS = [
  /^https:\/\/(?:[a-zA-Z0-9-]+\.)*ai\.studio$/,
  /^https:\/\/(?:[a-zA-Z0-9-]+\.)*run\.app$/,
  /^https:\/\/(?:[a-zA-Z0-9-]+\.)*web\.app$/,
  /^https:\/\/(?:[a-zA-Z0-9-]+\.)*firebaseapp\.com$/,
  /^https?:\/\/localhost(?::\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
];

/**
 * Validates request origin against trusted domain patterns and optional environment allowlist.
 * Returns true for allowed origins or empty origins (same-origin, curl, server-to-server).
 */
export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true; // Same-origin, direct server-to-server, mobile or CLI requests

  const envAllowed = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().toLowerCase())
    : [];

  const normalized = origin.trim().toLowerCase();
  if (envAllowed.includes(normalized)) {
    return true;
  }

  return TRUSTED_ORIGIN_PATTERNS.some((pattern) => pattern.test(normalized));
}

// Explicit allowlist CORS configuration
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
});

// Safe IP extractor to prevent ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
const getSafeClientIp = (req: Request): string => {
  return (
    req.ip ||
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : undefined) ||
    req.socket.remoteAddress ||
    '127.0.0.1'
  );
};

// Rate limiting for general API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // 600 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    keyGeneratorIpFallback: false,
    xForwardedForHeader: false,
    default: true,
  },
  keyGenerator: getSafeClientIp,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later.',
    },
  },
});

// Stricter rate limiting for document parsing & uploads
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 document uploads per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    keyGeneratorIpFallback: false,
    xForwardedForHeader: false,
    default: true,
  },
  keyGenerator: getSafeClientIp,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Document ingestion rate limit reached. Please wait a few moments before uploading additional files.',
    },
  },
});

// Rate limiting for AI / Gemini intensive endpoints
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 120, // 120 AI requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    keyGeneratorIpFallback: false,
    xForwardedForHeader: false,
    default: true,
  },
  keyGenerator: getSafeClientIp,
  message: {
    success: false,
    error: {
      code: 'AI_RATE_LIMIT_EXCEEDED',
      message: 'AI generation rate limit exceeded. Please wait a moment before sending new prompts.',
    },
  },
});

// Structured Request Logger with format-string safety
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    // Log without sensitive query params, body data, or authorization tokens
    console.log('[API_ACCESS]', { method, url, status, durationMs: duration });
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
  console.error('[SERVER_ERROR]', {
    method: req.method,
    url: req.originalUrl,
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
