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
  streetAddress?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  yearBuilt?: number;
  squareFootage?: number;
  occupantsCount?: number;
  primaryHeating?: string;
  primaryCooling?: string;
  notes?: string;
  timezone?: string;
  locale?: string;
  currency: string;
  currencyOverride?: boolean;
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
  propertyId?: string;
  assetId?: string;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export type KnownAssetCategory =
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
  | 'solar_energy'
  | 'power_backup'
  | 'water_system'
  | 'smart_home'
  | 'tools_equipment'
  | 'custom'
  | 'other';

export type AssetCategory = KnownAssetCategory | (string & {});

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

  // Phase 24.1 Universal Asset Intelligence extensions
  customCategory?: string;
  customType?: string;
  assetType?: string;
  serviceProvider?: string;
  serviceProviderContact?: string;
  warrantyIds?: string[];
  maintenanceTaskIds?: string[];
  documentIds?: string[];
  expenseIds?: string[];
  complianceStatus?: 'compliant' | 'review_required' | 'non_compliant' | 'exempt' | string;
  lifecycleStage?: 'new' | 'active' | 'aging' | 'end_of_life' | 'decommissioned' | string;
  tags?: string[];
  notes?: string;
  metadata?: Record<string, any>;
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
  completedDate?: string;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Phase 24.2: Universal Household Issues / Tickets
// ==========================================
export type HouseholdIssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export type HouseholdIssueStatus =
  | 'reported'
  | 'triaged'
  | 'scheduled'
  | 'in_progress'
  | 'waiting_parts'
  | 'resolved'
  | 'verified'
  | 'closed'
  | 'cancelled';

export interface HouseholdIssueAttachment {
  id: string;
  name: string;
  url?: string;
  fileType?: string;
  size?: number;
  uploadedAt?: string;
}

export interface HouseholdIssueActivityItem {
  id: string;
  timestamp: string;
  action: string;
  note?: string;
  previousStatus?: HouseholdIssueStatus;
  newStatus?: HouseholdIssueStatus;
  fromStatus?: HouseholdIssueStatus;
  toStatus?: HouseholdIssueStatus;
  userId: string;
}

export interface HouseholdIssue {
  id: string;
  userId: string;
  title: string;
  description?: string;
  assetId?: string;
  propertyId?: string;
  roomId?: string;
  category?: string;
  subcategory?: string;
  severity: HouseholdIssueSeverity;
  status: HouseholdIssueStatus;
  reportedAt: string;
  dueDate?: string;
  scheduledDate?: string;
  followUpDate?: string;
  resolvedAt?: string;
  verifiedAt?: string;
  closedAt?: string;
  notes?: string;
  attachments?: HouseholdIssueAttachment[];
  warrantyId?: string;
  maintenanceId?: string;
  documentIds?: string[];
  serviceProvider?: string;
  serviceProviderContact?: string;
  estimatedCost?: number;
  actualCost?: number;
  resolution?: string;
  rootCause?: string;
  safetyWarning?: string;
  resolutionChecklist?: ResolutionChecklistItem[];
  relatedIssueIds?: string[];
  isDemo?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  activityHistory?: HouseholdIssueActivityItem[];
}

// Phase 24.3: Issue Intelligence & Resolution Intelligence Types
export type WarrantyCoverageStatus =
  | 'covered'
  | 'possibly_covered'
  | 'expired'
  | 'no_warranty'
  | 'incomplete';

export interface ResolutionChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  autoDerived?: boolean;
}

export interface PossibleRelatedIssue {
  id: string;
  title: string;
  reportedAt: string;
  status: HouseholdIssueStatus;
  severity: HouseholdIssueSeverity;
  assetName?: string;
  assetId?: string;
  roomId?: string;
  relationType: 'same_asset' | 'same_room' | 'same_category' | 'repeat_failure' | 'symptom_match';
  relationReason: string;
  similarityScore: number;
  isLinked?: boolean;
}

export interface RecurringFailureSignal {
  isRecurring: boolean;
  repeatedIssueCount: number;
  recurrenceWindowMonths: number;
  firstReportedDate?: string;
  lastReportedDate?: string;
  summary: string;
  previousResolutions?: Array<{ issueId: string; date: string; resolution?: string; cost?: number }>;
  insufficientData: boolean;
}

