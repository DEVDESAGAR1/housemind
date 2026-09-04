import { GoogleGenAI } from '@google/genai';
import { DatabaseService } from './dbService';
import {
  HouseholdHealthReport,
  CategoryHealthBreakdown,
  HouseholdHealthSignal,
  HouseholdHealthRecommendation,
  HouseholdHealthAiExplanation,
  HealthStatusLevel,
  HouseholdHealthCategory,
  Property,
  Room,
  HomeAsset,
  WarrantyPolicy,
  MaintenanceTask,
  HouseholdExpense,
  UtilityAccount,
  HouseholdLoan,
  CreditCardAccount,
  FinancialTransaction,
  HouseholdDocument,
} from '../../src/types';

// Lazy-initialized Gemini Client
let genAIClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[HEALTH SERVICE] Warning: GEMINI_API_KEY is not set.');
    }
    genAIClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

function getStatusLevel(score: number, completeness: number): { level: HealthStatusLevel; label: string } {
  if (completeness < 25) {
    return { level: 'insufficient_data', label: 'Unrated (Setup Required)' };
  }
  if (score >= 85) return { level: 'excellent', label: 'Excellent' };
  if (score >= 70) return { level: 'good', label: 'Good' };
  if (score >= 50) return { level: 'fair', label: 'Needs Attention' };
  return { level: 'at_risk', label: 'Critical / At Risk' };
}

/**
 * Normalizes recurring expense to monthly baseline
 */
function toMonthly(amount: number, frequency?: string): number {
  const val = Number(amount) || 0;
  switch (frequency) {
    case 'annual':
      return val / 12;
    case 'quarterly':
      return val / 3;
    case 'one_time':
      return 0;
    case 'monthly':
    default:
      return val;
  }
}

/**
 * 1. Compute Home & Property Health (Weight: 20%)
 */
export function computeHomeHealth(
  properties: Property[],
  rooms: Room[],
  documents: HouseholdDocument[]
): CategoryHealthBreakdown {
  const signals: HouseholdHealthSignal[] = [];
  const positiveFactors: string[] = [];
  const riskFactors: string[] = [];

  let rawScore = 75; // Neutral baseline
  let completeness = 0;

  if (properties.length === 0) {
    signals.push({
      id: 'home_no_property',
      category: 'home',
      name: 'No Properties Configured',
      status: 'warning',
      scoreImpact: -15,
      weight: 0.8,
      title: 'Primary Residence Unregistered',
      description: 'Add your primary home or apartment to unlock property valuation and structural room tracking.',
      evidence: '0 properties currently registered in database.',
      recommendation: 'Register your primary residence under Properties & Rooms.',
      actionTab: 'properties',
      actionLabel: 'Add Property',
    });
    riskFactors.push('No property profile registered');
    rawScore = 60;
    completeness = 10;
  } else {
    positiveFactors.push(`${properties.length} property record(s) actively configured`);
    completeness += 40;

    // Check primary property details
    const primaryProp = properties[0];
    if (primaryProp.currentEstimatedValue || primaryProp.purchaseValue) {
      positiveFactors.push('Property valuation data tracked');
      completeness += 20;
      signals.push({
        id: 'home_valuation_tracked',
        category: 'home',
        name: 'Property Valuation Active',
        status: 'healthy',
        scoreImpact: 5,
        weight: 0.5,
        title: 'Valuation & Equity Monitored',
        description: `Current property valuation recorded at $${(primaryProp.currentEstimatedValue || primaryProp.purchaseValue || 0).toLocaleString()}.`,
        evidence: `Estimated value: $${primaryProp.currentEstimatedValue || primaryProp.purchaseValue}`,
      });
      rawScore += 5;
    }

    if (primaryProp.yearBuilt || primaryProp.squareFootage) {
      completeness += 20;
    }

    // Room zoning check
    if (rooms.length > 0) {
      completeness += 20;
      positiveFactors.push(`${rooms.length} room(s) zoned and mapped`);
      signals.push({
        id: 'home_rooms_zoned',
        category: 'home',
        name: 'Room Infrastructure Mapped',
        status: 'healthy',
        scoreImpact: 10,
        weight: 0.6,
        title: 'Space & Zone Coverage',
        description: `${rooms.length} functional zones configured across your residence.`,
        evidence: `${rooms.length} active room records linked to properties.`,
      });
      rawScore += 10;
    } else {
      signals.push({
        id: 'home_no_rooms',
        category: 'home',
        name: 'Unmapped Room Zones',
        status: 'info',
        scoreImpact: -5,
        weight: 0.4,
        title: 'Room Zones Not Mapped',
        description: 'Map individual rooms (Kitchen, HVAC closet, Living Room) to organize equipment and maintenance.',
        evidence: '0 rooms created for configured properties.',
        recommendation: 'Add key rooms to organize appliances by location.',
        actionTab: 'properties',
        actionLabel: 'Add Rooms',
      });
      rawScore -= 5;
      riskFactors.push('No rooms mapped to property');
    }

    // Check if property deeds or leases exist
    const hasPropertyDoc = documents.some(
      (d) => d.documentType === 'other' || (d.fileName && /deed|lease|mortgage|tax/i.test(d.fileName))
    );
    if (hasPropertyDoc) {
      positiveFactors.push('Property documentation archived');
      rawScore += 5;
    }
  }

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const completenessScore = Math.max(0, Math.min(100, Math.round(completeness)));
  const { level, label } = getStatusLevel(score, completenessScore);

  return {
    category: 'home',
    name: 'Home & Spaces',
    score,
    status: level,
    statusLabel: label,
    weight: 0.2,
    completenessScore,
    signals,
    summary:
      properties.length > 0
        ? `${properties.length} property and ${rooms.length} room zones tracked.`
        : 'Initial property profile setup recommended.',
    positiveFactors,
    riskFactors,
  };
}

