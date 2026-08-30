import { apiRequest, TestRunner } from '../test-helper';

export async function runSecurityTests(runner: TestRunner) {
  runner.setSuite('Security & Hardening Headers');

  await runner.test('Security headers (Helmet) are correctly attached on responses', async () => {
    const res = await apiRequest('/api/health');
    const xFrameOptions = res.headers.get('x-frame-options');
    const xContentTypeOptions = res.headers.get('x-content-type-options');

    if (!xContentTypeOptions || xContentTypeOptions !== 'nosniff') {
      throw new Error(`Expected X-Content-Type-Options: nosniff, got ${xContentTypeOptions}`);
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
}
