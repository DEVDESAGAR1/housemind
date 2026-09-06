/**
 * Server Secrets & Configuration Provider
 *
 * Centralized, server-only secret management layer for HouseMind.
 * In production (Cloud Run), secrets are injected directly into environment
 * variables via Google Cloud Secret Manager integration:
 *   --set-secrets=GEMINI_API_KEY=housemind-gemini-api-key:latest
 *
 * This module ensures:
 * 1. Zero client-side leakage (strictly backend-only execution)
 * 2. Safe diagnostics without revealing raw credential values
 * 3. Graceful degradation when secrets are missing in local dev or test runners
 * 4. Masking utilities for safe logging
 */

export interface SecretDiagnostics {
  geminiConfigured: boolean;
  geminiModel: string;
  nodeEnv: string;
  projectId: string;
}

/**
 * Retrieves the Gemini API Key from environment (injected via Secret Manager in Cloud Run).
 * Returns undefined if not set, enabling deterministic fallback modes.
 */
export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === '' || key === 'MY_GEMINI_API_KEY' || key === 'undefined') {
    return undefined;
  }
  return key.trim();
}

/**
 * Checks whether the Gemini API key is configured and valid for inference.
 */
export function isGeminiConfigured(): boolean {
  return typeof getGeminiApiKey() === 'string' && getGeminiApiKey()!.length > 0;
}

/**
 * Retrieves the configured Gemini model name with fallback.
 */
export function getGeminiModel(defaultModel: string = 'gemini-2.5-flash'): string {
  const envModel = process.env.GEMINI_MODEL;
  if (envModel && envModel.trim() !== '') {
    return envModel.trim();
  }
  return defaultModel;
}

/**
 * Safe diagnostic status reporter.
 * Strictly avoids serializing or printing any secret material.
 */
export function getSecretDiagnostics(projectId: string = 'hack2skillnewproject'): SecretDiagnostics {
  return {
    geminiConfigured: isGeminiConfigured(),
    geminiModel: getGeminiModel(),
    nodeEnv: process.env.NODE_ENV || 'development',
    projectId: projectId,
  };
}

/**
 * Obscures a secret string for safe diagnostic representation.
 * Never returns the raw secret or more than 4 initial characters.
 */
export function maskSecret(secret?: string): string {
  if (!secret || typeof secret !== 'string') {
    return '(not configured)';
  }
  if (secret.length <= 8) {
    return '***';
  }
  const prefix = secret.slice(0, 4);
  return `${prefix}...****`;
}

// In-memory circuit breaker for depleted AI prepayment credits / rate limits
let quotaExhaustedUntil: number = 0;

/**
 * Checks whether Gemini quota is known to be exhausted / rate-limited.
 */
export function isGeminiQuotaExhausted(): boolean {
  return Date.now() < quotaExhaustedUntil;
}

/**
 * Records that Gemini quota/credits are exhausted, pausing upstream calls for retryAfterMs.
 */
export function recordGeminiQuotaExhausted(retryAfterMs: number = 5 * 60 * 1000): void {
  quotaExhaustedUntil = Date.now() + retryAfterMs;
}

/**
 * Clears the Gemini quota circuit breaker.
 */
export function resetGeminiQuotaStatus(): void {
  quotaExhaustedUntil = 0;
}

/**
 * Evaluates whether an error indicates depleted prepayment credits, 429 rate limit, or RESOURCE_EXHAUSTED.
 */
export function isResourceExhaustedError(err: any): boolean {
  if (!err) return false;
  const str = typeof err === 'string' ? err : (err?.message || '') + ' ' + JSON.stringify(err);
  return (
    str.includes('429') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('prepayment credits are depleted') ||
    str.includes('quota') ||
    str.includes('credits are depleted')
  );
}

