# HouseMind — Autonomous Household Operating System & Financial Intelligence

HouseMind is an enterprise-grade, privacy-first household operating system and financial intelligence platform. Built with user-isolated cloud storage, deterministic financial calculation engines, Gemini 2.5 AI grounded decision intelligence, multi-currency localization, and strict zero-trust privacy and security controls.

---

## 🌟 Key Capabilities

1. **Privacy-First Data Architecture & Governance**
   - Strict user-isolated multi-tenant storage partitioned by authenticated Firebase Auth UID.
   - Comprehensive Privacy Center & Data Transparency console (`/api/household/privacy-center`).
   - Granular source metadata tagging (`sourceType`, `isDemo`, `ingestionDate`, `sourceReference`).
   - Non-destructive demo data deletion (`POST /api/household/demo-remove`) preserving user-authored data.
   - User-initiated complete household data wipe (`POST /api/household/reset-data`) with explicit confirmation.

2. **Controlled AI Processing & Context Minimization**
   - Ephemeral, query-specific context compiler transmitting only minimal aggregated figures and maintenance flags to Gemini.
   - Strict client-side and server-side PII redaction (unmasked account numbers, card PANs, passwords never sent to AI).
   - Zero retention for foundation model training.
   - Fully deterministic algorithmic fallbacks guaranteeing uptime when AI quotas are depleted.

3. **Deterministic Financial Intelligence Engine**
   - Direct classification of financial transactions (Credits, Debits, Transfers).
   - Real-time computation of net cash flow, monthly burn rate, and savings rates.
   - Intelligent handling of account transfers to prevent double-counting.

4. **Global Financial Localization**
   - Multi-country and regional financial standard configurations across North America, Europe, Asia-Pacific, and Latin America.
   - Deterministic, locale-aware formatting with robust fallback support.
   - User override controls for currencies, timezone, and regional tax/housing benchmarks.

5. **Grounded Gemini AI Copilot & Investigator**
   - Real-time diagnostic evaluation of household equipment, bills, anomalies, and contracts.
   - Structured JSON outputs with strict schema validation and runtime Zod parsing.

6. **"What-If" Financial Decision Simulator**
   - Simulation of major home expenditures (HVAC replacements, appliance upgrades, solar installations, debt restructuring).
   - Projected cash flow impacts, affordability indicators, and opportunity cost analyses.

7. **Bank & Billing Document Extraction Intelligence**
   - Secure extraction of PDF, image, and text statements with mandatory human-in-the-loop review before confirmation.
   - Multimodal document parsing with automatic currency and tax detection.

8. **Enterprise Security & Multitenancy**
   - Strict Firebase token authentication on all API routes (`/api/*`).
   - Structural user isolation with zero cross-tenant query contamination.
   - SSRF protection on outbound Cloud Firestore APIs, Helmet security headers, CSP, and tiered rate limiting.

---

## 📁 Repository Structure

```
├── server/                      # Express full-stack backend
│   ├── middleware/              # Auth, rate limiting, error handling
│   ├── routes/                  # REST API endpoints (household, transactions, scenarios, copilot)
│   ├── services/                # DatabaseService, GeminiService, DocumentParser, ScenarioEngine
│   ├── schemas.ts               # Runtime Zod validation schemas
│   └── utils/                   # Security utilities, SSRF validators, currencyConfig
├── src/                         # React 18 + Vite frontend
│   ├── components/              # Modular UI components (Dashboard, Expenses, Assets, Financial, Scenarios, DataSourcesModal)
│   ├── config/                  # Global localization and currency registries
│   ├── lib/                     # Firebase client and API clients
│   └── types.ts                 # TypeScript domain types and privacy schemas
├── tests/                       # Comprehensive Vitest/Node backend and integration test suite (81 tests)
│   ├── backend/                 # Auth, security, profile, expenses, assets, transactions, documents, copilot, scenarios, privacy
│   └── integration/             # Financial, document, intelligence, and persistence flows
├── firestore.rules              # Firebase security rules enforcing per-user data isolation
└── documentation/               # System architecture, privacy, and compliance documentation
```

---

## 📚 Comprehensive Documentation

For full architectural deep-dives, entity diagrams, complete 45+ endpoint API specifications, security threat models, and algorithm details, consult:
- **[Comprehensive Technical Handbook](file:///c:/Users/devde/Downloads/housemind/DOCUMENTATION.md)** (`DOCUMENTATION.md`)
- **[REST API Specification](file:///c:/Users/devde/Downloads/housemind/API.md)** (`API.md`)
- **[System Architecture](file:///c:/Users/devde/Downloads/housemind/ARCHITECTURE.md)** (`ARCHITECTURE.md`)
- **[Data Models & Schemas](file:///c:/Users/devde/Downloads/housemind/DATA_MODEL.md)** (`DATA_MODEL.md`)
- **[Security & Multi-Tenant Model](file:///c:/Users/devde/Downloads/housemind/SECURITY.md)** (`SECURITY.md`)
- **[Testing & QA Verification Strategy](file:///c:/Users/devde/Downloads/housemind/TESTING.md)** (`TESTING.md`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or bun

### Environment Variables
Configure your environment variables in `.env` (refer to `.env.example`):
```env
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
```

### Installation & Development
```bash
# Install dependencies
npm install

# Start full-stack development server (Express + Vite SPA)
npm run dev
```

### Running Tests
```bash
# Run all backend, unit, integration, and security tests (139 tests across 22 suites)
npm test

# Run full-stack Playwright browser user journey test suite (16 journeys)
npm run test:browser
```

### Building for Production
```bash
# Full-stack production build (Vite + esbuild)
npm run build

# Start production server
npm start
```

---

## 🔒 Security & Privacy

For comprehensive details on HouseMind's security posture, threat mitigation, data isolation, and AI safety controls, consult:
- [PRIVACY.md](./PRIVACY.md) — Privacy-First Data Architecture & Governance
- [SECURITY.md](./SECURITY.md) — Security Architecture & Threat Model
- [THREAT_MODEL.md](./THREAT_MODEL.md) — Threat Matrix & Vulnerability Mitigations
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System Architecture & Data Flow Diagrams
- [AI.md](./AI.md) — AI Safety & Context Minimization Protocols
- [DATA_MODEL.md](./DATA_MODEL.md) — Multi-Tenant Schema & Isolation Topology
- [API.md](./API.md) — REST API Specification
- [TESTING.md](./TESTING.md) — Automated Verification & Test Results
- [AUDIT_REPORT.md](./AUDIT_REPORT.md) — Security Audit & Remediation Log
- [CHANGELOG.md](./CHANGELOG.md) — Project Version History & Release Notes
