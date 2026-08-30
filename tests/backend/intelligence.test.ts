import { apiRequest, TestRunner } from '../test-helper';

export async function runIntelligenceTests(runner: TestRunner) {
  runner.setSuite('Intelligence & Deterministic Financial Metrics');

  const token = 'test-token-intel-user';

  // Seed expenses and assets for deterministic intelligence calculation
  await runner.test('Setup intelligence test fixtures', async () => {
    // Add monthly mortgage
    await apiRequest('/api/household/expenses', {
      method: 'POST',
      token,
      body: {
        title: 'Mortgage Loan',
        category: 'mortgage_rent',
        amount: 2200.0,
        frequency: 'monthly',
        dueDate: '2026-09-01',
      },
    });

    // Add yearly insurance
    await apiRequest('/api/household/expenses', {
      method: 'POST',
      token,
      body: {
        title: 'Homeowners Hazard Insurance',
        category: 'insurance',
        amount: 1200.0,
        frequency: 'annual',
        dueDate: '2026-11-15',
      },
    });

    // Add aging water heater
    await apiRequest('/api/household/assets', {
      method: 'POST',
      token,
      body: {
        name: 'Bradford White Gas Water Heater',
        category: 'plumbing',
        installDate: '2015-05-10',
        expectedLifespanYears: 10,
        purchaseCost: 1800.0,
        currentStatus: 'operational',
      },
    });
  });

  await runner.test('Compute deterministic summary metrics (monthly burn, annual cost)', async () => {
    const res = await apiRequest('/api/intelligence/summary', { token });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const summary = res.body?.data;
    if (!summary) {
      throw new Error('Summary data missing');
    }

    // Monthly burn rate should be 2200 + (1200 / 12) = 2300.0
    if (Math.abs(summary.monthlyBurnRate - 2300.0) > 0.01) {
      throw new Error(`Expected monthlyBurnRate ~2300, got ${summary.monthlyBurnRate}`);
    }

    // Annual total should be (2200 * 12) + 1200 = 27600.0
    if (Math.abs(summary.totalAnnualExpense - 27600.0) > 0.01) {
      throw new Error(`Expected totalAnnualExpense ~27600, got ${summary.totalAnnualExpense}`);
    }

    if (summary.activeExpensesCount !== 2) {
      throw new Error(`Expected activeExpensesCount 2, got ${summary.activeExpensesCount}`);
    }

    if (summary.totalAssetsCount !== 1) {
      throw new Error(`Expected totalAssetsCount 1, got ${summary.totalAssetsCount}`);
    }
  });

  await runner.test('Fetch generated intelligence insights and aging asset warnings', async () => {
    const res = await apiRequest('/api/intelligence/insights', { token });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }

    const insights = res.body?.data;
    if (!Array.isArray(insights)) {
      throw new Error('Insights should be an array');
    }

    // Since water heater was installed in 2015 with 10-year lifespan, in 2026 it is detected for maintenance/replacement
    const whInsight = insights.find((i: any) =>
      i.title.toLowerCase().includes('water heater') ||
      i.description.toLowerCase().includes('water heater')
    );

    if (!whInsight) {
      throw new Error(`Expected maintenance/lifespan insight for aging water heater, found: ${JSON.stringify(insights.map((i) => i.title))}`);
    }

    if (whInsight.type !== 'maintenance_due' && whInsight.type !== 'missing_info') {
      throw new Error(`Unexpected insight type: ${whInsight.type}`);
    }
  });
}
