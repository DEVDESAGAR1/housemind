import { z } from 'zod';

// ID / Param validation
export const idParamSchema = z.object({
  id: z
    .string()
    .min(1, 'ID is required')
    .max(128, 'ID is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'ID contains invalid characters'),
});

// Household Profile Schema
export const householdProfileSchema = z.object({
  homeName: z.string().trim().min(1, 'Home name is required').max(100, 'Home name is too long'),
  homeType: z.enum(['single_family', 'apartment', 'condo', 'townhouse', 'multi_family']),
  yearBuilt: z
    .number()
    .int()
    .min(1800, 'Year built must be after 1800')
    .max(new Date().getFullYear() + 5, 'Year built cannot be in the far future')
    .optional()
    .nullable(),
  squareFootage: z
    .number()
    .positive('Square footage must be positive')
    .max(100000, 'Square footage exceeds reasonable limits')
    .optional()
    .nullable(),
  currency: z
    .string()
    .trim()
    .length(3, 'Currency must be a 3-letter ISO code')
    .default('USD'),
  primaryHeating: z
    .string()
    .trim()
    .max(50, 'Heating type is too long')
    .optional()
    .nullable(),
});

// Household Expense Schema
export const createExpenseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title is too long'),
  category: z.enum([
    'utilities',
    'maintenance',
    'insurance',
    'mortgage_rent',
    'services',
    'other',
  ]),
  amount: z
    .number({ message: 'Amount must be a number' })
    .positive('Expense amount must be strictly greater than 0')
    .max(10000000, 'Amount exceeds reasonable limits'),
  frequency: z.enum(['monthly', 'quarterly', 'annual', 'one_time']),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  isAutoPay: z.boolean().default(false),
  paymentStatus: z.enum(['paid', 'pending', 'overdue']).default('pending'),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

// Home Asset Schema
export const createAssetSchema = z.object({
  name: z.string().trim().min(1, 'Asset name is required').max(100, 'Asset name is too long'),
  category: z.enum([
    'hvac',
    'plumbing',
    'kitchen',
    'laundry',
    'roofing_exterior',
    'electrical',
    'other',
  ]),
  brand: z.string().trim().max(100, 'Brand is too long').optional().nullable(),
  modelNumber: z.string().trim().max(100, 'Model number is too long').optional().nullable(),
  serialNumber: z.string().trim().max(100, 'Serial number is too long').optional().nullable(),
  installDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Install date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  warrantyExpiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Warranty expiry date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  expectedLifespanYears: z
    .number()
    .int()
    .positive('Lifespan must be positive')
    .max(100, 'Lifespan exceeds reasonable bounds')
    .optional()
    .nullable(),
  purchaseCost: z
    .number()
    .nonnegative('Purchase cost cannot be negative')
    .max(10000000, 'Purchase cost exceeds bounds')
    .optional()
    .nullable(),
  currentStatus: z
    .enum(['operational', 'needs_maintenance', 'critical', 'replaced'])
    .default('operational'),
  roomLocation: z.string().trim().max(100, 'Room location is too long').optional().nullable(),
  maintenanceNotes: z
    .string()
    .trim()
    .max(2000, 'Maintenance notes cannot exceed 2000 characters')
    .optional()
    .nullable(),
});

export const updateAssetSchema = createAssetSchema.partial();

// Copilot Chat Schema
export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message is too long (max 4000 chars)'),
  conversationId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid conversation ID')
    .optional()
    .nullable(),
});

// Insight Lifecycle Status Schema
export const updateInsightStatusSchema = z.object({
  status: z.enum(['new', 'viewed', 'dismissed', 'resolved']),
});

