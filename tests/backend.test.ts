import http from 'http';

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

async function runTests() {
  console.log('====================================================');
  console.log('  HOUSEMIND PHASE 2 BACKEND TEST SUITE STARTING     ');
  console.log('====================================================\n');

  // Test 1: Health Endpoint (Unauthenticated)
  try {
    const res = await makeRequest('GET', '/api/health');
    const passed = res.status === 200 && res.data.success === true && res.data.status === 'healthy';
    results.push({
      name: '1. GET /api/health returns 200 healthy status',
      passed,
      details: `Status: ${res.status}, Service: ${res.data?.service}`,
    });
  } catch (err: any) {
    results.push({ name: '1. GET /api/health', passed: false, details: err.message });
  }

  // Test 2: Unauthenticated Profile Request (Should return 401)
  try {
    const res = await makeRequest('GET', '/api/household/profile');
    const passed = res.status === 401 && res.data?.error?.code === 'UNAUTHORIZED';
    results.push({
      name: '2. Unauthenticated request to /api/household/profile returns 401 UNAUTHORIZED',
      passed,
      details: `Status: ${res.status}, Code: ${res.data?.error?.code}`,
    });
  } catch (err: any) {
    results.push({ name: '2. Unauthenticated profile test', passed: false, details: err.message });
  }

  // Test 3: Unauthenticated Expenses Request (Should return 401)
  try {
    const res = await makeRequest('GET', '/api/household/expenses');
    const passed = res.status === 401 && res.data?.error?.code === 'UNAUTHORIZED';
    results.push({
      name: '3. Unauthenticated request to /api/household/expenses returns 401 UNAUTHORIZED',
      passed,
      details: `Status: ${res.status}, Code: ${res.data?.error?.code}`,
    });
  } catch (err: any) {
    results.push({ name: '3. Unauthenticated expenses test', passed: false, details: err.message });
  }

  // Test 4: Malformed Authorization Header (Should return 401)
  try {
    const res = await makeRequest('GET', '/api/household/assets', {
      Authorization: 'Basic invalid_credentials_format',
    });
    const passed = res.status === 401 && res.data?.error?.code === 'UNAUTHORIZED';
    results.push({
      name: '4. Malformed Authorization header returns 401 with structured message',
      passed,
      details: `Status: ${res.status}, Message: ${res.data?.error?.message}`,
    });
  } catch (err: any) {
    results.push({ name: '4. Malformed auth header test', passed: false, details: err.message });
  }

  // Test 5: Bogus/Forged Firebase Token (Should return 401)
  try {
    const res = await makeRequest('GET', '/api/household/profile', {
      Authorization: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.fake_token_data',
    });
    const passed = res.status === 401 && res.data?.error?.code === 'UNAUTHORIZED';
    results.push({
      name: '5. Invalid/Forged Firebase ID token rejected with 401 UNAUTHORIZED',
      passed,
      details: `Status: ${res.status}, Code: ${res.data?.error?.code}`,
    });
  } catch (err: any) {
    results.push({ name: '5. Forged token test', passed: false, details: err.message });
  }

  // Test 6: Rate Limiting & Security Headers
  try {
    const res = await makeRequest('GET', '/api/health');
    const hasSecurityHeaders =
      res.headers['x-content-type-options'] === 'nosniff' &&
      res.headers['ratelimit-limit'] !== undefined;
    results.push({
      name: '6. Security headers (Helmet & RateLimit) present on responses',
      passed: hasSecurityHeaders,
      details: `RateLimit-Limit: ${res.headers['ratelimit-limit']}, X-Content-Type-Options: ${res.headers['x-content-type-options']}`,
    });
  } catch (err: any) {
    results.push({ name: '6. Security headers test', passed: false, details: err.message });
  }

  // Test 7: Zod Validation Unit Checks
  const { createExpenseSchema, createAssetSchema, idParamSchema } = await import('../server/schemas');
  
  // 7a: Negative amount rejection
  const negativeExpense = createExpenseSchema.safeParse({
    title: 'Test',
    category: 'utilities',
    amount: -50,
    frequency: 'monthly',
  });
  results.push({
    name: '7a. Zod Schema rejects negative expense amounts (< 0)',
    passed: !negativeExpense.success,
    details: negativeExpense.success ? 'Failed: Accepted negative amount' : 'Properly rejected',
  });

  // 7b: Invalid category rejection
  const invalidCategoryExpense = createExpenseSchema.safeParse({
    title: 'Test',
    category: 'illegal_category_123',
    amount: 100,
    frequency: 'monthly',
  });
  results.push({
    name: '7b. Zod Schema restricts category to allowed enums',
    passed: !invalidCategoryExpense.success,
    details: invalidCategoryExpense.success ? 'Failed: Accepted illegal category' : 'Properly rejected',
  });

  // 7c: Invalid date format rejection
  const invalidDateAsset = createAssetSchema.safeParse({
    name: 'Refrigerator',
    category: 'kitchen',
    installDate: '12/25/2020', // Invalid, must be YYYY-MM-DD
  });
  results.push({
    name: '7c. Zod Schema enforces strict YYYY-MM-DD date regex',
    passed: !invalidDateAsset.success,
    details: invalidDateAsset.success ? 'Failed: Accepted MM/DD/YYYY date' : 'Properly rejected',
  });

  // 7d: Invalid ID param rejection (path traversal / special characters)
  const invalidIdParam = idParamSchema.safeParse({ id: '../evil/path' });
  results.push({
    name: '7d. Zod ID Param schema rejects path traversal and special characters',
    passed: !invalidIdParam.success,
    details: invalidIdParam.success ? 'Failed: Accepted path traversal ID' : 'Properly rejected',
  });

  // Phase 4: Household Intelligence & Investigator Tests
  console.log('\n--- Phase 4 Intelligence Tests ---');

  // Test 8: Unauthenticated Intelligence Endpoints (Must return 401)
  try {
    const [resInsights, resRefresh, resExplain, resStatus] = await Promise.all([
      makeRequest('GET', '/api/intelligence/insights'),
      makeRequest('POST', '/api/intelligence/insights/refresh'),
      makeRequest('POST', '/api/intelligence/insights/test-id/explain'),
      makeRequest('PATCH', '/api/intelligence/insights/test-id/status', {}, { status: 'resolved' }),
    ]);

    const allRejected =
      resInsights.status === 401 &&
      resRefresh.status === 401 &&
      resExplain.status === 401 &&
      resStatus.status === 401;

    results.push({
      name: '8. Unauthenticated requests to /api/intelligence/* rejected with 401 UNAUTHORIZED',
      passed: allRejected,
      details: `GET: ${resInsights.status}, POST refresh: ${resRefresh.status}, POST explain: ${resExplain.status}, PATCH status: ${resStatus.status}`,
    });
  } catch (err: any) {
    results.push({ name: '8. Unauthenticated intelligence test', passed: false, details: err.message });
  }

  // Test 9: Deterministic Engine - Expense Increase & Large Expense Detection
  try {
    const { analyzeHouseholdData, generateInsightFingerprint } = await import(
      '../server/services/intelligenceService'
    );

    const testExpenses: any[] = [
      {
        id: 'exp-1',
        userId: 'user-123',
        title: 'Electricity - January',
        category: 'utilities',
        amount: 300,
        frequency: 'monthly',
        paymentStatus: 'paid',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'exp-2',
        userId: 'user-123',
        title: 'Electricity - February',
        category: 'utilities',
        amount: 380, // +26.7% increase (threshold > 15%)
        frequency: 'monthly',
        paymentStatus: 'paid',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      },
      {
        id: 'exp-3',
        userId: 'user-123',
        title: 'Emergency Roof Replacement',
        category: 'maintenance',
        amount: 8500, // Unusually large relative to regular budget
        frequency: 'one_time',
        paymentStatus: 'paid',
        createdAt: '2026-02-15T00:00:00Z',
        updatedAt: '2026-02-15T00:00:00Z',
      },
    ];

    const testAssets: any[] = [
      {
        id: 'asset-1',
        userId: 'user-123',
        name: 'Water Heater',
        category: 'plumbing',
        currentStatus: 'operational',
        warrantyExpiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days left
        brand: 'Rheem',
        modelNumber: 'PROG50',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'asset-2',
        userId: 'user-123',
        name: 'HVAC Compressor',
        category: 'hvac',
        currentStatus: 'needs_maintenance',
        brand: 'Carrier',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    const detected = analyzeHouseholdData(
      'user-123',
      { currency: 'USD' },
      testExpenses,
      testAssets
    );

    const hasExpenseIncrease = detected.some((i) => i.type === 'expense_increase');
    const hasLargeExpense = detected.some((i) => i.type === 'large_expense');
    const hasWarrantyExpiring = detected.some((i) => i.type === 'warranty_expiration');
    const hasMaintenanceDue = detected.some((i) => i.type === 'maintenance_due');

    const allDetected =
      hasExpenseIncrease && hasLargeExpense && hasWarrantyExpiring && hasMaintenanceDue;

    results.push({
      name: '9. Deterministic engine accurately identifies financial, warranty, and maintenance anomalies',
      passed: allDetected,
      details: `Detected ${detected.length} findings (Increase: ${hasExpenseIncrease}, Large: ${hasLargeExpense}, Warranty: ${hasWarrantyExpiring}, Maintenance: ${hasMaintenanceDue})`,
    });

    // Test 10: Idempotency & SHA-256 Fingerprint Duplicate Prevention
    const fp1 = generateInsightFingerprint('expense_increase', 'utilities', 380);
    const fp2 = generateInsightFingerprint('expense_increase', 'utilities', 380);
    const fp3 = generateInsightFingerprint('expense_increase', 'utilities', 390);

    const fingerprintsMatch = fp1 === fp2 && fp1 !== fp3 && fp1.length === 24;
    results.push({
      name: '10. Insight fingerprint hashing is idempotent, collision-resistant, and SHA-256 deterministic',
      passed: fingerprintsMatch,
      details: `Hash: ${fp1.substring(0, 16)}... Match: ${fp1 === fp2}`,
    });

  } catch (err: any) {
    results.push({ name: '9/10. Deterministic engine test', passed: false, details: err.message });
  }

  // Test 11: Zod Insight Status Schema Validation
  const { updateInsightStatusSchema } = await import('../server/schemas');
  const validStatus = updateInsightStatusSchema.safeParse({ status: 'resolved' });
  const invalidStatus = updateInsightStatusSchema.safeParse({ status: 'invalid_status_xyz' });

  results.push({
    name: '11. Zod updateInsightStatusSchema enforces valid lifecycle statuses (new/viewed/dismissed/resolved)',
    passed: validStatus.success && !invalidStatus.success,
    details: `Valid: ${validStatus.success}, Invalid rejected: ${!invalidStatus.success}`,
  });

  console.log('\n====================================================');
  console.log('               TEST RESULTS SUMMARY                 ');
  console.log('====================================================');
  let allPassed = true;
  for (const r of results) {
    const mark = r.passed ? '✅ PASS' : '❌ FAIL';
    if (!r.passed) allPassed = false;
    console.log(`${mark} : ${r.name}`);
    if (r.details) console.log(`         ↳ ${r.details}`);
  }
  console.log('====================================================\n');
  if (allPassed) {
    console.log('🎉 ALL BACKEND SECURITY & VALIDATION TESTS PASSED!');
  } else {
    console.error('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

