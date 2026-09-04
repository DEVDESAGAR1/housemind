import { z } from 'zod';

// ID / Param validation
export const idParamSchema = z.object({
  id: z
    .string()
    .min(1, 'ID is required')
    .max(128, 'ID is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'ID contains invalid characters'),
});

export const propertyIdParamSchema = idParamSchema;
export const roomIdParamSchema = idParamSchema;
export const warrantyIdParamSchema = idParamSchema;
export const maintenanceIdParamSchema = idParamSchema;
export const utilityIdParamSchema = idParamSchema;
export const loanIdParamSchema = idParamSchema;
export const creditCardIdParamSchema = idParamSchema;

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
  country: z.string().trim().max(100, 'Country name is too long').optional().nullable(),
  region: z.string().trim().max(100, 'State/Province is too long').optional().nullable(),
  city: z.string().trim().max(100, 'City is too long').optional().nullable(),
  timezone: z.string().trim().max(100, 'Timezone is too long').optional().nullable(),
  locale: z.string().trim().max(20, 'Locale is too long').optional().nullable(),
  currency: z
    .string()
    .trim()
    .length(3, 'Currency must be a 3-letter ISO code')
    .default('USD'),
  currencyOverride: z.boolean().optional().default(false),
  primaryHeating: z
    .string()
    .trim()
    .max(50, 'Heating type is too long')
    .optional()
    .nullable(),
});

export const updateHouseholdProfileSchema = householdProfileSchema.partial();

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
    'vehicle',
    'appliance',
    'major_appliance',
    'electronics',
    'property_related',
    'furniture',
    'hvac',
    'plumbing',
    'kitchen',
    'laundry',
    'roofing_exterior',
    'electrical',
    'other',
  ]),
  subcategory: z.string().trim().max(100).optional().nullable(),
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
  currentEstimatedValue: z
    .number()
    .nonnegative('Estimated value cannot be negative')
    .max(100000000)
    .optional()
    .nullable(),
  currentStatus: z
    .enum(['operational', 'needs_maintenance', 'critical', 'replaced', 'sold'])
    .default('operational'),
  propertyId: z.string().trim().max(128).optional().nullable(),
  roomId: z.string().trim().max(128).optional().nullable(),
  roomLocation: z.string().trim().max(100, 'Room location is too long').optional().nullable(),
  maintenanceNotes: z
    .string()
    .trim()
    .max(2000, 'Maintenance notes cannot exceed 2000 characters')
    .optional()
    .nullable(),
  imageUrl: z.string().trim().max(2000).optional().nullable(),
  invoiceDocumentId: z.string().trim().max(128).optional().nullable(),
  warrantyDocumentId: z.string().trim().max(128).optional().nullable(),
  supportingDocumentIds: z.array(z.string().trim().max(128)).max(20).optional().nullable(),
});

export const updateAssetSchema = createAssetSchema.partial();

// ==========================================
// Phase 10: Property & Room Schemas
// ==========================================

export const propertyTypeEnum = z.enum([
  'primary_home',
  'additional_home',
  'rental_property',
  'vacation_home',
  'plot_land',
  'other',
]);

export const propertyAddressSchema = z.object({
  street: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  region: z.string().trim().max(100).optional().nullable(),
  postalCode: z.string().trim().max(50).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
});

function preprocessProperty(val: any) {
  if (val && typeof val === 'object') {
    const raw = { ...val };
    if (typeof raw.address === 'string') {
      raw.address = { street: raw.address };
    }
    if (raw.propertyType === 'single_family' || raw.propertyType === 'apartment' || raw.propertyType === 'house') {
      raw.propertyType = 'primary_home';
    } else if (raw.propertyType === 'land') {
      raw.propertyType = 'plot_land';
    }
    return raw;
  }
  return val;
}

const basePropertySchema = z.object({
  name: z.string().trim().min(1, 'Property name is required').max(100, 'Name is too long'),
  propertyType: propertyTypeEnum.default('primary_home'),
  address: propertyAddressSchema.optional().nullable(),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Purchase date must be YYYY-MM-DD')
    .optional()
    .nullable(),
  purchaseValue: z.number().nonnegative().max(1000000000).optional().nullable(),
  currentEstimatedValue: z.number().nonnegative().max(1000000000).optional().nullable(),
  ownershipInfo: z.string().trim().max(200).optional().nullable(),
  squareFootage: z.number().positive().max(1000000).optional().nullable(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 5).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  documentIds: z.array(z.string().max(128)).max(50).optional().nullable(),
  linkedLoanId: z.string().max(128).optional().nullable(),
});

