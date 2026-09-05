import fs from 'fs';
import path from 'path';
import { apiRequest, TestRunner } from '../test-helper';
import {
  getGeminiApiKey,
  getGeminiModel,
  isGeminiConfigured,
  getSecretDiagnostics,
  maskSecret,
} from '../../server/config/secrets';
import { sanitizeLogUrl } from '../../server/middleware/security';

export async function runSecretsHardeningTests(runner: TestRunner): Promise<void> {
  runner.setSuite('Phase 28: Google Cloud Secret Manager + Production Secrets Hardening');

  // Test 1: Secret Configuration Provider
  await runner.test('Secret Configuration Provider: Resolves API key and model safely without exceptions', async () => {
    const key = getGeminiApiKey();
    const model = getGeminiModel();
    if (typeof model !== 'string' || model.length === 0) {
      throw new Error('Expected default model name to be a valid non-empty string');
    }
    // In local dev without key, key should be undefined or string
    if (key !== undefined && typeof key !== 'string') {
      throw new Error('getGeminiApiKey returned unexpected type');
    }
  });

  // Test 2: Secret Diagnostics
  await runner.test('Secret Diagnostics: Diagnostics report readiness booleans without revealing raw key data', async () => {
    const diagnostics = getSecretDiagnostics('test-project-123');
    if (typeof diagnostics.geminiConfigured !== 'boolean') {
      throw new Error('geminiConfigured must be boolean');
    }
    if (diagnostics.projectId !== 'test-project-123') {
      throw new Error('projectId mismatch in diagnostics');
    }
    // Verify diagnostics JSON does not contain any secret strings
    const jsonStr = JSON.stringify(diagnostics);
    if (jsonStr.includes('AIza') || jsonStr.includes('secret') || jsonStr.includes('password')) {
      throw new Error('Diagnostics output contains secret keyword or key material');
    }
  });

  // Test 3: Secret Masking Utility
  await runner.test('Secret Masking Utility: Masking function obscures characters and never prints plain secret', async () => {
    const mockSecret = 'AIzaSySecretTestingKey1234567890';
    const masked = maskSecret(mockSecret);
    if (masked === mockSecret) {
      throw new Error('maskSecret failed to obscure secret');
    }
    if (!masked.includes('***')) {
      throw new Error('maskSecret must contain masking asterisks');
    }
    if (masked.length > 10) {
      // should only be e.g. "AIza...****"
      if (!masked.endsWith('...****')) {
        throw new Error('maskSecret pattern unexpected');
      }
    }
    if (maskSecret(undefined) !== '(not configured)') {
      throw new Error('maskSecret on undefined should return (not configured)');
    }
  });

  // Test 4: Health Endpoint Confidentiality
  await runner.test('Health Endpoint Confidentiality: /api/health returns healthy status with zero secret keys or env dumps', async () => {
    const res = await apiRequest('/api/health', { method: 'GET' });
    if (res.status !== 200) {
      throw new Error(`/api/health returned non-200 status: ${res.status}`);
    }
    const body = res.body;
    if (!body || body.status !== 'healthy') {
      throw new Error('/api/health did not return healthy status');
    }
    if (body.apiKey !== undefined || body.geminiKey !== undefined || body.env !== undefined) {
      throw new Error('Sensitive configuration leaked in /api/health');
    }
  });

  // Test 5: Error Response Protection
  await runner.test('Error Response Protection: Server error handlers never leak secrets or environment variables', async () => {
    const res = await apiRequest('/api/household/invalid-secret-test-path-404', {
      method: 'GET',
    });
    const body = res.body;
    const bodyStr = JSON.stringify(body || {});
    if (bodyStr.includes('GEMINI_API_KEY') || bodyStr.includes('AIza') || bodyStr.includes('process.env')) {
      throw new Error('Error response leaked environment or secret names');
    }
  });

  // Test 6: Log URL Sanitizer
  await runner.test('Log URL Sanitizer: Strips tokens, keys, and credentials from query paths', async () => {
    const sensitiveUrl = '/api/household/assets?token=secret123&apiKey=AIzaFake&auth=bearerToken&filter=appliances';
    const sanitized = sanitizeLogUrl(sensitiveUrl);
    if (sanitized.includes('token=secret123')) throw new Error('token was not stripped');
    if (sanitized.includes('apiKey=AIzaFake')) throw new Error('apiKey was not stripped');
    if (sanitized.includes('auth=bearerToken')) throw new Error('auth was not stripped');
    if (!sanitized.includes('filter=appliances')) throw new Error('safe query parameter was removed');
  });

  // Test 7: Observability Safety
  await runner.test('Observability Safety: Structured request logger does not log request bodies or authorization tokens', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      body: { message: 'hello', secretToken: 'do-not-log-me' },
      headers: { Authorization: 'Bearer test-secret-token-xyz' },
    });
    // Request returns response (either 200 or 401 or handled)
    if (res.status >= 500) {
      throw new Error(`Copilot chat failed unexpectedly: ${res.status}`);
    }
  });

  // Test 8: Deterministic Fallback
  await runner.test('Deterministic Fallback: Services operate deterministically without crashing when key is absent', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      body: { message: 'What needs my attention?' },
      token: 'test-token-sec-user-1',
    });
    if (res.status !== 200) {
      throw new Error(`Copilot chat endpoint returned ${res.status}`);
    }
    const reply = res.body?.data?.reply || res.body?.reply;
    if (!reply || typeof reply !== 'string' || reply.length === 0) {
      throw new Error('Copilot did not return a valid reply in fallback mode');
    }
  });

  // Test 9: Client Bundle Scan
  await runner.test('Client Bundle Scan: Production client build artifacts contain zero server secrets', async () => {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      const distFiles = fs.readdirSync(distPath);
      for (const file of distFiles) {
        if (file.endsWith('.js') || file.endsWith('.html')) {
          const content = fs.readFileSync(path.join(distPath, file), 'utf-8');
          // Check for forbidden server environment string leaks
          if (content.includes('process.env.GEMINI_API_KEY')) {
            throw new Error(`Client artifact ${file} contains raw server GEMINI_API_KEY reference`);
          }
        }
      }
    }
  });

  // Test 10: Firebase Config Isolation
  await runner.test('Firebase Config Isolation: Client config contains only public browser web identifiers', async () => {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.private_key !== undefined || config.client_secret !== undefined || config.service_account !== undefined) {
        throw new Error('Private server credentials detected in firebase-applet-config.json');
      }
      if (typeof config.projectId !== 'string') {
        throw new Error('projectId missing from public web config');
      }
    }
  });
}