export interface IssueWarrantyIntelligence {
  status: WarrantyCoverageStatus;
  statusLabel: string;
  warrantyId?: string;
  provider?: string;
  policyNumber?: string;
  startDate?: string;
  endDate?: string;
  isExpired: boolean;
  daysUntilExpiration?: number;
  documentId?: string;
  documentName?: string;
  coverageNotes?: string;
  explanation: string;
}

export interface IssueMaintenanceIntelligence {
  recentMaintenance?: Array<{ id: string; title: string; completedDate?: string; serviceProvider?: string }>;
  upcomingMaintenance?: Array<{ id: string; title: string; dueDate?: string; priority?: string }>;
  overdueMaintenance?: Array<{ id: string; title: string; dueDate?: string }>;
  preventiveOpportunity?: string;
  associatedMaintenanceId?: string;
}

export interface RecommendedNextStep {
  id: string;
  order: number;
  title: string;
  actionType: 'safety' | 'warranty' | 'maintenance' | 'provider' | 'document' | 'verification' | 'general';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  guidance: string;
  actionableTab?: string;
}

export interface StructuredResolutionSummary {
  whatHappened: string;
  affectedAssetAndLocation: string;
  rootCause?: string;
  actionTaken: string;
  costSummary?: { estimated?: number; actual?: number; currency?: string };
  warrantyInvolvement: string;
  maintenanceImplications: string;
  supportingDocuments: Array<{ id: string; name: string }>;
  resolutionDate?: string;
  verificationState: string;
  recommendedPrevention: string;
  aiGeneratedNotes?: string;
}

export interface IssueIntelligenceReport {
  issueId: string;
  title: string;
  severity: HouseholdIssueSeverity;
  status: HouseholdIssueStatus;
  ageInDays: number;
  isOverdue: boolean;
  isAging: boolean;
  whyItMatters: string;
  safetyClassification: {
    isSafetyRisk: boolean;
    hazardType?: string;
    safetyWarning?: string;
    escalationAdvice?: string;
  };
  linkedAsset?: { id: string; name: string; brand?: string; model?: string; category?: string };
  linkedProperty?: { id: string; name: string };
  linkedRoom?: { id: string; name: string };
  relatedIssues: PossibleRelatedIssue[];
  recurringSignal: RecurringFailureSignal;
  warrantyIntelligence: IssueWarrantyIntelligence;
  maintenanceIntelligence: IssueMaintenanceIntelligence;
  recommendedNextSteps: RecommendedNextStep[];
  checklist: ResolutionChecklistItem[];
  resolutionSummary?: StructuredResolutionSummary;
  generatedAt: string;
}

export interface HouseholdIssueCandidate {
  title: string;
  description?: string;
  assetName?: string;
  assetId?: string;
  category?: string;
  subcategory?: string;
  propertyId?: string;
  roomId?: string;
  severity: HouseholdIssueSeverity;
  safetyWarning?: string;
  suggestedProvider?: string;
  estimatedCost?: number;
}

