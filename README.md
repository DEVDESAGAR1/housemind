# HouseMind — Household Operating System & Grounded Intelligence Platform

> **A full-stack operational substrate that connects physical properties, appliances, warranties, maintenance, utilities, recurring obligations, loans, documents, and family cash flows into a single connected operational graph.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Tests](https://img.shields.io/badge/Tests-402%2F402%20Passed%20(100%25)-success.svg)](docs/TESTING.md)
[![Playwright](https://img.shields.io/badge/Browser%20Journeys-25%2F25%20Passed%20(100%25)-success.svg)](docs/TESTING.md)
[![Gemini](https://img.shields.io/badge/Grounded%20AI-Gemini%20API-orange.svg)](https://ai.google.dev/)
[![Security](https://img.shields.io/badge/Security-Secret%20Manager%20%7C%20Tenant%20Isolated-blueviolet.svg)](SECURITY.md)

---

## 1. What is HouseMind?

Modern households are complex micro-enterprises. A typical family manages a physical structure, dozens of appliances with varying lifespans, manufacturer warranties, recurring maintenance schedules, utility meters, insurance policies, amortized mortgages, credit lines, and piles of invoices.

Yet, existing consumer software forces families into fragmented silos:
- **Banking apps** track money, but don't know when an air conditioner was last serviced.
- **Notes & cloud folders** store warranty PDFs, but fail to alert you when coverage is about to expire.
- **Maintenance checklists** track chores, but can't calculate whether repairing an old water heater is financially viable versus replacing it.
- **Generic AI chatbots** answer questions with guesses because they lack access to the factual state of your home.

**HouseMind solves this fragmentation.** It provides an integrated **Household Operating System** that bridges the physical, financial, and operational realities of homeownership.

```text
Household Data (Physical Assets, Invoices, Service Logs, Debt Contracts)
      ↓
Structured Records (Properties, Rooms, Assets, Warranties, Expenses, Loans)
      ↓
Relationships (LOCATED_IN, COVERED_BY, SERVICED_BY, BILLED_UNDER, etc.)
      ↓
Deterministic Intelligence (Health Scoring, Amortization Math, Gap Analysis)
      ↓
Grounded AI (Gemini Synthesis with Grounded Tools & Ephemeral Context)
      ↓
Actionable Household Decisions (Unified Actions, Morning Brief, Scenario Models)
```

---

## 2. ⚡ Judge & Evaluator Fast-Track Verification Guide

> **Quick Evaluation Summary for Judges**: Follow this 3-minute evaluation path to inspect HouseMind's 24 connected household domains, deterministic calculations, grounded Gemini intelligence, multimodal document intake, and privacy-first architecture.

### Quick Start (Local Setup in 60 Seconds)
```bash
# 1. Install dependencies & start development server
npm install
npm run dev
# 2. Open http://localhost:3000 in your browser
```

### Fast-Track Verification Checklist

| Step | Action | What to Observe / Verify |
| :--- | :--- | :--- |
| **1. Sign In** | Click **Sign In with Google** (or use the test user) | Authenticated session with per-tenant data isolation (`/users/{userId}/*`). |
| **2. Seed Demo Household** | Click **Load Demo Data** in the Command Center onboarding banner or Profile Menu | Populates **The Sharma Household** (Whitefield Villa, Bengaluru) with connected properties, rooms, HVAC assets, active issues, loans, and warranties. |
| **3. Command Center & Health Index** | Navigate to **Command Center** | • **Household Health Score (0–100)** computed dynamically across 4 pillars (Financial Safety, Asset Condition, Maintenance Readiness, Issue Urgency).<br>• **Needs Attention & Unified Actions** synthesizing multi-signal opportunities (e.g., Repair vs. Replace). |
| **4. Grounded AI Copilot** | Click **Copilot** in top navigation | • Grounded conversational AI querying 13 deterministic read-only tools.<br>• Ask: *"What assets need attention and are my warranties expiring soon?"*<br>• Notice source citations and strict mutation sandboxing (no destructive write permissions via chat). |
| **5. Multimodal Document Intake** | Click **Upload & Scan** (or via Documents) | • Upload any invoice/receipt (PDF, PNG, JPG).<br>• Two-stage human-in-the-loop review pipeline: AI extraction is presented for human edit & confirmation before committing to the ledger. |
| **6. Cross-Domain Intelligence & What-If Simulator** | Inspect Living Room AC in **Assets** / **Issues** | • Observe the 9-year-old Daikin AC: expired warranty + historical repair spend exceeding 65% of replacement cost.<br>• Click **What-If Simulator** to model 12-month net cash flow impact of new replacement vs. emergency repair. |
| **7. Privacy & Demo Purge** | Profile Menu ➔ **Profile & Preferences** | • Export full JSON data vault / CSV ledger.<br>• Click **Remove Demo Data** to cleanly purge sample records without affecting user data. |

### Automated QA Verification for Evaluators
```bash
npm test            # Run all 402 automated test suites (100% Passing)
npm run lint        # Static TypeScript type check (0 errors)
npm run build       # Production client & server build verification
```

---

## 3. How to Deep-Dive Explore HouseMind

Follow this comprehensive 8-step evaluation path to explore every corner of the platform:

### Step 1: Sign In
Authenticate using the supported Google Sign-In flow powered by Firebase Authentication. Each authenticated user is strictly isolated within their own tenant boundary.

### Step 2: Load Demo Data
If starting with an empty household, click **Load Demo Data** (available via the Command Center onboarding banner or the user Profile menu). This populates a coherent, realistic household dataset (**The Sharma Household**) spanning properties, assets, warranties, maintenance cadences, utilities, loans, and documents.
> *Note: Demo data is seeded example data for comprehensive evaluation—it is not a separate demo/guest authentication mode. All demo records can be purged at any time with a single click.*

### Step 3: Start at the Command Center
Navigate to **Command Center** in the top navigation bar. It serves as the household's executive cockpit:
- **Household Health Score**: Real-time 0–100 operational vitality score computed across 4 pillars.
- **Needs Attention**: Immediate high-priority items requiring action (overdue bills, critical maintenance, expiring warranties).
- **Unified Actions**: Compound decision cards synthesizing multi-signal opportunities (e.g., Repair vs. Replace, approaching warranty claim deadlines).
- **Upcoming Schedule**: Chronological 7-day, 14-day, and 30-day timeline of financial and upkeep commitments.
- **Domain Snapshots**: Real-time status cards for Home, Assets, Finances, and Upkeep.
- **Recent Activity**: Audit trail of completed tasks, updated records, and newly ingested documents.

### Step 4: Explore Household Domains
Use the main application navigation to inspect the underlying operational records:
- **Properties**: Multi-property structures, room allocations, square footage, and climate benchmarks.
- **Assets**: Equipment registry (HVAC, plumbing, electrical, appliances) tracking condition scores, expected lifespans, serial numbers, and replacement costs.
- **Maintenance & Upkeep**: Scheduled maintenance cadences, manufacturer and extended warranty policies, and universal issue tickets with contractor estimates.
- **Utilities & Debt**: Utility accounts, closed-form amortized mortgage schedules with monthly EMI breakdowns, and revolving credit card utilization monitors.
- **Finances**: Net cash flow, recurring expense categorization, and financial ledger summaries.
- **Documents**: Secure document vault for stored receipts, warranties, closing documents, and manuals.

### Step 5: Try Upload & Scan (Document Intake)
Experience the 6-step human-in-the-loop document intake engine:
1. Click **Upload & Scan** in the top navigation bar (or via the Documents view).
2. **Upload**: Drag and drop a receipt, invoice, or warranty document (supported formats: PDF, PNG, JPG, WebP up to 10MB).
3. **Extract**: Multimodal Gemini vision AI parses vendor, transaction date, line items, monetary amounts, equipment model numbers, and warranty durations.
4. **Review**: Extracted fields are displayed alongside confidence indicators.
5. **Edit**: Modify any field, select linked properties or assets, or adjust category tags.
6. **Confirm & Save**: Choose whether to save extracted entities (Asset, Warranty, Expense, or Task) or archive as document-only. *No AI extraction commits to your permanent database without explicit human approval.*

### Step 6: Explore Household Intelligence
Experience how HouseMind's intelligence layers assist daily decision-making:
- **Household Health Engine**: Inspect positive signals (completed maintenance, active warranties) and risk deductions (overdue bills, past-due service) across the 4 pillars.
- **Cross-Domain Intelligence**: Observe how the system links physical assets (`Daikin AC`) to active issues (`Compressor Vibration`), warranties, and cumulative repair spend.
- **Unified Actions**: Review compound recommendations (such as Repair vs. Replace triggered when cumulative repairs exceed 40% of replacement cost).
- **Morning Briefing**: Click the **🌅 Brief** button in the top navigation bar to open the daily 4-part briefing summarizing health score, urgent attention items, upcoming commitments, and top recommended action.
- **Household Copilot**: Click **Copilot** in navigation to converse with the grounded assistant. Copilot queries factual records via 13 read-only tools and provides source-grounded responses with deterministic fallback protection.

### Step 7: Explore Calendar & Notifications
- **Unified Calendar**: Click **Calendar** in navigation to view derived events (bills, maintenance, loans, warranties) in Month Grid or Agenda Timeline views, complete with monthly cash flow obligation totals.
- **Notification Center**: Click the bell icon in the header to review Critical, Warning, and Info alerts with read/unread states, and navigate directly to the affected record. Advance lead notice windows can be customized in Profile preferences.

### Step 8: Explore Help & Privacy Controls
- **Help Center**: Click **Help Center** in navigation (or the `?` icon) for practical guides, searchable documentation, and operational overviews.
- **Privacy & Data Governance**: Open the Profile menu (top right) -> `Profile & Preferences > Data Vault & Export` to export a complete JSON household backup, download a Financial Ledger CSV, surgically purge seeded sample records via **Remove Demo Data**, or perform an account reset.

---

## 4. Key Capabilities Across 24 Household Domains

HouseMind organizes household management into three core operational pillars:

### I. Physical Home Infrastructure
- **Property & Room Hierarchy**: Multi-property management with room-level asset mapping, square footage tracking, and climate benchmarks.
- **Asset Lifecycle Management**: Complete equipment registry (HVAC, plumbing, electrical, roofing, appliances) tracking age, condition score, expected lifespan, and estimated replacement costs.
- **Warranties & Coverage**: Manufacturer and extended warranty tracking with expiration alerts and claim contact details linked to physical equipment.
- **Preventative Maintenance**: Recurring service schedules, task logs, vendor details, and overdue service alerts.
- **Universal Issues & Tickets**: Problem lifecycle management (reported, in-progress, resolved) with contractor estimates and safety hazard detection (gas, electrical, water).

### II. Financial Infrastructure & Cash Flow
- **Unified Financial Ledger**: Comprehensive transaction tracking classifying entries into Credits, Debits, and Transfers, preventing double-counting and calculating true net cash flow.
- **Recurring Expenses**: Fixed household obligations (property taxes, insurance, HOA fees, subscriptions) normalized by payment frequency.
- **Mortgages & Amortized Loans**: Principal balances, interest rates, monthly EMI breakdowns, and lifetime interest projections.
- **Credit Cards & Utilization**: Statement cycles, credit limits, current balances, and credit utilization safety thresholds.
- **Staged Document Intelligence**: Ingests invoices, statements, and receipts through a transparent two-stage review pipeline (`pending_review` -> human edit -> `confirmed`) with SHA-256 duplicate detection.

### III. Grounded Intelligence & Decision Support
- **Cross-Domain Relational Graph**: An in-memory tenant relationship graph connecting physical assets, warranties, tickets, and expenses (`LOCATED_IN`, `COVERED_BY`, `SERVICED_BY`, `REPORTED_ON`, `BILLED_UNDER`, `ATTACHED_TO`, `PART_OF`).
- **Household Health Index**: A real-time 0–100 operational score calculated across 4 pillars: Financial Safety, Asset Condition, Maintenance Readiness, and Issue Urgency.
- **Command Center Cockpit**: Executive dashboard spotlighting immediate action items, priority alerts, upcoming deadlines, and cash runway.
- **Daily Morning Briefing**: A concise 4-part daily summary (Urgent Alerts, Today's Deadlines, Health Score, Proactive Recommendation) with direct action deep-links.
- **Grounded Copilot & Agent**: Conversational partner powered by 13 deterministic read tools, strict sandboxing against destructive mutations, and deterministic fallback guarantees.
- **What-If Scenario Simulator**: Simulates high-impact home decisions (e.g. replacing an aging HVAC vs paying down loan debt) projecting 12-month net cash flow impact before committing capital.

---

## 5. The Grounded AI Differentiator

> **HouseMind never asks Gemini to guess or calculate household facts.**

```text
Authenticated Household
        ↓
Household Context (Minimal Ephemeral Facts)
        ↓
Deterministic Facts (Factual Balances, Lifespan Math, Expiration Dates)
        ↓
Relationships / Intelligence (Cross-Domain Graph Traversal)
        ↓
Grounded Read Tools (get_assets, get_issues, get_warranties, ...)
        ↓
Gemini API Synthesis (Source-Grounded Natural Language Explanation)
        ↓
Action Proposal (Requires Human User Confirmation to Execute)
```

1. **Deterministic Calculation**: Financial arithmetic, EMI formulas, asset lifespans, and health scores are computed exclusively by verified deterministic TypeScript services.
2. **Ephemeral Context Minimization**: Only query-relevant records are assembled for prompt execution; full database dumps are never transmitted.
3. **Strict Mutation Sandbox**: Agent tools are strictly read-only. Destructive database operations cannot be triggered via conversation.
4. **Two-Stage Action Approval**: Any state changes proposed by the assistant (e.g. scheduling maintenance) require explicit user review and approval in the UI.
5. **Deterministic Continuity**: If upstream API quota is depleted, the platform falls back to deterministic rule-based narratives, ensuring 100% application uptime.

---

## 6. Realistic Showcase Scenario

To demonstrate how these domains interconnect in practice, HouseMind includes a realistic, localized showcase dataset (**The Sharma Household — Whitefield Villa, Bengaluru, India**):

- **The Physical Asset**: A 9-year-old `Daikin 2.0 Ton Inverter Split AC` located in the Living Room nearing its 10-year expected lifespan.
- **The Issue**: A recurring refrigerant leak ticket (`₹18,000` contractor repair estimate) logged against the unit.
- **The Compounding Risk**: The Cross-Domain Intelligence engine reveals that the warranty expired 14 months ago and historical repairs already total `₹24,500` (combined repair costs exceed 65% of the `₹65,000` replacement price).
- **The Actionable Outcome**: The Morning Brief flags this critical threshold and directs the homeowner to the **What-If Simulator**, projecting the 12-month net financial impact of replacement versus continuing emergency repairs.
- **Clean Sample Governance**: The demo dataset can be explored freely and surgically purged at any time (`Profile > Remove Demo Data`) without altering user-created records.

---

## 7. System Architecture & Tech Stack

```mermaid
flowchart LR
    subgraph Client["Frontend Tier (React 19 SPA)"]
        UI[Tailwind CSS v4 & Lucide Icons]
        Router[Single-Screen Modular Router]
        AuthSDK[Firebase Auth Client SDK]
    end

    subgraph Server["Application Server Tier (Node.js / Express)"]
        AuthMid[Firebase Admin JWT Verification & Tenant Scoping]
        DomainSvc[24 Subsystem Services & Dynamic Graph Engine]
        AgentOrch[Household Agent Orchestrator & Tool Registry]
    end

    subgraph Cloud["Google Cloud Platform Infrastructure"]
        Firestore[(Cloud Firestore: /users/userId/*)]
        SecretMgr[Cloud Secret Manager: housemind-gemini-api-key]
        GeminiAPI[Gemini API via @google/genai SDK]
    end

    Client -->|HTTPS + Bearer JWT| Server
    Server -->|Isolated Tenant Queries| Firestore
    Server -.->|Ephemeral Grounded Prompts| GeminiAPI
    SecretMgr -.->|Runtime Injection| Server
```

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React SPA | 19.0 | Fluid, accessible user interface with zero-slop design |
| **Backend** | Express on Node.js | 4.21 / 20+ | REST API, domain intelligence engines, and Vite middleware |
| **Type Safety** | TypeScript | 5.8 | End-to-end type safety with shared interfaces |
| **AI SDK** | `@google/genai` | 2.4.0 | Grounded Gemini Flash reasoning and multimodal extraction |
| **Auth & DB** | Firebase Auth & Firestore | 14.3 / 11.4 | RS256 token verification and per-tenant database isolation |
| **Secrets** | Google Cloud Secret Manager | Managed | Secure runtime injection with least-privilege IAM |
| **Styling** | Tailwind CSS & Lucide | 4.0 / 0.475 | Clean typography, mathematical spacing, accessible contrast |

---

## 8. Security & Privacy by Design

- **Tenant Isolation**: Every database operation is strictly scoped to `/users/{userId}/*`. Cross-tenant data access is structurally impossible.
- **Google Cloud Secret Manager**: Production API keys are resolved at runtime via Secret Manager (`housemind-gemini-api-key`). Zero credentials exist in client bundles, repository commits, or Docker layers.
- **SSRF Defense**: Outbound Firestore REST calls use validated constructors enforcing `https:`, trusted hostname `firestore.googleapis.com`, and strict ID regex (`SAFE_ID_REGEX`).
- **ReDoS Protection**: File parsers use a deterministic $O(n)$ linear-time parser (`parseDelimitedLine`), eliminating exponential backtracking risks.
- **Tiered Rate Limiting**: Sliding-window rate limiters throttle standard API calls (120 req/min), uploads (15 req/min), and AI synthesis (25 req/min).
- **Privacy Telemetry Boundary**: Standard Google Analytics 4 tracks aggregate adoption only. Monetary figures, balances, document text, search queries, and chat prompts are strictly stripped.

For detailed specifications, see [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md).

---

## 9. Quick Start & Local Development

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/DEVDESAGAR1/housemind.git
cd housemind

# 2. Install dependencies
npm install

# 3. Start development server (Port 3000)
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## 10. Quality Assurance & Verification Suite

HouseMind includes an automated test harness and browser journey suite covering all 24 domains:

```bash
# 1. Run the complete automated test suite (402 tests across 47 suites)
npm test

# 2. Run the Playwright browser user-journeys suite (25 journeys)
npm run test:browser

# 3. Run static type validation (Zero errors)
npm run lint

# 4. Run production build verification
npm run build
```

### Verified Test Results

```text
===============================================================
  TEST EXECUTION SUMMARY
===============================================================
  Total Tests Executed: 402
  Passed:               402 (100%)
  Failed:               0
===============================================================
ALL TESTS PASSED SUCCESSFULLY.
```

For the complete testing breakdown and Playwright browser journey specifications, consult [docs/TESTING.md](docs/TESTING.md).

---

## 11. Comprehensive Documentation Directory

| Document | Description |
| :--- | :--- |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | Full technical specification, 24 domain subsystems, dynamic graph model, and complete REST API reference |
| **[docs/TESTING.md](docs/TESTING.md)** | Testing philosophy, 47 test suites breakdown (402 tests), and 25 Playwright browser user journeys |
| **[docs/USER-JOURNEYS.md](docs/USER-JOURNEYS.md)** | Detailed walkthroughs of the 6 end-to-end homeowner user workflows |
| **[SECURITY.md](SECURITY.md)** | Security architecture, STRIDE threat model, defense-in-depth, Secret Manager, and AI safety protocols |
| **[PRIVACY.md](PRIVACY.md)** | Data governance, context minimization, two-stage document staging, and telemetry boundaries |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Production Cloud Run deployment guide, Secret Manager provisioning, Docker instructions, and secret rotation |
| **[CHANGELOG.md](CHANGELOG.md)** | Semantic release notes detailing platform milestones up to v2.6.2 |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Code of conduct, development setup, code standards, and pull request workflow |
| **[docs/historical/AUDIT_REPORT.md](docs/historical/AUDIT_REPORT.md)** | Archived historical security audit and CodeQL remediation log |

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
