# HouseMind Changelog

All notable changes to the HouseMind platform will be documented in this file.

---

## [Phase 7 & 8] - 2026-08-31

### Added
- **Global Financial Localization Engine**:
  - Centralized multi-country registry (`src/config/locationCurrencyConfig.ts` and `server/utils/currencyConfig.ts`) supporting North America, Europe, UK, Japan, Australia, India, and Latin America.
  - User override capability allowing custom currency selections decoupled from country settings.
  - Safe, locale-aware currency formatter (`formatCurrency`) with robust numeric fallbacks.
  - Automatic timezone and regional benchmarks calculation.
- **Dataset Lifecycle & Demo Data Management**:
  - Safe demo data purge endpoint (`POST /api/household/demo-remove`) removing only seeded records without affecting real user entries.
  - Full data reset endpoint (`POST /api/household/reset-data`) with explicit confirmation.
  - UI controls in the **Data Sources & Transparency** modal for managing sample datasets.
- **Production Documentation Suite**:
  - Comprehensive documentation: `README.md`, `SECURITY.md`, `ARCHITECTURE.md`, `THREAT_MODEL.md`, `PRIVACY.md`, `AI.md`, `DATA_MODEL.md`, `API.md`, `TESTING.md`, `DEPLOYMENT.md`, `AUDIT_REPORT.md`, `CHANGELOG.md`.

### Security & Hardening
- **SSRF Remediation**: Strict URL constructor with `SAFE_ID_REGEX` on all Firestore REST request builders.
- **Multi-Tenant Isolation**: Enforced user isolation on all API routes, database operations, and Firestore rules.
- **Rate Limiting & Headers**: Helmet security headers, CSP, and tiered rate limiting on upload, AI, and API routes.
- **Safe Logging**: Format string sanitization across all server logging and error handler pipelines.

### Changed
- Refactored `Dashboard.tsx`, `ExpensesView.tsx`, `AssetsView.tsx`, `FinancialView.tsx`, and `ScenarioCard.tsx` to use unified localization utilities.
- Standardized error response envelopes across all Express routes.
