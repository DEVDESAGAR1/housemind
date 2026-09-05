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