/**
 * 2. Compute Asset & Equipment Health (Weight: 30%)
 */
export function computeAssetHealth(
  assets: HomeAsset[],
  warranties: WarrantyPolicy[],
  maintenanceTasks: MaintenanceTask[],
  referenceDate: Date = new Date()
): CategoryHealthBreakdown {
  const signals: HouseholdHealthSignal[] = [];
  const positiveFactors: string[] = [];
  const riskFactors: string[] = [];

  let rawScore = 80;
  let completeness = 0;

  const todayStr = referenceDate.toISOString().split('T')[0];
  const nowTime = referenceDate.getTime();

  if (assets.length === 0) {
    signals.push({
      id: 'asset_no_inventory',
      category: 'assets',
      name: 'No Asset Inventory',
      status: 'warning',
      scoreImpact: -15,
      weight: 0.8,
      title: 'Major Home Appliances Not Logged',
      description: 'Log your HVAC, water heater, refrigerator, and vehicles to track warranties, lifespans, and service intervals.',
      evidence: '0 registered assets.',
      recommendation: 'Add major appliances under Assets.',
      actionTab: 'assets',
      actionLabel: 'Add Asset',
    });
    riskFactors.push('No assets or appliances tracked');
    rawScore = 65;
    completeness = 10;
  } else {
    completeness += 30;
    positiveFactors.push(`${assets.length} equipment/asset(s) actively tracked`);

    // Operational Status check
    const criticalAssets = assets.filter((a) => a.currentStatus === 'critical');
    const needsMaintAssets = assets.filter((a) => a.currentStatus === 'needs_maintenance');
    const operationalAssets = assets.filter((a) => a.currentStatus === 'operational' || !a.currentStatus);

    if (criticalAssets.length > 0) {
      const deduction = Math.min(35, criticalAssets.length * 20);
      rawScore -= deduction;
      const names = criticalAssets.map((a) => a.name).join(', ');
      riskFactors.push(`${criticalAssets.length} asset(s) in CRITICAL failure state: ${names}`);
      signals.push({
        id: 'asset_critical_status',
        category: 'assets',
        name: 'Critical Equipment Failure',
        status: 'critical',
        scoreImpact: -deduction,
        weight: 1.0,
        title: 'Critical Equipment Failure Detected',
        description: `${criticalAssets.length} asset(s) marked as critical: ${names}. Immediate replacement or repair needed.`,
        evidence: `Critical status on: ${names}`,
        recommendation: 'Inspect and schedule emergency servicing or replacement.',
        actionTab: 'assets',
        actionLabel: 'View Assets',
        relatedEntityIds: criticalAssets.map((a) => a.id),
      });
    }

    if (needsMaintAssets.length > 0) {
      const deduction = Math.min(20, needsMaintAssets.length * 10);
      rawScore -= deduction;
      const names = needsMaintAssets.map((a) => a.name).join(', ');
      riskFactors.push(`${needsMaintAssets.length} asset(s) need maintenance: ${names}`);
      signals.push({
        id: 'asset_needs_maintenance',
        category: 'assets',
        name: 'Pending Asset Maintenance',
        status: 'warning',
        scoreImpact: -deduction,
        weight: 0.7,
        title: 'Maintenance Required on Equipment',
        description: `${needsMaintAssets.length} asset(s) require routine servicing: ${names}.`,
        evidence: `Maintenance flag on: ${names}`,
        recommendation: 'Perform routine service to avoid catastrophic failure.',
        actionTab: 'maintenance',
        actionLabel: 'Schedule Service',
        relatedEntityIds: needsMaintAssets.map((a) => a.id),
      });
    }

    if (criticalAssets.length === 0 && needsMaintAssets.length === 0 && operationalAssets.length > 0) {
      positiveFactors.push('100% of tracked equipment is fully operational');
      rawScore += 10;
      signals.push({
        id: 'asset_all_operational',
        category: 'assets',
        name: 'Operational Excellence',
        status: 'healthy',
        scoreImpact: 10,
        weight: 0.6,
        title: 'All Equipment Operational',
        description: 'No broken or degraded assets currently reported in the household.',
        evidence: `${operationalAssets.length}/${assets.length} assets operational.`,
      });
    }

    // Asset Detail Completeness
    const withInstallOrLifespan = assets.filter((a) => a.installDate || a.expectedLifespanYears);
    if (withInstallOrLifespan.length > 0) {
      completeness += 20;
    }

    // Aging Check: Assets approaching or past expected lifespan
    const agingAssets = assets.filter((a) => {
      if (!a.installDate || !a.expectedLifespanYears) return false;
      const installYear = new Date(a.installDate).getFullYear();
      const currentYear = referenceDate.getFullYear();
      const age = currentYear - installYear;
      return age >= a.expectedLifespanYears;
    });

    if (agingAssets.length > 0) {
      const deduction = Math.min(15, agingAssets.length * 5);
      rawScore -= deduction;
      const names = agingAssets.map((a) => a.name).join(', ');
      riskFactors.push(`${agingAssets.length} asset(s) past expected lifespan: ${names}`);
      signals.push({
        id: 'asset_aging_lifespan',
        category: 'assets',
        name: 'Aging Equipment Past Lifespan',
        status: 'warning',
        scoreImpact: -deduction,
        weight: 0.6,
        title: 'Appliance Near/Past Expected Lifespan',
        description: `${names} have exceeded their manufacturer design lifespan. Budget for replacement.`,
        evidence: `${agingAssets.length} equipment past expected lifespan.`,
        recommendation: 'Evaluate replacement costs in What-If Simulator.',
        actionTab: 'simulator',
        actionLabel: 'Model Replacement',
        relatedEntityIds: agingAssets.map((a) => a.id),
      });
    }

    // Warranty Check
    const activeWarranties = warranties.filter((w) => !w.endDate || w.endDate >= todayStr);
    const expiredWarranties = warranties.filter((w) => w.endDate && w.endDate < todayStr);

    if (warranties.length > 0) {
      completeness += 25;
      if (activeWarranties.length > 0) {
        positiveFactors.push(`${activeWarranties.length} active warranty policy(ies) protecting assets`);
        rawScore += 10;
        signals.push({
          id: 'asset_warranty_active',
          category: 'assets',
          name: 'Warranty Coverage Active',
          status: 'healthy',
          scoreImpact: 10,
          weight: 0.5,
          title: 'Active Warranty Protection',
          description: `${activeWarranties.length} active warranties shielding against repair costs.`,
          evidence: `${activeWarranties.length} active warranties on file.`,
        });
      }
    }

    // Maintenance Tasks Check
    const overdueTasks = maintenanceTasks.filter((t) => {
      const d = t.nextServiceDate || t.serviceDate;
      return t.status !== 'completed' && d && d < todayStr;
    });

    if (maintenanceTasks.length > 0) {
      completeness += 25;
    }

    if (overdueTasks.length > 0) {
      const deduction = Math.min(25, overdueTasks.length * 10);
      rawScore -= deduction;
      const titles = overdueTasks.map((t) => t.title).join(', ');
      riskFactors.push(`${overdueTasks.length} overdue maintenance task(s): ${titles}`);
      signals.push({
        id: 'asset_overdue_maintenance',
        category: 'assets',
        name: 'Overdue Maintenance Tasks',
        status: 'critical',
        scoreImpact: -deduction,
        weight: 0.9,
        title: 'Overdue Preventative Maintenance',
        description: `${overdueTasks.length} task(s) past scheduled service date: ${titles}.`,
        evidence: `Overdue tasks: ${titles}`,
        recommendation: 'Execute overdue maintenance tasks immediately.',
        actionTab: 'maintenance',
        actionLabel: 'View Tasks',
        relatedEntityIds: overdueTasks.map((t) => t.id),
      });
    } else if (maintenanceTasks.some((t) => t.status === 'completed')) {
      positiveFactors.push('Regular maintenance history logged and kept up to date');
      rawScore += 5;
    }
  }

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const completenessScore = Math.max(0, Math.min(100, Math.round(completeness)));
  const { level, label } = getStatusLevel(score, completenessScore);

  return {
    category: 'assets',
    name: 'Assets & Equipment',
    score,
    status: level,
    statusLabel: label,
    weight: 0.3,
    completenessScore,
    signals,
    summary:
      assets.length > 0
        ? `${assets.length} assets tracked, ${warranties.length} warranties, ${maintenanceTasks.length} service tasks.`
        : 'Asset inventory and warranty tracking recommended.',
    positiveFactors,
    riskFactors,
  };
}