export const createPropertySchema = z.preprocess(preprocessProperty, basePropertySchema);
export const updatePropertySchema = z.preprocess(preprocessProperty, basePropertySchema.partial());

export const roomTypeEnum = z.enum([
  'living_room',
  'bedroom',
  'kitchen',
  'bathroom',
  'balcony',
  'garage',
  'office',
  'storage',
  'garden',
  'dining_room',
  'basement',
  'attic',
  'hallway',
  'utility_area',
  'other',
]);

function preprocessRoom(val: any) {
  if (val && typeof val === 'object') {
    const raw = { ...val };
    if (!raw.type && raw.roomType) {
      raw.type = raw.roomType;
    }
    if (raw.floorLevel !== undefined && raw.floor === undefined) {
      raw.floor = String(raw.floorLevel);
    }
    return raw;
  }
  return val;
}

const baseRoomSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required').max(128),
  name: z.string().trim().min(1, 'Room name is required').max(100),
  type: roomTypeEnum.default('other'),
  floor: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  documentIds: z.array(z.string().max(128)).max(50).optional().nullable(),
});

export const createRoomSchema = z.preprocess(preprocessRoom, baseRoomSchema);
export const updateRoomSchema = z.preprocess(preprocessRoom, baseRoomSchema.partial());

// ==========================================
// Phase 10: Warranty, Maintenance & Utility Schemas
// ==========================================

export const warrantyStatusEnum = z.enum(['active', 'expiring_soon', 'expired']);

function preprocessWarranty(val: any) {
  if (val && typeof val === 'object') {
    const raw = { ...val };
    if (!raw.warrantyProvider && raw.providerName) {
      raw.warrantyProvider = raw.providerName;
    } else if (!raw.warrantyProvider && raw.title) {
      raw.warrantyProvider = raw.title;
    }
    if (!raw.endDate && raw.expirationDate) {
      raw.endDate = raw.expirationDate;
    }
    if (!raw.startDate) {
      raw.startDate = new Date().toISOString().slice(0, 10);
    }
    if (!raw.endDate) {
      raw.endDate = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    }
    if (!raw.coverageNotes && raw.coverageType) {
      raw.coverageNotes = raw.coverageType;
    }
    if (!raw.contactInfo && raw.supportPhone) {
      raw.contactInfo = { phone: raw.supportPhone };
    }
    return raw;
  }
  return val;
}

const baseWarrantySchema = z.object({
  assetId: z.string().max(128).optional().nullable(),
  propertyId: z.string().max(128).optional().nullable(),
  warrantyProvider: z.string().trim().min(1, 'Provider is required').max(150),
  policyNumber: z.string().trim().max(150).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  durationMonths: z.number().int().positive().max(600).optional().nullable(),
  coverageNotes: z.string().trim().max(2000).optional().nullable(),
  contactInfo: z
    .object({
      phone: z.string().trim().max(50).optional().nullable(),
      email: z.string().trim().email().max(150).optional().nullable(),
      website: z.string().trim().max(300).optional().nullable(),
    })
    .optional()
    .nullable(),
  documentId: z.string().max(128).optional().nullable(),
  status: warrantyStatusEnum.default('active'),
});

export const createWarrantySchema = z.preprocess(preprocessWarranty, baseWarrantySchema);
export const updateWarrantySchema = z.preprocess(preprocessWarranty, baseWarrantySchema.partial());

export const maintenanceScheduleEnum = z.enum([
  'none',
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
  'custom',
]);

export const maintenanceStatusEnum = z.enum(['scheduled', 'completed', 'overdue', 'pending']);

function preprocessMaintenance(val: any) {
  if (val && typeof val === 'object') {
    const raw = { ...val };
    if (!raw.serviceDate && raw.dueDate) {
      raw.serviceDate = raw.dueDate;
    } else if (!raw.serviceDate) {
      raw.serviceDate = new Date().toISOString().slice(0, 10);
    }
    if (raw.cost === undefined && raw.estimatedCost !== undefined) {
      raw.cost = raw.estimatedCost;
    } else if (raw.cost === undefined && raw.actualCost !== undefined) {
      raw.cost = raw.actualCost;
    }
    if (!raw.recurringSchedule && raw.recurrenceIntervalMonths) {
      if (raw.recurrenceIntervalMonths === 1) raw.recurringSchedule = 'monthly';
      else if (raw.recurrenceIntervalMonths === 3) raw.recurringSchedule = 'quarterly';
      else if (raw.recurrenceIntervalMonths === 6) raw.recurringSchedule = 'semi_annual';
      else if (raw.recurrenceIntervalMonths === 12) raw.recurringSchedule = 'annual';
    }
    return raw;
  }
  return val;
}

const baseMaintenanceSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(150),
  assetId: z.string().max(128).optional().nullable(),
  propertyId: z.string().max(128).optional().nullable(),
  roomId: z.string().max(128).optional().nullable(),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Service date must be YYYY-MM-DD'),
  cost: z.number().nonnegative('Cost cannot be negative').max(10000000).default(0),
  serviceProvider: z.string().trim().max(150).optional().nullable(),
  contactPhone: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  receiptDocumentId: z.string().max(128).optional().nullable(),
  nextServiceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Next service date must be YYYY-MM-DD')
    .optional()
    .nullable(),
  recurringSchedule: maintenanceScheduleEnum.default('none'),
  status: maintenanceStatusEnum.default('scheduled'),
});

export const createMaintenanceSchema = z.preprocess(preprocessMaintenance, baseMaintenanceSchema);
export const updateMaintenanceSchema = z.preprocess(preprocessMaintenance, baseMaintenanceSchema.partial());

export const utilityServiceTypeEnum = z.enum([
  'electricity',
  'water',
  'gas',
  'internet',
  'mobile',
  'trash',
  'hoa',
  'heating_oil',
  'solar',
  'other',
]);

export const utilityBillingCycleEnum = z.enum(['monthly', 'bi_monthly', 'quarterly', 'annual']);

function preprocessUtility(val: any) {
  if (val && typeof val === 'object') {
    const raw = { ...val };
    if (!raw.serviceType && raw.utilityType) {
      raw.serviceType = raw.utilityType;
    }
    if (!raw.provider && raw.providerName) {
      raw.provider = raw.providerName;
    }
    if (!raw.accountIdentifier && raw.accountNumber) {
      raw.accountIdentifier = raw.accountNumber;
    }
    if (raw.typicalAmount === undefined && raw.typicalMonthlyCost !== undefined) {
      raw.typicalAmount = raw.typicalMonthlyCost;
    }
    if (raw.isAutoPay === undefined && raw.autoPayEnabled !== undefined) {
      raw.isAutoPay = raw.autoPayEnabled;
    }
    if (raw.dueDateDay === undefined && raw.paymentDueDay !== undefined) {
      raw.dueDateDay = raw.paymentDueDay;
    }
    return raw;
  }
  return val;
}

