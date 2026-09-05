import { apiRequest, TestRunner } from '../test-helper';

export async function runScenariosTests(runner: TestRunner) {
  runner.setSuite('Decision Simulator & Financial Affordability Modeling');

  const tokenA = 'test-token-scenario-user-a';
  const tokenB = 'test-token-scenario-user-b';

  let createdScenarioId = '';
  let secondScenarioId = '';

  // Setup starter data for User A to have deterministic baseline
  await runner.test('seeds baseline financial metrics for scenario simulations', async () => {
    // Add income transaction
    const txRes = await apiRequest('/api/transactions', {
      method: 'POST',
      token: tokenA,
      body: {
        date: '2026-08-01',
        amount: 5000,
        type: 'CREDIT',
        category: 'Salary',
        merchant: 'Employer Payroll',
        description: 'Monthly Salary',
        isSalary: true,
      },
    });
    if (txRes.status !== 201) {
      throw new Error(`Failed to create income tx: ${txRes.status}`);
    }

    // Add recurring expense
    const expRes = await apiRequest('/api/household/expenses', {
      method: 'POST',
      token: tokenA,
      body: {
        title: 'Apartment Rent / Mortgage',
        category: 'mortgage_rent',
        amount: 2000,
        frequency: 'monthly',
        paymentStatus: 'paid',
      },
    });
    if (expRes.status !== 201) {
      throw new Error(`Failed to create expense: ${expRes.status}`);
    }
  });

  await runner.test('returns verified financial baseline surplus and cash flow metrics', async () => {
    const res = await apiRequest('/api/scenarios/baseline', { token: tokenA });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const data = res.body?.data;
    if (!data || data.monthlyIncome <= 0) {
      throw new Error(`Expected monthlyIncome > 0, got ${data?.monthlyIncome}`);
    }
    if (data.totalMonthlyExpenses <= 0) {
      throw new Error(`Expected totalMonthlyExpenses > 0, got ${data?.totalMonthlyExpenses}`);
    }
    if (data.netMonthlySurplus <= 0) {
      throw new Error(`Expected positive netMonthlySurplus, got ${data?.netMonthlySurplus}`);
    }
  });

  await runner.test('simulates hypothetical appliance EMI without persisting data', async () => {
    const res = await apiRequest('/api/scenarios/simulate', {
      method: 'POST',
      token: tokenA,
      body: {
        type: 'appliance_purchase',
        inputs: {
          applianceName: '5-Star Heat Pump AC',
          applianceCategory: 'hvac',
          purchaseCost: 1500,
          downPayment: 300,
          loanPrincipal: 1200,
          annualInterestRate: 0,
          tenureMonths: 12,
          applianceMonthlyOperatingCost: 20,
        },
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const { baselineMetrics, projectedMetrics, affordability } = res.body?.data || {};
    if (!projectedMetrics || projectedMetrics.monthlyEmiPayment !== 100) {
      throw new Error(`Expected monthly EMI 100 for 1200 principal at 0% for 12m, got ${projectedMetrics?.monthlyEmiPayment}`);
    }
    if (!affordability || !affordability.status) {
      throw new Error('Simulation response missing affordability indicator');
    }
  });

  await runner.test('creates and persists what-if purchase scenarios', async () => {
    const res = await apiRequest('/api/scenarios', {
      method: 'POST',
      token: tokenA,
      body: {
        title: 'Upgrade to Daikin Inverter AC',
        description: 'Testing 12m zero-cost EMI purchase',
        type: 'appliance_purchase',
        isPinned: true,
        inputs: {
          applianceName: 'Daikin 1.5T 5-Star AC',
          purchaseCost: 1500,
          downPayment: 300,
          loanPrincipal: 1200,
          annualInterestRate: 0,
          tenureMonths: 12,
          applianceMonthlyOperatingCost: 25,
        },
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const scenario = res.body?.data;
    if (!scenario?.id || scenario.title !== 'Upgrade to Daikin Inverter AC') {
      throw new Error(`Scenario creation payload mismatch: ${JSON.stringify(scenario)}`);
    }
    createdScenarioId = scenario.id;
  });

  await runner.test('creates second scenario for multi-option comparison', async () => {
    const res = await apiRequest('/api/scenarios', {
      method: 'POST',
      token: tokenA,
      body: {
        title: 'Promotion & Senior Role Raise',
        type: 'income_change',
        inputs: {
          incomeDelta: 1000,
          incomeChangeType: 'salary_hike',
        },
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}`);
    }
    secondScenarioId = res.body.data.id;
  });

  await runner.test('returns listing of all created scenarios for user', async () => {
    const res = await apiRequest('/api/scenarios', { token: tokenA });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }
    const list = res.body?.data || [];
    if (!list.some((s: any) => s.id === createdScenarioId)) {
      throw new Error(`Created scenario ${createdScenarioId} not found in listing`);
    }
  });

  await runner.test('returns scenario detail and affordability metrics by ID', async () => {
    const res = await apiRequest(`/api/scenarios/${createdScenarioId}`, { token: tokenA });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }
    if (res.body?.data?.id !== createdScenarioId) {
      throw new Error('Scenario ID mismatch');
    }
  });

  await runner.test('updates scenario parameter inputs and recalculates projection', async () => {
    const res = await apiRequest(`/api/scenarios/${createdScenarioId}`, {
      method: 'PUT',
      token: tokenA,
      body: {
        title: 'Upgrade to Daikin Inverter AC (Adjusted)',
        inputs: {
          applianceName: 'Daikin 1.5T 5-Star AC',
          purchaseCost: 1800,
          downPayment: 600,
          loanPrincipal: 1200,
          annualInterestRate: 0,
          tenureMonths: 12,
        },
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    if (res.body?.data?.title !== 'Upgrade to Daikin Inverter AC (Adjusted)') {
      throw new Error('Scenario title update failed');
    }
  });

  await runner.test('duplicates scenario into an independent cloned model', async () => {
    const res = await apiRequest(`/api/scenarios/${createdScenarioId}/duplicate`, {
      method: 'POST',
      token: tokenA,
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}`);
    }
    const dup = res.body?.data;
    if (!dup?.id || dup.id === createdScenarioId) {
      throw new Error('Duplicated scenario must have a distinct ID');
    }
    if (!dup.title.includes('(Copy)')) {
      throw new Error(`Duplicated scenario title should contain (Copy), got ${dup.title}`);
    }

    // Clean up duplicate
    await apiRequest(`/api/scenarios/${dup.id}`, { method: 'DELETE', token: tokenA });
  });

  await runner.test('evaluates scenario comparison matrix with deterministic recommendations', async () => {
    const res = await apiRequest('/api/scenarios/compare', {
      method: 'POST',
      token: tokenA,
      body: {
        scenarioIds: [createdScenarioId, secondScenarioId],
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    const comparison = res.body?.data;
    if (!comparison?.scenarios || comparison.scenarios.length !== 2) {
      throw new Error('Comparison matrix missing scenarios');
    }
    if (!comparison.recommendedScenarioId) {
      throw new Error('Comparison missing deterministic recommended scenario');
    }
  });

  await runner.test('generates scenario reasoning explanation with graceful Gemini fallback', async () => {
    const res = await apiRequest(`/api/scenarios/${createdScenarioId}/explain`, {
      method: 'POST',
      token: tokenA,
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    const explanation = res.body?.data?.geminiExplanation || res.body?.data;
    if (!explanation || !explanation.executiveSummary) {
      throw new Error('Expected structured Gemini explanation in response');
    }
  });

  await runner.test('prevents cross-tenant access, modification, or deletion of scenario models', async () => {
    // User B tries to get User A's scenario
    const getRes = await apiRequest(`/api/scenarios/${createdScenarioId}`, { token: tokenB });
    if (getRes.status !== 404) {
      throw new Error(`Expected 404 Not Found for cross-tenant access, got ${getRes.status}`);
    }

    // User B tries to update User A's scenario
    const putRes = await apiRequest(`/api/scenarios/${createdScenarioId}`, {
      method: 'PUT',
      token: tokenB,
      body: { title: 'Malicious Hack' },
    });
    if (putRes.status !== 404) {
      throw new Error(`Expected 404 Not Found for cross-tenant update, got ${putRes.status}`);
    }

    // User B tries to delete User A's scenario
    const delRes = await apiRequest(`/api/scenarios/${createdScenarioId}`, {
      method: 'DELETE',
      token: tokenB,
    });
    if (delRes.status !== 404) {
      throw new Error(`Expected 404 Not Found for cross-tenant delete, got ${delRes.status}`);
    }
  });

  await runner.test('deletes scenario model removing it from user collection', async () => {
    const res = await apiRequest(`/api/scenarios/${createdScenarioId}`, {
      method: 'DELETE',
      token: tokenA,
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }

    const checkRes = await apiRequest(`/api/scenarios/${createdScenarioId}`, { token: tokenA });
    if (checkRes.status !== 404) {
      throw new Error('Deleted scenario still returned');
    }
  });

  await runner.test('preserves real household financial records without destructive side-effects', async () => {
    // Verify expenses and transactions are untouched
    const expRes = await apiRequest('/api/household/expenses', { token: tokenA });
    const txRes = await apiRequest('/api/transactions', { token: tokenA });

    if (expRes.status !== 200 || txRes.status !== 200) {
      throw new Error('Failed to retrieve real household data for verification');
    }

    const rentExp = expRes.body?.data?.find((e: any) => e.title === 'Apartment Rent / Mortgage');
    if (!rentExp || rentExp.amount !== 2000) {
      throw new Error('Real expense was unexpectedly modified');
    }
  });
}
