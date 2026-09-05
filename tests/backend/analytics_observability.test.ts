import { apiRequest, TestRunner } from '../test-helper';
import {
  sanitizeAnalyticsParams,
  getMeasurementId,
  isAnalyticsEnabled,
  resetAnalyticsForTesting,
} from '../../src/lib/analytics';
import {
  classifyServerError,
  sanitizeLogUrl,
} from '../../server/middleware/security';

export async function runAnalyticsObservabilityTests(runner: TestRunner): Promise<void> {
  runner.setSuite('Phase 27: Free GA4 + Production Observability');

  // Test 1: Analytics disabled when measurement ID is missing
  await runner.test('Analytics Configuration: Gracefully remains disabled when measurement ID is absent', async () => {
    resetAnalyticsForTesting();
    const id = getMeasurementId();
    if (!id && isAnalyticsEnabled() !== false) {
      throw new Error('Analytics should be disabled when measurement ID is absent');
    }
  });

  // Test 2: Parameter Sanitizer - Ban and strip forbidden PII keys
  await runner.test('Privacy Enforcement: Parameter sanitizer strictly strips forbidden PII and identity keys', async () => {
    const rawPayload = {
      uid: 'firebase-user-abc-123',
      userId: 'user-789',
      user_id: 'usr_xyz',
      email: 'alex@example.com',
      phone: '+1-555-019-2834',
      address: '123 Main St, Suite 400',
      postal_code: '560038',
      tenantId: 'tenant-999',
      household_id: 'hh-1234',
      provider: 'google',
      result: 'success',
    };

    const sanitized = sanitizeAnalyticsParams(rawPayload);

    // Forbidden keys must be stripped
    if (sanitized.uid !== undefined) throw new Error('uid was not stripped');
    if (sanitized.userId !== undefined) throw new Error('userId was not stripped');
    if (sanitized.user_id !== undefined) throw new Error('user_id was not stripped');
    if (sanitized.email !== undefined) throw new Error('email was not stripped');
    if (sanitized.phone !== undefined) throw new Error('phone was not stripped');
    if (sanitized.address !== undefined) throw new Error('address was not stripped');
    if (sanitized.postal_code !== undefined) throw new Error('postal_code was not stripped');
    if (sanitized.tenantId !== undefined) throw new Error('tenantId was not stripped');
    if (sanitized.household_id !== undefined) throw new Error('household_id was not stripped');

    // Safe allowlisted categorical keys must be preserved
    if (sanitized.provider !== 'google') throw new Error('provider was not preserved');
    if (sanitized.result !== 'success') throw new Error('result was not preserved');
  });

  // Test 3: Search Query Exclusion
  await runner.test('Search Privacy: Raw search queries are strictly excluded from analytics parameters', async () => {
    const rawSearchParams = {
      query: 'show me all HDFC home loan payments and bank balances',
      search_term: 'secret property deed',
      result_bucket: 'multiple',
      category_filter: 'finance',
    };

    const sanitized = sanitizeAnalyticsParams(rawSearchParams);

    if (sanitized.query !== undefined) throw new Error('raw query was not stripped');
    if (sanitized.search_term !== undefined) throw new Error('search_term was not stripped');
    if (sanitized.result_bucket !== 'multiple') throw new Error('result_bucket was not preserved');
    if (sanitized.category_filter !== 'finance') throw new Error('category_filter was not preserved');
  });

  // Test 4: Copilot Prompt & Response Exclusion
  await runner.test('Copilot Privacy: LLM user prompts, assistant responses, and context are never passed to analytics', async () => {
    const rawCopilotParams = {
      prompt: 'What is my current monthly income and total mortgage debt?',
      response: 'Your monthly salary is ₹1,85,000 and total outstanding loan is ₹42,50,000.',
      user_prompt: 'how much do I spend on Daikin AC?',
      response_mode: 'ai',
      action_type: 'action_execution',
    };

    const sanitized = sanitizeAnalyticsParams(rawCopilotParams);

    if (sanitized.prompt !== undefined) throw new Error('prompt was not stripped');
    if (sanitized.response !== undefined) throw new Error('response was not stripped');
    if (sanitized.user_prompt !== undefined) throw new Error('user_prompt was not stripped');
    if (sanitized.response_mode !== 'ai') throw new Error('response_mode was not preserved');
    if (sanitized.action_type !== 'action_execution') throw new Error('action_type was not preserved');
  });

  // Test 5: Financial Amount & Currency Exclusion
  await runner.test('Financial Privacy: Monetary figures, balances, salaries, and rates are stripped from parameters', async () => {
    const rawFinanceParams = {
      amount: 46500,
      cost: 14500,
      price: 250000,
      salary: 185000,
      balance: 95000,
      emi: 48500,
      category: 'housing',
      loan_type: 'mortgage',
      utility_type: 'electricity',
    };

    const sanitized = sanitizeAnalyticsParams(rawFinanceParams);

    if (sanitized.amount !== undefined) throw new Error('amount was not stripped');
    if (sanitized.cost !== undefined) throw new Error('cost was not stripped');
    if (sanitized.price !== undefined) throw new Error('price was not stripped');
    if (sanitized.salary !== undefined) throw new Error('salary was not stripped');
    if (sanitized.balance !== undefined) throw new Error('balance was not stripped');
    if (sanitized.emi !== undefined) throw new Error('emi was not stripped');
    if (sanitized.category !== 'housing') throw new Error('category was not preserved');
    if (sanitized.loan_type !== 'mortgage') throw new Error('loan_type was not preserved');
    if (sanitized.utility_type !== 'electricity') throw new Error('utility_type was not preserved');
  });

  // Test 6: Document Content & Filename Exclusion
  await runner.test('Document Privacy: File names, OCR extracts, and document text are stripped from parameters', async () => {
    const rawDocParams = {
      filename: 'HDFC_Bank_Statement_Aug_2026.pdf',
      file_name: 'Property_Tax_Receipt.pdf',
      content: 'CONFIDENTIAL: Account number 9876543210',
      text: 'Total due: INR 54,200',
      ocr_text: 'PAN Number: ABCDE1234F',
      file_type: 'pdf',
      domain: 'finance',
    };

    const sanitized = sanitizeAnalyticsParams(rawDocParams);

    if (sanitized.filename !== undefined) throw new Error('filename was not stripped');
    if (sanitized.file_name !== undefined) throw new Error('file_name was not stripped');
    if (sanitized.content !== undefined) throw new Error('content was not stripped');
    if (sanitized.text !== undefined) throw new Error('text was not stripped');
    if (sanitized.ocr_text !== undefined) throw new Error('ocr_text was not stripped');
    if (sanitized.file_type !== 'pdf') throw new Error('file_type was not preserved');
    if (sanitized.domain !== 'finance') throw new Error('domain was not preserved');
  });

  // Test 7: Sensitive Value Pattern Detection (e.g. email or currency figures passed in allowed keys)
  await runner.test('Value Sanitization: Email-like or currency patterns inside allowed keys are rejected', async () => {
    const deceptiveParams = {
      category: 'user@secretdomain.com',
      domain: '₹ 45,000 cost',
      provider: 'google',
    };

    const sanitized = sanitizeAnalyticsParams(deceptiveParams);

    if (sanitized.category !== undefined) throw new Error('email-pattern category was not stripped');
    if (sanitized.domain !== undefined) throw new Error('currency-pattern domain was not stripped');
    if (sanitized.provider !== 'google') throw new Error('safe provider was not preserved');
  });

  // Test 8: Server Observability - Error Classification
  await runner.test('Server Observability: Error categorization classifies failure codes into standardized buckets', async () => {
    if (classifyServerError(401, 'UNAUTHORIZED') !== 'authentication_error') throw new Error('401 misclassified');
    if (classifyServerError(403, 'FORBIDDEN') !== 'authorization_error') throw new Error('403 misclassified');
    if (classifyServerError(404, 'NOT_FOUND') !== 'not_found') throw new Error('404 misclassified');
    if (classifyServerError(429, 'TOO_MANY_REQUESTS') !== 'rate_limit') throw new Error('429 misclassified');
    if (classifyServerError(400, 'VALIDATION_ERROR') !== 'validation_error') throw new Error('400 misclassified');
    if (classifyServerError(502, 'GEMINI_UPSTREAM_ERROR') !== 'upstream_ai_error') throw new Error('502 misclassified');
    if (classifyServerError(500, 'DOCUMENT_OCR_FAILED') !== 'document_processing_error') throw new Error('500 OCR misclassified');
    if (classifyServerError(500, 'FIRESTORE_WRITE_ERROR') !== 'database_error') throw new Error('500 DB misclassified');
    if (classifyServerError(500, 'INTERNAL_SERVER_ERROR') !== 'internal_error') throw new Error('500 internal misclassified');
  });

  // Test 9: Server Observability - URL Sanitization in Logs
  await runner.test('Server Logging: URL query parameters with tokens or secrets are stripped before logging', async () => {
    const rawUrl = '/api/household/search?token=secret123&apiKey=xyz999&category=assets';
    const cleanUrl = sanitizeLogUrl(rawUrl);

    if (cleanUrl.includes('token=secret123')) throw new Error('token was not stripped from log URL');
    if (cleanUrl.includes('apiKey=xyz999')) throw new Error('apiKey was not stripped from log URL');
    if (!cleanUrl.includes('category=assets')) throw new Error('safe query param was lost in log URL');
  });

  // Test 10: Health Endpoint Safety
  await runner.test('Health Endpoint: /api/health responds cleanly without leaking secrets, tokens or db records', async () => {
    const res = await apiRequest('/api/health', { method: 'GET' });
    if (res.status !== 200) throw new Error(`Health status returned ${res.status}`);
    const data = res.body;
    if (!data || data.status !== 'healthy') throw new Error('Health check payload invalid');
    if (data.service !== 'HouseMind Backend') throw new Error('Health service name mismatch');
    if (data.apiKey !== undefined) throw new Error('API key leaked in health response');
    if (data.secrets !== undefined) throw new Error('Secrets leaked in health response');
    if (data.users !== undefined) throw new Error('Users leaked in health response');
  });
}
