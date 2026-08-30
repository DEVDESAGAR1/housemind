import { apiRequest, TestRunner } from '../test-helper';

export async function runAssetsTests(runner: TestRunner) {
  runner.setSuite('Household Assets CRUD');

  const token = 'test-token-asset-user';
  let createdAssetId = '';

  await runner.test('Create valid appliance asset record', async () => {
    const res = await apiRequest('/api/household/assets', {
      method: 'POST',
      token,
      body: {
        name: 'Trane XR14 Heat Pump',
        category: 'hvac',
        brand: 'Trane',
        modelNumber: '4TWR4036G1000A',
        serialNumber: '21041TR928',
        installDate: '2021-06-15',
        warrantyExpiryDate: '2031-06-15',
        expectedLifespanYears: 15,
        purchaseCost: 7500.0,
        currentStatus: 'operational',
        roomLocation: 'Outdoor Utility Pad',
        maintenanceNotes: 'Annual checkup done in April',
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    if (!res.body?.data?.id) {
      throw new Error('Asset response missing ID');
    }
    createdAssetId = res.body.data.id;
    if (res.body.data.name !== 'Trane XR14 Heat Pump') {
      throw new Error(`Expected name 'Trane XR14 Heat Pump', got ${res.body.data.name}`);
    }
  });

  await runner.test('List assets contains created asset record', async () => {
    const res = await apiRequest('/api/household/assets', { token });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }
    const item = res.body?.data?.find((a: any) => a.id === createdAssetId);
    if (!item) {
      throw new Error(`Created asset ${createdAssetId} not found in listing`);
    }
  });

  await runner.test('Update asset status and notes', async () => {
    const res = await apiRequest(`/api/household/assets/${createdAssetId}`, {
      method: 'PUT',
      token,
      body: {
        currentStatus: 'needs_maintenance',
        maintenanceNotes: 'Filter replacement scheduled next week',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }
    if (res.body?.data?.currentStatus !== 'needs_maintenance') {
      throw new Error(`Expected status 'needs_maintenance', got ${res.body?.data?.currentStatus}`);
    }
  });

  await runner.test('Delete asset removes record', async () => {
    const delRes = await apiRequest(`/api/household/assets/${createdAssetId}`, {
      method: 'DELETE',
      token,
    });

    if (delRes.status !== 200) {
      throw new Error(`Expected 200 OK for delete, got ${delRes.status}`);
    }

    const listRes = await apiRequest('/api/household/assets', { token });
    const exists = listRes.body?.data?.some((a: any) => a.id === createdAssetId);
    if (exists) {
      throw new Error(`Asset ${createdAssetId} still exists after deletion`);
    }
  });
}
