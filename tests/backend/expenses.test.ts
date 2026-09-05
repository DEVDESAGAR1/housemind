import { apiRequest, TestRunner } from '../test-helper';

export async function runExpensesTests(runner: TestRunner) {
  runner.setSuite('Household Recurring Expenses & Cash Flow Lifecycle');

  const token = 'test-token-expense-user';
  let createdExpenseId = '';

  await runner.test('creates recurring monthly expense item with metadata', async () => {
    const res = await apiRequest('/api/household/expenses', {
      method: 'POST',
      token,
      body: {
        title: 'High-Speed Fiber Internet',
        category: 'services',
        amount: 89.99,
        frequency: 'monthly',
        dueDate: '2026-09-01',
        isAutoPay: true,
        paymentStatus: 'paid',
        notes: 'Gigabit fiber connection',
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    if (!res.body?.data?.id) {
      throw new Error('Expense response missing ID');
    }
    createdExpenseId = res.body.data.id;
    if (res.body.data.amount !== 89.99) {
      throw new Error(`Expected amount 89.99, got ${res.body.data.amount}`);
    }
  });

  await runner.test('returns expense listings including newly created item', async () => {
    const res = await apiRequest('/api/household/expenses', { token });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }
    const item = res.body?.data?.find((e: any) => e.id === createdExpenseId);
    if (!item) {
      throw new Error(`Created expense ${createdExpenseId} not found in listing`);
    }
  });

  await runner.test('updates recurring expense amount and payment status', async () => {
    const res = await apiRequest(`/api/household/expenses/${createdExpenseId}`, {
      method: 'PUT',
      token,
      body: {
        amount: 99.99,
        paymentStatus: 'pending',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    if (res.body?.data?.amount !== 99.99) {
      throw new Error(`Expected updated amount 99.99, got ${res.body?.data?.amount}`);
    }
  });

  await runner.test('deletes recurring expense removing it from collection', async () => {
    const delRes = await apiRequest(`/api/household/expenses/${createdExpenseId}`, {
      method: 'DELETE',
      token,
    });

    if (delRes.status !== 200) {
      throw new Error(`Expected 200 OK for delete, got ${delRes.status}`);
    }

    const listRes = await apiRequest('/api/household/expenses', { token });
    const exists = listRes.body?.data?.some((e: any) => e.id === createdExpenseId);
    if (exists) {
      throw new Error(`Expense ${createdExpenseId} still exists after deletion`);
    }
  });

  await runner.test('rejects invalid expense payload with negative amount', async () => {
    const res = await apiRequest('/api/household/expenses', {
      method: 'POST',
      token,
      body: {
        title: 'Negative Expense',
        category: 'utilities',
        amount: -100,
        frequency: 'monthly',
      },
    });

    if (res.status !== 400) {
      throw new Error(`Expected 400 validation error, got ${res.status}`);
    }
  });
}
