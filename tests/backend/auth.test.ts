import { apiRequest, TestRunner } from '../test-helper';

export async function runAuthTests(runner: TestRunner) {
  runner.setSuite('Household Authentication & Tenant Security');

  await runner.test('allows public health endpoint to report healthy status', async () => {
    const res = await apiRequest('/api/health');
    if (res.status !== 200) {
      throw new Error(`Expected status 200, got ${res.status}`);
    }
    if (!res.body?.status || res.body.status !== 'healthy') {
      throw new Error(`Expected status to be healthy, got ${JSON.stringify(res.body)}`);
    }
  });

  await runner.test('rejects unauthenticated request to protected profile endpoint with 401 UNAUTHORIZED', async () => {
    const res = await apiRequest('/api/household/profile');
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    }
    if (res.body?.success !== false || res.body?.error?.code !== 'UNAUTHORIZED') {
      throw new Error(`Expected UNAUTHORIZED error code, got ${JSON.stringify(res.body)}`);
    }
  });

  await runner.test('rejects malformed or invalid bearer token with 401 UNAUTHORIZED', async () => {
    const res = await apiRequest('/api/household/expenses', {
      headers: { Authorization: 'Bearer totally-invalid-token-string-xyz' },
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 for invalid token, got ${res.status}`);
    }
  });

  await runner.test('allows authenticated user with valid bearer token to access isolated profile', async () => {
    const res = await apiRequest('/api/household/profile', {
      token: 'test-token-user-alpha',
    });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }
    if (res.body?.success !== true) {
      throw new Error(`Expected success: true, got ${JSON.stringify(res.body)}`);
    }
  });

  await runner.test('prevents cross-tenant data leakage between isolated user accounts', async () => {
    // User Alpha creates an expense
    const createRes = await apiRequest('/api/household/expenses', {
      method: 'POST',
      token: 'test-token-user-alpha',
      body: {
        title: 'Alpha Private Expense',
        category: 'utilities',
        amount: 350.0,
        frequency: 'monthly',
      },
    });

    if (createRes.status !== 201) {
      throw new Error(`Failed to create alpha expense: ${createRes.status} ${JSON.stringify(createRes.body)}`);
    }

    // User Beta lists expenses
    const betaRes = await apiRequest('/api/household/expenses', {
      token: 'test-token-user-beta',
    });

    if (betaRes.status !== 200) {
      throw new Error(`Failed to fetch beta expenses: ${betaRes.status}`);
    }

    const hasAlphaRecord = betaRes.body?.data?.some(
      (e: any) => e.title === 'Alpha Private Expense'
    );

    if (hasAlphaRecord) {
      throw new Error('Tenant isolation breach! User Beta received User Alpha expense item.');
    }
  });

  // =========================================================================
  // URL Query Bypass & Attacker Forgery Regression Suite
  // =========================================================================

  await runner.test('rejects unauthenticated query parameter bypass attempts (?demo=true, ?guest=true, ?anonymous=true)', async () => {
    const bypassEndpoints = [
      '/api/household/profile?demo=true',
      '/api/household/profile?demo==true',
      '/api/household/expenses?guest=true',
      '/api/household/command-center?anonymous=true',
    ];

    for (const url of bypassEndpoints) {
      const res = await apiRequest(url);
      if (res.status !== 401) {
        throw new Error(`Expected 401 Unauthorized for bypass attempt ${url}, got ${res.status}`);
      }
      if (res.body?.success !== false || res.body?.error?.code !== 'UNAUTHORIZED') {
        throw new Error(`Expected UNAUTHORIZED error envelope for ${url}, got ${JSON.stringify(res.body)}`);
      }
    }
  });

  await runner.test('rejects forged attacker and legacy guest bearer tokens with 401 UNAUTHORIZED', async () => {
    const forgedTokens = [
      'test-token-attacker',
      'test-token-forged',
      'test-token-invalid',
      'guest-token-preview',
    ];

    for (const badToken of forgedTokens) {
      const res = await apiRequest('/api/household/profile', {
        headers: { Authorization: `Bearer ${badToken}` },
      });
      if (res.status !== 401) {
        throw new Error(`Expected 401 Unauthorized for token ${badToken}, got ${res.status}`);
      }
    }
  });

  await runner.test('rejects unauthenticated request to demo-seed endpoint with 401 UNAUTHORIZED', async () => {
    const res = await apiRequest('/api/household/demo-seed', {
      method: 'POST',
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for unauthenticated demo-seed, got ${res.status}`);
    }
  });

  await runner.test('allows authenticated users to seed and remove starter demo data idempotently', async () => {
    const seedRes = await apiRequest('/api/household/demo-seed', {
      method: 'POST',
      token: 'test-token-seed-tester',
    });
    if (seedRes.status !== 200) {
      throw new Error(`Expected 200 OK for authenticated demo seed, got ${seedRes.status}`);
    }
    if (seedRes.body?.success !== true) {
      throw new Error(`Expected success: true, got ${JSON.stringify(seedRes.body)}`);
    }

    // Verify records exist for this user
    const listRes = await apiRequest('/api/household/expenses', {
      token: 'test-token-seed-tester',
    });
    if (listRes.status !== 200 || !Array.isArray(listRes.body?.data) || listRes.body.data.length === 0) {
      throw new Error(`Expected seeded expenses to be present, got: ${JSON.stringify(listRes.body)}`);
    }

    // Clean up seeded records for this user
    const removeRes = await apiRequest('/api/household/demo-remove', {
      method: 'POST',
      token: 'test-token-seed-tester',
    });
    if (removeRes.status !== 200 || removeRes.body?.success !== true) {
      throw new Error(`Expected 200 OK for demo removal, got ${removeRes.status}`);
    }
  });
}
