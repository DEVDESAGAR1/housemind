# HouseMind — Autonomous Household Operating System & Financial Intelligence

HouseMind is an enterprise-grade, secure, and privacy-preserving household operating system and financial intelligence platform. Built with full multi-tenant user isolation, deterministic financial calculation engines, Gemini 2.5 AI grounded decision intelligence, multi-currency localization, and strict zero-trust security controls.

---

## 🌟 Key Capabilities

1. **Deterministic Financial Intelligence Engine**
   - Direct classification of financial transactions (Credits, Debits, Transfers).
   - Real-time computation of net cash flow, monthly burn rate, and savings rates.
   - Intelligent handling of account transfers to prevent double-counting.

2. **Global Financial Localization**
   - Multi-country and regional financial standard configurations across North America, Europe, Asia-Pacific, and Latin America.
   - Deterministic, locale-aware formatting with robust fallback support.
   - User override controls for currencies, timezone, and regional tax/housing benchmarks.

3. **Grounded Gemini AI Copilot & Investigator**
   - Real-time diagnostic evaluation of household equipment, bills, anomalies, and contracts.
   - Zero-hallucination structured JSON outputs with deterministic fallbacks when quotas are exhausted.
   - Contextual grounding ensuring raw credentials, passwords, and sensitive identifiers are excluded from prompt pipelines.

4. **"What-If" Financial Decision Simulator**
   - Simulation of major home expenditures (HVAC replacements, appliance upgrades, solar installations, debt restructuring).
   - Projected cash flow impacts, affordability indicators, and opportunity cost analyses.

5. **Bank & Billing Document Extraction Intelligence**
   - Secure extraction of PDF, image, and text statements with mandatory review before confirmation.
   - Multimodal document parsing with automatic currency and tax detection.

6. **Enterprise Security & Multitenancy**
   - Strict Firebase token authentication on all API routes (`/api/*`).
   - Structural multi-tenant user isolation with zero cross-tenant query contamination.
   - SSRF protection on outbound Cloud Firestore APIs, Helmet security headers, CSP, and tiered rate limiting.

---

## 📁 Repository Structure

```
├── server/                      # Express full-stack backend
│   ├── middleware/              # Auth, rate limiting, error handling
│   ├── routes/                  # REST API endpoints (household, transactions, scenarios, copilot)
│   ├── services/                # DatabaseService, GeminiService, DocumentParser
│   └── utils/                   # Security utilities, SSRF validators
├── src/                         # React 18 + Vite frontend
│   ├── components/              # Modular UI components (Dashboard, Expenses, Assets, Financial, Scenarios)
│   ├── config/                  # Global localization and currency registries
│   ├── lib/                     # Firebase client and API clients
│   └── types.ts                 # TypeScript domain types and schemas
├── tests/                       # Comprehensive Vitest backend and integration test suite
├── firestore.rules              # Firebase security rules enforcing per-user data isolation
└── documentation/               # System architecture and compliance documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or bun

### Environment Variables
Configure your environment variables in `.env` (refer to `.env.example`):
```env
GEMINI_API_KEY=your_gemini_api_key_here
FIREBASE_CONFIG=your_firebase_config_json_here
```

### Installation & Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Running Tests
```bash
# Run complete test suite (71+ tests)
npm test
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
- `SECURITY.md` — Security architecture, defense-in-depth, and SSRF mitigations
- `THREAT_MODEL.md` — Complete threat matrix and vulnerability protections
- `PRIVACY.md` — Data handling, retention, and isolation standards
- `ARCHITECTURE.md` — System architecture and data flow diagrams
- `AI.md` — AI model grounding, prompt containment, and safety fallbacks
