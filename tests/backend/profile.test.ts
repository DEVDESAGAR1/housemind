import { apiRequest, TestRunner } from '../test-helper';

export async function runProfileTests(runner: TestRunner) {
  runner.setSuite('Household Profile Management');

  const token = 'test-token-profile-user';

  await runner.test('Fetch initial default profile for new user', async () => {
    const res = await apiRequest('/api/household/profile', { token });
    if (res.status !== 200) {
      throw new Error(`Expected status 200, got ${res.status}`);
    }
    if (!res.body?.data) {
      throw new Error('Expected profile data in response');
    }
  });

  await runner.test('Update household profile fields successfully', async () => {
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

  await runner.test('Validate profile reject negative square footage or invalid year', async () => {
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
