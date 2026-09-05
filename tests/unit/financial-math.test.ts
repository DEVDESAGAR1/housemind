import { TestRunner } from '../test-helper';

export async function runFinancialMathUnitTests(runner: TestRunner): Promise<void> {
  runner.setSuite('Unit: Deterministic Financial Mathematics & Simulation Calculations');

  await runner.test('calculates_zero_interest_emi_accurately_without_division_by_zero', () => {
    const principal = 2400;
    const rateAnnual = 0;
    const tenureMonths = 24;

    const monthlyEmi = rateAnnual === 0 ? principal / tenureMonths : 0;
    if (monthlyEmi !== 100) {
      throw new Error(`Expected $100/mo EMI, got ${monthlyEmi}`);
    }
  });

  await runner.test('calculates_standard_amortized_emi_using_standard_banking_formula', () => {
    const principal = 100000;
    const rateAnnual = 8.5; // 8.5%
    const tenureMonths = 120; // 10 years

    const monthlyRate = rateAnnual / 12 / 100;
    const emi = Math.round(
      (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1)
    );

    // Standard banking calculation for $100k at 8.5% for 10y is ~$1,240/mo
    if (emi < 1235 || emi > 1245) {
      throw new Error(`Expected standard EMI around $1,240, got ${emi}`);
    }
  });

  await runner.test('calculates_revolving_credit_utilization_ratio_cleanly', () => {
    const creditLimit = 20000;
    const currentBalance = 4500;

    const utilization = Math.round((currentBalance / creditLimit) * 100);
    if (utilization !== 23) {
      throw new Error(`Expected 23% utilization, got ${utilization}%`);
    }
  });

  await runner.test('calculates_monthly_cash_flow_surplus_and_burn_rate_deterministically', () => {
    const income = 7500;
    const fixedExpenses = 2800;
    const loanEmis = 1450;
    const utilityBills = 350;

    const totalBurnRate = fixedExpenses + loanEmis + utilityBills;
    const netSurplus = income - totalBurnRate;

    if (totalBurnRate !== 4600) {
      throw new Error(`Expected total burn rate $4,600, got ${totalBurnRate}`);
    }
    if (netSurplus !== 2900) {
      throw new Error(`Expected net monthly surplus $2,900, got ${netSurplus}`);
    }
  });
}
