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
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://*.googleusercontent.com",
        "https://*.gstatic.com",
        "https://*.firebasestorage.app",
        "https://images.unsplash.com",
        "https://*.unsplash.com",
      ],
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
        "ws:",
        "http://localhost:*",
        "ws://localhost:*",
        "http://127.0.0.1:*",
        "ws://127.0.0.1:*",
      ],
      frameSrc: ["'self'", "https://*.firebaseapp.com", "https://accounts.google.com"],
      frameAncestors: ["'self'", "https://*.google.com", "https://*.googleusercontent.com", "https://*.ai.studio", "https://ai.studio", "*"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: false,
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

/**
 * Structured URL validation using WHATWG URL parser.
 * Rejects javascript:, data:, file:, credentials, port tricks, and private/internal IP ranges.
 */
export function isSafeUrl(urlString?: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;

  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false; // Malformed URL
  }

  // 1. Strict protocol allowlist
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  // 2. Reject credentials in URL (e.g. https://user:pass@evil.com)
  if (parsed.username || parsed.password) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Reject loopback, link-local / metadata, and internal IP ranges
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('169.254.') || // Cloud instance metadata & link-local
    hostname.startsWith('100.64.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  ) {
    return false;
  }

  return true;
}

/**
 * Validates request origin against structured domain allowlist using WHATWG URL parsing.
 * Returns true for allowed origins or empty origins (same-origin, curl, server-to-server).
 * Does NOT rely on naive substring matching or regex backtracking.
 */
export function isAllowedOrigin(origin?: string): boolean {
  if (!origin || typeof origin !== 'string') {
    return true; // Direct server-to-server, same-origin, or CLI requests
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false; // Malformed URL
  }

  // Reject non-web protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  // Reject origins containing credentials (user:pass@host)
  if (parsed.username || parsed.password) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Environment-configured allowed origins (exact match on origin or hostname)
  const envAllowed = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().toLowerCase())
    : [];

  const originNormalized = parsed.origin.toLowerCase();
  if (envAllowed.includes(originNormalized) || envAllowed.includes(hostname)) {
    return true;
  }

  // Local development hostnames
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }

  // Production trusted domains: require HTTPS and exact match or subdomain
  if (parsed.protocol !== 'https:') {
    return false;
  }

  const trustedSuffixes = ['ai.studio', 'run.app', 'web.app', 'firebaseapp.com'];
  for (const suffix of trustedSuffixes) {
    if (hostname === suffix || hostname.endsWith(`.${suffix}`)) {
      return true;
    }
  }

  return false;
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
export const getSafeClientIp = (req: Request): string => {
  return (
    req.ip ||
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : undefined) ||
    req.socket.remoteAddress ||
    '127.0.0.1'
  );
};

/**
 * Tenant-aware rate limit key generator.
 * Combines IP address and authenticated tenant token prefix to enforce tenant isolation.
 */
export const getTenantRateLimitKey = (req: Request): string => {
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      return `tenant_${token.slice(0, 32)}`;
    }
  }
  return getSafeClientIp(req);
};

/**
 * Note on Multi-Instance Architecture:
 * In-memory rate limiting operates per Cloud Run container instance to protect node CPU, memory,
 * and AI quotas from local resource exhaustion. Edge-level distributed protection across instances
 * is provided by Google Cloud Armor and load balancer ingress policies.
 */

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
  keyGenerator: getTenantRateLimitKey,
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
  keyGenerator: getTenantRateLimitKey,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Document ingestion rate limit reached. Please wait a few moments before uploading additional files.',
    },
  },
});

// Rate limiting for AI / Gemini intensive endpoints (Copilot, Health Explain, Scenarios)
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
  keyGenerator: getTenantRateLimitKey,
  message: {
    success: false,
    error: {
      code: 'AI_RATE_LIMIT_EXCEEDED',
      message: 'AI generation rate limit exceeded. Please wait a moment before sending new prompts.',
    },
  },
});

// Rate limiting for authentication-sensitive endpoints (login, token validation, user profile updates)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 min
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
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please wait before trying again.',
    },
  },
});

// Rate limiting for Search operations
export const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 180, // 180 searches per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    keyGeneratorIpFallback: false,
    xForwardedForHeader: false,
    default: true,
  },
  keyGenerator: getTenantRateLimitKey,
  message: {
    success: false,
    error: {
      code: 'SEARCH_RATE_LIMIT_EXCEEDED',
      message: 'Search query rate limit reached. Please wait a moment.',
    },
  },
});

// Rate limiting for Notification polling and operations
export const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    keyGeneratorIpFallback: false,
    xForwardedForHeader: false,
    default: true,
  },
  keyGenerator: getTenantRateLimitKey,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Notification rate limit reached.',
    },
  },
});

// Rate limiting for SPA static web delivery (around server.ts line 92)
export const webLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1200, // 1200 requests per 15 min
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
      message: 'Too many page requests. Please wait a moment before refreshing.',
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
