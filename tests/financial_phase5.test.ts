import http from 'http';
import {
  generateTransactionFingerprint,
} from '../server/services/transactionService';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function makeRequest(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const reqHeaders: Record<string, string> = {
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsedData: any = rawData;
          try {
            parsedData = JSON.parse(rawData);
          } catch {
            // Keep raw if not json
          }
          resolve({ status: res.statusCode || 0, data: parsedData, headers: res.headers });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('  HOUSEMIND PHASE 5 FINANCIAL & DOCUMENT TEST SUITE ');
  console.log('====================================================\n');

  // Test 1: SHA-256 Fingerprint Stability & Normalization
  try {
    const fp1 = generateTransactionFingerprint(
      'user_123',
      'HDFC Checking',
      '2026-03-01',
      150.75,
      'DEBIT',
      'Grocery Store Purchase',
      'REF-9988'
    );
    const fp2 = generateTransactionFingerprint(
      'user_123',
      '  hdfc checking  ',
      '2026-03-01',
      150.750,
      'DEBIT',
      'grocery store purchase ',
      'ref-9988'
    );
    const fpDifferentUser = generateTransactionFingerprint(
      'user_456',
      'HDFC Checking',
      '2026-03-01',
      150.75,
      'DEBIT',
      'Grocery Store Purchase',
      'REF-9988'
    );

    const isMatch = fp1 === fp2;
    const isUserIsolated = fp1 !== fpDifferentUser;
    const passed = isMatch && isUserIsolated && fp1.length === 64;

    results.push({
      name: '1. Deterministic SHA-256 fingerprinting normalization & user isolation',
      passed,
      details: `FP1 length: ${fp1.length}, Identical normalized match: ${isMatch}, User isolated: ${isUserIsolated}`,
    });
  } catch (err: any) {
    results.push({ name: '1. Fingerprint test', passed: false, details: err.message });
  }

  // Test 2: Unauthenticated GET /api/transactions returns 401
  try {
    const res = await makeRequest('GET', '/api/transactions');
    const passed = res.status === 401;
    results.push({
      name: '2. Unauthenticated GET /api/transactions returns 401 UNAUTHORIZED',
      passed,
      details: `Status: ${res.status}, Code: ${res.data?.error?.code || res.data?.code}`,
    });
  } catch (err: any) {
    results.push({ name: '2. Unauthenticated transactions test', passed: false, details: err.message });
  }

  // Test 3: Unauthenticated GET /api/transactions/summary returns 401
  try {
    const res = await makeRequest('GET', '/api/transactions/summary');
    const passed = res.status === 401;
    results.push({
      name: '3. Unauthenticated GET /api/transactions/summary returns 401 UNAUTHORIZED',
      passed,
      details: `Status: ${res.status}`,
    });
  } catch (err: any) {
    results.push({ name: '3. Unauthenticated summary test', passed: false, details: err.message });
  }

  // Test 4: Unauthenticated GET /api/documents returns 401
  try {
    const res = await makeRequest('GET', '/api/documents');
    const passed = res.status === 401;
    results.push({
      name: '4. Unauthenticated GET /api/documents returns 401 UNAUTHORIZED',
      passed,
      details: `Status: ${res.status}`,
    });
  } catch (err: any) {
    results.push({ name: '4. Unauthenticated documents test', passed: false, details: err.message });
  }

  // Test 5: Unauthenticated POST /api/documents/upload returns 401
  try {
    const res = await makeRequest('POST', '/api/documents/upload');
    const passed = res.status === 401;
    results.push({
      name: '5. Unauthenticated POST /api/documents/upload returns 401 UNAUTHORIZED',
      passed,
      details: `Status: ${res.status}`,
    });
  } catch (err: any) {
    results.push({ name: '5. Unauthenticated upload test', passed: false, details: err.message });
  }

  // Test 6: Unauthenticated POST /api/imports/test-id/confirm returns 401
  try {
    const res = await makeRequest('POST', '/api/imports/test-doc-id/confirm', {}, { candidates: [] });
    const passed = res.status === 401;
    results.push({
      name: '6. Unauthenticated POST /api/imports/:id/confirm returns 401 UNAUTHORIZED',
      passed,
      details: `Status: ${res.status}`,
    });
  } catch (err: any) {
    results.push({ name: '6. Unauthenticated confirm test', passed: false, details: err.message });
  }

  // Test 7: Unauthenticated POST /api/imports/test-id/reject returns 401
  try {
    const res = await makeRequest('POST', '/api/imports/test-doc-id/reject', {}, {});
    const passed = res.status === 401;
    results.push({
      name: '7. Unauthenticated POST /api/imports/:id/reject returns 401 UNAUTHORIZED',
      passed,
      details: `Status: ${res.status}`,
    });
  } catch (err: any) {
    results.push({ name: '7. Unauthenticated reject test', passed: false, details: err.message });
  }

  // Test 8: Validation schemas reject invalid dates or negative amounts
  try {
    const { createTransactionSchema } = await import('../server/schemas');
    const invalidTx = {
      type: 'DEBIT',
      amount: -50, // Negative amount not allowed
      date: 'not-a-date',
      description: '',
      category: 'Food',
    };
    const parseResult = createTransactionSchema.safeParse(invalidTx);
    const passed = !parseResult.success && parseResult.error.issues.length >= 2;
    results.push({
      name: '8. Schema rejects negative amounts and invalid date formats',
      passed,
      details: `Rejected as expected: ${!parseResult.success}, Errors: ${parseResult.error?.issues.map((i) => i.path).join(', ')}`,
    });
  } catch (err: any) {
    results.push({ name: '8. Schema validation test', passed: false, details: err.message });
  }

  // Print Summary
  console.log('----------------------------------------------------');
  console.log('  TEST EXECUTION RESULTS:');
  console.log('----------------------------------------------------');
  let passedCount = 0;
  for (const r of results) {
    const mark = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} : ${r.name}`);
    if (r.details) {
      console.log(`         Details: ${r.details}`);
    }
    if (r.passed) passedCount++;
  }

  console.log('\n====================================================');
  console.log(`  TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${results.length - passedCount}`);
  console.log('====================================================');

  if (passedCount < results.length) {
    process.exit(1);
  }
}

runPhase5Tests();
