import { apiRequest, TestRunner } from '../test-helper';
import { DatabaseService } from '../../server/services/dbService';

export async function runIntelligenceFlowIntegrationTests(runner: TestRunner) {
  runner.setSuite('Integration: Intelligence & AI Copilot Synergy');

  const userId = 'e2e-intel-synergy-user';
  const token = `test-token-${userId}`;

  await runner.test('E2E: Seed user context with profile, recurring expenses, and aging appliances', async () => {
    await DatabaseService.seedDemoData(userId);

    const profile = await DatabaseService.getProfile(userId);
    if (!profile) throw new Error('Seeded profile missing');

    const expenses = await DatabaseService.listExpenses(userId);
    if (expenses.length === 0) throw new Error('Seeded expenses missing');

    const assets = await DatabaseService.listAssets(userId);
    if (assets.length === 0) throw new Error('Seeded assets missing');
  });

  await runner.test('E2E: Intelligence engine generates actionable savings opportunities', async () => {
    const res = await apiRequest('/api/intelligence/insights', { token });
    if (res.status !== 200) {
      throw new Error(`Failed to fetch insights: ${res.status}`);
    }

    const insights = res.body.data;
    if (!Array.isArray(insights) || insights.length === 0) {
      throw new Error('Expected at least one proactive savings insight');
    }
  });

  await runner.test('E2E: Copilot answers contextual questions accurately based on user data', async () => {
    const res = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token,
      body: {
        message: 'Can you summarize my home profile and list all equipment installed before 2020?',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Copilot chat query failed: ${res.status}`);
    }

    const { data } = res.body;
    if (!data.reply || data.reply.length < 20) {
      throw new Error('Copilot reply empty or incomplete');
    }
    if (!data.groundedSummary.profileLoaded) {
      throw new Error('Copilot failed to load grounded profile');
    }
  });
}
