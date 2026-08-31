# HouseMind Architecture & Technical Specification

HouseMind is an intelligent household financial and property management platform that combines deterministic financial mathematics with grounded generative AI.

---

## 1. System Overview

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT (SPA)                                     |
|  React 18 + TypeScript + Tailwind CSS + Lucide Icons + Motion + Recharts + D3     |
|                                                                                   |
|  [ Dashboard ]  [ Financials ]  [ Documents ]  [ Expenses ]  [ Assets ]  [ What-If ]
+-----------------------------------------------------------------------------------+
                                         |
                                         | HTTPS (JSON / Multipart)
                                         v
+-----------------------------------------------------------------------------------+
|                             EXPRESS BACKEND (Node.js)                             |
|                                                                                   |
|  [ Security Layer: Helmet CSP + CORS + Tiered Rate Limiters + Safe Logger ]       |
|  [ Auth Layer: Firebase ID Token Verification + Multi-Tenant Scoping ]            |
|  [ Validation Layer: Zod Runtime Schema Parsers ]                                 |
|                                                                                   |
|  Routes:                                                                          |
|  • /api/household      • /api/transactions    • /api/documents   • /api/imports   |
|  • /api/scenarios      • /api/intelligence    • /api/copilot     • /api/health    |
+-----------------------------------------------------------------------------------+
                   |                                        |
                   | REST API (Safe URL Builder)            | SDK (@google/genai)
                   v                                        v
+-------------------------------------+   +-----------------------------------------+
|        GOOGLE CLOUD FIRESTORE       |   |             GEMINI 2.5 FLASH            |
|  Strict User Isolation Subtrees     |   |  • Document Candidate Extraction        |
|  /users/{userId}/...                |   |  • What-If Scenario Explanations        |
|  Fallback to Isolated Store         |   |  • Contextual Household Copilot         |
+-------------------------------------+   +-----------------------------------------+
```

---

## 2. Core Modules & Responsibilities

### 2.1 Financial Intelligence & Ledger (`server/routes/transactions.ts`, `server/services/transactionService.ts`)
- **Ledger Engine**: Computes cash flow, net surplus, category breakdown, account balances, and savings rates deterministically.
- **Deduplication Engine**: Uses canonical fingerprinting combining date, normalized merchant/description, amount, and account ID to detect duplicate transaction candidates across uploads.

### 2.2 Document Processing & Confirmation Queue (`server/routes/documents.ts`, `server/services/documentParserService.ts`)
- **Multi-Format Extraction**: Parses PDF, CSV, TXT, and images.
- **Mandatory Review Flow**: Extracted candidates enter a `pending_review` staging state. Transactions are only committed to the ledger after explicit user confirmation or category overrides.
- **Deterministic CSV Engine**: Provides fast, zero-quota parsing for structured bank statement CSVs.

### 2.3 What-If Financial Simulator (`server/routes/scenarios.ts`, `server/services/scenarioEngine.ts`)
- **Simulation Types**: Major Purchase / Loan, Salary Change, Inflation Adjustment, Property Expense, Lifestyle Shift, Emergency Expense.
- **Projection Engine**: Computes debt amortization, monthly payment impact, revised savings rate, financial pressure scores (0-100), and affordability classifications without modifying baseline household records.
- **Comparison Matrix**: Evaluates up to 5 scenarios side-by-side to highlight optimal financial paths.

### 2.4 Household Copilot & Proactive Insights (`server/routes/copilot.ts`, `server/routes/intelligence.ts`)
- **Context Grounding**: Injects verified profile, location, currency, assets, and recurring expenses into AI prompts.
- **Zero-Quota Fallback**: Gracefully generates deterministic, data-grounded insights if Gemini API limits are reached.

---

## 3. Data Model & Firestore Hierarchy

```
/users/{userId}
   ├── profile/current                 (HouseholdProfile: location, currency, property details)
   ├── expenses/{expenseId}            (HouseholdExpense: utilities, maintenance, insurance)
   ├── assets/{assetId}                (HomeAsset: appliances, HVAC, roofs, vehicles)
   ├── transactions/{transactionId}    (FinancialTransaction: income, expense, transfers)
   ├── documents/{documentId}          (HouseholdDocument: uploaded statements, candidate cache)
   ├── scenarios/{scenarioId}          (Scenario: What-If simulation parameters & projections)
   ├── insights/{insightId}            (HouseholdInsight: proactive savings & risk alerts)
   └── conversations/{conversationId}  (CopilotConversation: multi-turn dialogue history)
```

---

## 4. Testing & Verification Architecture

The backend test suite (`tests/index.ts`) exercises 81 automated tests across all domain areas:
- Authentication, Token Invalidation, and IDOR Isolation.
- Ledger deduplication and mathematical consistency.
- Document upload, candidate staging, and confirmation.
- Scenario simulation, amortization, and multi-tenant isolation.
- SSRF prevention and security header attachment.
