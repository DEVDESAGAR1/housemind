import crypto from 'crypto';
import { DatabaseService } from './dbService';
import {
  FinancialTransaction,
  FinancialSummary,
  TransactionType,
  TransactionCandidate,
} from '../../src/types';

/**
 * Generate a deterministic, collision-resistant SHA-256 fingerprint for a transaction.
 * Scoped to the user and normalized across date, amount, direction, and description.
 */
export function generateTransactionFingerprint(
  userId: string,
  account: string | undefined | null,
  date: string,
  amount: number,
  type: TransactionType,
  description: string,
  reference?: string | null
): string {
  const normUser = userId.trim();
  const normDate = (date || '').trim();
  const normAmount = Number(amount || 0).toFixed(2);
  const normType = (type || 'DEBIT').trim().toUpperCase();
  const normDesc = (description || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const raw = `${normUser}|${normDate}|${normAmount}|${normType}|${normDesc}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Fetch all transactions for a user.
 */
export async function getUserTransactions(
  userId: string,
  filters?: {
    type?: string;
    category?: string;
    account?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<FinancialTransaction[]> {
  let transactions = (await DatabaseService.listTransactions(userId)) as FinancialTransaction[];

  if (filters?.type && filters.type !== 'ALL') {
    transactions = transactions.filter((t) => t.type === filters.type);
  }

  if (filters?.category) {
    transactions = transactions.filter((t) => t.category === filters.category);
  }

  if (filters?.account) {
    transactions = transactions.filter((t) => (t.account || (t as any).accountName) === filters.account);
  }

  if (filters?.startDate) {
    transactions = transactions.filter((t) => t.date >= filters.startDate!);
  }

  if (filters?.endDate) {
    transactions = transactions.filter((t) => t.date <= filters.endDate!);
  }

  // Text search
  if (filters?.search) {
    const term = filters.search.toLowerCase();
    transactions = transactions.filter(
      (t) =>
        t.description.toLowerCase().includes(term) ||
        (t.merchant && t.merchant.toLowerCase().includes(term)) ||
        (t.category && t.category.toLowerCase().includes(term)) ||
        (t.account && t.account.toLowerCase().includes(term)) ||
        (t.reference && t.reference.toLowerCase().includes(term))
    );
  }

  // Offset & Limit
  if (filters?.offset !== undefined) {
    transactions = transactions.slice(filters.offset);
  }
  if (filters?.limit !== undefined) {
    transactions = transactions.slice(0, filters.limit);
  }

  return transactions;
}

/**
 * Compute deterministic Financial Overview Metrics.
 * Enforces pure mathematical calculations without approximations or AI guesses.
 */
export async function computeFinancialSummary(
  userId: string,
  currency: string = 'USD'
): Promise<FinancialSummary> {
  const allTransactions = await getUserTransactions(userId);

  let totalIncome = 0; // CONFIRMED CREDITs (excluding transfers)
  let totalExpenses = 0; // CONFIRMED DEBITs (excluding transfers)
  let totalCredits = 0; // ALL CREDIT transactions
  let totalDebits = 0; // ALL DEBIT transactions
  let totalTransfers = 0; // ALL TRANSFER transactions
  let recurringIncome = 0;
  let recurringExpenses = 0;

  const categoryMap = new Map<string, number>();
  const accountMap = new Map<string, { netAmount: number; count: number }>();

  for (const t of allTransactions) {
    const amt = Number(t.amount) || 0;
    const accName = t.account || (t as any).accountName || 'Main Account';

    if (!accountMap.has(accName)) {
      accountMap.set(accName, { netAmount: 0, count: 0 });
    }
    const accStat = accountMap.get(accName)!;
    accStat.count += 1;

    if (t.type === 'CREDIT') {
      totalCredits += amt;
      totalIncome += amt;
      accStat.netAmount += amt;

      if (t.isSalary || t.category === 'Salary') {
        recurringIncome += amt;
      }
    } else if (t.type === 'DEBIT') {
      totalDebits += amt;
      totalExpenses += amt;
      accStat.netAmount -= amt;

      // Group expense categories
      const cat = t.category || 'Other Expense';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + amt);

      if (
        t.category === 'Subscription' ||
        t.category === 'EMI / Loan' ||
        t.category === 'Insurance' ||
        t.category === 'Utilities' ||
        (t as any).isRecurring
      ) {
        recurringExpenses += amt;
      }
    } else if (t.type === 'TRANSFER') {
      // Transfers are neither income nor expense
      totalTransfers += amt;
      if (t.category === 'Transfer In') {
        accStat.netAmount += amt;
      } else if (t.category === 'Transfer Out') {
        accStat.netAmount -= amt;
      }
    }
  }

  // Pure deterministic arithmetic
  const netCashFlow = Number((totalIncome - totalExpenses).toFixed(2));
  const savingsRate =
    totalIncome > 0
      ? Number(((netCashFlow / totalIncome) * 100).toFixed(1))
      : 0;

  // Top spending categories
  const topSpendingCategories = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount: Number(amount.toFixed(2)),
      percentage:
        totalExpenses > 0 ? Number(((amount / totalExpenses) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Account breakdown
  const accountBreakdown = Array.from(accountMap.entries()).map(
    ([account, stats]) => ({
      account,
      netAmount: Number(stats.netAmount.toFixed(2)),
      count: stats.count,
    })
  );

  return {
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
    netCashFlow,
    savingsRate,
    totalCredits: Number(totalCredits.toFixed(2)),
    totalDebits: Number(totalDebits.toFixed(2)),
    totalTransfers: Number(totalTransfers.toFixed(2)),
    recurringIncome: Number(recurringIncome.toFixed(2)),
    recurringExpenses: Number(recurringExpenses.toFixed(2)),
    topSpendingCategories,
    accountBreakdown,
    recentTransactions: allTransactions.slice(0, 10),
    transactionsCount: allTransactions.length,
  };
}

/**
 * Check if candidate transactions already exist in the database by fingerprint.
 */
export async function checkDuplicateCandidates(
  userId: string,
  candidates: TransactionCandidate[]
): Promise<TransactionCandidate[]> {
  const existing = await getUserTransactions(userId);
  const existingFingerprints = new Set(existing.map((t) => t.fingerprint));

  return candidates.map((candidate) => {
    const isDup = existingFingerprints.has(candidate.fingerprint);
    return {
      ...candidate,
      isDuplicate: isDup,
      duplicateReason: isDup
        ? 'Already imported (Matching account, date, amount, direction, and description)'
        : undefined,
      selected: !isDup, // Default to unselected if duplicate
    };
  });
}

/**
 * Persist confirmed candidate transactions to database.
 */
export async function persistConfirmedTransactions(
  userId: string,
  documentId: string | undefined,
  candidates: TransactionCandidate[],
  accountOverride?: string | null
): Promise<{ insertedIds: string[]; duplicatesSkipped: number }> {
  const existing = await getUserTransactions(userId);
  const existingFingerprints = new Set(existing.map((t) => t.fingerprint));

  const insertedIds: string[] = [];
  let duplicatesSkipped = 0;
  const nowIso = new Date().toISOString();

  for (const c of candidates) {
    const finalAccount = (accountOverride || c.account || 'Main Account').trim();
    const finalFingerprint = generateTransactionFingerprint(
      userId,
      finalAccount,
      c.date,
      c.amount,
      c.type,
      c.description,
      c.reference
    );

    // Skip if existing duplicate
    if (existingFingerprints.has(finalFingerprint)) {
      duplicatesSkipped += 1;
      continue;
    }

    const id = `tx_${crypto.randomUUID()}`;
    const transactionRecord: FinancialTransaction = {
      id,
      userId,
      type: c.type,
      amount: Number(c.amount),
      currency: 'USD',
      date: c.date,
      description: c.description.trim(),
      merchant: c.merchant || undefined,
      category: c.category.trim(),
      subcategory: c.subcategory || undefined,
      account: finalAccount,
      source: 'statement_import',
      reference: c.reference || undefined,
      balance: c.balance !== undefined && c.balance !== null ? Number(c.balance) : undefined,
      confidence: c.confidence !== undefined ? Number(c.confidence) : 1.0,
      fingerprint: finalFingerprint,
      isSalary: Boolean(c.isSalaryCandidate || c.category === 'Salary'),
      documentId: documentId || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await DatabaseService.createTransaction(userId, transactionRecord, id);
    insertedIds.push(id);
    existingFingerprints.add(finalFingerprint);
  }

  return { insertedIds, duplicatesSkipped };
}
