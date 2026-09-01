import { apiRequest, TestRunner } from '../test-helper';

export async function runHealthIntelligenceTests(runner: TestRunner) {
  runner.setSuite('Phase 3: Household Health Intelligence');

  const token = 'test-token-health-user-p3';

  await runner.test('GET /api/intelligence/health on fresh account returns provisional report', async () => {
    const res = await apiRequest('/api/intelligence/health', { token });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const report = res.body?.data;
    if (!report) throw new Error('Health report data missing');

    if (typeof report.overallScore !== 'number' || report.overallScore < 0 || report.overallScore > 100) {
      throw new Error(`Invalid overallScore: ${report.overallScore}`);
    }

    if (!report.categories?.home || !report.categories?.assets || !report.categories?.finances || !report.categories?.documents) {
      throw new Error('Categories missing in health report');
    }

    if (report.isProvisional !== true) {
      throw new Error(`Expected isProvisional to be true on empty profile, got ${report.isProvisional}`);
    }

    if (!Array.isArray(report.recommendations) || report.recommendations.length === 0) {
      throw new Error('Expected actionable recommendations on provisional setup');
    }
  });

  await runner.test('GET /api/household/health route alias functions identically', async () => {
    const res = await apiRequest('/api/household/health', { token });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    const report = res.body?.data;
    if (!report || typeof report.overallScore !== 'number') {
      throw new Error('Household health route alias returned invalid data');
    }
  });

  await runner.test('Seed property, asset, and expense fixtures for health evaluation', async () => {
    // 1. Add Property
    const propRes = await apiRequest('/api/household/properties', {
      method: 'POST',
      token,
      body: {
        name: '452 Crestview Ridge',
        propertyType: 'single_family',
        purchaseValue: 750000,
        currentEstimatedValue: 820000,
        yearBuilt: 2019,
        squareFootage: 2800,
        currency: 'USD',
      },
    });
    const propertyId = propRes.body?.data?.id || propRes.body?.property?.id;

    // 2. Add Room
    if (propertyId) {
      await apiRequest('/api/household/rooms', {
        method: 'POST',
        token,
        body: {
          propertyId,
          name: 'Main Kitchen',
          type: 'kitchen',
        },
      });
    }

    // 3. Add Operational Asset
    const assetRes = await apiRequest('/api/household/assets', {
      method: 'POST',
      token,
      body: {
        name: 'Trane XR14 Heat Pump',
        category: 'hvac',
        installDate: '2023-04-10',
        expectedLifespanYears: 15,
        purchaseCost: 8500,
        currentStatus: 'operational',
      },
    });
    const assetId = assetRes.body?.data?.id;

    // 4. Add Active Warranty
    if (assetId) {
      await apiRequest('/api/household/warranties', {
        method: 'POST',
        token,
        body: {
          assetId,
          warrantyProvider: 'Trane Comfort Care',
          policyNumber: 'TC-8821',
          startDate: '2023-04-10',
          endDate: '2028-04-10',
          status: 'active',
          coverageNotes: 'Compressor and electrical coverage',
        },
      });
    }

    // 5. Add Recurring Expense on AutoPay
    await apiRequest('/api/household/expenses', {
      method: 'POST',
      token,
      body: {
        title: 'Municipal Water & Sewer',
        category: 'utilities',
        amount: 85,
        frequency: 'monthly',
        paymentStatus: 'paid',
        isAutoPay: true,
      },
    });
  });

  await runner.test('Health score reflects registered assets, properties, and active warranty', async () => {
    const res = await apiRequest('/api/intelligence/health', { token });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }

    const report = res.body?.data;
    if (!report) throw new Error('Report missing');

    if (report.categories.home.score <= 60) {
      throw new Error(`Expected home score to improve, got ${report.categories.home.score}`);
    }

    if (report.categories.assets.score <= 70) {
      throw new Error(`Expected asset score to reflect operational warranty coverage, got ${report.categories.assets.score}`);
    }

    if (report.completenessScore <= 20) {
      throw new Error(`Expected completeness to rise with multi-domain data, got ${report.completenessScore}%`);
    }
  });

  await runner.test('Critical equipment failure deterministically penalizes asset health', async () => {
    // Add critical failing asset
    await apiRequest('/api/household/assets', {
      method: 'POST',
      token,
      body: {
        name: 'Basement Sump Pump',
        category: 'plumbing',
        installDate: '2016-01-01',
        expectedLifespanYears: 7,
        purchaseCost: 650,
        currentStatus: 'critical',
      },
    });

    const res = await apiRequest('/api/intelligence/health', { token });
    const report = res.body?.data;

    const hasCriticalSignal = report.topSignals.some((s: any) => s.status === 'critical' || s.name.includes('Critical'));
    if (!hasCriticalSignal) {
      throw new Error('Expected critical signal to be flagged for failing sump pump');
    }
  });

  await runner.test('POST /api/intelligence/health/explain returns structured AI explanation', async () => {
    const res = await apiRequest('/api/intelligence/health/explain', {
      method: 'POST',
      token,
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK for explanation, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const explanation = res.body?.data;
    if (!explanation?.executiveSummary || !Array.isArray(explanation.strengths) || !Array.isArray(explanation.topRisks)) {
      throw new Error('Invalid explanation structure returned');
    }
  });
}
