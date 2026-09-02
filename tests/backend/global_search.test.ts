import { apiRequest, TestRunner } from '../test-helper';

export async function runGlobalSearchTests(runner: TestRunner) {
  runner.setSuite('Phase 5: Global Search & Discovery');

  const token = 'test-token-search-' + Date.now();
  const otherToken = 'test-token-other-search-' + Date.now();

  await runner.test('Global Search: Querying empty database returns empty results', async () => {
    const res = await apiRequest('/api/search?q=dishwasher', { token });

    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    const data = res.body?.data || res.body;
    if (!Array.isArray(data.results) || data.results.length !== 0) {
      throw new Error(`Expected 0 results, got ${data.results?.length}`);
    }
    if (typeof data.totalMatches !== 'number' || data.totalMatches !== 0) {
      throw new Error(`Expected totalMatches 0, got ${data.totalMatches}`);
    }
  });

  await runner.test('Global Search: Indexes across multi-domain household entities', async () => {
    // 1. Create Property
    await apiRequest('/api/household/properties', {
      method: 'POST',
      token,
      body: {
        name: 'Maplewood Family Residence',
        propertyType: 'single_family',
        address: { street: '742 Evergreen Terrace', city: 'Springfield', region: 'OR' },
      },
    });

    // 2. Create Asset
    await apiRequest('/api/household/assets', {
      method: 'POST',
      token,
      body: {
        name: 'Bosch 800 Series Dishwasher',
        category: 'appliance',
        brand: 'Bosch',
        modelNumber: 'SHPM78Z55N',
        currentStatus: 'operational',
      },
    });

    // 3. Create Maintenance Task
    await apiRequest('/api/maintenance-tasks', {
      method: 'POST',
      token,
      body: {
        title: 'HVAC Air Filter Replacement',
        serviceProvider: 'Apex Heating & Cooling',
        serviceDate: '2026-04-15',
        cost: 45,
        recurringSchedule: 'quarterly',
        status: 'scheduled',
      },
    });

    // 4. Create Utility Account
    await apiRequest('/api/utilities', {
      method: 'POST',
      token,
      body: {
        name: 'Pacific Power & Light',
        provider: 'Pacific Power',
        serviceType: 'electricity',
        accountNumber: 'UTIL-987654',
        billingCycle: 'monthly',
        typicalAmount: 140,
        paymentStatus: 'paid',
        isAutoPay: true,
      },
    });

    // Test Search for "Bosch"
    const assetSearch = await apiRequest('/api/search?q=Bosch', { token });
    if (assetSearch.status !== 200) throw new Error(`Search failed: ${assetSearch.status}`);
    const assetData = assetSearch.body?.data || assetSearch.body;
    if (!assetData.results || assetData.results.length === 0) throw new Error('Expected to find Bosch asset');
    if (assetData.results[0].entityType !== 'asset') {
      throw new Error(`Expected entityType asset, got ${assetData.results[0].entityType}`);
    }

    // Test Search for "Evergreen"
    const propSearch = await apiRequest('/api/search?q=Evergreen', { token });
    const propData = propSearch.body?.data || propSearch.body;
    if (!propData.results || propData.results.length === 0) throw new Error('Expected to find property');
    if (propData.results[0].entityType !== 'property') {
      throw new Error(`Expected entityType property, got ${propData.results[0].entityType}`);
    }

    // Test Search for "HVAC"
    const maintSearch = await apiRequest('/api/search?q=HVAC', { token });
    const maintData = maintSearch.body?.data || maintSearch.body;
    if (!maintData.results || maintData.results.length === 0) throw new Error('Expected to find maintenance task');
    if (maintData.results[0].entityType !== 'maintenance') {
      throw new Error(`Expected entityType maintenance, got ${maintData.results[0].entityType}`);
    }

    // Test Search for "Pacific"
    const utilSearch = await apiRequest('/api/search?q=Pacific', { token });
    const utilData = utilSearch.body?.data || utilSearch.body;
    if (!utilData.results || utilData.results.length === 0) throw new Error('Expected to find utility account');
    if (utilData.results[0].entityType !== 'utility') {
      throw new Error(`Expected entityType utility, got ${utilData.results[0].entityType}`);
    }
  });

  await runner.test('Global Search: Category filtering restricts result set accurately', async () => {
    // Search with category filter = 'assets'
    const res = await apiRequest('/api/search?q=e&category=assets', { token });

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = res.body?.data || res.body;
    for (const item of data.results) {
      if (item.category !== 'assets' && item.entityType !== 'asset') {
        throw new Error(`Filter violation: item category ${item.category} was returned when filter is assets`);
      }
    }
  });

  await runner.test('Global Search: Multi-tenant isolation prevents cross-account discovery', async () => {
    // Search other user with the same query
    const res = await apiRequest('/api/search?q=Bosch', { token: otherToken });

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = res.body?.data || res.body;
    if (!data.results || data.results.length !== 0) {
      throw new Error('Tenant isolation breach: other user found first user records!');
    }
  });
}
