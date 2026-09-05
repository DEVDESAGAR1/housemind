# HouseMind Changelog

All notable changes to the HouseMind platform are documented in this file. The project adheres to [Semantic Versioning](https://semver.org/).

---

## [v2.5.0] - 2026-09-05

### Added
- **Documentation Audit & Consolidation**:
  - Unified technical architecture and domain model into `docs/ARCHITECTURE.md`.
  - Comprehensive quality assurance and verification documentation in `docs/TESTING.md` covering all 347 passing automated tests.
  - Realistic end-to-end user workflows in `docs/USER-JOURNEYS.md`.
  - Structured contributing guide in `CONTRIBUTING.md`.
- **Archival Security Log**: Preserved historical audit findings in `docs/historical/AUDIT_REPORT.md`.

### Changed
- Refactored `README.md` to be the definitive, competition-ready product specification.
- Updated `SECURITY.md` incorporating the full STRIDE threat model and AI safety protocols.
- Updated `PRIVACY.md` detailing GA4 privacy boundaries, context minimization, and zero-PII telemetry.
- Updated `DEPLOYMENT.md` with container build instructions and Secret Manager verification steps.
- Removed outdated fragmented root documents (`DOCUMENTATION.md`, `DATA_MODEL.md`, `API.md`, `AI.md`, `THREAT_MODEL.md`).

---

## [v2.4.0] - 2026-09-02

### Added
- **Google Cloud Secret Manager Integration**:
  - Dedicated secret resolution provider fetching `housemind-gemini-api-key`.
  - Least-privilege IAM configuration (`roles/secretmanager.secretAccessor`) for Cloud Run runtime identity.
  - Diagnostic readiness probes masking credentials while validating runtime availability.
  - Client bundle scan verification ensuring zero private credentials leak into frontend assets.

---

## [v2.3.0] - 2026-08-31

### Added
- **Privacy-Preserving Telemetry & Observability**:
  - Free-tier Google Analytics 4 integration with strict parameter sanitization.
  - Automatic stripping of financial values, document text, search queries, and chat prompts.
  - Anonymous client-side session identification preventing Firebase Auth UID linkage.
  - Structured server error categorization and query parameter credential masking in logs.

---

## [v2.2.0] - 2026-08-28

### Added
- **Cross-Domain Intelligence Graph**:
  - In-memory relational network generated dynamically per-tenant from structured database records.
  - Graph edges connecting physical, operational, and financial entities (`LOCATED_IN`, `COVERED_BY`, `SERVICED_BY`, `REPORTED_ON`, `BILLED_UNDER`, `ATTACHED_TO`, `PART_OF`).
  - Compounding risk discovery (e.g., recurring appliance repair costs exceeding replacement thresholds).
- **Unified Household Actions**:
  - Standardized cross-domain recommendations with priority scoring and deep-link routing.

---

## [v2.1.0] - 2026-08-25

### Added
- **4-Part Daily Morning Briefing**:
  - Operational summary delivering Urgent Alerts, Today's Deadlines, Health Score, and Proactive Advice.
  - Actionable deep-links enabling instant navigation to relevant bills, tasks, or tickets.
  - Deterministic fallback narrative generator ensuring 100% availability if upstream AI is unavailable.
- **Unified Copilot Multi-Turn UX**:
  - Rich Markdown rendering with structured bullet points and source reference tags.

---

## [v2.0.0] - 2026-08-20

### Added
- **Household Agent Orchestrator**:
  - Multi-turn conversational partner powered by 13 deterministic read tools.
  - Ephemeral context minimizer assembling only query-relevant facts.
  - Read-only tool sandboxing strictly rejecting autonomous destructive or financial mutations.
  - Two-stage action proposal and explicit user confirmation workflow.
  - Chronological agent activity stream and user preference persistence.

---

## [v1.5.0] - 2026-08-15

### Added
- **Universal Issues & Tickets**:
  - Problem lifecycle management (reported, in-progress, resolved).
  - Contractor estimate tracking and safety hazard categorization (electrical, plumbing, gas).
- **Sub-5ms Global Search**:
  - Multi-domain indexing querying assets, expenses, tickets, loans, and documents instantly.

---

## [v1.2.0] - 2026-08-10

### Added
- **What-If Scenario Simulator**:
  - 12-month forward cash flow projection simulating major repairs, replacements, and debt payoffs.
  - Opportunity cost evaluations and side-by-side scenario comparisons.
- **Two-Stage Document Staging Pipeline**:
  - Upload candidate extraction (`pending_review`) with human-in-the-loop verification before ledger commitment.
  - SHA-256 duplicate statement detection.

---

## [v1.0.0] - 2026-08-01

### Added
- **Household Operating System Core Foundation**:
  - Physical infrastructure: Properties, rooms, assets, warranties, maintenance logs.
  - Financial infrastructure: Transactions ledger, recurring expenses, amortized loans, credit cards.
  - Multi-tenant architecture with Firebase Authentication and per-tenant Firestore isolation (`/users/{userId}/*`).
  - Comprehensive defense-in-depth: Helmet headers, tiered rate limiting, SSRF protection, linear-time $O(n)$ parser.
