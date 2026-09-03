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

  // =========================================================================
  // URL Query Bypass & Attacker Forgery Regression Suite
  // =========================================================================

  await runner.test('Reject unauthenticated request with ?demo=true with 401', async () => {
    const res = await apiRequest('/api/household/profile?demo=true');
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    }
    if (res.body?.success !== false || res.body?.error?.code !== 'UNAUTHORIZED') {
      throw new Error(`Expected UNAUTHORIZED error, got ${JSON.stringify(res.body)}`);
    }
  });

  await runner.test('Reject unauthenticated request with ?demo==true with 401', async () => {
    const res = await apiRequest('/api/household/profile?demo==true');
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    }
  });

  await runner.test('Reject unauthenticated request with ?guest=true with 401', async () => {
    const res = await apiRequest('/api/household/expenses?guest=true');
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    }
  });

  await runner.test('Reject unauthenticated request with ?anonymous=true with 401', async () => {
    const res = await apiRequest('/api/household/command-center?anonymous=true');
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    }
  });

  await runner.test('Reject forged bearer token Authorization: Bearer test-token-attacker with 401', async () => {
    const res = await apiRequest('/api/household/profile', {
      headers: { Authorization: 'Bearer test-token-attacker' },
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for test-token-attacker, got ${res.status}`);
    }
  });

  await runner.test('Reject forged bearer token Authorization: Bearer test-token-forged with 401', async () => {
    const res = await apiRequest('/api/household/expenses', {
      headers: { Authorization: 'Bearer test-token-forged' },
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for test-token-forged, got ${res.status}`);
    }
  });

  await runner.test('Reject forged bearer token Authorization: Bearer test-token-invalid with 401', async () => {
    const res = await apiRequest('/api/household/profile', {
      headers: { Authorization: 'Bearer test-token-invalid' },
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for test-token-invalid, got ${res.status}`);
    }
  });

  await runner.test('Reject legacy guest bearer token Authorization: Bearer guest-token-preview with 401', async () => {
    const res = await apiRequest('/api/household/profile', {
      headers: { Authorization: 'Bearer guest-token-preview' },
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for guest-token-preview, got ${res.status}`);
    }
  });

  await runner.test('Reject unauthenticated request to POST /api/household/demo-seed with 401', async () => {
    const res = await apiRequest('/api/household/demo-seed', {
      method: 'POST',
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for unauthenticated demo-seed, got ${res.status}`);
    }
  });

  await runner.test('Authenticated user can seed realistic starter demo DATA idempotently', async () => {
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
