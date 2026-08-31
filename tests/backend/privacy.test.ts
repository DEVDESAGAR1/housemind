import { apiRequest, TestRunner } from '../test-helper';
import { DatabaseService } from '../../server/services/dbService';

export async function runPrivacyTests(runner: TestRunner): Promise<void> {
  runner.setSuite('Privacy-First Architecture & Data Deletion');

  const userIdA = 'privacy-user-alice';
  const userIdB = 'privacy-user-bob';
  const tokenA = 'test-token-privacy-user-alice';
  const tokenB = 'test-token-privacy-user-bob';

  // Setup: Seed demo data for User A and User B
  await DatabaseService.seedDemoData(userIdA);
  await DatabaseService.seedDemoData(userIdB);

  // Add real custom records for User A
  const customExpense = await DatabaseService.createExpense(userIdA, {
    title: 'Custom Private Electric Bill',
    category: 'utilities',
    amount: 175.5,
    frequency: 'monthly',
    isAutoPay: true,
  });

  const customTx = await DatabaseService.createTransaction(userIdA, {
    date: '2026-03-01',
    description: 'Custom Home Depot Paint & Supplies',
    amount: 84.2,
    type: 'expense',
    category: 'Home & Maintenance',
    source: 'manual',
  });

  const customAsset = await DatabaseService.createAsset(userIdA, {
    name: 'Custom Smart Thermostat',
    category: 'hvac',
    purchaseDate: '2025-06-15',
    purchasePrice: 249.99,
    expectedLifespanYears: 10,
    status: 'good',
  });

  // Test 1: GET /api/household/privacy-center returns accurate user vs demo breakdown
  await runner.test('Privacy Center returns accurate user vs demo item inventory', async () => {
    const res = await apiRequest('/api/household/privacy-center', {
      method: 'GET',
      token: tokenA,
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const data = res.body.data;
    if (!data || !data.userId || data.userId !== userIdA) {
      throw new Error(`Expected data for userId ${userIdA}, got: ${JSON.stringify(data)}`);
    }

    if (typeof data.userRecordsCount !== 'number' || data.userRecordsCount < 3) {
      throw new Error(`Expected at least 3 user records, got ${data.userRecordsCount}`);
    }

    if (typeof data.demoRecordsCount !== 'number' || data.demoRecordsCount === 0) {
      throw new Error(`Expected demoRecordsCount > 0, got ${data.demoRecordsCount}`);
    }

    if (data.isolationLevel !== 'STRICT_USER_ISOLATED') {
      throw new Error(`Expected isolationLevel to be 'STRICT_USER_ISOLATED', got ${data.isolationLevel}`);
    }

    if (!Array.isArray(data.sources) || data.sources.length === 0) {
      throw new Error('Expected data sources list in privacy summary');
    }
  });

  // Test 2: Demo data deletion deletes ONLY demo records, leaving custom user records intact
  await runner.test('Demo data removal deletes only seeded items and preserves user records', async () => {
    const res = await apiRequest('/api/household/demo-remove', {
      method: 'POST',
      token: tokenA,
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    if (!res.body.deletedCount || res.body.deletedCount <= 0) {
      throw new Error(`Expected deletedCount > 0, got ${res.body.deletedCount}`);
    }

    // Verify custom records still exist
    const fetchedExpense = await DatabaseService.getExpense(userIdA, customExpense.id);
    if (!fetchedExpense || fetchedExpense.title !== 'Custom Private Electric Bill') {
      throw new Error('User custom expense was erroneously deleted during demo cleanup!');
    }

    const fetchedTx = await DatabaseService.getTransaction(userIdA, customTx.id);
    if (!fetchedTx || fetchedTx.description !== 'Custom Home Depot Paint & Supplies') {
      throw new Error('User custom transaction was erroneously deleted during demo cleanup!');
    }

    const fetchedAsset = await DatabaseService.getAsset(userIdA, customAsset.id);
    if (!fetchedAsset || fetchedAsset.name !== 'Custom Smart Thermostat') {
      throw new Error('User custom asset was erroneously deleted during demo cleanup!');
    }

    // Verify demo records count for userIdA is now 0
    const summary = DatabaseService.getPrivacySummary(userIdA);
    if (summary.demoRecordsCount !== 0) {
      throw new Error(`Expected demoRecordsCount to be 0 after removal, got ${summary.demoRecordsCount}`);
    }

    // Verify User B's demo records were NOT affected (multi-tenant isolation)
    const summaryB = DatabaseService.getPrivacySummary(userIdB);
    if (summaryB.demoRecordsCount === 0) {
      throw new Error("User B's demo records were mistakenly purged when User A removed demo data!");
    }
  });

  // Test 3: Reset data endpoint requires explicit confirmation
  await runner.test('Reset household data endpoint rejects unconfirmed requests', async () => {
    const res = await apiRequest('/api/household/reset-data', {
      method: 'POST',
      token: tokenA,
      body: { confirm: false },
    });

    if (res.status !== 400) {
      throw new Error(`Expected 400 for unconfirmed reset, got ${res.status}`);
    }
  });

  // Test 4: Reset data endpoint safely wipes confirmed user data and preserves other tenants
  await runner.test('Reset household data safely wipes confirmed user data and preserves other tenants', async () => {
    const res = await apiRequest('/api/household/reset-data', {
      method: 'POST',
      token: tokenA,
      body: { confirmPhrase: 'DELETE MY DATA' },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const summaryAfter = DatabaseService.getPrivacySummary(userIdA);
    if (summaryAfter.totalRecords !== 0) {
      throw new Error(`Expected 0 records after full reset, found ${summaryAfter.totalRecords}`);
    }

    // User B's data must remain intact
    const summaryB = DatabaseService.getPrivacySummary(userIdB);
    if (summaryB.totalRecords === 0) {
      throw new Error("User B's data was wiped during User A's reset!");
    }
  });
}
