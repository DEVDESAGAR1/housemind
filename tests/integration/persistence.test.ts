import { apiRequest, TestRunner } from '../test-helper';
import { DatabaseService } from '../../server/services/dbService';

export async function runPersistenceIntegrationTests(runner: TestRunner) {
  runner.setSuite('Integration: Database Service & State Persistence');

  const userId = 'e2e-persistence-user';
  const token = `test-token-${userId}`;

  await runner.test('Idempotent demo data seeding (repeated seeding does not corrupt state)', async () => {
    // First seed
    await DatabaseService.seedDemoData(userId);
    const count1 = (await DatabaseService.listTransactions(userId)).length;

    // Second seed (idempotent)
    await DatabaseService.seedDemoData(userId);
    const count2 = (await DatabaseService.listTransactions(userId)).length;

    if (count1 !== count2) {
      throw new Error(`Seeding is not idempotent: count changed from ${count1} to ${count2}`);
    }
  });

  await runner.test('CRUD state persists across multiple read-modify-write transactions', async () => {
    // Create new transaction
    const createRes = await apiRequest('/api/transactions', {
      method: 'POST',
      token,
      body: {
        type: 'DEBIT',
        amount: 45.20,
        currency: 'USD',
        date: '2026-08-28',
        description: 'Hardware Store Fasteners & Screws',
        category: 'Maintenance',
      },
    });

    const txId = createRes.body.transaction.id;

    // Verify it is present
    const getRes = await apiRequest(`/api/transactions/${txId}`, { token });
    if (getRes.status !== 200 || getRes.body.transaction.amount !== 45.20) {
      throw new Error('Transaction persistence check failed');
    }

    // Modify
    const updateRes = await apiRequest(`/api/transactions/${txId}`, {
      method: 'PUT',
      token,
      body: { amount: 55.20 },
    });

    if (updateRes.status !== 200 || updateRes.body.transaction.amount !== 55.20) {
      throw new Error('Transaction update persistence check failed');
    }

    // Delete
    await apiRequest(`/api/transactions/${txId}`, { method: 'DELETE', token });
    const finalGet = await apiRequest(`/api/transactions/${txId}`, { token });
    if (finalGet.status !== 404) {
      throw new Error('Transaction deletion failed to persist');
    }
  });
}
