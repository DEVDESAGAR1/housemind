import { apiRequest, TestRunner } from '../test-helper';

export async function runProfileTests(runner: TestRunner) {
  runner.setSuite('Household Profile & Localization Management');

  const token = 'test-token-profile-user';

  await runner.test('returns initial default profile for newly registered user', async () => {
    const res = await apiRequest('/api/household/profile', { token });
    if (res.status !== 200) {
      throw new Error(`Expected status 200, got ${res.status}`);
    }
    if (!res.body?.data) {
      throw new Error('Expected profile data in response');
    }
  });

  await runner.test('updates household profile specification fields successfully', async () => {
    const updatePayload = {
      homeName: 'Maplewood Residence',
      homeType: 'single_family',
      yearBuilt: 2018,
      squareFootage: 2850,
      primaryHeating: 'Heat Pump',
      currency: 'USD',
    };

    const res = await apiRequest('/api/household/profile', {
      method: 'PUT',
      token,
      body: updatePayload,
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    if (res.body?.data?.homeName !== 'Maplewood Residence') {
      throw new Error(`Expected updated homeName 'Maplewood Residence', got ${res.body?.data?.homeName}`);
    }
    if (res.body?.data?.squareFootage !== 2850) {
      throw new Error(`Expected squareFootage 2850, got ${res.body?.data?.squareFootage}`);
    }
  });

  await runner.test('updates profile localization attributes and currency overrides', async () => {
    const res = await apiRequest('/api/household/profile', {
      method: 'PUT',
      token,
      body: {
        country: 'Germany',
        currency: 'EUR',
        currencyOverride: false,
        locale: 'de-DE',
        timezone: 'Europe/Berlin',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }
    if (res.body?.data?.country !== 'Germany' || res.body?.data?.currency !== 'EUR') {
      throw new Error(`Expected Germany/EUR, got ${res.body?.data?.country}/${res.body?.data?.currency}`);
    }
  });

  await runner.test('returns data sources summary with grounded AI context', async () => {
    const res = await apiRequest('/api/household/data-sources', { token });
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    if (!res.body?.data?.aiContextGrounding) {
      throw new Error('Expected aiContextGrounding in data sources');
    }
  });

  await runner.test('seeds and safely purges demo starter data without affecting user records', async () => {
    // 1. Seed demo data
    const seedRes = await apiRequest('/api/household/demo-seed', { method: 'POST', token });
    if (seedRes.status !== 200) {
      throw new Error(`Expected 200 for demo-seed, got ${seedRes.status}`);
    }

    // 2. Remove demo data
    const removeRes = await apiRequest('/api/household/demo-remove', { method: 'POST', token });
    if (removeRes.status !== 200) {
      throw new Error(`Expected 200 for demo-remove, got ${removeRes.status}`);
    }
    if (typeof removeRes.body?.deletedCount !== 'number') {
      throw new Error('Expected deletedCount in demo-remove response');
    }
  });

  await runner.test('rejects invalid profile inputs with negative square footage or invalid year', async () => {
    const res = await apiRequest('/api/household/profile', {
      method: 'PUT',
      token,
      body: {
        squareFootage: -50,
      },
    });

    if (res.status !== 400) {
      throw new Error(`Expected 400 validation error, got ${res.status}`);
    }
  });
}
