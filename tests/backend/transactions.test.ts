import { apiRequest, TestRunner } from '../test-helper';

export async function runTransactionsTests(runner: TestRunner) {
  runner.setSuite('Financial Transactions & Summary Ledger');

  const token = 'test-token-tx-user';
  let createdTxId = '';

  await runner.test('Create manual income transaction (CREDIT)', async () => {
    const res = await apiRequest('/api/transactions', {
      method: 'POST',
      token,
      body: {
        type: 'CREDIT',
        amount: 5000.0,
        currency: 'USD',
        date: '2026-08-01',
        description: 'Monthly Engineering Salary',
        category: 'Salary',
        account: 'Chase Checking',
        isSalary: true,
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    createdTxId = res.body?.transaction?.id;
    if (!createdTxId) {
      throw new Error('Created transaction missing ID');
    }
    if (res.body.transaction.amount !== 5000.0) {
      throw new Error(`Expected amount 5000.0, got ${res.body.transaction.amount}`);
    }
    if (!res.body.transaction.fingerprint) {
      throw new Error('Transaction fingerprint missing');
    }
  });

  await runner.test('Create manual expense transaction (DEBIT)', async () => {
    const res = await apiRequest('/api/transactions', {
      method: 'POST',
      token,
      body: {
        type: 'DEBIT',
        amount: 1500.0,
        currency: 'USD',
        date: '2026-08-03',
        description: 'Mortgage Payment ACH',
        category: 'Housing',
        account: 'Chase Checking',
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}`);
    }
  });

  await runner.test('Create manual transfer transaction (TRANSFER)', async () => {
    const res = await apiRequest('/api/transactions', {
      method: 'POST',
      token,
      body: {
        type: 'TRANSFER',
        amount: 800.0,
        currency: 'USD',
        date: '2026-08-10',
        description: 'Transfer to High Yield Savings',
        category: 'Transfer Out',
        account: 'Chase Checking',
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}`);
    }
  });

  await runner.test('Compute deterministic financial summary (Credits, Debits, Net Cash Flow, Savings Rate)', async () => {
    const res = await apiRequest('/api/transactions/summary', { token });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }

    const { summary } = res.body;
    if (!summary) {
      throw new Error('Summary data missing');
    }

    // Total income = 5000.0, Total expenses = 1500.0, Net cash flow = 3500.0
    if (summary.totalIncome !== 5000.0) {
      throw new Error(`Expected totalIncome 5000.0, got ${summary.totalIncome}`);
    }
    if (summary.totalExpenses !== 1500.0) {
      throw new Error(`Expected totalExpenses 1500.0, got ${summary.totalExpenses}`);
    }
    if (summary.netCashFlow !== 3500.0) {
      throw new Error(`Expected netCashFlow 3500.0, got ${summary.netCashFlow}`);
    }
    // Savings rate = (3500 / 5000) * 100 = 70.0%
    if (summary.savingsRate !== 70.0) {
      throw new Error(`Expected savingsRate 70.0%, got ${summary.savingsRate}`);
    }
    if (summary.totalTransfers !== 800.0) {
      throw new Error(`Expected totalTransfers 800.0, got ${summary.totalTransfers}`);
    }
  });

  await runner.test('Filter transactions by type and text search', async () => {
    const filterRes = await apiRequest('/api/transactions?type=DEBIT', { token });
    if (filterRes.status !== 200) {
      throw new Error(`Expected 200 OK, got ${filterRes.status}`);
    }
    if (filterRes.body.transactions.some((t: any) => t.type !== 'DEBIT')) {
      throw new Error('Filter by DEBIT returned non-debit transaction');
    }

    const searchRes = await apiRequest('/api/transactions?search=Mortgage', { token });
    if (searchRes.status !== 200) {
      throw new Error(`Expected 200 OK, got ${searchRes.status}`);
    }
    if (searchRes.body.transactions.length !== 1 || !searchRes.body.transactions[0].description.includes('Mortgage')) {
      throw new Error('Search failed to find Mortgage transaction');
    }
  });

  await runner.test('Update transaction amount and category', async () => {
    const res = await apiRequest(`/api/transactions/${createdTxId}`, {
      method: 'PUT',
      token,
      body: {
        amount: 5200.0,
        notes: 'Includes annual performance bonus',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }
    if (res.body.transaction.amount !== 5200.0) {
      throw new Error(`Expected updated amount 5200.0, got ${res.body.transaction.amount}`);
    }
  });

  await runner.test('Delete transaction removes it from ledger', async () => {
    const res = await apiRequest(`/api/transactions/${createdTxId}`, {
      method: 'DELETE',
      token,
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }

    const getRes = await apiRequest(`/api/transactions/${createdTxId}`, { token });
    if (getRes.status !== 404) {
      throw new Error(`Expected 404 Not Found after deletion, got ${getRes.status}`);
    }
  });
}