/**
 * 3. Compute Financial & Obligation Health (Weight: 35%)
 */
export function computeFinancialHealth(
  expenses: HouseholdExpense[],
  utilities: UtilityAccount[],
  loans: HouseholdLoan[],
  creditCards: CreditCardAccount[],
  transactions: FinancialTransaction[],
  referenceDate: Date = new Date()
): CategoryHealthBreakdown {
  const signals: HouseholdHealthSignal[] = [];
  const positiveFactors: string[] = [];
  const riskFactors: string[] = [];

  let rawScore = 80;
  let completeness = 0;

  const totalFinancialRecords =
    expenses.length + utilities.length + loans.length + creditCards.length + transactions.length;

  if (totalFinancialRecords === 0) {
    signals.push({
      id: 'finance_no_records',
      category: 'finances',
      name: 'No Financial Records',
      status: 'warning',
      scoreImpact: -15,
      weight: 0.8,
      title: 'Household Finances Untracked',
      description: 'Track recurring bills, utilities, credit cards, or import bank statements to monitor cash flow and debt obligations.',
      evidence: '0 financial records registered.',
      recommendation: 'Add recurring expenses or upload statements under Finances.',
      actionTab: 'finances',
      actionLabel: 'Add Financials',
    });
    riskFactors.push('No financial or expense records tracked');
    rawScore = 65;
    completeness = 10;
  } else {
    completeness += 30;

    // 1. Delinquency / Overdue check across all accounts
    const overdueExpenses = expenses.filter((e) => e.paymentStatus === 'overdue');
    const overdueUtilities = utilities.filter((u) => u.paymentStatus === 'overdue');
    const overdueLoans = loans.filter((l) => (l as any).paymentStatus === 'overdue');
    const overdueCreditCards = creditCards.filter((c) => (c as any).paymentStatus === 'overdue');

    const totalOverdueCount =
      overdueExpenses.length + overdueUtilities.length + overdueLoans.length + overdueCreditCards.length;

    if (totalOverdueCount > 0) {
      const deduction = Math.min(40, 25 + (totalOverdueCount - 1) * 10);
      rawScore -= deduction;
      riskFactors.push(`${totalOverdueCount} payment(s) currently OVERDUE`);
      signals.push({
        id: 'finance_overdue_payments',
        category: 'finances',
        name: 'Overdue Financial Obligations',
        status: 'critical',
        scoreImpact: -deduction,
        weight: 1.0,
        title: 'Overdue Payments Detected',
        description: `You have ${totalOverdueCount} overdue bill(s)/payment(s). Unpaid balances incur late penalties and credit degradation.`,
        evidence: `${totalOverdueCount} overdue items across bills and obligations.`,
        recommendation: 'Settle overdue balances immediately to restore good standing.',
        actionTab: 'finances',
        actionLabel: 'Review Bills',
      });
    } else {
      positiveFactors.push('Zero overdue bills or delinquent payments');
      rawScore += 10;
      signals.push({
        id: 'finance_all_current',
        category: 'finances',
        name: 'All Obligations Current',
        status: 'healthy',
        scoreImpact: 10,
        weight: 0.7,
        title: 'Punctual Payment Record',
        description: 'All tracked utility bills, recurring expenses, and debt obligations are current and on-schedule.',
        evidence: '0 overdue payments across all accounts.',
      });
    }

    // 2. AutoPay Protection
    const totalRecurringAccounts = expenses.length + utilities.length;
    if (totalRecurringAccounts > 0) {
      completeness += 20;
      const autopayCount =
        expenses.filter((e) => e.isAutoPay).length + utilities.filter((u) => u.isAutoPay).length;
      const autopayRatio = autopayCount / totalRecurringAccounts;

      if (autopayRatio >= 0.5) {
        positiveFactors.push(`${Math.round(autopayRatio * 100)}% of recurring expenses are on AutoPay`);
        rawScore += 5;
        signals.push({
          id: 'finance_autopay_shield',
          category: 'finances',
          name: 'AutoPay Protection Active',
          status: 'healthy',
          scoreImpact: 5,
          weight: 0.4,
          title: 'Automated Billing Coverage',
          description: `Strong automation: ${autopayCount}/${totalRecurringAccounts} recurring obligations are configured for automatic deduction.`,
          evidence: `${Math.round(autopayRatio * 100)}% on AutoPay`,
        });
      } else if (totalRecurringAccounts >= 3 && autopayRatio < 0.2) {
        signals.push({
          id: 'finance_low_autopay',
          category: 'finances',
          name: 'Manual Payment Exposure',
          status: 'info',
          scoreImpact: 0,
          weight: 0.3,
          title: 'Low AutoPay Adoption',
          description: 'Most recurring bills are paid manually, increasing risk of accidental late fees.',
          evidence: `Only ${autopayCount}/${totalRecurringAccounts} bills automated.`,
          recommendation: 'Enable AutoPay on routine utility accounts.',
          actionTab: 'utilities',
          actionLabel: 'Configure AutoPay',
        });
      }
    }

    // 3. Credit Card Utilization
    if (creditCards.length > 0) {
      completeness += 20;
      const totalCreditLimit = creditCards.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
      const totalCreditDebt = creditCards.reduce((sum, c) => sum + (c.outstandingAmount || 0), 0);

      if (totalCreditLimit > 0) {
        const utilPercent = (totalCreditDebt / totalCreditLimit) * 100;
        if (utilPercent <= 30) {
          positiveFactors.push(`Low revolving credit utilization (${Math.round(utilPercent)}%)`);
          rawScore += 5;
          signals.push({
            id: 'finance_low_credit_util',
            category: 'finances',
            name: 'Optimal Credit Utilization',
            status: 'healthy',
            scoreImpact: 5,
            weight: 0.6,
            title: 'Optimal Revolving Credit Usage',
            description: `Revolving credit utilization is at ${Math.round(utilPercent)}%, safely below the recommended 30% ceiling.`,
            evidence: `$${totalCreditDebt.toLocaleString()} / $${totalCreditLimit.toLocaleString()} limit`,
          });
        } else if (utilPercent > 80) {
          rawScore -= 25;
          riskFactors.push(`Critical credit card utilization (${Math.round(utilPercent)}%)`);
          signals.push({
            id: 'finance_high_credit_util',
            category: 'finances',
            name: 'High Credit Utilization Risk',
            status: 'critical',
            scoreImpact: -25,
            weight: 0.9,
            title: 'Excessive Credit Utilization',
            description: `Credit cards are utilizing ${Math.round(utilPercent)}% of total available limit, creating high interest drag.`,
            evidence: `${Math.round(utilPercent)}% utilization`,
            recommendation: 'Pay down high-interest credit card balances.',
            actionTab: 'utilities',
            actionLabel: 'Manage Debts',
          });
        } else if (utilPercent > 50) {
          rawScore -= 12;
          riskFactors.push(`Elevated credit utilization (${Math.round(utilPercent)}%)`);
          signals.push({
            id: 'finance_elevated_credit_util',
            category: 'finances',
            name: 'Elevated Credit Utilization',
            status: 'warning',
            scoreImpact: -12,
            weight: 0.6,
            title: 'Elevated Credit Card Balances',
            description: `Credit utilization is ${Math.round(utilPercent)}%, which exceeds recommended 30% guidelines.`,
            evidence: `${Math.round(utilPercent)}% utilization`,
            recommendation: 'Target bringing utilization below 30%.',
            actionTab: 'utilities',
            actionLabel: 'Manage Debts',
          });
        }
      }
    }

    // 4. Cash Flow & Monthly Surplus
    if (transactions.length > 0) {
      completeness += 30;
      const credits = transactions.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + (t.amount || 0), 0);
      const debits = transactions.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + (t.amount || 0), 0);

      if (credits > 0) {
        const netCashFlow = credits - debits;
        const savingsRate = credits > 0 ? (netCashFlow / credits) * 100 : 0;

        if (netCashFlow > 0 && savingsRate >= 15) {
          positiveFactors.push(`Strong positive cash flow with ${Math.round(savingsRate)}% savings rate`);
          rawScore += 10;
          signals.push({
            id: 'finance_healthy_savings',
            category: 'finances',
            name: 'Positive Net Savings Rate',
            status: 'healthy',
            scoreImpact: 10,
            weight: 0.7,
            title: 'Healthy Savings Rate',
            description: `Net household cash flow is positive with an estimated ${Math.round(savingsRate)}% savings margin.`,
            evidence: `Net surplus: +$${Math.round(netCashFlow).toLocaleString()}`,
          });
        } else if (netCashFlow < 0) {
          rawScore -= 15;
          riskFactors.push('Household spending exceeds recorded income (deficit cash flow)');
          signals.push({
            id: 'finance_cash_flow_deficit',
            category: 'finances',
            name: 'Deficit Cash Flow',
            status: 'warning',
            scoreImpact: -15,
            weight: 0.8,
            title: 'Monthly Cash Flow Deficit',
            description: `Recent transactions reflect debits exceeding credits by $${Math.abs(Math.round(netCashFlow)).toLocaleString()}.`,
            evidence: `Deficit: -$${Math.abs(Math.round(netCashFlow)).toLocaleString()}`,
            recommendation: 'Review discretionary spending or test adjustments in What-If Simulator.',
            actionTab: 'simulator',
            actionLabel: 'Open Simulator',
          });
        }
      }
    }

    // 5. Debt Burden
    if (loans.length > 0) {
      completeness += 15;
      const totalMonthlyEmi = loans
        .filter((l) => l.status === 'active')
        .reduce((sum, l) => sum + (l.emiAmount || 0), 0);
      positiveFactors.push(`${loans.length} active loan/mortgage structure(s) tracked`);

      if (totalMonthlyEmi > 0) {
        signals.push({
          id: 'finance_loan_schedule_tracked',
          category: 'finances',
          name: 'Amortization & EMI Tracked',
          status: 'healthy',
          scoreImpact: 5,
          weight: 0.4,
          title: 'Debt Obligations Structured',
          description: `Total monthly EMI amortizations of $${Math.round(totalMonthlyEmi).toLocaleString()} monitored.`,
          evidence: `${loans.length} loans on file`,
        });
        rawScore += 5;
      }
    }
  }

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const completenessScore = Math.max(0, Math.min(100, Math.round(completeness)));
  const { level, label } = getStatusLevel(score, completenessScore);

  return {
    category: 'finances',
    name: 'Financial Health',
    score,
    status: level,
    statusLabel: label,
    weight: 0.35,
    completenessScore,
    signals,
    summary:
      totalFinancialRecords > 0
        ? `${expenses.length} bills, ${utilities.length} utilities, ${loans.length} loans, ${creditCards.length} cards tracked.`
        : 'Financial ledger and recurring bill setup recommended.',
    positiveFactors,
    riskFactors,
  };
}

