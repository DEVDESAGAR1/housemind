import { apiRequest, TestRunner } from '../test-helper';

export async function runCommandCenterTests(runner: TestRunner) {
  runner.setSuite('Phase 4: Household Command Center Intelligence');

  const token = 'test-token-cmd-center-p4';

  await runner.test('GET /api/household/command-center on new account returns clean initial structure', async () => {
    const res = await apiRequest('/api/household/command-center', { token });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const summary = res.body?.data || res.body?.summary;
    if (!summary) throw new Error('Command center summary data missing');

    if (summary.totalProperties !== 0 || summary.totalAssetsCount !== 0) {
      throw new Error(`Expected zero counts on empty account, got props=${summary.totalProperties}, assets=${summary.totalAssetsCount}`);
    }

    if (!summary.today || typeof summary.today.overdueCount !== 'number') {
      throw new Error('today section missing or invalid in command center summary');
    }

    if (!summary.upcoming30Days || !Array.isArray(summary.upcoming30Days.billsAndExpenses)) {
      throw new Error('upcoming30Days section missing in command center summary');
    }
  });

  await runner.test('GET /api/home/command-center-summary route alias operates identically', async () => {
    const res = await apiRequest('/api/home/command-center-summary', { token });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    const summary = res.body?.data || res.body?.summary;
    if (!summary || typeof summary.totalProperties !== 'number') {
      throw new Error('Command center alias returned invalid structure');
    }
  });

  await runner.test('Seed multi-domain records to test Command Center aggregation', async () => {
    // 1. Add Property
    await apiRequest('/api/household/properties', {
      method: 'POST',
      token,
      body: {
        name: 'Command Manor',
        propertyType: 'single_family',
        purchaseValue: 600000,
        currentEstimatedValue: 680000,
        yearBuilt: 2020,
        squareFootage: 2400,
        currency: 'USD',
      },
    });

    // 2. Add Asset
    await apiRequest('/api/household/assets', {
      method: 'POST',
      token,
      body: {
        name: 'Trane XR14 Heat Pump',
        category: 'hvac',
        brand: 'Trane',
        purchaseCost: 8500,
        currentEstimatedValue: 7200,
        currentStatus: 'operational',
      },
    });

    // 3. Add Loan
    await apiRequest('/api/loans', {
      method: 'POST',
      token,
      body: {
        loanName: 'Primary Mortgage',
        loanType: 'home_loan',
        lender: 'Chase Bank',
        principalAmount: 480000,
        outstandingAmount: 460000,
        interestRate: 6.25,
        emiAmount: 2950,
        startDate: '2023-01-01',
        endDate: '2053-01-01',
        tenureMonths: 360,
        paymentDueDay: 1,
        status: 'active',
      },
    });

    // 4. Add Credit Card
    await apiRequest('/api/credit-cards', {
      method: 'POST',
      token,
      body: {
        cardNickname: 'Sapphire Reserve',
        cardIssuer: 'Chase',
        last4Digits: '8812',
        creditLimit: 25000,
        outstandingAmount: 4200,
        minimumDue: 150,
        paymentDueDate: '2026-09-18',
      },
    });

    // 5. Add Expense / Utility
    await apiRequest('/api/household/expenses', {
      method: 'POST',
      token,
      body: {
        title: 'High-Speed Fiber Internet',
        category: 'services',
        amount: 85,
        frequency: 'monthly',
        paymentStatus: 'pending',
        isAutoPay: true,
        dueDate: '2026-09-15',
      },
    });
  });

  await runner.test('Verify Command Center aggregates data accurately across all domains', async () => {
    const res = await apiRequest('/api/household/command-center', { token });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }

    const summary = res.body?.data || res.body?.summary;
    if (!summary) throw new Error('Command center summary missing');

    if (summary.totalProperties !== 1) {
      throw new Error(`Expected totalProperties === 1, got ${summary.totalProperties}`);
    }

    if (summary.totalAssetsCount !== 1) {
      throw new Error(`Expected totalAssetsCount === 1, got ${summary.totalAssetsCount}`);
    }

    if (summary.totalOutstandingLoanDebt !== 460000) {
      throw new Error(`Expected totalOutstandingLoanDebt === 460000, got ${summary.totalOutstandingLoanDebt}`);
    }

    if (summary.totalCreditCardDebt !== 4200) {
      throw new Error(`Expected totalCreditCardDebt === 4200, got ${summary.totalCreditCardDebt}`);
    }

    if (summary.homeSpaces.totalPropertyValuation !== 680000) {
      throw new Error(`Expected property valuation 680000, got ${summary.homeSpaces.totalPropertyValuation}`);
    }

    if (summary.financialObligations.monthlyLoansTotal !== 2950) {
      throw new Error(`Expected monthlyLoansTotal === 2950, got ${summary.financialObligations.monthlyLoansTotal}`);
    }
  });

  await runner.test('Command Center maintains strict multi-tenant isolation', async () => {
    const otherToken = 'test-token-cmd-center-other-user';
    const res = await apiRequest('/api/household/command-center', { token: otherToken });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK for other tenant, got ${res.status}`);
    }

    const summary = res.body?.data || res.body?.summary;
    if (summary.totalProperties !== 0 || summary.totalAssetsCount !== 0) {
      throw new Error(`Tenant leak detected! Other user sees properties=${summary.totalProperties}`);
    }
  });
}