const baseUtilitySchema = z.object({
  propertyId: z.string().max(128).optional().nullable(),
  name: z.string().trim().min(1, 'Utility name is required').max(100),
  serviceType: utilityServiceTypeEnum.default('electricity'),
  provider: z.string().trim().min(1, 'Provider name is required').max(150),
  accountIdentifier: z.string().trim().max(100).optional().nullable(),
  billingCycle: utilityBillingCycleEnum.default('monthly'),
  dueDateDay: z.number().int().min(1).max(31).optional().nullable(),
  nextDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Next due date must be YYYY-MM-DD')
    .optional()
    .nullable(),
  typicalAmount: z.number().nonnegative().max(10000000),
  latestBillAmount: z.number().nonnegative().max(10000000).optional().nullable(),
  paymentStatus: z.enum(['paid', 'pending', 'overdue']).default('pending'),
  isAutoPay: z.boolean().default(false),
  documentIds: z.array(z.string().max(128)).max(50).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const createUtilitySchema = z.preprocess(preprocessUtility, baseUtilitySchema);
export const updateUtilitySchema = z.preprocess(preprocessUtility, baseUtilitySchema.partial());

// ==========================================
// Phase 10: Loans & Credit Cards Schemas
// ==========================================

export const loanTypeEnum = z.enum([
  'home_loan',
  'vehicle_loan',
  'personal_loan',
  'appliance_loan',
  'education_loan',
  'solar_loan',
  'other',
]);

function preprocessLoan(val: any) {
  if (val && typeof val === 'object') {
    const raw = { ...val };
    if (!raw.loanName && raw.name) {
      raw.loanName = raw.name;
    }
    if (!raw.lender && raw.lenderName) {
      raw.lender = raw.lenderName;
    }
    if (raw.loanType === 'mortgage') {
      raw.loanType = 'home_loan';
    }
    if (raw.principalAmount === undefined && raw.originalPrincipal !== undefined) {
      raw.principalAmount = raw.originalPrincipal;
    }
    if (raw.interestRate === undefined && raw.interestRatePercent !== undefined) {
      raw.interestRate = raw.interestRatePercent;
    }
    if (raw.emiAmount === undefined && raw.monthlyPayment !== undefined) {
      raw.emiAmount = raw.monthlyPayment;
    }
    if (raw.outstandingAmount === undefined && raw.currentBalance !== undefined) {
      raw.outstandingAmount = raw.currentBalance;
    }
    if (!raw.startDate) {
      raw.startDate = new Date().toISOString().slice(0, 10);
    }
    if (!raw.endDate) {
      if (raw.maturityYear) {
        raw.endDate = `${raw.maturityYear}-12-31`;
      } else {
        raw.endDate = new Date(Date.now() + 360 * 30 * 86400000).toISOString().slice(0, 10);
      }
    }
    if (raw.tenureMonths === undefined) {
      raw.tenureMonths = 360;
    }
    return raw;
  }
  return val;
}

const baseLoanSchema = z.object({
  propertyId: z.string().max(128).optional().nullable(),
  assetId: z.string().max(128).optional().nullable(),
  loanName: z.string().trim().min(1, 'Loan name is required').max(150),
  loanType: loanTypeEnum.default('home_loan'),
  lender: z.string().trim().min(1, 'Lender is required').max(150),
  principalAmount: z.number().positive().max(1000000000),
  interestRate: z.number().min(0).max(100),
  emiAmount: z.number().positive().max(10000000),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  tenureMonths: z.number().int().min(1).max(600),
  paymentDueDay: z.number().int().min(1).max(31).default(1),
  outstandingAmount: z.number().nonnegative().max(1000000000),
  documentIds: z.array(z.string().max(128)).max(50).optional().nullable(),
  status: z.enum(['active', 'closed']).default('active'),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const createLoanSchema = z.preprocess(preprocessLoan, baseLoanSchema);
export const updateLoanSchema = z.preprocess(preprocessLoan, baseLoanSchema.partial());

function preprocessCreditCard(val: any) {
  if (val && typeof val === 'object') {
    const raw = { ...val };
    if (!raw.cardNickname && raw.cardName) {
      raw.cardNickname = raw.cardName;
    }
    if (!raw.cardIssuer && raw.issuer) {
      raw.cardIssuer = raw.issuer;
    }
    if (!raw.last4Digits && raw.lastFourDigits) {
      raw.last4Digits = raw.lastFourDigits;
    }
    if (raw.outstandingAmount === undefined && raw.currentBalance !== undefined) {
      raw.outstandingAmount = raw.currentBalance;
    }
    if (raw.minimumDue === undefined && raw.minimumPaymentDue !== undefined) {
      raw.minimumDue = raw.minimumPaymentDue;
    }
    if (raw.aprRate === undefined && raw.aprPercent !== undefined) {
      raw.aprRate = raw.aprPercent;
    }
    if (raw.isAutoPay === undefined && raw.autoPayEnabled !== undefined) {
      raw.isAutoPay = raw.autoPayEnabled;
    }
    if (!raw.paymentDueDate) {
      raw.paymentDueDate = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
    }
    return raw;
  }
  return val;
}

const baseCreditCardSchema = z.object({
  cardNickname: z.string().trim().min(1, 'Card nickname is required').max(100),
  cardIssuer: z.string().trim().min(1, 'Issuer is required').max(100),
  last4Digits: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Last 4 digits must be exactly 4 numeric digits (no full numbers/CVV allowed)'),
  creditLimit: z.number().positive().max(10000000),
  billingCycleDay: z.number().int().min(1).max(31).optional().nullable(),
  statementDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Statement date must be YYYY-MM-DD')
    .optional()
    .nullable(),
  paymentDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment due date must be YYYY-MM-DD'),
  outstandingAmount: z.number().nonnegative().max(10000000),
  minimumDue: z.number().nonnegative().max(10000000).default(0),
  aprRate: z.number().min(0).max(100).optional().nullable(),
  paymentStatus: z.enum(['paid', 'pending', 'overdue']).default('pending'),
  isAutoPay: z.boolean().default(false),
  documentIds: z.array(z.string().max(128)).max(50).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const createCreditCardSchema = z.preprocess(preprocessCreditCard, baseCreditCardSchema);
export const updateCreditCardSchema = z.preprocess(preprocessCreditCard, baseCreditCardSchema.partial());

// Document Upload & Confirmation Types Enum
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

// ==========================================
// Phase 10: AI Document Extraction & Review Schemas
// ==========================================

export const extractEntityFromDocSchema = z.object({
  documentId: z.string().max(128).optional(),
  fileBase64: z.string().optional(),
  fileName: z.string().max(255).optional(),
  fileType: z.string().max(100).optional(),
  documentType: documentTypeEnum.optional(),
  targetEntityType: z
    .enum(['asset', 'warranty', 'maintenance', 'utility', 'loan', 'credit_card', 'expense', 'document', 'property', 'room', 'transaction'])
    .optional(),
  targetEntityHint: z
    .enum(['asset', 'warranty', 'maintenance', 'utility', 'loan', 'credit_card', 'expense', 'document', 'property', 'room', 'transaction'])
    .optional(),
  notes: z.string().max(2000).optional().nullable(),
});

const baseSaveExtractedEntitySchema = z.object({
  entityType: z
    .enum(['asset', 'warranty', 'maintenance', 'utility', 'loan', 'credit_card', 'expense', 'document', 'property', 'room', 'transaction'])
    .optional(),
  targetEntity: z
    .enum(['asset', 'warranty', 'maintenance', 'utility', 'loan', 'credit_card', 'expense', 'document', 'property', 'room', 'transaction'])
    .optional(),
  entityData: z.record(z.string(), z.any()).optional(),
  payload: z.record(z.string(), z.any()).optional(),
  sourceDocumentId: z.string().max(128).optional().nullable(),
  documentId: z.string().max(128).optional().nullable(),
});

export const saveExtractedEntitySchema = baseSaveExtractedEntitySchema.transform((data) => ({
  entityType: (data.entityType || data.targetEntity || 'asset') as any,
  targetEntity: (data.targetEntity || data.entityType || 'asset') as any,
  entityData: data.entityData || data.payload || {},
  payload: data.payload || data.entityData || {},
  sourceDocumentId: data.sourceDocumentId || data.documentId || undefined,
  documentId: data.documentId || data.sourceDocumentId || undefined,
}));

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
export const transactionCandidateSchema = z.object({
  id: z.string(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  description: z.string().trim().min(1).max(255),
  amount: z.number().positive(),
  currency: z.string().trim().length(3).optional().nullable(),
  requiresCurrencyReview: z.boolean().optional(),
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

// ==========================================
// Phase 9: Privacy & Data Source Schemas
// ==========================================

export const ingestionSourceTypeEnum = z.enum([
  'manual_entry',
  'manual_upload',
  'google_drive',
  'gmail',
  'demo_seed',
]);

export const ingestionDataTypeEnum = z.enum([
  'transaction',
  'expense',
  'asset',
  'maintenance_log',
  'document',
  'scenario',
]);

export const sourceMetadataSchema = z.object({
  userId: z.string().min(1).max(128),
  sourceType: ingestionSourceTypeEnum,
  sourceId: z.string().max(256).optional().nullable(),
  sourceReference: z.string().max(256).optional().nullable(),
  dataType: ingestionDataTypeEnum,
  importedAt: z.string(),
  userConfirmed: z.boolean(),
  processingStatus: z.enum(['pending', 'processed', 'confirmed', 'failed']),
  deletionStatus: z.enum(['active', 'deleted']),
  isDemo: z.boolean().optional(),
});

export const resetUserDataSchema = z.object({
  confirm: z.boolean().optional(),
  confirmPhrase: z.string().optional(),
}).refine(data => data.confirm === true || data.confirmPhrase === 'DELETE MY DATA', {
  message: 'Explicit confirmation { confirm: true } or confirmPhrase: "DELETE MY DATA" required.',
});

export const deleteDemoDataSchema = z.object({
  confirm: z.boolean().optional(),
});

export const toggleSourceSchema = z.object({
  sourceType: ingestionSourceTypeEnum,
  action: z.enum(['connect', 'disconnect', 'sync']),
  folderId: z.string().max(256).optional().nullable(),
  queryFilter: z.string().max(256).optional().nullable(),
});

// Household Memory Schemas (Phase 20)
export const memoryIdParamSchema = idParamSchema;

export const createHouseholdMemorySchema = z.object({
  category: z.enum(['preference', 'asset', 'maintenance', 'notification', 'fact']),
  key: z.string().trim().min(1, 'Key is required').max(100, 'Key exceeds 100 characters'),
  value: z.union([
    z.string().trim().min(1, 'Value cannot be empty').max(500, 'Value exceeds 500 characters'),
    z.record(z.string(), z.any()),
  ]),
  source: z.enum(['user_explicit', 'app_preference', 'confirmed_suggestion']).optional().default('user_explicit'),
  confirmed: z.boolean().optional().default(true),
});

export const updateHouseholdMemorySchema = z.object({
  category: z.enum(['preference', 'asset', 'maintenance', 'notification', 'fact']).optional(),
  key: z.string().trim().min(1).max(100).optional(),
  value: z
    .union([
      z.string().trim().min(1).max(500),
      z.record(z.string(), z.any()),
    ])
    .optional(),
  confirmed: z.boolean().optional(),
});




