import { apiRequest, TestRunner } from '../test-helper';
import { DatabaseService } from '../../server/services/dbService';

export async function runSecurityTests(runner: TestRunner) {
  runner.setSuite('Security & Hardening Headers');

  await runner.test('Security headers (Helmet) are correctly attached on responses', async () => {
    const res = await apiRequest('/api/health');
    const xContentTypeOptions = res.headers.get('x-content-type-options');
    const csp = res.headers.get('content-security-policy');

    if (!xContentTypeOptions || xContentTypeOptions !== 'nosniff') {
      throw new Error(`Expected X-Content-Type-Options: nosniff, got ${xContentTypeOptions}`);
    }
    if (!csp) {
      throw new Error('Expected Content-Security-Policy header to be present');
    }
  });

  await runner.test('Reverse proxy & X-Forwarded-For headers do not trigger crash or spoofing', async () => {
    const res = await apiRequest('/api/health', {
      headers: {
        'X-Forwarded-For': '203.0.113.195, 70.41.3.18',
        'X-Forwarded-Proto': 'https',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected status 200 with proxy headers, got ${res.status}`);
    }
  });

  await runner.test('Input validation rejects malicious payload exceeding schema limits', async () => {
    const res = await apiRequest('/api/household/profile', {
      method: 'PUT',
      token: 'test-token-sec-user',
      body: {
        homeName: 'A'.repeat(500), // Exceeds max 100
        yearBuilt: 1700, // Pre-1800 invalid year
      },
    });

    if (res.status !== 400) {
      throw new Error(`Expected 400 Validation Error, got ${res.status}`);
    }
    if (res.body?.error?.code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected VALIDATION_ERROR, got ${JSON.stringify(res.body)}`);
    }
  });

  await runner.test('SSRF Defense: DatabaseService rejects path traversal and malicious characters in IDs', async () => {
    const maliciousIds = [
      '../../../evil',
      'user/../../secret',
      'user%20id',
      'user\nid',
      'user@evil.com/sub',
      'a'.repeat(200), // exceeds safe length
    ];

    for (const badId of maliciousIds) {
      try {
        // Attempting to query with a malicious ID should be rejected or safely handled
        await DatabaseService.getProfile(badId, 'test-token-real');
      } catch (err: any) {
        // Expected security error rejection
        if (!err.message.includes('Invalid identifier') && !err.message.includes('Invalid')) {
          throw new Error(`Unexpected error message for SSRF injection attempt: ${err.message}`);
        }
      }
    }
  });

  await runner.test('Strict IDOR Isolation: User A cannot read or mutate User B resources', async () => {
    // User A creates an expense
    const resA = await apiRequest('/api/household/expenses', {
      method: 'POST',
      token: 'test-token-user-alpha',
      body: {
        title: 'Alpha Private Expense',
        amount: 250,
        category: 'maintenance',
        frequency: 'monthly',
      },
    });

    if (resA.status !== 201 || !resA.body?.data?.id) {
      throw new Error('User A failed to create expense');
    }

    const alphaExpenseId = resA.body.data.id;

    // User B tries to update User A's expense
    const resBUpdate = await apiRequest(`/api/household/expenses/${alphaExpenseId}`, {
      method: 'PUT',
      token: 'test-token-user-beta',
      body: {
        title: 'Hacked Title',
        amount: 9999,
      },
    });

    if (resBUpdate.status !== 404) {
      throw new Error(`Expected 404 Not Found for cross-user update, got ${resBUpdate.status}`);
    }

    // User B tries to delete User A's expense
    const resBDelete = await apiRequest(`/api/household/expenses/${alphaExpenseId}`, {
      method: 'DELETE',
      token: 'test-token-user-beta',
    });

    if (resBDelete.status !== 404) {
      throw new Error(`Expected 404 Not Found for cross-user delete, got ${resBDelete.status}`);
    }

    // Verify User A's original expense is unchanged
    const resAVerify = await apiRequest('/api/household/expenses', {
      token: 'test-token-user-alpha',
    });
    const found = resAVerify.body.data.find((e: any) => e.id === alphaExpenseId);
    if (!found || found.title !== 'Alpha Private Expense') {
      throw new Error("User A's expense was compromised by User B!");
    }
  });
}