/**
 * 4. Compute Document Compliance & Records Health (Weight: 15%)
 */
export function computeDocumentHealth(
  documents: HouseholdDocument[],
  assets: HomeAsset[],
  properties: Property[],
  loans: HouseholdLoan[],
  warranties: WarrantyPolicy[]
): CategoryHealthBreakdown {
  const signals: HouseholdHealthSignal[] = [];
  const positiveFactors: string[] = [];
  const riskFactors: string[] = [];

  let rawScore = 70;
  let completeness = 0;

  if (documents.length === 0) {
    signals.push({
      id: 'doc_empty_archive',
      category: 'documents',
      name: 'No Documents Ingested',
      status: 'warning',
      scoreImpact: -15,
      weight: 0.7,
      title: 'Digital Paper Trail Empty',
      description: 'Upload utility bills, bank statements, warranties, and insurance policies to keep an encrypted, searchable record.',
      evidence: '0 documents in repository.',
      recommendation: 'Upload invoices, policies, or statements via Global Upload.',
      actionTab: 'documents',
      actionLabel: 'Upload Documents',
    });
    riskFactors.push('No digitized household documents stored');
    rawScore = 60;
    completeness = 10;
  } else {
    completeness += 40;
    positiveFactors.push(`${documents.length} document(s) securely archived`);

    // Confirmed vs Pending Review
    const pendingDocs = documents.filter((d) => d.status === 'pending_review');
    const confirmedDocs = documents.filter((d) => d.status === 'confirmed');

    if (confirmedDocs.length >= 3) {
      positiveFactors.push(`${confirmedDocs.length} confirmed verified document records`);
      rawScore += 15;
      signals.push({
        id: 'doc_verified_records',
        category: 'documents',
        name: 'Verified Document Records',
        status: 'healthy',
        scoreImpact: 15,
        weight: 0.6,
        title: 'Verified Digital Archive',
        description: `${confirmedDocs.length} documents have been fully parsed, reviewed, and linked to household accounts.`,
        evidence: `${confirmedDocs.length} confirmed docs.`,
      });
    }

    if (pendingDocs.length > 5) {
      rawScore -= 10;
      riskFactors.push(`${pendingDocs.length} documents awaiting review/confirmation`);
      signals.push({
        id: 'doc_pending_review_backlog',
        category: 'documents',
        name: 'Document Review Backlog',
        status: 'warning',
        scoreImpact: -10,
        weight: 0.5,
        title: 'Pending Intake Review',
        description: `${pendingDocs.length} documents are waiting for candidate confirmation.`,
        evidence: `${pendingDocs.length} pending review.`,
        recommendation: 'Review and confirm extracted line items.',
        actionTab: 'documents',
        actionLabel: 'Review Intake',
      });
    }

    // Document types coverage
    const hasStatements = documents.some((d) => d.documentType === 'bank_statement' || d.documentType === 'credit_card_statement');
    const hasUtilities = documents.some((d) => d.documentType === 'utility_bill');
    const hasWarranties = documents.some((d) => d.documentType === 'warranty_doc' || d.documentType === 'insurance_policy');

    let coverageCount = 0;
    if (hasStatements) coverageCount++;
    if (hasUtilities) coverageCount++;
    if (hasWarranties) coverageCount++;

    completeness += coverageCount * 20;

    if (coverageCount >= 2) {
      positiveFactors.push('Multi-domain document coverage (financials, utilities, and warranties)');
      rawScore += 10;
    }
  }

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const completenessScore = Math.max(0, Math.min(100, Math.round(completeness)));
  const { level, label } = getStatusLevel(score, completenessScore);

  return {
    category: 'documents',
    name: 'Document & Compliance',
    score,
    status: level,
    statusLabel: label,
    weight: 0.15,
    completenessScore,
    signals,
    summary:
      documents.length > 0
        ? `${documents.length} documents archived (${documents.filter((d) => d.status === 'confirmed').length} verified).`
        : 'Document digitization recommended.',
    positiveFactors,
    riskFactors,
  };
}

