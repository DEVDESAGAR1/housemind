# HouseMind Data Model & Firestore Architecture

This document specifies the data model schemas, relationships, constraints, and Firestore collections used in HouseMind.

---

## 1. Storage Topology & Namespacing

Every record is stored under a user-isolated namespace:
`/users/{userId}/{collectionName}/{documentId}`

```
/users/{userId}
   ├── profile                     (HouseholdProfile)
   ├── expenses/{expenseId}        (HouseholdExpense)
   ├── assets/{assetId}            (HomeAsset)
   ├── transactions/{txId}         (FinancialTransaction)
   ├── documents/{docId}           (HouseholdDocument)
   ├── insights/{insightId}        (HouseholdInsight)
   ├── scenarios/{scenarioId}      (Scenario)
   └── conversations/{convoId}     (CopilotConversation)
```

---

## 2. Core Entity Definitions

### 2.1 HouseholdProfile
```typescript
interface HouseholdProfile {
  userId: string;
  homeName: string;
  homeType: 'single_family' | 'apartment' | 'townhouse' | 'condo' | 'multi_family';
  yearBuilt: number;
  squareFootage: number;
  country: string;               // e.g. "United States", "Germany", "India"
  currency: string;              // ISO 4217 code, e.g. "USD", "EUR", "INR"
  currencyOverride?: boolean;    // When user explicitly decouples currency from country
  locale?: string;               // BCP 47 tag, e.g. "en-US", "de-DE", "en-IN"
  timezone?: string;             // IANA timezone identifier
  region?: string;               // State / Province / Region
  city?: string;
  primaryHeating: string;
  createdAt: string;             // ISO 8601
  updatedAt: string;
}
```

### 2.2 FinancialTransaction
```typescript
interface FinancialTransaction {
  id: string;
  userId: string;
  date: string;                  // YYYY-MM-DD
  type: 'CREDIT' | 'DEBIT' | 'TRANSFER';
  amount: number;
  currency: string;
  category: string;
  description: string;
  merchant?: string;
  account?: string;
  sourceDocumentId?: string;
  isConfirmed: boolean;
  isSalary?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 HouseholdExpense
```typescript
interface HouseholdExpense {
  id: string;
  userId: string;
  title: string;
  category: 'utilities' | 'maintenance' | 'insurance' | 'mortgage_rent' | 'services' | 'other';
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time';
  dueDate?: string;
  isAutoPay: boolean;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.4 HomeAsset
```typescript
interface HomeAsset {
  id: string;
  userId: string;
  name: string;
  category: 'hvac' | 'appliance' | 'plumbing' | 'electrical' | 'roofing' | 'structure' | 'other';
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  installDate?: string;
  warrantyExpiryDate?: string;
  expectedLifespanYears?: number;
  purchaseCost?: number;
  currentStatus: 'operational' | 'needs_maintenance' | 'critical' | 'replaced';
  roomLocation?: string;
  maintenanceNotes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.5 Scenario (What-If Simulation)
```typescript
interface Scenario {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: 'large_purchase' | 'debt_payoff' | 'income_change' | 'expense_reduction' | 'emergency_fund';
  inputs: ScenarioInput;
  baselineMetrics: ScenarioBaselineMetrics;
  projectedMetrics: ScenarioProjectedMetrics;
  affordability: AffordabilityIndicator;
  explanation?: ScenarioGeminiExplanation;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}
```
