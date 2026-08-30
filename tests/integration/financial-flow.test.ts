import { apiRequest, TestRunner } from '../test-helper';
import { DatabaseService } from '../../server/services/dbService';

export async function runFinancialFlowIntegrationTests(runner: TestRunner) {
  runner.setSuite('Integration: End-to-End Financial Intelligence Flow');

  const userId = 'e2e-financial-user';
  const token = `test-token-${userId}`;

  await runner.test('Seed comprehensive demo dataset for new homeowner', async () => {
    await DatabaseService.seedDemoData(userId);

    const txRes = await apiRequest('/api/transactions', { token });
    if (txRes.status !== 200) {
      throw new Error(`Failed to list seeded transactions: ${txRes.status}`);
    }
    if (txRes.body.transactions.length < 5) {
      throw new Error(`Expected at least 5 seeded transactions, found ${txRes.body.transactions.length}`);
    }
  });

  await runner.test('Verify mathematical integrity of seeded financial metrics', async () => {
    const summaryRes = await apiRequest('/api/transactions/summary', { token });
    if (summaryRes.status !== 200) {
      throw new Error(`Failed to compute summary: ${summaryRes.status}`);
    }

    const { summary } = summaryRes.body;
    if (summary.totalIncome <= 0) {
      throw new Error(`Expected totalIncome > 0, got ${summary.totalIncome}`);
    }
    if (summary.totalExpenses <= 0) {
      throw new Error(`Expected totalExpenses > 0, got ${summary.totalExpenses}`);
    }
    if (summary.netCashFlow !== Number((summary.totalIncome - summary.totalExpenses).toFixed(2))) {
      throw new Error('Net cash flow does not equal income minus expenses');
    }
    if (summary.savingsRate < 0 || summary.savingsRate > 100) {
      throw new Error(`Savings rate outside valid 0-100 percentage range: ${summary.savingsRate}`);
    }
    if (!Array.isArray(summary.topSpendingCategories) || summary.topSpendingCategories.length === 0) {
      throw new Error('Top spending categories empty');
    }
  });

  await runner.test('Add manual transaction and confirm real-time summary recalculation', async () => {
    const initialSummary = (await apiRequest('/api/transactions/summary', { token })).body.summary;

    const addRes = await apiRequest('/api/transactions', {
      method: 'POST',
      token,
      body: {
        type: 'DEBIT',
        amount: 250.0,
        currency: 'USD',
        date: '2026-08-25',
        description: 'Plumbing Emergency Pipe Repair',
        category: 'Maintenance',
        account: 'Chase Checking (*4822)',
      },
    });

    if (addRes.status !== 201) {
      throw new Error(`Failed to add transaction: ${addRes.status}`);
    }

    const updatedSummary = (await apiRequest('/api/transactions/summary', { token })).body.summary;
    const expectedExpenses = Number((initialSummary.totalExpenses + 250.0).toFixed(2));

    if (Math.abs(updatedSummary.totalExpenses - expectedExpenses) > 0.01) {
      throw new Error(`Expected updated totalExpenses ${expectedExpenses}, got ${updatedSummary.totalExpenses}`);
    }
  });
}
