import { apiRequest, TestRunner } from '../test-helper';

export async function runAuthTests(runner: TestRunner) {
  runner.setSuite('Authentication & Multi-Tenant Authorization');

  await runner.test('Health endpoint is public and reports healthy status', async () => {
    const res = await apiRequest('/api/health');
    if (res.status !== 200) {
      throw new Error(`Expected status 200, got ${res.status}`);
    }
    if (!res.body?.status || res.body.status !== 'healthy') {
      throw new Error(`Expected status to be healthy, got ${JSON.stringify(res.body)}`);
    }
  });

  await runner.test('Reject unauthenticated request to /api/household/profile with 401', async () => {
    const res = await apiRequest('/api/household/profile');
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    }
    if (res.body?.success !== false || res.body?.error?.code !== 'UNAUTHORIZED') {
      throw new Error(`Expected UNAUTHORIZED error code, got ${JSON.stringify(res.body)}`);
    }
  });

  await runner.test('Reject malformed / invalid bearer token with 401', async () => {
    const res = await apiRequest('/api/household/expenses', {
      headers: { Authorization: 'Bearer totally-invalid-token-string-xyz' },
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 for invalid token, got ${res.status}`);
    }
  });

  await runner.test('Authenticate user with valid test token and access isolated profile', async () => {
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

  await runner.test('Strict Multi-Tenant Isolation: user-beta cannot see user-alpha records', async () => {
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
}