export interface NaturalLanguageIssueExtractionResult {
  candidateAssets: Array<{
    name: string;
    category?: string;
    brand?: string;
    existingAssetId?: string;
    isNewAsset: boolean;
  }>;
  candidateIssues: HouseholdIssueCandidate[];
  safetyWarnings: string[];
  confidence: number;
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
  | 'issue'
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
      type: 'bill_due' | 'maintenance_due' | 'overdue_payment' | 'warranty_expiring' | 'issue_attention';
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

export interface ChatStructuredData {
  type: 'warranties' | 'financial' | 'health' | 'morning_brief' | 'maintenance';
  title?: string;
  data: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedQuestions?: string[];
  actionProposal?: AgentActionProposal;
  actionExecution?: AgentActionExecutionResult;
  morningBrief?: HouseholdMorningBrief;
  structuredData?: ChatStructuredData;
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

export type HouseholdAgentIntent =
  | 'GREETING'
  | 'MORNING_BRIEF'
  | 'HOUSEHOLD_HEALTH'
  | 'NEEDS_ATTENTION'
  | 'MAINTENANCE_WARRANTIES'
  | 'FINANCES_BILLS_DEBTS'
  | 'DOCUMENTS_VAULT'
  | 'CALENDAR_SCHEDULE'
  | 'NOTIFICATIONS_ALERTS'
  | 'COMPREHENSIVE_DIAGNOSTIC';

export interface AgentPriorityItem {
  id?: string;
  title: string;
  category: 'maintenance' | 'utility' | 'loan' | 'card' | 'asset' | 'warranty' | 'general';
  urgency: 'urgent' | 'soon' | 'optimal';
  reason: string;
  actionTab?: string;
  dueDate?: string;
  amount?: number;
}

export type MorningBriefUrgency =
  | 'critical'
  | 'overdue'
  | 'due_today'
  | 'warning'
  | 'due_soon'
  | 'nominal';

export interface MorningBriefItem {
  id: string;
  title: string;
  category:
    | 'maintenance'
    | 'utility'
    | 'loan'
    | 'card'
    | 'expense'
    | 'warranty'
    | 'document'
    | 'alert'
    | 'general';
  urgency: MorningBriefUrgency;
  reason: string;
  dueDate?: string;
  amount?: number;
  currency?: string;
  actionTab?: string;
  actionLabel?: string;
}

export interface MorningBriefRecommendedAction {
  title: string;
  category: string;
  urgency: MorningBriefUrgency;
  reason: string;
  actionTab: string;
  actionLabel: string;
}

export interface MorningBriefFinancialObligation {
  title: string;
  amount: number;
  dueDate?: string;
  type: string;
  status?: string;
}

export interface MorningBriefMaintenanceConcern {
  title: string;
  urgency: MorningBriefUrgency;
  dueDate?: string;
  cost?: number;
}

export interface MorningBriefWarrantyConcern {
  title: string;
  type: 'warranty' | 'document';
  dateOrStatus: string;
}

export interface HouseholdMorningBrief {
  generatedAt: string;
  homeName: string;
  statusHeadline: string;
  overallStatus: 'nominal' | 'attention_required' | 'critical' | 'setup_required';
  healthScore?: number;
  healthLabel?: string;
  isProvisional: boolean;
  completenessScore: number;
  itemsNeedingAttention: MorningBriefItem[];
  itemsToWatch: MorningBriefItem[];
  financialObligationsSummary: {
    monthlyBurnRate: number;
    upcomingTotalDueNext7Days: number;
    currency: string;
    keyObligations: MorningBriefFinancialObligation[];
  };
  maintenanceAssetConcerns: {
    overdueTasksCount: number;
    upcomingTasksCount: number;
    concerns: MorningBriefMaintenanceConcern[];
  };
  documentWarrantyConcerns: {
    expiringWarrantiesCount: number;
    pendingReviewDocsCount: number;
    concerns: MorningBriefWarrantyConcern[];
  };
  recommendedFirstAction: MorningBriefRecommendedAction | null;
  synthesizedNarrative: string;
  groundedFacts: {
    totalAssetsCount: number;
    activeWarrantiesCount: number;
    totalMonthlyBurnRate: number;
    totalOutstandingDebt: number;
    currency: string;
  };
  agentAudit?: AgentAuditMetadata;
}

export type AgentActionCategory =
  | 'READ'
  | 'RECOMMEND'
  | 'NAVIGATE'
  | 'SAFE_ACTION'
  | 'WRITE'
  | 'DELETE'
  | 'PAYMENT'
  | 'TRANSFER'
  | 'AUTH'
  | 'SECURITY'
  | 'PERMISSION';

export type AgentActionType =
  | 'markNotificationRead'
  | 'markAllNotificationsRead'
  | 'completeMaintenanceTask'
  | 'dismissInsight'
  | 'navigateTab';

export type AgentActionRiskLevel = 'low' | 'medium' | 'high';

export type AgentActionStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed'
  | 'denied'
  | 'cancelled';

export interface AgentActionProposal {
  actionId: string;
  actionType: AgentActionType;
  title: string;
  description: string;
  targetEntityId?: string;
  targetEntityType?: string;
  targetEntityName?: string;
  parameters?: Record<string, any>;
  riskLevel: AgentActionRiskLevel;
  expectedOutcome: string;
  status: AgentActionStatus;
  createdAt: string;
  expiresAt: string;
}

export interface AgentActionExecutionResult {
  actionId: string;
  actionType: AgentActionType;
  status: 'executed' | 'failed' | 'denied' | 'cancelled';
  success: boolean;
  message: string;
  executedAt: string;
  postState?: Record<string, any>;
  verification: {
    verified: boolean;
    verifiedAt?: string;
    checkedCondition: string;
    postState?: Record<string, any>;
  };
  audit?: AgentToolAuditRecord;
  auditRecord?: AgentToolAuditRecord;
}

export type AgentToolName =
  | 'getHouseholdHealth'
  | 'getUpcomingObligations'
  | 'getOverdueMaintenance'
  | 'getFinancialSummary'
  | 'getExpiringWarrantiesAndDocuments'
  | 'getRecentNotifications';

export interface AgentToolAuditRecord {
  toolName: string;
  category: AgentActionCategory;
  status: 'success' | 'denied' | 'error';
  executionTimeMs: number;
  denialReason?: string;
  paramsSummary?: Record<string, string | number | boolean>;
}

export interface AgentAuditMetadata {
  intent: HouseholdAgentIntent | string;
  toolsInvoked: AgentToolAuditRecord[];
  authenticatedTenant: string;
  timestamp: string;
}

export interface CopilotChatResponse {
  conversationId: string;
  reply: string;
  suggestedQuestions: string[];
  groundedSummary: {
    profileLoaded: boolean;
    expensesCount: number;
    assetsCount: number;
    healthScore?: number;
    intent?: HouseholdAgentIntent | string;
    domainsConsulted?: string[];
  };
  agentActionPlan?: {
    intent: HouseholdAgentIntent | string;
    priorityItems?: AgentPriorityItem[];
    reasoningBrief?: string;
  };
  agentAudit?: AgentAuditMetadata;
  morningBrief?: HouseholdMorningBrief;
  actionProposal?: AgentActionProposal;
  actionExecution?: AgentActionExecutionResult;
}

export type AgentActivityEventType =
  | 'DETECTED'
  | 'INVESTIGATED'
  | 'RECOMMENDED'
  | 'ACTION_PROPOSED'
  | 'APPROVAL_REQUESTED'
  | 'ACTION_APPROVED'
  | 'ACTION_CANCELLED'
  | 'ACTION_EXECUTED'
  | 'VERIFICATION_PASSED'
  | 'VERIFICATION_FAILED'
  | 'ACTION_DENIED';

export type AgentActivityStatus = 'info' | 'pending' | 'success' | 'warning' | 'error' | 'cancelled';

export interface AgentActivityItem {
  id: string;
  userId: string;
  timestamp: string;
  eventType: AgentActivityEventType;
  title: string;
  description: string;
  actionType?: AgentActionType;
  actionId?: string;
  targetDomain?: string;
  targetEntityId?: string;
  targetEntityName?: string;
  status: AgentActivityStatus;
  verification?: {
    verified: boolean;
    checkedCondition?: string;
  };
  metadata?: Record<string, any>;
}

export interface AgentActivityTimelineResponse {
  total: number;
  limit: number;
  offset: number;
  activities: AgentActivityItem[];
}

export type HouseholdMemoryCategory =
  | 'preference'
  | 'asset'
  | 'maintenance'
  | 'notification'
  | 'fact';

export interface HouseholdMemoryItem {
  id: string;
  userId: string;
  category: HouseholdMemoryCategory;
  key: string;
  value: string | Record<string, any>;
  source: 'user_explicit' | 'app_preference' | 'confirmed_suggestion';
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMemoriesResponse {
  total: number;
  memories: HouseholdMemoryItem[];
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
  propertyId?: string;
  assetId?: string;
  uploadedAt?: string;
  isDemo?: boolean;
  sourceMetadata?: ImportedSourceMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface AssetRelationships {
  asset: HomeAsset;
  property?: Property | null;
  room?: Room | null;
  issues: HouseholdIssue[];
  warranties: Warranty[];
  maintenances: MaintenanceTask[];
  expenses: HouseholdExpense[];
  documents: HouseholdDocument[];
  calendarEvents: HouseholdCalendarEvent[];
  notifications: HouseholdNotification[];
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

export interface GlobalSearchResultItem {
  id: string;
  entityType:
    | 'property'
    | 'room'
    | 'asset'
    | 'maintenance'
    | 'warranty'
    | 'utility'
    | 'expense'
    | 'transaction'
    | 'loan'
    | 'credit_card'
    | 'document';
  category: 'properties' | 'assets' | 'maintenance' | 'warranties' | 'utilities' | 'finances' | 'documents';
  title: string;
  subtitle: string;
  badge: string;
  targetTab: string;
  targetSubTab?: string;
  targetId: string;
  score: number;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface GlobalSearchCategory {
  key: string;
  label: string;
  count: number;
}

export interface GlobalSearchResponse {
  query: string;
  totalMatches: number;
  categoryFilter?: string;
  categories: GlobalSearchCategory[];
  groupedResults: Record<string, GlobalSearchResultItem[]>;
  results: GlobalSearchResultItem[];
}

// ==========================================
// Phase 6: Household Calendar & Notifications
// ==========================================

export type HouseholdCalendarEventType =
  | 'utility'
  | 'expense'
  | 'loan'
  | 'credit_card'
  | 'maintenance'
  | 'warranty'
  | 'document';

export type HouseholdCalendarEventStatus =
  | 'overdue'
  | 'due_today'
  | 'due_soon'
  | 'upcoming'
  | 'completed'
  | 'paid'
  | 'normal';

export type HouseholdCalendarEventPriority = 'critical' | 'important' | 'upcoming' | 'normal';

export interface HouseholdCalendarEvent {
  id: string;
  eventType: HouseholdCalendarEventType;
  title: string;
  subtitle: string;
  date: string; // YYYY-MM-DD
  endDate?: string;
  amount?: number;
  currency?: string;
  status: HouseholdCalendarEventStatus;
  priority: HouseholdCalendarEventPriority;
  sourceEntityType: string;
  sourceId: string;
  targetTab: string;
  targetSubTab?: string;
  isCompleted: boolean;
  isPaid: boolean;
  isAutoPay?: boolean;
  daysDiff: number;
  formattedDate: string;
  metadata?: Record<string, any>;
}

export interface HouseholdCalendarResponse {
  startDate: string;
  endDate: string;
  totalCount: number;
  events: HouseholdCalendarEvent[];
  countsByCategory: Record<string, number>;
  countsByStatus: {
    overdue: number;
    due_today: number;
    due_soon: number;
    upcoming: number;
    completed: number;
  };
}

export type HouseholdNotificationCategory =
  | 'bills_payments'
  | 'maintenance'
  | 'warranties'
  | 'documents'
  | 'alerts'
  | 'agent';

export type HouseholdNotificationPriority = 'critical' | 'important' | 'upcoming';

export interface HouseholdNotification {
  id: string;
  userId: string;
  category: HouseholdNotificationCategory;
  priority: HouseholdNotificationPriority;
  title: string;
  message: string;
  dueDate?: string;
  sourceEntityType: string;
  sourceId: string;
  targetTab: string;
  targetSubTab?: string;
  actionLabel?: string;
  isRead: boolean;
  readAt?: string;
  isDismissed?: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  userId: string;
  categories: {
    billsPayments: boolean;
    maintenance: boolean;
    warranties: boolean;
    documents: boolean;
    householdAlerts: boolean;
  };
  advanceNoticeDays: {
    bills: number;
    maintenance: number;
    warranties: number;
    documents: number;
  };
  channels: {
    inApp: boolean;
    email: boolean;
  };
  emailAddress?: string;
  updatedAt: string;
}

export interface HouseholdNotificationsResponse {
  totalCount: number;
  unreadCount: number;
  notifications: HouseholdNotification[];
  categoriesCount: Record<string, number>;
  preferences: NotificationPreferences;
}
