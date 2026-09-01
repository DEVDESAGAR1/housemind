/**
 * HouseMind Type Definitions
 * Strict TypeScript types for User Profiles, Expenses, Assets, and Conversations.
 */

export interface HouseholdProfile {
  userId: string;
  email: string;
  displayName: string;
  homeName: string;
  homeType: 'single_family' | 'apartment' | 'condo' | 'townhouse' | 'multi_family';
  yearBuilt?: number;
  squareFootage?: number;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  locale?: string;
  currency: string;
  currencyOverride?: boolean;
  primaryHeating?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Phase 9: Unified Ingestion & Source Tracking
// ==========================================

export type IngestionSourceType =
  | 'manual_entry'
  | 'manual_upload'
  | 'google_drive'
  | 'gmail'
  | 'demo_seed';

export type IngestionDataType =
  | 'transaction'
  | 'expense'
  | 'asset'
  | 'maintenance_log'
  | 'document'
  | 'scenario';

export type ProcessingStatus = 'pending' | 'processed' | 'confirmed' | 'failed';
export type DeletionStatus = 'active' | 'deleted';

export interface ImportedSourceMetadata {
  userId: string;
  sourceType: IngestionSourceType;
  sourceId?: string; // documentId, messageId, or driveFileId
  sourceReference?: string; // file name, sender email, subject
  dataType: IngestionDataType;
  importedAt: string;
  userConfirmed: boolean;
  processingStatus: ProcessingStatus;
  deletionStatus: DeletionStatus;
  isDemo?: boolean;
}

export type ExpenseCategory =
  | 'utilities'
  | 'maintenance'
  | 'insurance'
  | 'mortgage_rent'
  | 'services'
  | 'other';

export type ExpenseFrequency = 'monthly' | 'quarterly' | 'annual' | 'one_time';
export type PaymentStatus = 'paid' | 'pending' | 'overdue';

export interface HouseholdExpense {
  id: string;
  userId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  frequency: ExpenseFrequency;
  dueDate?: string;
  isAutoPay: boolean;
  paymentStatus: PaymentStatus;
  notes?: string;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export type AssetCategory =
  | 'vehicle'
  | 'appliance'
  | 'major_appliance'
  | 'electronics'
  | 'property_related'
  | 'furniture'
  | 'hvac'
  | 'plumbing'
  | 'kitchen'
  | 'laundry'
  | 'roofing_exterior'
  | 'electrical'
  | 'other';

export type AssetStatus = 'operational' | 'needs_maintenance' | 'critical' | 'replaced' | 'sold';

// ==========================================
// Phase 10: Run the Home - Core Entities
// ==========================================

export type PropertyType =
  | 'primary_home'
  | 'additional_home'
  | 'rental_property'
  | 'vacation_home'
  | 'plot_land'
  | 'other';

export interface PropertyAddress {
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

export interface Property {
  id: string;
  userId: string;
  name: string;
  propertyType: PropertyType;
  address?: PropertyAddress;
  purchaseDate?: string;
  purchaseValue?: number;
  currentEstimatedValue?: number;
  ownershipInfo?: string;
  squareFootage?: number;
  yearBuilt?: number;
  notes?: string;
  documentIds?: string[];
  linkedLoanId?: string;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export type RoomType =
  | 'living_room'
  | 'bedroom'
  | 'master_bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'balcony'
  | 'garage'
  | 'office'
  | 'home_office'
  | 'storage'
  | 'garden'
  | 'outdoor'
  | 'dining_room'
  | 'basement'
  | 'attic'
  | 'hallway'
  | 'utility_area'
  | 'utility_room'
  | 'laundry'
  | 'other';

export interface Room {
  id: string;
  userId: string;
  propertyId: string;
  name: string;
  type: RoomType;
  roomType?: RoomType;
  floor?: string;
  floorLevel?: string;
  squareFootage?: number;
  notes?: string;
  documentIds?: string[];
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface HomeAsset {
  id: string;
  userId: string;
  propertyId?: string;
  roomId?: string;
  name: string;
  category: AssetCategory;
  subcategory?: string;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  installDate?: string;
  warrantyExpiryDate?: string;
  expectedLifespanYears?: number;
  purchaseCost?: number;
  currentEstimatedValue?: number;
  currentStatus: AssetStatus;
  roomLocation?: string;
  maintenanceNotes?: string;
  imageUrl?: string;
  invoiceDocumentId?: string;
  warrantyDocumentId?: string;
  supportingDocumentIds?: string[];
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export type WarrantyStatus = 'active' | 'expiring_soon' | 'expired';

export interface Warranty {
  id: string;
  userId: string;
  assetId?: string;
  propertyId?: string;
  title?: string;
  warrantyProvider: string;
  providerName?: string;
  policyNumber?: string;
  coverageType?: string;
  coverageDetails?: string;
  startDate: string;
  endDate: string;
  expiryDate?: string;
  durationMonths?: number;
  coverageNotes?: string;
  notes?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  contactPhone?: string;
  contactEmail?: string;
  documentId?: string;
  status: WarrantyStatus;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceSchedule =
  | 'none'
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual'
  | 'custom'
  | string;

export type MaintenanceStatus = 'scheduled' | 'pending' | 'completed' | 'overdue';

export interface MaintenanceTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category?: string;
  assetId?: string;
  propertyId?: string;
  roomId?: string;
  serviceDate: string;
  dueDate?: string;
  cost: number;
  estimatedCost?: number;
  actualCost?: number;
  serviceProvider?: string;
  serviceProviderName?: string;
  serviceProviderContact?: string;
  contactPhone?: string;
  notes?: string;
  receiptDocumentId?: string;
  nextServiceDate?: string;
  recurringSchedule: MaintenanceSchedule;
  frequency?: MaintenanceSchedule;
  status: MaintenanceStatus;
  lastCompletedDate?: string;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export type UtilityServiceType =
  | 'electricity'
  | 'water'
  | 'gas'
  | 'internet'
  | 'mobile'
  | 'trash'
  | 'hoa'
  | 'heating_oil'
  | 'solar'
  | 'other';

export type UtilityType = UtilityServiceType;

export type UtilityBillingCycle = 'monthly' | 'bi_monthly' | 'quarterly' | 'annual' | string;

export interface UtilityAccount {
  id: string;
  userId: string;
  propertyId?: string;
  name: string;
  serviceType: UtilityServiceType;
  utilityType?: UtilityType;
  provider: string;
  providerName?: string;
  accountIdentifier?: string;
  accountNumber?: string;
  billingCycle: UtilityBillingCycle;
  dueDateDay?: number;
  paymentDueDay?: number;
  nextDueDate?: string;
  typicalAmount: number;
  typicalMonthlyCost?: number;
  latestBillAmount?: number;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  isAutoPay: boolean;
  autoPayEnabled?: boolean;
  isPaidThisMonth?: boolean;
  documentIds?: string[];
  notes?: string;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export type LoanType =
  | 'home_loan'
  | 'mortgage'
  | 'vehicle_loan'
  | 'auto'
  | 'personal_loan'
  | 'appliance_loan'
  | 'education_loan'
  | 'solar_loan'
  | 'other';

export interface HouseholdLoan {
  id: string;
  userId: string;
  propertyId?: string;
  assetId?: string;
  loanName: string;
  name?: string;
  loanType: LoanType;
  lender: string;
  lenderName?: string;
  accountNumber?: string;
  principalAmount: number;
  originalPrincipal?: number;
  interestRate: number; // e.g. 6.5 for 6.5%
  interestRatePercent?: number;
  emiAmount: number;
  monthlyPayment?: number;
  maturityYear?: number;
  startDate: string;
  endDate: string;
  tenureMonths: number;
  paymentDueDay: number;
  outstandingAmount: number;
  currentBalance?: number;
  documentIds?: string[];
  status: 'active' | 'closed';
  notes?: string;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardAccount {
  id: string;
  userId: string;
  cardNickname: string;
  cardName?: string;
  cardIssuer: string;
  issuer?: string;
  last4Digits: string; // strictly 4 digits, NO full PAN
  lastFourDigits?: string;
  creditLimit: number;
  billingCycleDay?: number;
  statementDate?: string;
  paymentDueDate: string;
  outstandingAmount: number;
  currentBalance?: number;
  minimumDue: number;
  minimumPaymentDue?: number;
  aprRate?: number;
  aprPercent?: number;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  isAutoPay: boolean;
  autoPayEnabled?: boolean;
  documentIds?: string[];
  notes?: string;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export type HouseholdEntityType =
  | 'property'
  | 'room'
  | 'asset'
  | 'warranty'
  | 'maintenance'
  | 'utility'
  | 'loan'
  | 'credit_card'
  | 'document'
  | 'expense'
  | 'transaction';

export type WarrantyPolicy = Warranty;
export type RecurrenceFrequency = MaintenanceSchedule;

export interface HomeCommandCenterSummary {
  totalProperties?: number;
  totalRooms?: number;
  totalAssetsCount?: number;
  totalLoansCount?: number;
  totalOutstandingLoanDebt?: number;
  totalCreditCardDebt?: number;
  totalCreditLimit?: number;
  overallCreditUtilizationPercent?: number;
  today: {
    urgentTasks: Array<{
      id: string;
      type: 'bill_due' | 'maintenance_due' | 'overdue_payment' | 'warranty_expiring';
      title: string;
      subtitle?: string;
      amount?: number;
      dueDate: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
    overdueCount: number;
    dueTodayCount: number;
  };
  upcoming30Days: {
    totalObligationsAmount: number;
    emis: Array<{
      id: string;
      name: string;
      amount: number;
      dueDate: string;
      lender: string;
    }>;
    creditCards: Array<{
      id: string;
      nickname: string;
      last4: string;
      amount: number;
      dueDate: string;
      isAutoPay: boolean;
    }>;
    utilities: Array<{
      id: string;
      name: string;
      provider: string;
      amount: number;
      dueDate: string;
      isAutoPay: boolean;
    }>;
    billsAndExpenses?: Array<{
      id: string;
      title: string;
      amount: number;
      dueDate: string;
      category: string;
      isAutoPay?: boolean;
    }>;
    warrantiesExpiring: Array<{
      id: string;
      provider: string;
      assetName?: string;
      expiryDate: string;
      daysRemaining: number;
    }>;
    maintenanceTasks: Array<{
      id: string;
      title: string;
      targetName?: string;
      dueDate: string;
      status: MaintenanceStatus;
    }>;
  };
  homeSpaces: {
    propertiesCount: number;
    roomsCount: number;
    assetsCount: number;
    totalAssetValuation: number;
    totalPropertyValuation: number;
    assetsNeedingAttention: number;
  };
  financialObligations: {
    monthlyLoansTotal: number;
    monthlyUtilitiesTotal: number;
    monthlyCreditCardsTotal: number;
    monthlyRecurringExpensesTotal: number;
    totalMonthlyObligations: number;
  };
  documents: {
    totalDocuments: number;
    expiringDocumentsCount: number;
    recentDocuments: DocumentRecord[];
  };
}

export type ExtractedTargetEntityType =
  | 'asset'
  | 'warranty'
  | 'maintenance'
  | 'utility'
  | 'loan'
  | 'credit_card'
  | 'expense'
  | 'document';

export interface ExtractedEntityReviewData {
  extractionId?: string;
  documentType: DocumentType;
  suggestedEntity: ExtractedTargetEntityType;
  detectedEntityType?: HouseholdEntityType | ExtractedTargetEntityType;
  sourceDocumentId?: string;
  confidence: number;
  confidenceScore?: number;
  sourceFileName?: string;
  warnings?: string[];
  sourceReferences?: string[];
  extractedAt?: string;
  status?: string;
  rawTextPreview?: string;
  extractedFields: {
    // General
    title?: string;
    merchantOrIssuer?: string;
    date?: string;
    amount?: number;
    currency?: string;
    notes?: string;
    // Asset
    brand?: string;
    modelNumber?: string;
    serialNumber?: string;
    assetCategory?: AssetCategory;
    purchaseCost?: number;
    installDate?: string;
    expectedLifespanYears?: number;
    // Warranty
    warrantyProvider?: string;
    policyNumber?: string;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
    warrantyDurationMonths?: number;
    coverageNotes?: string;
    contactPhone?: string;
    // Maintenance
    taskTitle?: string;
    serviceProvider?: string;
    serviceCost?: number;
    serviceDate?: string;
    nextServiceDate?: string;
    // Utility
    utilityProvider?: string;
    utilityType?: UtilityServiceType;
    accountIdentifier?: string;
    billAmount?: number;
    dueDate?: string;
    billingCycle?: UtilityBillingCycle;
    // Loan
    loanName?: string;
    lender?: string;
    loanType?: LoanType;
    principalAmount?: number;
    interestRate?: number;
    emiAmount?: number;
    tenureMonths?: number;
    // Credit Card
    cardNickname?: string;
    cardIssuer?: string;
    last4Digits?: string;
    creditLimit?: number;
    outstandingAmount?: number;
    minimumDue?: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedQuestions?: string[];
}

export interface ConversationSummary {
  id: string;
  userId: string;
  title: string;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[];
}

export interface CopilotChatResponse {
  conversationId: string;
  reply: string;
  suggestedQuestions: string[];
  groundedSummary: {
    profileLoaded: boolean;
    expensesCount: number;
    assetsCount: number;
  };
}

export type InsightType =
  | 'expense_increase'
  | 'large_expense'
  | 'recurring_change'
  | 'warranty_expiration'
  | 'maintenance_due'
  | 'missing_info';

export type InsightSeverity = 'low' | 'medium' | 'high' | 'critical';

export type InsightStatus = 'new' | 'viewed' | 'dismissed' | 'resolved';

export interface InsightEvidence {
  facts: string[];
  calculation: string;
  rawMetrics?: Record<string, any>;
}

export interface GeminiInsightExplanation {
  summary: string;
  interpretation: string;
  recommendedAction: string;
  generatedAt: string;
}

export interface HouseholdInsight {
  id: string;
  userId: string;
  fingerprint: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  whyDetected: string;
  relatedEntityIds: string[];
  relatedEntityType: 'expense' | 'asset' | 'profile' | 'general';
  calculatedValues: {
    currentAmount?: number;
    previousAmount?: number;
    percentChange?: number;
    threshold?: number;
    averageAmount?: number;
    ratioToAverage?: number;
    daysUntilExpiry?: number;
    daysOverdue?: number;
    missingFields?: string[];
    monthlyImpact?: number;
    [key: string]: any;
  };
  evidence: InsightEvidence;
  status: InsightStatus;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
  geminiExplanation?: GeminiInsightExplanation | null;
}

// ==========================================
// Phase 5: Financial & Document Intelligence Types
// ==========================================

export type TransactionType = 'CREDIT' | 'DEBIT' | 'TRANSFER';

export type TransactionSource =
  | 'manual'
  | 'statement_import'
  | 'salary_slip'
  | 'bill_scan'
  | 'receipt_scan';

export type IncomeCategory =
  | 'Salary'
  | 'Freelance'
  | 'Business'
  | 'Interest'
  | 'Dividend'
  | 'Refund'
  | 'Other Income';

export type ExpenseCategoryFinancial =
  | 'Housing'
  | 'Utilities'
  | 'Food'
  | 'Transport'
  | 'Shopping'
  | 'Healthcare'
  | 'Education'
  | 'Insurance'
  | 'EMI / Loan'
  | 'Entertainment'
  | 'Subscription'
  | 'Maintenance'
  | 'Bank Fees'
  | 'Taxes'
  | 'Other Expense';

export type TransferCategory = 'Transfer In' | 'Transfer Out';

export type FinancialCategory = IncomeCategory | ExpenseCategoryFinancial | TransferCategory;

export interface FinancialTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  description: string;
  merchant?: string;
  category: string;
  subcategory?: string;
  account?: string;
  source: TransactionSource;
  reference?: string;
  balance?: number;
  notes?: string;
  confidence?: number;
  fingerprint: string;
  isSalary?: boolean;
  isRecurring?: boolean;
  documentId?: string;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}


export type DocumentType =
  | 'bank_statement'
  | 'credit_card_statement'
  | 'salary_slip'
  | 'utility_bill'
  | 'invoice_receipt'
  | 'insurance_policy'
  | 'warranty_doc'
  | 'other';

export type DocumentStatus = 'pending_review' | 'confirmed' | 'rejected' | 'failed';

export interface TransactionCandidate {
  id: string; // Temporary ID for candidate review
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  currency?: string | null;
  requiresCurrencyReview?: boolean;
  type: TransactionType;
  category: string;
  subcategory?: string;
  merchant?: string;
  account?: string;
  reference?: string;
  balance?: number;
  confidence: number;
  isSalaryCandidate?: boolean;
  isDuplicate?: boolean;
  duplicateReason?: string;
  fingerprint: string;
  selected: boolean;
  rawText?: string;
}

export interface HouseholdDataSourcesSummary {
  userId: string;
  householdProfile: {
    homeName: string;
    country: string;
    region?: string;
    city?: string;
    currency: string;
    locale: string;
    timezone: string;
  };
  dataCounts: {
    manualTransactions: number;
    importedDocuments: number;
    confirmedTransactions: number;
    recurringExpenses: number;
    registeredAssets: number;
    properties?: number;
    rooms?: number;
    warranties?: number;
    maintenances?: number;
    utilities?: number;
    loans?: number;
    creditCards?: number;
    whatIfScenarios: number;
    copilotConversations: number;
    demoRecordsCount?: number;
    userRecordsCount?: number;
  };
  isolationStatus: 'STRICT_USER_ISOLATED';
  aiContextGrounding: {
    groundedSources: string[];
    excludedSensitiveData: string[];
  };
  sources?: DataSourceConnection[];
}

export interface DataSourceConnection {
  id: string;
  sourceType: IngestionSourceType;
  name: string;
  description: string;
  status: 'active' | 'ready' | 'disconnected' | 'syncing' | 'error';
  statusLabel: string;
  isConfigured: boolean;
  lastSyncAt?: string;
  scope?: string;
  selectableFilters?: {
    folderId?: string;
    folderName?: string;
    queryFilter?: string;
  };
  recordsCount: number;
  demoRecordsCount: number;
  canDisconnect: boolean;
}

export interface PrivacyCenterSummary {
  userId: string;
  authStatus: 'authenticated' | 'unauthenticated';
  isolationLevel: 'STRICT_USER_ISOLATED';
  dataRetentionPolicy: string;
  totalRecords: number;
  userRecordsCount: number;
  demoRecordsCount: number;
  recordsByType: {
    transactions: { total: number; user: number; demo: number };
    expenses: { total: number; user: number; demo: number };
    assets: { total: number; user: number; demo: number };
    properties?: { total: number; user: number; demo: number };
    rooms?: { total: number; user: number; demo: number };
    warranties?: { total: number; user: number; demo: number };
    maintenances?: { total: number; user: number; demo: number };
    utilities?: { total: number; user: number; demo: number };
    loans?: { total: number; user: number; demo: number };
    creditCards?: { total: number; user: number; demo: number };
    documents: { total: number; user: number; demo: number };
    scenarios: { total: number; user: number; demo: number };
    conversations: { total: number; user: number; demo: number };
  };
  sources: DataSourceConnection[];
  aiPrivacyBoundary: {
    status: 'MINIMAL_RELEVANT_CONTEXT_ONLY';
    description: string;
    sharedElements: string[];
    strictlyRedactedElements: string[];
    retentionGuarantee: string;
  };
}

export interface ExtractedDocumentSummary {
  institutionOrIssuer?: string;
  accountIdentifier?: string;
  periodStart?: string;
  periodEnd?: string;
  statementPeriodStart?: string;
  statementPeriodEnd?: string;
  totalCredits?: number;
  totalDebits?: number;
  openingBalance?: number;
  closingBalance?: number;
  netAmount?: number;
  currency?: string;
  // Salary Slip specific
  employerName?: string;
  employeeName?: string;
  grossSalary?: number;
  netSalary?: number;
  deductions?: number;
  salaryDate?: string;
  // Utility Bill / Invoice specific
  billingProvider?: string;
  billAmount?: number;
  dueDate?: string;
  policyNumber?: string;
  notes?: string;
}

export type Expense = HouseholdExpense;
export type Asset = HomeAsset;
export type Transaction = FinancialTransaction;
export type DocumentRecord = HouseholdDocument;
export type CopilotConversation = ConversationDetail;

export interface HouseholdDocument {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: DocumentType;
  status: DocumentStatus;
  extractedSummary?: ExtractedDocumentSummary;
  transactionCandidates: TransactionCandidate[];
  confirmedTransactionIds?: string[];
  notes?: string;
  uploadedAt?: string;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  savingsRate: number;
  totalCredits: number;
  totalDebits: number;
  totalTransfers: number;
  recurringIncome: number;
  recurringExpenses: number;
  topSpendingCategories: Array<{ category: string; amount: number; percentage: number }>;
  accountBreakdown: Array<{ account: string; netAmount: number; count: number }>;
  recentTransactions: FinancialTransaction[];
  transactionsCount: number;
}

// ==========================================
// Phase 6: What-If Simulator & Decision Intelligence Types
// ==========================================

export type ScenarioType =
  | 'income_change'
  | 'new_expense'
  | 'one_time_purchase'
  | 'emi_loan'
  | 'appliance_purchase'
  | 'savings_goal'
  | 'custom';

export type AffordabilityStatus =
  | 'highly_affordable'
  | 'affordable'
  | 'tight_margin'
  | 'high_risk'
  | 'unaffordable';

export interface CustomAdjustment {
  label: string;
  type: 'income' | 'expense' | 'one_time';
  amount: number;
  frequency?: 'monthly' | 'annual' | 'one_time';
}

export interface ScenarioInput {
  // Income Change
  incomeDelta?: number; // Monthly change (+/-)
  incomeChangeType?: 'salary_hike' | 'bonus_amortized' | 'job_loss' | 'freelance_stream' | 'other';
  // New Expense
  expenseTitle?: string;
  expenseCategory?: string;
  expenseAmount?: number;
  expenseFrequency?: 'monthly' | 'quarterly' | 'annual' | 'one_time';
  // One-Time Purchase
  purchaseTitle?: string;
  purchaseCost?: number;
  purchaseCategory?: string;
  // EMI / Loan
  loanPrincipal?: number;
  annualInterestRate?: number; // e.g. 10.5 for 10.5%
  tenureMonths?: number;
  downPayment?: number;
  processingFee?: number;
  loanType?: 'personal' | 'auto' | 'home_renovation' | 'education' | 'appliance_no_cost_emi' | 'other';
  // Appliance Purchase
  applianceName?: string;
  applianceCategory?: AssetCategory;
  applianceLifespanYears?: number;
  applianceMonthlyOperatingCost?: number; // e.g. estimated monthly power / maintenance
  replacesAssetId?: string; // If replacing an existing asset
  // Savings Goal
  savingsTargetAmount?: number;
  savingsHorizonMonths?: number;
  savingsGoalCategory?: string;
  // Custom multi-variable
  customAdjustments?: CustomAdjustment[];
  // General Notes
  notes?: string;
}

export interface ScenarioBaselineMetrics {
  monthlyIncome: number;
  monthlyRecurringExpenses: number;
  monthlyDiscretionaryExpenses: number;
  totalMonthlyExpenses: number;
  netMonthlySurplus: number;
  savingsRate: number;
  totalLiquidAssets?: number;
  currency: string;
}

export interface ScenarioProjectedMetrics {
  projectedMonthlyIncome: number;
  projectedMonthlyExpenses: number;
  projectedNetSurplus: number;
  projectedSavingsRate: number;
  surplusDelta: number; // monthly net change (+/-)
  savingsRateDelta: number; // percentage points change (+/-)
  monthlyEmiPayment?: number;
  totalInterestPayable?: number;
  totalLoanCost?: number;
  oneTimeCashImpact?: number;
  requiredMonthlySavings?: number;
  breakevenMonths?: number; // months to absorb one-time cost with surplus
  annualSurplusImpact: number;
  debtToIncomeRatio: number;
  expenseToIncomeRatio: number;
}

export interface AffordabilityIndicator {
  status: AffordabilityStatus;
  financialPressureScore: number; // 0 (none) to 100 (critical deficit)
  verdictTitle: string;
  verdictSummary: string;
  warnings: string[];
  positiveFlags: string[];
  debtToIncomeRatio: number;
  expenseToIncomeRatio: number;
}

export interface ScenarioGeminiExplanation {
  executiveSummary: string;
  riskAnalysis: string[];
  opportunityCost: string;
  strategicRecommendation: string;
  generatedAt: string;
}

export interface Scenario {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: ScenarioType;
  inputs: ScenarioInput;
  baselineMetrics: ScenarioBaselineMetrics;
  projectedMetrics: ScenarioProjectedMetrics;
  affordability: AffordabilityIndicator;
  geminiExplanation?: ScenarioGeminiExplanation | null;
  isPinned?: boolean;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioComparison {
  scenarios: Scenario[];
  comparisonMatrix: {
    labels: string[];
    monthlyIncomes: number[];
    monthlyExpenses: number[];
    netMonthlySurpluses: number[];
    savingsRates: number[];
    surplusDeltas: number[];
    pressureScores: number[];
    affordabilityStatuses: AffordabilityStatus[];
    oneTimeCosts: number[];
    totalLoanCosts: number[];
  };
  recommendedScenarioId?: string;
  recommendationReason?: string;
}

// ==========================================
// Phase 3: Household Health Intelligence Types
// ==========================================

export type HouseholdHealthCategory = 'home' | 'assets' | 'finances' | 'documents';
export type HealthStatusLevel = 'excellent' | 'good' | 'fair' | 'at_risk' | 'insufficient_data';
export type HealthSignalStatus = 'healthy' | 'warning' | 'critical' | 'info';

export interface HouseholdHealthSignal {
  id: string;
  category: HouseholdHealthCategory;
  name: string;
  status: HealthSignalStatus;
  scoreImpact: number; // e.g. +10 or -20
  weight: number; // 0.1 to 1.0
  title: string;
  description: string;
  evidence: string;
  recommendation?: string;
  actionTab?: string;
  actionLabel?: string;
  relatedEntityIds?: string[];
}

export interface CategoryHealthBreakdown {
  category: HouseholdHealthCategory;
  name: string;
  score: number; // 0 to 100
  status: HealthStatusLevel;
  statusLabel: string;
  weight: number; // e.g. 0.25
  completenessScore: number; // 0 to 100
  signals: HouseholdHealthSignal[];
  summary: string;
  positiveFactors: string[];
  riskFactors: string[];
}

export interface HouseholdHealthAiExplanation {
  executiveSummary: string;
  strengths: string[];
  topRisks: string[];
  prioritizedActionPlan: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    category: HouseholdHealthCategory;
    estimatedImpact: string;
  }>;
  generatedAt: string;
}

export interface HouseholdHealthRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  category: HouseholdHealthCategory;
  description: string;
  actionTab?: string;
  actionLabel?: string;
}

export interface HouseholdHealthReport {
  userId: string;
  calculatedAt: string;
  overallScore: number; // 0 to 100
  status: HealthStatusLevel;
  statusLabel: string;
  completenessScore: number; // 0 to 100
  isProvisional: boolean;
  categories: {
    home: CategoryHealthBreakdown;
    assets: CategoryHealthBreakdown;
    finances: CategoryHealthBreakdown;
    documents: CategoryHealthBreakdown;
  };
  topSignals: HouseholdHealthSignal[];
  recommendations: HouseholdHealthRecommendation[];
  aiExplanation?: HouseholdHealthAiExplanation | null;
  dataCompletenessDetails: {
    propertiesCount: number;
    roomsCount: number;
    assetsCount: number;
    warrantiesCount: number;
    maintenanceTasksCount: number;
    expensesCount: number;
    utilitiesCount: number;
    loansCount: number;
    creditCardsCount: number;
    documentsCount: number;
    transactionsCount: number;
  };
}



