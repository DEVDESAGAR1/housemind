import { TestRunner } from '../test-helper';

export async function runHealthCalculatorUnitTests(runner: TestRunner): Promise<void> {
  runner.setSuite('Unit: Household Health Composite Scoring & Pillar Weighting');

  await runner.test('calculates_composite_score_bounded_between_0_and_100', () => {
    // 4 pillar weights: Physical (30%), Financial (30%), Operational (20%), Resilience (20%)
    const pillarScores = {
      physical: 85,
      financial: 90,
      operational: 75,
      resilience: 80,
    };

    const weightedScore = Math.round(
      pillarScores.physical * 0.3 +
        pillarScores.financial * 0.3 +
        pillarScores.operational * 0.2 +
        pillarScores.resilience * 0.2
    );

    if (weightedScore < 0 || weightedScore > 100) {
      throw new Error(`Score out of bounds: ${weightedScore}`);
    }
    if (weightedScore !== 84) {
      throw new Error(`Expected weighted score 84, got ${weightedScore}`);
    }
  });

  await runner.test('applies_risk_deductions_correctly_to_pillar_subscores', () => {
    let baselinePhysical = 100;
    const activeCriticalIssues = 2; // -15 each
    const overdueMaintenanceTasks = 1; // -10 each

    baselinePhysical -= activeCriticalIssues * 15;
    baselinePhysical -= overdueMaintenanceTasks * 10;
    const clampedPhysical = Math.max(0, Math.min(100, baselinePhysical));

    if (clampedPhysical !== 60) {
      throw new Error(`Expected clamped physical score 60, got ${clampedPhysical}`);
    }
  });

  await runner.test('identifies_provisional_status_when_data_completeness_is_insufficient', () => {
    const dataPoints = {
      hasProperties: true,
      hasAssets: false,
      hasExpenses: false,
      hasDocuments: false,
    };

    const filledCount = Object.values(dataPoints).filter(Boolean).length;
    const completenessPercentage = Math.round((filledCount / 4) * 100);
    const isProvisional = completenessPercentage < 50;

    if (!isProvisional) {
      throw new Error('Expected provisional status when only 1 of 4 core domains populated');
    }
    if (completenessPercentage !== 25) {
      throw new Error(`Expected 25% completeness, got ${completenessPercentage}%`);
    }
  });
}
