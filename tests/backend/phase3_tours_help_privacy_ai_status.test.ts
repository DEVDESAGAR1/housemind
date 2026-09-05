import { apiRequest, TestRunner } from '../test-helper';
import { HOUSEMIND_TOURS } from '../../src/components/tours/tourDefinitions';
import { HELP_ARTICLES, searchHelpArticles } from '../../src/components/help/helpData';
import { sanitizeAnalyticsParams, ALLOWED_PARAM_KEYS, FORBIDDEN_KEY_PATTERNS } from '../../src/lib/analytics';

export async function runPhase3ToursHelpPrivacyAiStatusTests(runner: TestRunner) {
  runner.setSuite('Phase 3: Guided Tours, Help & Support, Footer, Privacy & AI Status');

  const tokenUserA = 'test-token-phase3-user-a';
  const tokenUserB = 'test-token-phase3-user-b';

  // 1. AI STATUS ENDPOINT & TRANSPARENCY
  await runner.test('AI Status: Safe endpoint reports configuration status without leaking secrets', async () => {
    const res = await apiRequest('/api/system/ai-status', {
      method: 'GET',
      token: tokenUserA,
    });

    if (res.status !== 200) {
      throw new Error(`AI status endpoint failed: ${JSON.stringify(res.body)}`);
    }

    const data = res.body?.data;
    if (!data || !['available', 'unavailable', 'not_configured'].includes(data.status)) {
      throw new Error(`Invalid status payload: ${JSON.stringify(data)}`);
    }

    if (!data.fallbackMode || typeof data.fallbackMode !== 'string') {
      throw new Error(`Missing fallbackMode in status: ${JSON.stringify(data)}`);
    }

    // Strictly verify zero secret leakage
    const rawBody = JSON.stringify(res.body);
    if (rawBody.toLowerCase().includes('key') && rawBody.includes('AIza')) {
      throw new Error(`Secret API key leaked in AI status response!`);
    }
    if (rawBody.toLowerCase().includes('secret_manager') || rawBody.toLowerCase().includes('private_key')) {
      throw new Error(`Secret Manager resource leaked in AI status response!`);
    }
  });

  // 2. GUIDED TOURS INTEGRITY (ALL 11 REQUIRED TOURS)
  await runner.test('Guided Tours: All 11 core walkthrough tours are defined with accessible steps', async () => {
    const requiredTourIds = [
      'overview',
      'command_center',
      'health',
      'upload_scan',
      'assets_issues',
      'finance',
      'calendar_notifications',
      'unified_actions',
      'cross_domain',
      'morning_brief',
      'copilot',
    ];

    for (const id of requiredTourIds) {
      const tour = HOUSEMIND_TOURS[id];
      if (!tour) {
        throw new Error(`Missing required tour definition: "${id}"`);
      }
      if (!tour.title || tour.title.trim().length === 0) {
        throw new Error(`Tour "${id}" is missing title`);
      }
      if (!tour.steps || tour.steps.length === 0) {
        throw new Error(`Tour "${id}" has no steps`);
      }
      for (let i = 0; i < tour.steps.length; i++) {
        const step = tour.steps[i];
        if (!step.title || !step.description) {
          throw new Error(`Tour "${id}" step ${i + 1} is missing title or description`);
        }
      }
    }
  });

  // 3. HELP CENTER ARTICLES & AI TRANSPARENCY
  await runner.test('Help Center: Knowledge articles include AI architecture and guided tour links', async () => {
    const aiArticle = HELP_ARTICLES.find((a) => a.id === 'how-housemind-ai-works');
    if (!aiArticle) {
      throw new Error(`Missing "how-housemind-ai-works" help article`);
    }
    if (!aiArticle.title.toLowerCase().includes('ai')) {
      throw new Error(`AI article title mismatch: ${aiArticle.title}`);
    }

    const tourArticle = HELP_ARTICLES.find((a) => a.id === 'guided-tours-overview');
    if (!tourArticle) {
      throw new Error(`Missing "guided-tours-overview" help article`);
    }
    if (!tourArticle.actionLink?.tourId) {
      throw new Error(`Tour article missing actionLink.tourId`);
    }

    // Search query resolution
    const searchResults = searchHelpArticles('gemini');
    if (!searchResults.some((a) => a.id === 'how-housemind-ai-works')) {
      throw new Error(`Search for "gemini" failed to return AI architecture article`);
    }
  });

  // 4. ANALYTICS PARAMETER SANITIZATION & PRIVACY
  await runner.test('Analytics Privacy: Strictly sanitizes sensitive PII, dollar amounts, and prompts', async () => {
    const dirtyPayload = {
      category: 'financials',
      status: 'success',
      email: 'user@example.com',
      amount: '$14,500',
      price: '₹42,000',
      prompt: 'What is my bank balance?',
      secret_token: 'AIzaSySecretToken',
      file_name: 'confidential_tax_return.pdf',
      ocr_text: 'PAN Number: ABCDE1234F',
      uid: 'firebase-user-uid-123',
    };

    const clean = sanitizeAnalyticsParams(dirtyPayload);

    // Allowed categorical keys must remain
    if (clean.category !== 'financials' || clean.status !== 'success') {
      throw new Error(`Valid allowed parameters were incorrectly dropped: ${JSON.stringify(clean)}`);
    }

    // Sensitive keys must be completely removed
    const keys = Object.keys(clean);
    for (const forbidden of ['email', 'amount', 'price', 'prompt', 'secret_token', 'file_name', 'ocr_text', 'uid']) {
      if (keys.includes(forbidden)) {
        throw new Error(`Forbidden key "${forbidden}" leaked through analytics sanitizer!`);
      }
    }
  });

  // 5. TENANT ISOLATION PRESERVATION
  await runner.test('Multi-Tenant Isolation: User B cannot access User A records across core endpoints', async () => {
    // Create Profile A
    const profA = await apiRequest('/api/household/profile', {
      method: 'PUT',
      token: tokenUserA,
      body: { homeName: 'Alpha Estate', homeType: 'single_family', currency: 'USD' },
    });
    if (profA.status !== 200) throw new Error(`User A profile failed`);

    // Create Expense for User A
    const expA = await apiRequest('/api/household/expenses', {
      method: 'POST',
      token: tokenUserA,
      body: {
        title: 'Secret Executive Security',
        amount: 5000,
        category: 'other',
        frequency: 'monthly',
        dueDate: '2026-10-01',
        paymentStatus: 'pending',
      },
    });
    if (expA.status !== 201) throw new Error(`User A expense failed`);
    const expAId = expA.body.data.id;

    // User B attempts to fetch User A's expense by deep link
    const attackRes = await apiRequest(`/api/household/expenses/${expAId}`, {
      method: 'GET',
      token: tokenUserB,
    });

    if (attackRes.status !== 404 && attackRes.status !== 403) {
      throw new Error(`Multi-tenant isolation breach: User B accessed User A record with status ${attackRes.status}`);
    }
  });
}
