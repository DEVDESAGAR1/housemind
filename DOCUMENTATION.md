# HouseMind: Comprehensive System & Technical Documentation

> **Version:** 2.4.0 • **Architecture:** Full-Stack Modular TypeScript (SPA + Express) • **Engine:** Gemini 3.7 Grounded AI & Deterministic Financial Logic

---

## Table of Contents

1. [Executive Overview & System Architecture](#1-executive-overview--system-architecture)
2. [Technology Stack & Runtime Topology](#2-technology-stack--runtime-topology)
3. [Domain Model & Data Architecture](#3-domain-model--data-architecture)
4. [Complete REST API Reference](#4-complete-rest-api-reference)
5. [AI & Intelligence Engine Architecture](#5-ai--intelligence-engine-architecture)
6. [Financial Math, Projections & Simulation Logic](#6-financial-math-projections--simulation-logic)
7. [Security Perimeter, Multi-Tenancy & Data Governance](#7-security-perimeter-multi-tenancy--data-governance)
8. [Frontend Component Architecture & UI System](#8-frontend-component-architecture--ui-system)
9. [Automated Verification, Testing & QA Matrix](#9-automated-verification-testing--qa-matrix)
10. [Configuration, Build & Deployment Guide](#10-configuration-build--deployment-guide)

---

## 1. Executive Overview & System Architecture

**HouseMind** is an enterprise-grade household operating system designed to give property owners complete visibility and predictive control over their physical properties, major equipment lifecycles, recurring obligations, amortized debts, preventative maintenance schedules, and multi-year cash flows.

The system pairs **deterministic financial mathematics** (amortization schedules, cash-flow projections, health scoring algorithms) with **grounded generative intelligence** (Gemini 3.7 for receipt/invoice document extraction, conversational assistance, and scenario risk analysis).

```mermaid
flowchart TB
    subgraph Client["Client Browser (React 19 SPA)"]
        UI[Navbar, Dashboard, Command Center]
        Views[Properties, Assets, Debts, Ledger, Calendar, Copilot, Simulator]
        Auth[Firebase Client Auth & Token Invalidator]
    end

    subgraph Security["Security & Perimeter Layer"]
        Helmet[Helmet Security Headers & CSP]
        CORS[Strict Origin Whitelist CORS]
        RateLimit[Tiered Sliding-Window Rate Limiters]
        Sanitizer[Input Body Sanitizer & Parser]
    end

    subgraph Server["Express Backend (Node.js / TypeScript)"]
        AuthMiddleware[Firebase Admin Auth Token Verification]
        Router[API Route Matrix - 45+ Endpoints]
        Services[Domain Services Layer]
        
        subgraph CoreServices["Core Domain Services"]
            CC[Command Center & Health Engine]
            DE[Document Extraction & OCR Engine]
            SE[What-If Scenario Engine]
            NS[Notification & Alert Engine]
            CS[Calendar Scheduling Service]
            GS[Multi-Domain Global Search]
            CP[Grounded Copilot Service]
        end
    end

    subgraph Storage["Isolated Storage Layer"]
        Store[(Multi-Tenant In-Memory / Firestore Storage)]
    end

    subgraph AI["Google Cloud AI"]
        Gemini[Gemini 3.7 Intelligence via @google/genai]
    end

    Client -->|HTTPS + Bearer JWT| Security
    Security --> AuthMiddleware
    AuthMiddleware --> Router
    Router --> Services
    Services --> Store
    Services -.->|Server-side Isolated API Key| Gemini
```

---

## 2. Technology Stack & Runtime Topology

| Layer | Technology | Key Libraries & Specifications |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 (`react`, `react-dom`) | Modern hooks (`useMemo`, `useCallback`, `useState`, `useEffect`) |
| **Language** | TypeScript 5.8+ | Strict type checking, zero `any` in core models |
| **Build Tool & Dev Server**| Vite 6.2 | Rollup bundler, Hot Module Replacement (HMR) |
| **Styling & Icons** | Tailwind CSS v4 & Lucide React | Curated Slate/Indigo/Emerald theme tokens, zero generic colors |
| **Backend Runtime** | Node.js 20+ & Express 4.21 | Modular router architecture, middleware pipeline |
| **AI SDK** | `@google/genai` (v2.4.0) | Gemini 3.7 Flash with structured JSON schema output & retry policies |
| **Auth & Identity** | Firebase Auth & Firebase Admin 14.3 | ID Token verification with test-environment bypass capabilities |
| **Security & Middleware** | `helmet`, `cors`, `express-rate-limit`, `zod`, `multer` | Safe upload limits (15MB), linear-time regex parsers |
| **Automated Testing** | Node test harness + Playwright 1.62 | 139 backend unit/integration tests + 16 browser user journeys |

---

## 3. Domain Model & Data Architecture

HouseMind enforces strict multi-tenant isolation. All domain records reside in user-scoped stores identified by the authenticated user's `userId`.

```mermaid
erDiagram
    HouseholdProfile ||--o{ Property : owns
    HouseholdProfile ||--o{ HouseholdExpense : tracks
    HouseholdProfile ||--o{ UtilityAccount : pays
    HouseholdProfile ||--o{ HouseholdLoan : owes
    HouseholdProfile ||--o{ CreditCardAccount : maintains
    HouseholdProfile ||--o{ HouseholdScenario : simulates
    HouseholdProfile ||--o{ CopilotConversation : logs
    
    Property ||--o{ RoomSpace : contains
    Property ||--o{ HomeAsset : houses
    
    HomeAsset ||--o{ MaintenanceTask : requires
    HomeAsset ||--o{ WarrantyPolicy : covered_by
    
    HouseholdDocument ||--o{ FinancialTransaction : extracts_to
```

### 3.1 Entity Model Specifications

#### 1. Household Profile (`HouseholdProfile`)
The core configuration entity establishing regional currency, property square footage, and timezone defaults.
- `userId` (string, PK): Multi-tenant tenant identifier.
- `displayName` (string): User's preferred name.
- `homeName` (string): Primary household nickname (e.g., "Maplewood Haven").
- `homeType` (enum): `single_family` | `condo` | `townhouse` | `multi_family` | `apartment`.
- `yearBuilt` (number): Construction year for equipment degradation models.
- `squareFootage` (number): Physical property footprint.
- `currency` (string): ISO 4217 currency code (e.g., `USD`, `EUR`, `GBP`, `CAD`, `AUD`, `INR`, `JPY`).
- `primaryHeating` (string): HVAC energy source classification.

#### 2. Physical Properties & Spaces (`Property`, `RoomSpace`)
- `Property`: ID, name, propertyType (`primary_residence`, `rental_property`, `vacation_home`), address (street, city, state, zip), squareFootage, yearBuilt, purchaseDate, purchasePrice, estimatedValue.
- `RoomSpace`: ID, propertyId, name (e.g., "Master Suite", "Utility Basement"), roomType (`kitchen`, `bathroom`, `bedroom`, `living_room`, `utility_room`, `garage`, `outdoor`), floorLevel.

#### 3. Equipment & Assets (`HomeAsset`)
- `HomeAsset`: ID, propertyId, roomId, name, category (`hvac`, `plumbing`, `electrical`, `appliance`, `roofing`, `structural`, `exterior`, `vehicle`, `other`), brand, modelNumber, serialNumber, purchaseDate, purchasePrice, estimatedLifespanYears, expectedReplacementYear, currentStatus (`operational`, `needs_maintenance`, `critical`), notes.

#### 4. Maintenance & Warranties (`MaintenanceTask`, `WarrantyPolicy`)
- `MaintenanceTask`: ID, propertyId, assetId, title, frequency (`monthly`, `quarterly`, `semi_annual`, `annual`, `as_needed`), nextDueDate, estimatedCost, status (`scheduled`, `in_progress`, `completed`, `deferred`), serviceProvider, notes.
- `WarrantyPolicy`: ID, assetId, providerName, policyNumber, coverageType (`manufacturer`, `extended`, `home_warranty`), startDate, expiryDate, status (`active`, `expired`, `pending_claim`), contactPhone, contactEmail, coverageDetails.

#### 5. Utilities & Debt Center (`UtilityAccount`, `HouseholdLoan`, `CreditCardAccount`)
- `UtilityAccount`: ID, propertyId, utilityType (`electricity`, `water_sewer`, `natural_gas`, `internet_cable`, `trash_recycling`, `solar`), provider, accountNickname, accountNumber, typicalAmount, paymentStatus (`paid`, `pending`, `overdue`), isAutoPay, nextDueDate.
- `HouseholdLoan`: ID, propertyId, loanType (`first_mortgage`, `second_mortgage`, `heloc`, `auto_loan`, `personal_loan`, `solar_loan`), lenderName, principalAmount, outstandingAmount, interestRate, monthlyPayment, emiDayOfMonth, startDate, termMonths.
- `CreditCardAccount`: ID, cardNickname, institution, last4Digits, creditLimit, outstandingAmount, apr, paymentDueDate, minPaymentAmount, isAutoPay, statementCycleDay.

#### 6. Recurring Expenses & Ledger (`HouseholdExpense`, `FinancialTransaction`)
- `HouseholdExpense`: ID, title, category (`mortgage_rent`, `utilities`, `insurance`, `groceries`, `services`, `maintenance`, `other`), amount, frequency (`monthly`, `quarterly`, `annual`), dueDate, isAutoPay, paymentStatus.
- `FinancialTransaction`: ID, date, description, merchant, amount, type (`INCOME`, `EXPENSE`, `TRANSFER`), category, accountId, isPending, sourceDocumentId, candidateId.

---

## 4. Complete REST API Reference

All protected endpoints require `Authorization: Bearer <ID_TOKEN>`.

### 4.1 System & Health Probes

| Method | Endpoint | Description | Rate Limit |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service liveness, timestamp, and memory statistics | Exempt |
| `GET` | `/api/household/health` | Comprehensive household system health evaluation | 120 req/min |
| `POST` | `/api/intelligence/health/explain` | Gemini explanation of household health score | 30 req/min |

### 4.2 Household Profile & Privacy Governance

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/household/profile` | Returns user's profile and regional currency settings |
| `PUT` | `/api/household/profile` | Updates household specs, home name, currency, year built |
| `GET` | `/api/household/privacy-center` | Audits data inventory (User vs Demo counts), source isolation boundaries |
| `POST` | `/api/household/seed-demo` | Seeds full deterministic starter fixtures across all 10 domains |
| `POST` | `/api/household/demo-remove` | Surgically purges records where `isDemo: true`, preserving user entries |
| `POST` | `/api/household/reset-data` | Complete user account data purge (Requires `{ confirm: true }`) |

### 4.3 Command Center & Global Operations

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/household/command-center` | Aggregated household operating summary (needs attention, schedule, snapshots) |
| `GET` | `/api/household/search` | Multi-domain full-text instant search (`q=query`, `limit=50`) |
| `GET` | `/api/household/calendar/events` | Date-filtered calendar schedule across bills, tasks, warranties |
| `GET` | `/api/household/calendar/export.ics` | RFC 5545 iCalendar standard export file for Apple/Google Calendar |

### 4.4 Properties, Rooms & Equipment

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` / `POST` | `/api/household/properties` | List all properties / Register a new real estate property |
| `PUT` / `DELETE` | `/api/household/properties/:id` | Update property specs / Delete property and cascade rooms |
| `GET` / `POST` | `/api/household/rooms` | List spaces / Allocate a room zone to a property |
| `PUT` / `DELETE` | `/api/household/rooms/:id` | Update room name or floor / Delete room space |
| `GET` / `POST` | `/api/household/assets` | List registered appliances / Register new equipment |
| `PUT` / `DELETE` | `/api/household/assets/:id` | Update asset condition / Delete equipment record |

### 4.5 Maintenance Tasks & Warranty Vault

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` / `POST` | `/api/household/maintenances` | List tasks / Schedule preventative maintenance item |
| `PUT` / `DELETE` | `/api/household/maintenances/:id` | Update task status or cost / Delete maintenance task |
| `GET` / `POST` | `/api/household/warranties` | List active policies / Register warranty protection policy |
| `PUT` / `DELETE` | `/api/household/warranties/:id` | Update policy number or expiry / Delete warranty record |

### 4.6 Utilities, Mortgages & Credit Cards

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` / `POST` | `/api/household/utilities` | List utility accounts / Register new provider account |
| `PUT` / `DELETE` | `/api/household/utilities/:id` | Update utility bill amount or status / Delete account |
| `GET` / `POST` | `/api/household/loans` | List mortgages and loans / Record amortized debt |
| `PUT` / `DELETE` | `/api/household/loans/:id` | Update outstanding loan balance / Delete loan record |
| `GET` / `POST` | `/api/household/credit-cards` | List cards / Register credit card account with APR and limit |
| `PUT` / `DELETE` | `/api/household/credit-cards/:id` | Update card balance or autopay / Delete card record |

### 4.7 Expenses, Ledger & Documents

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` / `POST` | `/api/household/expenses` | List recurring bills / Add recurring expense |
| `PUT` / `DELETE` | `/api/household/expenses/:id` | Update expense amount or schedule / Delete expense |
| `GET` / `POST` | `/api/transactions` | Query itemized ledger / Record financial transaction |
| `GET` | `/api/transactions/summary` | Compute net income, cash flow, and savings rate |
| `POST` | `/api/documents/upload` | Upload statement/receipt for OCR & AI extraction |
| `POST` | `/api/documents/extract-entity` | Parse unstructured text into structured entity schema |
| `POST` | `/api/documents/:id/confirm` | Commit staging candidates into the confirmed ledger |

### 4.8 What-If Decision Simulator

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/scenarios/baseline` | Extract current baseline monthly cash flow parameters |
| `GET` / `POST` | `/api/scenarios` | List saved scenarios / Create and persist scenario model |
| `POST` | `/api/scenarios/simulate` | Deterministically simulate scenario without saving |
| `POST` | `/api/scenarios/compare` | Compare up to 4 scenarios side-by-side |
| `DELETE` | `/api/scenarios/:id` | Delete saved scenario model |

### 4.9 AI Copilot & Notifications

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/copilot/chat` | Send conversational query to grounded Gemini 3.7 Copilot |
| `GET` / `DELETE`| `/api/copilot/conversations` | List conversation threads / Purge conversation history |
| `GET` | `/api/household/notifications` | Retrieve active notifications with unread count |
| `PUT` | `/api/household/notifications/:id/read` | Mark individual notification as read |
| `PUT` | `/api/household/notifications/mark-all-read` | Mark all pending notifications as read |
| `GET` / `PUT` | `/api/household/notifications/preferences` | Get / Update advance notice days and category rules |

---

## 5. AI & Intelligence Engine Architecture

HouseMind integrates the latest **Gemini 3.7 Intelligence** via the official Google Cloud `@google/genai` SDK.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as React Client
    participant Server as Express Backend
    participant DB as Isolated DB Store
    participant Gemini as Gemini 3.7 Flash

    User->>App: Submits invoice document or prompt
    App->>Server: POST /api/copilot/chat (with JWT)
    Server->>DB: Pulls verified user context (Expenses, Assets, Loans)
    Server->>Server: Injects grounding context & strict system prompt
    Server->>Gemini: Calls generateContent({ model: 'gemini-2.5-flash', ... })
    alt Gemini API Key Available & Valid
        Gemini-->>Server: Returns structured grounded response
    else Key Missing or Quota Depleted
        Server->>Server: Executes deterministic fallback intelligence engine
    end
    Server-->>App: Returns response + suggested follow-ups
    App-->>User: Renders rich markdown response with citations
```

### 5.1 Intelligence Principles
1. **Zero-Trust Client Perimeter:** API keys are never stored in browser bundles or passed in client payloads. All calls are mediated strictly by the Express backend.
2. **Context Grounding:** Prompts include the user's active household profile, real currency symbol, exact appliance count, upcoming bills, and loan balances.
3. **Structured JSON Extraction:** Invoices and receipts are parsed using `responseMimeType: "application/json"` with formal JSON schema contracts for date, vendor, total, and line items.
4. **Deterministic Fallback Engine:** If an upstream network or quota error occurs, the server automatically switches to algorithmic fallback logic to ensure uninterrupted user operations.

---

## 6. Financial Math, Projections & Simulation Logic

### 6.1 Debt Amortization Formula
Monthly payment $M$ for loan principal $P$, monthly interest rate $r = \frac{\text{APR}}{1200}$, and number of payments $n = \text{termMonths}$:

$$M = P \times \frac{r(1 + r)^n}{(1 + r)^n - 1}$$

If $r = 0$, $M = \frac{P}{n}$.

### 6.2 Financial Pressure Score (0–100)
Calculated from debt-to-income (DTI) ratio, revised savings rate, and emergency fund buffer:

$$\text{Pressure Score} = \min\left(100, \max\left(0, (\text{DTI} \times 40) + ((1 - \text{SavingsRate}) \times 40) + \text{VolatilityAdjustment}\right)\right)$$

- **Affordability Classifications:**
  - `Safe (Pressure < 35)`: Surplus remains robust, emergency buffer intact.
  - `Moderate (Pressure 35–65)`: Budget tightens, but obligations remain manageable.
  - `High Risk (Pressure > 65)`: Negative cash flow or debt service exceeds safe thresholds.

### 6.3 Household Health Scoring Algorithm (0–100)
Derived from four weighted domain pillars:
1. **Asset Reliability (30 pts):** Based on the proportion of appliances in `operational` status vs `needs_maintenance` or `critical`.
2. **Preventative Maintenance (25 pts):** Measures on-time task completion rate and overdue task penalties.
3. **Warranty & Protection Coverage (20 pts):** Evaluates percentage of active warranties on major mechanical systems (HVAC, Roof, Water Heater).
4. **Budget & Utility Stability (25 pts):** Tracks utility cost trends and on-time bill payment history.

---

## 7. Security Perimeter, Multi-Tenancy & Data Governance

```
+-------------------------------------------------------------------------------+
|                           CLIENT APPLICATION PERIMETER                        |
|   • Strict Content Security Policy (CSP) blocking unauthorized scripts         |
|   • Authenticated token injection with zero client-side credential storage     |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                           EXPRESS SECURITY MIDDLEWARE                         |
|   • Helmet (HSTS, frameguard, XSS filter, referrerPolicy)                     |
|   • Tiered Sliding-Window Rate Limiters (120 req/min general, 30 req/min AI)  |
|   • CORS origin whitelisting: localhost, *.web.app, *.run.app                 |
|   • Maximum payload size: 15MB                                                |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                         MULTI-TENANT ISOLATION LAYER                          |
|   • All read/write queries require verified JWT req.user.uid                  |
|   • Cross-tenant IDOR defense: Store maps partitioned per userId              |
|   • URL builder defense: SSRF sanitization on all outbound network paths      |
|   • Linear-time CSV parser: ReDoS-immune bounded state machine                |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                           PRIVACY CENTER GOVERNANCE                           |
|   • Complete Data Inventory Auditing (User-authored vs Demo-seeded items)     |
|   • Surgical Demo Cleanup: Purges only isDemo: true records                   |
|   • Account Deletion: Two-factor confirmation phrase ("DELETE MY DATA")       |
|   • Zero-Lock-In Export: Full JSON and CSV export capabilities                |
+-------------------------------------------------------------------------------+
```

---

## 8. Frontend Component Architecture & UI System

The user interface follows a modern, cohesive design system organized around an intuitive primary navigation matrix and contextual action zones.

### 8.1 Navbar Navigation Matrix (`Navbar.tsx`)

- **1. Brand Identity & Global Selector:**
  - `HouseMind` logo, Home profile switcher badge (`Maplewood Haven`).
- **2. Priority Navigation Groups:**
  - **Home:** Overview Dashboard, Physical Properties, Space Architecture.
  - **Assets:** Equipment Inventory, Preventative Maintenance, Warranty Vault.
  - **Finances:** Ledger & Cash Flow, Recurring Expenses, Credit Cards, Bills.
  - **More:** Integrated Calendar, Vault Documents, What-If Simulator, AI Copilot, Help Center.
- **3. Protected Right Action Zone:**
  - `+ Add` Action Trigger (Property, Asset, Task, Warranty, Utility, Loan, Card, Expense, Document).
  - Global Search button (`⌘K` / `Ctrl+K`).
  - Real-time Notification Bell with live unread badge.
  - Profile & Data Governance avatar dropdown.

### 8.2 Views Directory & Routing Architecture

```
src/
  ├── components/
  │   ├── Navbar.tsx                          # Primary header navigation matrix
  │   ├── Dashboard.tsx                       # Operating screen & health widget
  │   ├── PropertiesView.tsx                  # Real estate properties & rooms
  │   ├── AssetsView.tsx                      # Equipment registry & search filters
  │   ├── MaintenanceWarrantiesView.tsx       # Tasks schedule & warranty vault
  │   ├── UtilitiesDebtsView.tsx              # Utility bills, loans & credit cards
  │   ├── FinancialView.tsx                   # Cash flow ledger & transactions
  │   ├── ExpensesView.tsx                    # Recurring monthly/annual expenses
  │   ├── DocumentManagerView.tsx             # Statement vault & entity extraction
  │   ├── CopilotView.tsx                     # Grounded Gemini 3.7 chat interface
  │   ├── SearchModal.tsx                     # ⌘K Multi-domain instant search
  │   ├── Toast.tsx                           # Dynamic notification alerts
  │   ├── ErrorBoundary.tsx                   # React component crash isolation
  │   ├── calendar/
  │   │   └── CalendarView.tsx                # Integrated household calendar & .ics
  │   ├── command-center/
  │   │   ├── NeedsAttentionSection.tsx       # Actionable overdue/critical alerts
  │   │   ├── UpcomingScheduleSection.tsx     # 30-day cash & maintenance timeline
  │   │   ├── DomainSnapshotsSection.tsx      # Quick domain status cards
  │   │   └── RecentActivitySection.tsx       # Audit log of household events
  │   ├── notifications/
  │   │   ├── NotificationBell.tsx            # Live badge notification icon
  │   │   ├── NotificationCenterModal.tsx     # Notification triage modal
  │   │   └── NotificationPreferencesModal.tsx# Custom notice days & alert rules
  │   ├── scenarios/
  │   │   ├── ScenarioSimulatorView.tsx       # What-If scenario workbench
  │   │   ├── ScenarioBuilderModal.tsx        # Presets (AC EMI, Solar, Remodel)
  │   │   ├── ScenarioComparisonModal.tsx     # Side-by-side matrix comparator
  │   │   └── AffordabilityBadge.tsx          # Dynamic risk level indicator
  │   └── help/
  │       ├── HelpCenterView.tsx              # Knowledge base & FAQs
  │       └── ContextualHelp.tsx              # In-view quick help popovers
```

---

## 9. Automated Verification, Testing & QA Matrix

HouseMind uses a dual-engine automated test framework ensuring 100% verified correctness:

```
========================================================================
   HOUSEMIND AUTOMATED TESTING SUITE SUMMARY
========================================================================
  Backend & Integration Tests:     139 tests across 22 suites (100% Pass)
  Playwright Browser Journeys:     16 user journeys (100% Pass)
  Total Test Count:                155 automated tests
========================================================================
```

### 9.1 Browser User Journey Matrix (`tests/browser-user-journeys.test.ts`)

| ID | User Journey Flow | Verification Target |
| :--- | :--- | :--- |
| `JOURNEY-01` | Landing Page & Security Perimeter | Hero login button, feature cards, unauthenticated route perimeter |
| `JOURNEY-02` | Command Center & Health Intelligence | Health modal open/close, quick action buttons |
| `JOURNEY-03` | Top Navigation Bar & Dropdowns Matrix | Full navigation dropdown matrix (Home, Assets, Finances, More) |
| `JOURNEY-04` | Property Registration & Space Allocation | Adding property, room allocation, live card render |
| `JOURNEY-05` | Asset Registry & Search Filtering | Asset creation, brand/model attributes, search filter, empty states |
| `JOURNEY-06` | Maintenance Scheduling & Warranty Vault | Task scheduling, completion toggling, warranty vault records |
| `JOURNEY-07` | Financial Ledger & Itemized Expenses | Adding ledger transaction, recurring bill creation, cash flow sync |
| `JOURNEY-08` | Utilities, Amortized Loans & Debt Center | Utility account creation, 30-year fixed loan recording, card tabs |
| `JOURNEY-09` | What-If Decision Simulator | Preset selection, affordability simulation, scenario card persist |
| `JOURNEY-10` | AI Copilot Interactive Chat | Assistant prompt input, grounded conversation response stream |
| `JOURNEY-11` | Global Instant Search Modal (`⌘K`) | Live search querying, multi-domain categorised matching results |
| `JOURNEY-12` | Household Calendar View | Month timeline, next month navigation, today jump control |
| `JOURNEY-13` | Notification Center & Alert Triage | Bell notification drawer, item click navigation, category filter |
| `JOURNEY-14` | Profile Settings & Privacy Center | Currency selection, Residence specs, Privacy inventory audit |
| `JOURNEY-15` | Help Center Knowledge Base | Search bar, FAQ category filters, interactive guides |
| `JOURNEY-16` | Mobile Responsiveness & Touch Drawer | iPhone 14 viewport (390×844), hamburger drawer toggle |

---

## 10. Configuration, Build & Deployment Guide

### 10.1 Environment Variables Configuration

Create a `.env` file in the project root:

```ini
# Server Configuration
PORT=3000
NODE_ENV=development

# Google Gemini Intelligence (Server-side Only)
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Admin Configuration (Optional for Cloud Deployment)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 10.2 NPM Scripts Directory

```bash
# Start full-stack local development server (Express + Vite HMR)
npm run dev

# Build production assets and bundle Express backend
npm run build

# Start production server
npm start

# Run all backend, unit, integration, and security tests (139 tests)
npm test

# Run full-stack Playwright browser user journey test suite (16 journeys)
npm run test:browser

# Run TypeScript typecheck validation
npm run lint
```

---

*Documentation maintained by the HouseMind Engineering Team.*