/**
 * 5. Composite Overall Household Health Calculation
 */
export function calculateHouseholdHealthReport(
  userId: string,
  profile: Record<string, any> | null,
  properties: Property[],
  rooms: Room[],
  assets: HomeAsset[],
  warranties: WarrantyPolicy[],
  maintenanceTasks: MaintenanceTask[],
  expenses: HouseholdExpense[],
  utilities: UtilityAccount[],
  loans: HouseholdLoan[],
  creditCards: CreditCardAccount[],
  transactions: FinancialTransaction[],
  documents: HouseholdDocument[],
  referenceDate: Date = new Date()
): HouseholdHealthReport {
  const home = computeHomeHealth(properties, rooms, documents);
  const assetCategory = computeAssetHealth(assets, warranties, maintenanceTasks, referenceDate);
  const finances = computeFinancialHealth(expenses, utilities, loans, creditCards, transactions, referenceDate);
  const docs = computeDocumentHealth(documents, assets, properties, loans, warranties);

  // Overall Weighted Score: Home (20%), Assets (30%), Finances (35%), Docs (15%)
  const weightedOverall =
    home.score * home.weight +
    assetCategory.score * assetCategory.weight +
    finances.score * finances.weight +
    docs.score * docs.weight;

  const overallScore = Math.max(0, Math.min(100, Math.round(weightedOverall)));

  // Completeness calculation
  const weightedCompleteness =
    home.completenessScore * home.weight +
    assetCategory.completenessScore * assetCategory.weight +
    finances.completenessScore * finances.weight +
    docs.completenessScore * docs.weight;

  const completenessScore = Math.max(0, Math.min(100, Math.round(weightedCompleteness)));
  const isProvisional = completenessScore < 25;

  const { level, label } = getStatusLevel(overallScore, completenessScore);

  // Collate Top Signals
  const allSignals = [
    ...assetCategory.signals,
    ...finances.signals,
    ...home.signals,
    ...docs.signals,
  ];

  // Prioritize critical and warning signals first
  allSignals.sort((a, b) => {
    const priorityOrder: Record<string, number> = { critical: 4, warning: 3, healthy: 2, info: 1 };
    return (priorityOrder[b.status] || 0) - (priorityOrder[a.status] || 0);
  });

  const topSignals = allSignals.slice(0, 6);

  // Generate Prioritized Actionable Recommendations
  const recommendations: HouseholdHealthRecommendation[] = [];

  // Check for critical items
  if (assetCategory.signals.some((s) => s.status === 'critical')) {
    recommendations.push({
      id: 'rec_repair_critical_assets',
      priority: 'high',
      category: 'assets',
      title: 'Resolve critical equipment failures immediately',
      description: 'Inspect assets marked as critical to schedule certified technician servicing or replacement.',
      actionTab: 'assets',
      actionLabel: 'Inspect Assets',
    });
  }

  if (finances.signals.some((s) => s.status === 'critical')) {
    recommendations.push({
      id: 'rec_settle_overdue_debts',
      priority: 'high',
      category: 'finances',
      title: 'Settle overdue utility and credit balances',
      description: 'Clear overdue bills immediately to prevent late penalties and protect credit standing.',
      actionTab: 'finances',
      actionLabel: 'Pay Overdue Bills',
    });
  }

  if (assetCategory.signals.some((s) => s.id === 'asset_overdue_maintenance')) {
    recommendations.push({
      id: 'rec_complete_overdue_maint',
      priority: 'high',
      category: 'assets',
      title: 'Perform overdue preventative maintenance',
      description: 'Complete scheduled filter replacements, seasonal tune-ups, and inspection tasks.',
      actionTab: 'maintenance',
      actionLabel: 'View Schedule',
    });
  }

  // Medium / Info recommendations
  if (properties.length === 0) {
    recommendations.push({
      id: 'rec_setup_property',
      priority: 'medium',
      category: 'home',
      title: 'Register primary home profile',
      description: 'Add your property details to enable space zoning and location-aware maintenance.',
      actionTab: 'properties',
      actionLabel: 'Add Property',
    });
  }

  if (assets.length === 0) {
    recommendations.push({
      id: 'rec_log_appliances',
      priority: 'medium',
      category: 'assets',
      title: 'Catalog major household appliances',
      description: 'Add HVAC, water heaters, and major appliances to track warranties and maintenance.',
      actionTab: 'assets',
      actionLabel: 'Catalog Appliances',
    });
  }

  if (documents.length === 0) {
    recommendations.push({
      id: 'rec_upload_documents',
      priority: 'low',
      category: 'documents',
      title: 'Digitize household documents and receipts',
      description: 'Upload appliance receipts, warranty cards, and insurance policies for instant retrieval.',
      actionTab: 'documents',
      actionLabel: 'Upload Documents',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'rec_maintain_excellence',
      priority: 'low',
      category: 'home',
      title: 'Household operating in optimal parameters',
      description: 'Continue logging periodic maintenance and routine utility payments to sustain health scores.',
      actionTab: 'dashboard',
      actionLabel: 'Command Center',
    });
  }

  return {
    userId,
    calculatedAt: referenceDate.toISOString(),
    overallScore,
    status: level,
    statusLabel: label,
    completenessScore,
    isProvisional,
    categories: {
      home,
      assets: assetCategory,
      finances,
      documents: docs,
    },
    topSignals,
    recommendations: recommendations.slice(0, 5),
    aiExplanation: null,
    dataCompletenessDetails: {
      propertiesCount: properties.length,
      roomsCount: rooms.length,
      assetsCount: assets.length,
      warrantiesCount: warranties.length,
      maintenanceTasksCount: maintenanceTasks.length,
      expensesCount: expenses.length,
      utilitiesCount: utilities.length,
      loansCount: loans.length,
      creditCardsCount: creditCards.length,
      documentsCount: documents.length,
      transactionsCount: transactions.length,
    },
  };
}

