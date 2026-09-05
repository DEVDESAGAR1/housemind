import { getAnalytics, isSupported, logEvent, Analytics } from 'firebase/analytics';
import app from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';

// Global Analytics singleton instance
let analyticsInstance: Analytics | null = null;
let isInitializing = false;
let initAttempted = false;

// Strict categorical parameter allowlist
export const ALLOWED_PARAM_KEYS = new Set([
  'provider',
  'result',
  'status',
  'domain',
  'category',
  'category_filter',
  'classification_category',
  'file_type',
  'error_category',
  'result_bucket',
  'response_mode',
  'action_type',
  'export_type',
  'channel',
  'priority',
  'loan_type',
  'utility_type',
  'filter_type',
  'page_title',
  'page_path',
  'page_location',
  'count',
  'item_count',
]);

// Explicit forbidden sensitive key patterns (case-insensitive checks)
export const FORBIDDEN_KEY_PATTERNS = [
  /uid/i,
  /user_?id/i,
  /email/i,
  /phone/i,
  /address/i,
  /postal/i,
  /query$/i,
  /search_?term/i,
  /prompt/i,
  /(?:^|_)response(?:$|_(?:text|content|body|raw|message|data))/i,
  /amount/i,
  /cost/i,
  /price/i,
  /salary/i,
  /income/i,
  /balance/i,
  /emi/i,
  /rate/i,
  /file_?name/i,
  /content/i,
  /text/i,
  /ocr/i,
  /(?:^|_)id$/i, // exact id or ending with _id (e.g. asset_id, record_id)
  /token/i,
  /secret/i,
  /body/i,
  /header/i,
  /password/i,
  /pan/i,
  /aadhaar/i,
  /ssn/i,
];

// Explicit forbidden value patterns (e.g., email-like, currency figures, long text)
export const SENSITIVE_VALUE_REGEX = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
  /(?:₹|\$|€|£)\s*[0-9]+/, // Currency prefix
  /\b\d{10,16}\b/, // Phone or credit card digits
];

/**
 * Sanitizes analytics event parameters against strict allowlists and forbidden patterns.
 * Strips all PII, financial figures, document content, LLM prompts/responses, and record IDs.
 */
export function sanitizeAnalyticsParams(
  params?: Record<string, any>
): Record<string, string | number | boolean> {
  if (!params || typeof params !== 'object') {
    return {};
  }

  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, rawValue] of Object.entries(params)) {
    // 1. Check if key matches any forbidden pattern
    const isForbiddenKey = FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isForbiddenKey) {
      continue;
    }

    // 2. Check if key is in the explicit allowlist
    const normalizedKey = key.toLowerCase();
    if (!ALLOWED_PARAM_KEYS.has(normalizedKey)) {
      continue;
    }

    // 3. Validate and sanitize value types
    if (typeof rawValue === 'boolean') {
      sanitized[normalizedKey] = rawValue;
    } else if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      // Allow only non-negative small integer counts/buckets (e.g. result count <= 1000)
      if (rawValue >= 0 && rawValue <= 1000 && Number.isInteger(rawValue)) {
        sanitized[normalizedKey] = rawValue;
      }
    } else if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      // Drop empty strings or strings exceeding 64 chars
      if (!trimmed || trimmed.length > 64) {
        continue;
      }
      // Check for sensitive value patterns (email, phone, currency strings)
      const hasSensitiveValue = SENSITIVE_VALUE_REGEX.some((pattern) => pattern.test(trimmed));
      if (hasSensitiveValue) {
        continue;
      }
      sanitized[normalizedKey] = trimmed.toLowerCase();
    }
  }

  return sanitized;
}

/**
 * Retrieves the effective Google Analytics 4 Measurement ID from config or environment.
 */
export function getMeasurementId(): string | null {
  // Check runtime environment variable first, then fallback to Firebase config JSON
  const envMeasurementId =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined)
      : undefined;

  const configMeasurementId = firebaseConfig.measurementId;

  const effectiveId = (envMeasurementId || configMeasurementId || '').trim();
  return effectiveId && effectiveId.startsWith('G-') ? effectiveId : null;
}

/**
 * Checks if the environment is a test runner (Playwright E2E or Unit test)
 */
function isTestEnvironment(): boolean {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return true;
  }
  if (typeof window !== 'undefined' && (window as any).__PLAYWRIGHT_TEST_USER__) {
    return true;
  }
  return false;
}

/**
 * Initializes Firebase Analytics in the browser environment.
 * Safe, non-blocking, and idempotent. Fails gracefully if unsupported or unconfigured.
 */
export async function initializeAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance) {
    return analyticsInstance;
  }

  if (typeof window === 'undefined') {
    return null; // Server-side or Node.js environment
  }

  if (isTestEnvironment()) {
    initAttempted = true;
    return null; // Do not initialize in automated test environments
  }

  if (isInitializing) {
    return null;
  }

  isInitializing = true;
  initAttempted = true;

  try {
    const measurementId = getMeasurementId();
    if (!measurementId) {
      // Measurement ID not configured - analytics remains cleanly disabled
      return null;
    }

    const supported = await isSupported().catch(() => false);
    if (!supported) {
      return null;
    }

    analyticsInstance = getAnalytics(app);
    return analyticsInstance;
  } catch (err) {
    // Non-blocking failure isolation - application continues normally
    console.warn('[ANALYTICS] Graceful initialization notice:', err);
    analyticsInstance = null;
    return null;
  } finally {
    isInitializing = false;
  }
}

/**
 * Tracks a privacy-safe categorical event to Google Analytics 4.
 * All parameters are strictly sanitized before transmission.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, any>
): void {
  try {
    if (typeof window === 'undefined' || isTestEnvironment()) {
      return;
    }

    if (!analyticsInstance) {
      return; // Analytics disabled or not yet initialized
    }

    // Validate event name (lowercase alphanumeric + underscores, 1-40 chars)
    const normalizedEvent = eventName.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]{1,39}$/.test(normalizedEvent)) {
      return;
    }

    const sanitizedParams = sanitizeAnalyticsParams(params);
    logEvent(analyticsInstance, normalizedEvent, sanitizedParams);
  } catch (err) {
    // Fail-safe: analytics errors must NEVER crash the application
    console.warn('[ANALYTICS] Event tracking notice:', err);
  }
}

/**
 * Tracks a normalized page view to Google Analytics 4.
 */
export function trackPageView(pageName: string): void {
  try {
    if (typeof window === 'undefined' || isTestEnvironment()) {
      return;
    }

    // Normalize route to canonical product destinations
    const normalizedPage = pageName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    trackEvent('page_view', {
      page_title: normalizedPage,
      page_path: `/${normalizedPage}`,
    });
  } catch {
    // Non-blocking
  }
}

/**
 * Checks if analytics is currently active and ready in the client.
 */
export function isAnalyticsEnabled(): boolean {
  return analyticsInstance !== null;
}

/**
 * Resets internal analytics state for test isolation.
 */
export function resetAnalyticsForTesting(): void {
  analyticsInstance = null;
  isInitializing = false;
  initAttempted = false;
}
