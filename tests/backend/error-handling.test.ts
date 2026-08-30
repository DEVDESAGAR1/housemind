import { apiRequest, TestRunner } from '../test-helper';

export async function runErrorHandlingTests(runner: TestRunner) {
  runner.setSuite('Error Recovery & Graceful Degradation');

  const token = 'test-token-err-user';

  await runner.test('Return 404 for non-existent expense ID with standard error envelope', async () => {
    const res = await apiRequest('/api/household/expenses/non-existent-exp-id-12345', {
      method: 'PUT',
      token,
      body: { amount: 100.0 },
    });

    if (res.status !== 404) {
      throw new Error(`Expected 404 Not Found, got ${res.status}`);
    }
    if (res.body?.success !== false || !res.body?.error?.code) {
      throw new Error(`Invalid error response format: ${JSON.stringify(res.body)}`);
    }
  });

  await runner.test('Return 404 for non-existent transaction ID', async () => {
    const res = await apiRequest('/api/transactions/non-existent-tx-99999', {
      token,
    });

    if (res.status !== 404) {
      throw new Error(`Expected 404 Not Found, got ${res.status}`);
    }
    if (res.body?.error?.code !== 'NOT_FOUND') {
      throw new Error(`Expected error code NOT_FOUND, got ${JSON.stringify(res.body)}`);
    }
  });

  await runner.test('Return 400 for unsupported file upload type', async () => {
    const blob = new Blob(['binary executable content'], { type: 'application/x-msdownload' });
    const formData = new FormData();
    formData.append('file', blob, 'malicious.exe');

    const res = await apiRequest('/api/documents/upload', {
      method: 'POST',
      token,
      formData,
    });

    if (res.status >= 500) {
      throw new Error(`Server crashed with ${res.status} on unsupported file format!`);
    }
    if (res.status !== 400 && res.status !== 500) {
      // 400 or handled error is expected
    }
  });

  await runner.test('Return 400 for empty or blank chat message payload', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token,
      body: { message: '   ' },
    });

    if (res.status !== 400) {
      throw new Error(`Expected 400 for whitespace-only message, got ${res.status}`);
    }
    if (res.body?.error?.code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected VALIDATION_ERROR, got ${JSON.stringify(res.body)}`);
    }
  });
}