/**
 * 6. Deterministic Fallback for AI Explanation
 */
export function generateDeterministicHealthExplanation(
  report: HouseholdHealthReport
): HouseholdHealthAiExplanation {
  const strengths: string[] = [];
  const topRisks: string[] = [];
  const actionPlan: HouseholdHealthAiExplanation['prioritizedActionPlan'] = [];

  // Extract from categories
  Object.values(report.categories).forEach((cat) => {
    cat.positiveFactors.forEach((p) => {
      if (strengths.length < 5) strengths.push(p);
    });
    cat.riskFactors.forEach((r) => {
      if (topRisks.length < 5) topRisks.push(r);
    });
  });

  if (strengths.length === 0) {
    strengths.push('Clean baseline profile ready for household tracking');
  }

  if (topRisks.length === 0) {
    topRisks.push('No critical operational or financial risk factors detected');
  }

  report.recommendations.forEach((rec) => {
    actionPlan.push({
      priority: rec.priority,
      action: rec.title,
      category: rec.category,
      estimatedImpact:
        rec.priority === 'high' ? '+10 to +25 score restoration' : '+5 to +10 score optimization',
    });
  });

  const summary = report.isProvisional
    ? `Your Household Health Score is currently calculated provisionally at ${report.overallScore}/100 with ${report.completenessScore}% data completeness. Complete your property, asset, and financial records to unlock full precision scoring.`
    : `Your Household Health Score is ${report.overallScore}/100 (${report.statusLabel}). Financial health is scored at ${report.categories.finances.score}/100, equipment & asset operational integrity at ${report.categories.assets.score}/100, property setup at ${report.categories.home.score}/100, and document compliance at ${report.categories.documents.score}/100.`;

  return {
    executiveSummary: summary,
    strengths,
    topRisks,
    prioritizedActionPlan: actionPlan,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 7. Gemini AI Health Explanation Generator (with robust error recovery)
 */
export async function generateHealthAiExplanation(
  report: HouseholdHealthReport
): Promise<HouseholdHealthAiExplanation> {
  const fallback = generateDeterministicHealthExplanation(report);

  try {
    const ai = getGeminiClient();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return fallback;
    }

    const prompt = `You are HouseMind's Chief Household Intelligence Advisor.
Analyze the following deterministic household health report and produce a professional, actionable, and executive-ready summary.
CRITICAL RULE: DO NOT change or invent any numerical scores. The deterministic scores are absolute ground truth.

Household Health Data:
- Overall Score: ${report.overallScore}/100 (${report.statusLabel})
- Data Completeness: ${report.completenessScore}% (Is Provisional: ${report.isProvisional})
- Categories:
  * Home & Spaces: ${report.categories.home.score}/100 (Completeness: ${report.categories.home.completenessScore}%, Positives: ${report.categories.home.positiveFactors.join('; ') || 'None'}, Risks: ${report.categories.home.riskFactors.join('; ') || 'None'})
  * Assets & Equipment: ${report.categories.assets.score}/100 (Completeness: ${report.categories.assets.completenessScore}%, Positives: ${report.categories.assets.positiveFactors.join('; ') || 'None'}, Risks: ${report.categories.assets.riskFactors.join('; ') || 'None'})
  * Financial Health: ${report.categories.finances.score}/100 (Completeness: ${report.categories.finances.completenessScore}%, Positives: ${report.categories.finances.positiveFactors.join('; ') || 'None'}, Risks: ${report.categories.finances.riskFactors.join('; ') || 'None'})
  * Documents & Compliance: ${report.categories.documents.score}/100 (Completeness: ${report.categories.documents.completenessScore}%, Positives: ${report.categories.documents.positiveFactors.join('; ') || 'None'}, Risks: ${report.categories.documents.riskFactors.join('; ') || 'None'})
- Top Signals: ${report.topSignals.map((s) => `[${s.status.toUpperCase()}] ${s.title}: ${s.description}`).join(' | ')}

Return ONLY valid JSON with this exact structure:
{
  "executiveSummary": "Concise 2-3 sentence overview explaining why the household is at this health score and the most impactful immediate lever.",
  "strengths": ["Clear strength 1", "Clear strength 2"],
  "topRisks": ["Clear risk 1", "Clear risk 2"],
  "prioritizedActionPlan": [
    {
      "priority": "high" | "medium" | "low",
      "action": "Specific concrete action step",
      "category": "home" | "assets" | "finances" | "documents",
      "estimatedImpact": "e.g. Prevents equipment failure and restores +15 points"
    }
  ]
}`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text ? response.text.trim() : '';
    if (!text) {
      return fallback;
    }

    const parsed = JSON.parse(text);
    return {
      executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
      strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : fallback.strengths,
      topRisks: Array.isArray(parsed.topRisks) && parsed.topRisks.length > 0 ? parsed.topRisks : fallback.topRisks,
      prioritizedActionPlan:
        Array.isArray(parsed.prioritizedActionPlan) && parsed.prioritizedActionPlan.length > 0
          ? parsed.prioritizedActionPlan
          : fallback.prioritizedActionPlan,
      generatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.warn('[HEALTH SERVICE] Gemini explanation fallback activated:', error?.message || error);
    return fallback;
  }
}

/**
 * 8. Top-level Service API: Fetch complete household data and compute health
 */
export class HouseholdHealthService {
  static async getHouseholdHealth(
    userId: string,
    options: { includeAiExplanation?: boolean; referenceDate?: Date } = {}
  ): Promise<HouseholdHealthReport> {
    const [
      profile,
      properties,
      rooms,
      assets,
      warranties,
      tasks,
      expenses,
      utilities,
      loans,
      creditCards,
      transactions,
      documents,
    ] = await Promise.all([
      DatabaseService.getProfile(userId).catch(() => null),
      DatabaseService.listProperties(userId).catch(() => []),
      DatabaseService.listRooms(userId).catch(() => []),
      DatabaseService.listAssets(userId).catch(() => []),
      DatabaseService.listWarranties(userId).catch(() => []),
      DatabaseService.listMaintenances(userId).catch(() => []),
      DatabaseService.listExpenses(userId).catch(() => []),
      DatabaseService.listUtilities(userId).catch(() => []),
      DatabaseService.listLoans(userId).catch(() => []),
      DatabaseService.listCreditCards(userId).catch(() => []),
      DatabaseService.listTransactions(userId).catch(() => []),
      DatabaseService.listDocuments(userId).catch(() => []),
    ]);

    const report = calculateHouseholdHealthReport(
      userId,
      profile,
      properties,
      rooms,
      assets,
      warranties,
      tasks,
      expenses,
      utilities,
      loans,
      creditCards,
      transactions,
      documents,
      options.referenceDate || new Date()
    );

    if (options.includeAiExplanation) {
      report.aiExplanation = await generateHealthAiExplanation(report);
    } else {
      report.aiExplanation = generateDeterministicHealthExplanation(report);
    }

    return report;
  }

  static async explainHouseholdHealth(userId: string): Promise<HouseholdHealthAiExplanation> {
    const report = await this.getHouseholdHealth(userId, { includeAiExplanation: false });
    return generateHealthAiExplanation(report);
  }
}
