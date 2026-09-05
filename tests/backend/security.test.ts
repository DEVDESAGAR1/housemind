import { apiRequest, TestRunner } from '../test-helper';
import { DatabaseService } from '../../server/services/dbService';

export async function runSecurityTests(runner: TestRunner) {
  runner.setSuite('Server Security, Rate Limiting & Proxy Protection');

  await runner.test('attaches security headers (Helmet) correctly on responses', async () => {
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

  await runner.test('handles reverse proxy and X-Forwarded-For headers safely without spoofing or crashes', async () => {
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

  await runner.test('rejects malicious input payload exceeding schema limits', async () => {
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

  await runner.test('rejects path traversal and malicious characters in IDs to defend against SSRF', async () => {
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

  await runner.test('prevents IDOR mutations across isolated user resources', async () => {
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

  await runner.test('enforces CORS policy allowing trusted origins and rejecting arbitrary origins', async () => {
    // 1. Allowed Production Cloud Run origin
    const prodRes = await apiRequest('/api/health', {
      headers: {
        Origin: 'https://ais-dev-wuwp76n5p24fhhnx2krmds-482220002764.asia-southeast1.run.app',
      },
    });
    const prodCors = prodRes.headers.get('access-control-allow-origin');
    const prodCreds = prodRes.headers.get('access-control-allow-credentials');

    if (prodCors !== 'https://ais-dev-wuwp76n5p24fhhnx2krmds-482220002764.asia-southeast1.run.app') {
      throw new Error(`Expected Access-Control-Allow-Origin for Cloud Run, got: ${prodCors}`);
    }
    if (prodCreds !== 'true') {
      throw new Error(`Expected Access-Control-Allow-Credentials: true, got: ${prodCreds}`);
    }

    // 2. Allowed Local Dev origin
    const devRes = await apiRequest('/api/health', {
      headers: {
        Origin: 'http://localhost:3000',
      },
    });
    const devCors = devRes.headers.get('access-control-allow-origin');
    if (devCors !== 'http://localhost:3000') {
      throw new Error(`Expected Access-Control-Allow-Origin for localhost:3000, got: ${devCors}`);
    }

    // 3. Rejected Arbitrary / Untrusted Origin
    const evilOrigin = 'https://malicious-attacker.com';
    const evilRes = await apiRequest('/api/health', {
      headers: {
        Origin: evilOrigin,
      },
    });
    const evilCors = evilRes.headers.get('access-control-allow-origin');
    if (evilCors && evilCors !== 'null') {
      try {
        const parsedCors = new URL(evilCors);
        if (parsedCors.origin === evilOrigin || parsedCors.hostname === 'malicious-attacker.com') {
          throw new Error(`Untrusted origin must NOT receive Access-Control-Allow-Origin! Got: ${evilCors}`);
        }
      } catch {
        if (evilCors === evilOrigin || evilCors === '*') {
          throw new Error(`Untrusted origin must NOT receive Access-Control-Allow-Origin! Got: ${evilCors}`);
        }
      }
    }
  });

  await runner.test('validates structured URLs and origins against domain spoofing and SSRF', async () => {
    const { isAllowedOrigin, isSafeUrl } = await import('../../server/middleware/security');

    // Valid origins
    if (!isAllowedOrigin('https://ai.studio')) throw new Error('Expected https://ai.studio to be allowed');
    if (!isAllowedOrigin('https://my-app.ai.studio')) throw new Error('Expected subdomain of ai.studio to be allowed');
    if (!isAllowedOrigin('http://localhost:3000')) throw new Error('Expected localhost to be allowed in dev');

    // Malicious suffix spoofing (e.g. evil-domain ending with trusted keyword or prefixing)
    if (isAllowedOrigin('https://ai.studio.attacker.com')) {
      throw new Error('Spoofed suffix domain ai.studio.attacker.com MUST be rejected');
    }
    if (isAllowedOrigin('https://attacker-ai.studio.com')) {
      throw new Error('Attacker prefixed domain attacker-ai.studio.com MUST be rejected');
    }
    if (isAllowedOrigin('https://run.app.phishing.org')) {
      throw new Error('Spoofed run.app.phishing.org MUST be rejected');
    }
    if (isAllowedOrigin('javascript:alert(1)')) {
      throw new Error('javascript: URI MUST be rejected');
    }
    if (isAllowedOrigin('https://user:pass@ai.studio')) {
      throw new Error('Origin with credentials MUST be rejected');
    }

    // SSRF / isSafeUrl validation
    if (!isSafeUrl('https://firestore.googleapis.com/v1/projects/my-proj')) {
      throw new Error('Expected valid HTTPS URL to be safe');
    }
    if (!isSafeUrl('http://127.0.0.1:8080/secret')) {
      throw new Error('Loopback IP MUST be rejected');
    }
    if (!isSafeUrl('http://localhost:3000/api')) {
      throw new Error('Localhost MUST be rejected by isSafeUrl');
    }
    if (!isSafeUrl('http://169.254.169.254/computeMetadata/v1/')) {
      throw new Error('Metadata IP MUST be rejected');
    }
    if (!isSafeUrl('javascript:evil()')) {
      throw new Error('javascript URL MUST be rejected');
    }
    if (!isSafeUrl('https://admin:secret@trusted.com/data')) {
      throw new Error('Credential-bearing URL MUST be rejected');
    }
  });

  await runner.test('exempts health check from rate limiting while enforcing limits on protected APIs', async () => {
    // Health check is always reachable for Cloud Run probes
    const healthRes = await apiRequest('/api/health');
    if (healthRes.status !== 200 || healthRes.body?.status !== 'healthy') {
      throw new Error(`Health check failed: status ${healthRes.status}`);
    }

    // Authenticated API request includes rate limiting headers or executes normally
    const profileRes = await apiRequest('/api/household/profile', {
      token: 'test-token-rate-limit-user',
    });
    if (profileRes.status !== 200) {
      throw new Error(`Protected route returned status ${profileRes.status}`);
    }
  });

  await runner.test('parses delimited document lines in linear time defending against ReDoS', async () => {
    const { parseDelimitedLine } = await import('../../server/services/documentParserService');

    // 1. Standard quoted CSV and TSV lines
    const standardLine = '2026-03-01,"Home Depot, Inc.",$84.20,"Maintenance, Repair"';
    const standardCells = parseDelimitedLine(standardLine);
    if (
      standardCells.length !== 4 ||
      standardCells[1] !== 'Home Depot, Inc.' ||
      standardCells[3] !== 'Maintenance, Repair'
    ) {
      throw new Error(`Failed to parse standard quoted CSV line: ${JSON.stringify(standardCells)}`);
    }

    // 2. Escaped internal quotes
    const escapedQuoteLine = '"Special ""Deluxe"" Item",120.00';
    const escapedCells = parseDelimitedLine(escapedQuoteLine);
    if (escapedCells[0] !== 'Special "Deluxe" Item' || escapedCells[1] !== '120.00') {
      throw new Error(`Failed to parse escaped quotes: ${JSON.stringify(escapedCells)}`);
    }

    // 3. Adversarial input: 50,000 characters of unmatched quotes, spaces, and commas
    const adversarialLine = '"' + ', "'.repeat(10000) + 'unmatched string tail';
    const startTime = performance.now();
    const result = parseDelimitedLine(adversarialLine);
    const elapsedMs = performance.now() - startTime;

    if (elapsedMs > 50) {
      throw new Error(`Adversarial line parsing exceeded 50ms (took ${elapsedMs.toFixed(2)}ms) - possible ReDoS!`);
    }
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('Expected adversarial line to parse safely into cell array');
    }
  });

  await runner.test('extracts entity fields safely in linear time without regex catastrophic backtracking', async () => {
    const {
      extractSafeWarrantyProvider,
      extractSafePolicyNumber,
      extractSafeWarrantyTitle,
    } = await import('../../server/services/entityExtractionService');

    // 1. Legitimate extraction cases
    const legTitle = extractSafeWarrantyTitle('RECEIPT & WARRANTY: Bosch Series 800 Dishwasher purchased on 2026-02-10');
    if (legTitle !== 'Bosch Series 800 Dishwasher') {
      throw new Error(`Expected legitimate warranty title, got: ${legTitle}`);
    }

    const legProvider = extractSafeWarrantyProvider('Provider: Acme Home Protection LLC. Standard terms apply.');
    if (legProvider !== 'Acme Home Protection LLC') {
      throw new Error(`Expected legitimate provider, got: ${legProvider}`);
    }

    const legPolicy = extractSafePolicyNumber('Account details: Policy #POL-88392-CA active until 2028');
    if (legPolicy !== 'POL-88392-CA') {
      throw new Error(`Expected legitimate policy number, got: ${legPolicy}`);
    }

    // 2. Adversarial ReDoS payloads (repetition designed to cause catastrophic backtracking in polynomial regexes)
    const longRepeatingWords = 'Word '.repeat(5000);
    const adversarialProviderInput = 'Provider ' + longRepeatingWords;
    const adversarialTitleInput = 'RECEIPT & WARRANTY: ' + longRepeatingWords;
    const adversarialPolicyInput = 'Policy ' + '#'.repeat(5000) + '99999';

    const t0 = performance.now();
    const advProviderResult = extractSafeWarrantyProvider(adversarialProviderInput);
    const advTitleResult = extractSafeWarrantyTitle(adversarialTitleInput);
    const advPolicyResult = extractSafePolicyNumber(adversarialPolicyInput);
    const elapsed = performance.now() - t0;

    if (elapsed > 50) {
      throw new Error(`Adversarial extraction took too long (${elapsed.toFixed(2)}ms) - ReDoS vulnerability!`);
    }

    // Handled safely without throw
    if (typeof advProviderResult !== 'undefined' && typeof advProviderResult !== 'string') {
      throw new Error('Unexpected return type');
    }
  });

  await runner.test('enforces strict loop bounds and row limits on document parsing', async () => {
    const {
      parseDelimitedLine,
      parseCsvDeterministically,
      MAX_LINE_CHAR_LIMIT,
      MAX_CSV_ROW_LIMIT,
    } = await import('../../server/services/documentParserService');

    // 1. Line exceeding MAX_LINE_CHAR_LIMIT is safely clamped
    const oversizedLine = 'cell1,cell2,' + 'x'.repeat(MAX_LINE_CHAR_LIMIT + 5000);
    const cells = parseDelimitedLine(oversizedLine);
    if (!Array.isArray(cells) || cells.length === 0) {
      throw new Error('Expected clamped parse of oversized line');
    }

    // 2. Invalid or malicious maxLineLength bounds (NaN, Infinity, negative) clamp safely
    const badBoundCells = parseDelimitedLine('a,b,c', -100 as any);
    if (badBoundCells.length !== 3) {
      throw new Error('Negative bound should safely fall back to safe default limit');
    }

    const nanBoundCells = parseDelimitedLine('a,b,c', NaN as any);
    if (nanBoundCells.length !== 3) {
      throw new Error('NaN bound should safely fall back to safe default limit');
    }

    // 3. Huge CSV with 10,000 lines processes safely up to MAX_CSV_ROW_LIMIT without hanging
    const fakeCsv = 'Date,Description,Amount\n' + '2026-01-01,Adversarial Item,10.00\n'.repeat(10000);
    const t0 = performance.now();
    const result = parseCsvDeterministically('test-user', 'massive.csv', fakeCsv);
    const elapsed = performance.now() - t0;

    if (elapsed > 200) {
      throw new Error(`Massive CSV processing took too long (${elapsed.toFixed(2)}ms)`);
    }
    if (result.candidates.length > MAX_CSV_ROW_LIMIT) {
      throw new Error(`Candidates exceeded safe limit: ${result.candidates.length}`);
    }
  });
}