export const queryInsightSchema = z.object({
  status: z.enum(['new', 'viewed', 'dismissed', 'resolved', 'all']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical', 'all']).optional(),
});

// ==========================================
// Phase 5: Financial Transaction & Document Schemas
// ==========================================

export const transactionTypeEnum = z.enum(['CREDIT', 'DEBIT', 'TRANSFER']);

export const transactionSourceEnum = z.enum([
  'manual',
  'statement_import',
  'salary_slip',
  'bill_scan',
  'receipt_scan',
]);

export const financialCategoriesList = [
  // Income
  'Salary',
  'Freelance',
  'Business',
  'Interest',
  'Dividend',
  'Refund',
  'Other Income',
  // Expense
  'Housing',
  'Utilities',
  'Food',
  'Transport',
  'Shopping',
  'Healthcare',
  'Education',
  'Insurance',
  'EMI / Loan',
  'Entertainment',
  'Subscription',
  'Maintenance',
  'Bank Fees',
  'Taxes',
  'Other Expense',
  // Transfer
  'Transfer In',
  'Transfer Out',
] as const;

export const createTransactionSchema = z.object({
  type: transactionTypeEnum,
  amount: z
    .number({ message: 'Amount must be a number' })
    .positive('Transaction amount must be strictly greater than 0')
    .max(100000000, 'Amount exceeds reasonable limits'),
  currency: z
    .string()
    .trim()
    .length(3, 'Currency must be a 3-letter ISO code')
    .default('USD'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(255, 'Description is too long'),
  merchant: z.string().trim().max(150, 'Merchant name is too long').optional().nullable(),
  category: z.string().trim().min(1, 'Category is required').max(100, 'Category is too long'),
  subcategory: z.string().trim().max(100, 'Subcategory is too long').optional().nullable(),
  account: z.string().trim().max(100, 'Account name is too long').optional().nullable(),
  source: transactionSourceEnum.default('manual'),
  reference: z.string().trim().max(150, 'Reference is too long').optional().nullable(),
  balance: z.number().optional().nullable(),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  confidence: z.number().min(0).max(1).optional().nullable(),
  isSalary: z.boolean().optional().default(false),
  isRecurring: z.boolean().optional().default(false),
  documentId: z.string().max(128).optional().nullable(),
});


export const updateTransactionSchema = createTransactionSchema.partial();

export const queryTransactionsSchema = z.object({
  type: z.enum(['CREDIT', 'DEBIT', 'TRANSFER', 'ALL']).optional(),
  category: z.string().optional(),
  account: z.string().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// Document Upload & Confirmation Schemas
export const documentTypeEnum = z.enum([
  'bank_statement',
  'credit_card_statement',
  'salary_slip',
  'utility_bill',
  'invoice_receipt',
  'insurance_policy',
  'warranty_doc',
  'other',
]);

export const transactionCandidateSchema = z.object({
  id: z.string(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  description: z.string().trim().min(1).max(255),
  amount: z.number().positive(),
  type: transactionTypeEnum,
  category: z.string().trim().min(1).max(100),
  subcategory: z.string().trim().max(100).optional().nullable(),
  merchant: z.string().trim().max(150).optional().nullable(),
  account: z.string().trim().max(100).optional().nullable(),
  reference: z.string().trim().max(150).optional().nullable(),
  balance: z.number().optional().nullable(),
  confidence: z.number().min(0).max(1),
  isSalaryCandidate: z.boolean().optional(),
  isDuplicate: z.boolean().optional(),
  duplicateReason: z.string().optional(),
  fingerprint: z.string(),
  selected: z.boolean(),
  rawText: z.string().optional().nullable(),
});

export const confirmImportSchema = z.object({
  candidates: z
    .array(transactionCandidateSchema)
    .min(1, 'At least one transaction must be selected for import'),
  accountOverride: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const rejectImportSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

// ==========================================
// Phase 6: What-If Scenario Schemas
// ==========================================

export const scenarioTypeEnum = z.enum([
  'income_change',
  'new_expense',
  'one_time_purchase',
  'emi_loan',
  'appliance_purchase',
  'savings_goal',
  'custom',
]);

export const customAdjustmentSchema = z.object({
  label: z.string().trim().min(1).max(100),
  type: z.enum(['income', 'expense', 'one_time']),
  amount: z.number().positive('Amount must be greater than 0').max(100000000),
  frequency: z.enum(['monthly', 'annual', 'one_time']).optional(),
});

export const scenarioInputSchema = z.object({
  // Income Change
  incomeDelta: z.number().min(-10000000).max(10000000).optional().nullable(),
  incomeChangeType: z
    .enum(['salary_hike', 'bonus_amortized', 'job_loss', 'freelance_stream', 'other'])
    .optional()
    .nullable(),
  // New Expense
  expenseTitle: z.string().trim().max(100).optional().nullable(),
  expenseCategory: z.string().trim().max(100).optional().nullable(),
  expenseAmount: z.number().positive().max(10000000).optional().nullable(),
  expenseFrequency: z.enum(['monthly', 'quarterly', 'annual', 'one_time']).optional().nullable(),
  // One-Time Purchase
  purchaseTitle: z.string().trim().max(100).optional().nullable(),
  purchaseCost: z.number().positive().max(100000000).optional().nullable(),
  purchaseCategory: z.string().trim().max(100).optional().nullable(),
  // EMI / Loan
  loanPrincipal: z.number().positive().max(100000000).optional().nullable(),
  annualInterestRate: z.number().min(0).max(100).optional().nullable(),
  tenureMonths: z.number().int().min(1).max(360).optional().nullable(),
  downPayment: z.number().min(0).max(100000000).optional().nullable(),
  processingFee: z.number().min(0).max(1000000).optional().nullable(),
  loanType: z
    .enum(['personal', 'auto', 'home_renovation', 'education', 'appliance_no_cost_emi', 'other'])
    .optional()
    .nullable(),
  // Appliance Purchase
  applianceName: z.string().trim().max(100).optional().nullable(),
  applianceCategory: z
    .enum(['hvac', 'plumbing', 'kitchen', 'laundry', 'roofing_exterior', 'electrical', 'other'])
    .optional()
    .nullable(),
  applianceLifespanYears: z.number().int().min(1).max(50).optional().nullable(),
  applianceMonthlyOperatingCost: z.number().min(0).max(100000).optional().nullable(),
  replacesAssetId: z.string().max(128).optional().nullable(),
  // Savings Goal
  savingsTargetAmount: z.number().positive().max(1000000000).optional().nullable(),
  savingsHorizonMonths: z.number().int().min(1).max(360).optional().nullable(),
  savingsGoalCategory: z.string().trim().max(100).optional().nullable(),
  // Custom multi-variable
  customAdjustments: z.array(customAdjustmentSchema).max(20).optional().nullable(),
  // Notes
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const createScenarioSchema = z.object({
  title: z.string().trim().min(1, 'Scenario title is required').max(100, 'Title is too long'),
  description: z.string().trim().max(500).optional().nullable(),
  type: scenarioTypeEnum,
  inputs: scenarioInputSchema,
  isPinned: z.boolean().optional(),
});

export const simulateScenarioSchema = z.object({
  type: scenarioTypeEnum,
  inputs: scenarioInputSchema,
});

export const updateScenarioSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  type: scenarioTypeEnum.optional(),
  inputs: scenarioInputSchema.optional(),
  isPinned: z.boolean().optional(),
});

export const compareScenariosSchema = z.object({
  scenarioIds: z.array(z.string().min(1).max(128)).min(2, 'Select at least 2 scenarios to compare').max(5),
});



