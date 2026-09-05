# HouseMind Quality Assurance, Verification & Testing Suite

> **Verification Status:** ALL 347 AUTOMATED TESTS PASSING (100%)  
> **Total Test Suites:** 38 Domains & Subsystems • **Test Harness:** Pure Node.js / TypeScript (`tsx`)  
> **Browser Journeys:** 16 Interactive Playwright User Journeys

---

## 1. Overview & Testing Philosophy

HouseMind enforces strict verification standards across all 24 household domains. Because the platform manages physical property assets, warranty contracts, legal documents, and financial cash flows, reliability is non-negotiable.

The testing architecture adheres to four core principles:

1. **Zero-Mock Business Logic**: Financial calculations (burn rate, net cash flow, EMI amortization), health scoring, and graph edge traversal run through actual production services rather than mocked stubs.
2. **Strict Multi-Tenant Isolation Verification**: Every suite creates multiple isolated test tenants and verifies that cross-tenant read, write, or mutation attempts are strictly denied.
3. **Deterministic Fallback Guarantees**: Copilot and Morning Brief test suites simulate both upstream AI connectivity and simulated upstream quota depletion (`RESOURCE_EXHAUSTED` 429), verifying that the system degrades gracefully into deterministic factual narratives without crashing or hallucinating.
4. **Permanent Regression Defense**: Critical bug fixes (SSRF URL traversal, polynomial ReDoS regex, date formatting, format string sanitization, CORS origin checks) have dedicated regression tests ensuring past issues never reoccur.

---

## 2. Test Suite Execution & Summary

### Primary Verification Suite (`npm test`)

The primary test runner (`tests/run-all.ts`) executes all 38 backend, security, intelligence, and integration test suites against an in-memory full-stack test harness.

```bash
# Run the complete automated test suite
npm test
```

### Verified Test Results

```text
===============================================================
  TEST EXECUTION SUMMARY
===============================================================
  Total Tests Executed: 347
  Passed:               347 (100%)
  Failed:               0
  Execution Time:       30,130 ms (~30.1s)
===============================================================
ALL TESTS PASSED SUCCESSFULLY.
```

---

## 3. Test Suites Breakdown

The 347 automated tests are organized into 38 distinct test suites:

| # | Suite Name | File | Focus Areas |
| :--- | :--- | :--- | :--- |
| **1** | Authentication & Authorization | `backend/auth.test.ts` | JWT bearer token verification, missing token rejection, expired tokens, tenant ID extraction |
| **2** | Security & Rate Limiting | `backend/security.test.ts` | IP spoofing defense, tiered sliding-window rate limiters, SSRF path traversal blocking, CORS regex rules |
| **3** | Household Profile Management | `backend/profile.test.ts` | Currency localization, country benchmarks, profile CRUD, square footage updates |
| **4** | Recurring Expenses Lifecycle | `backend/expenses.test.ts` | Bill frequency calculation, auto-pay flags, active/paused statuses, monthly normalization |
| **5** | Home Assets & Equipment | `backend/assets.test.ts` | Asset lifecycle, age calculation, lifespan estimates, replacement cost projection, condition scoring |
| **6** | Intelligence & Cash Flow | `backend/intelligence.test.ts` | Monthly burn rate, replacement capital reserves, runway calculation, savings rate |
| **7** | Financial Ledger & Transactions | `backend/transactions.test.ts` | Credit/Debit/Transfer classification, double-counting defense, balance computation |
| **8** | Document Pipeline & Staging | `backend/documents.test.ts` | File upload limits, OCR candidate extraction, two-stage review (`pending_review` -> `confirmed`) |
| **9** | Grounded Copilot & Safety | `backend/copilot.test.ts` | Grounded tool execution, prompt injection defense, source citations, context sanitization |
| **10** | What-If Scenario Simulator | `backend/scenarios.test.ts` | 12-month financial impact projection, opportunity cost evaluation, multi-scenario comparison |
| **11** | Error Recovery & Resiliency | `backend/error-handling.test.ts` | Missing payload validation, malformed JSON recovery, server error masking, 404 handlers |
| **12** | Home Systems & Entity Extraction | `backend/phase10_home_systems.test.ts` | Natural-language equipment extraction, model/serial extraction, room assignment |
| **13** | Permanent Regression Protections | `backend/regression_phase1.test.ts` | ReDoS linear-time parser verification, SSRF host whitelist, format string safety |
| **14** | Financial Flow Integration | `integration/financial-flow.test.ts` | End-to-end flow: Document upload -> candidate review -> ledger transaction -> cash flow recalculation |
| **15** | Document Flow Integration | `integration/document-flow.test.ts` | Multi-page invoice processing, duplicate detection, candidate confirmation, asset linking |
| **16** | Copilot & Intelligence Synergy | `integration/intelligence-flow.test.ts` | Copilot retrieving factual health scores, overdue maintenance, and unconfirmed bills |
| **17** | Multi-Tenant Persistence | `integration/persistence.test.ts` | Cross-user data isolation, concurrent tenant operations, database serialization |
| **18** | Privacy & Data Deletion | `backend/privacy.test.ts` | `isDemo` provenance tracking, surgical demo data removal, total account reset confirmation |
| **19** | Physical Systems & Rooms | `backend/phase10_home_systems.test.ts` | Hierarchical room assignments, square footage aggregates, property containment |
| **20** | Health Intelligence (4 Pillars) | `backend/health_intelligence.test.ts` | Financial Safety, Asset Condition, Maintenance Readiness, Issue Urgency scoring (0–100) |
| **21** | Command Center Aggregations | `backend/command_center.test.ts` | Unified cockpit feed, priority alert sorting, actionable alert thresholds |
| **22** | Sub-5ms Global Search | `backend/global_search.test.ts` | Multi-domain index queries across assets, expenses, tickets, loans, and documents |
| **23** | End-to-End User Journeys | `integration/e2e-journeys.test.ts` | Integration-level multi-step journeys simulating real homeowner scenarios |
| **24** | Agent Orchestrator & Tool Calling | `backend/agent_orchestrator.test.ts` | Intent classification, minimal context selection, tool execution dispatch |
| **25** | Agent Tools & Sandboxing | `backend/agent_tools_permissions.test.ts` | Read-only tool boundary, destructive operation denial, financial remittance restriction |
| **26** | Daily Morning Brief Generator | `backend/morning_brief.test.ts` | 4-part briefing generation, deadline extraction, proactive maintenance recommendations |
| **27** | Agent Action Proposals | `backend/agent_action_approval.test.ts` | Structured proposal generation, user confirmation flow, execution on approval |
| **28** | Agent Activity Stream | `backend/agent_activity_ui.test.ts` | Chronological activity logging, tool execution transparency, user audit trail |
| **29** | Agent Memory & Preferences | `backend/agent_notifications_memory.test.ts` | Household preference storage, alert thresholds, conversational memory persistence |
| **30** | Prompt Injection Defense | `backend/agent_evaluation_security.test.ts` | System prompt override defense, adversarial jailbreak resilience, context boundary isolation |
| **31** | Unified Copilot Multi-Turn UX | `backend/unified_copilot_ux.test.ts` | Multi-turn conversational continuity, bullet formatting, Markdown rendering, deep-link tags |
| **32** | Universal Issues & Safety | `backend/issue_intelligence.test.ts` | Electrical/gas hazard detection, contractor estimate tracking, ticket resolution workflows |
| **33** | Cross-Domain Intelligence Graph | `backend/cross_domain_intelligence.test.ts` | Dynamic graph generation, edge relationships (`COVERED_BY`, `REPORTED_ON`, `BILLED_UNDER`) |
| **34** | Unified Household Actions Engine | `backend/unified_household_actions.test.ts` | Cross-domain recommendation engine, priority calculation, action deep-link generation |
| **35** | Morning Brief UX & Deep-Links | `backend/morning_brief_ux.test.ts` | Structured 4-part payload formatting, action route deep-links, fallback narrative delivery |
| **36** | Showcase Alignment & Localization | `backend/demo_household_alignment.test.ts` | Multi-currency localization, realistic asset-issue-warranty linkages, tenant scoping |
| **37** | Telemetry & Observability | `backend/analytics_observability.test.ts` | GA4 parameter sanitization: zero PII, zero monetary figures, zero prompts/queries |
| **38** | Production Secrets Hardening | `backend/secrets_hardening.test.ts` | Google Cloud Secret Manager resolution, masking in logs, `/api/health` secret confidentiality |

---

## 4. Playwright Browser User Journeys

In addition to the 347 automated backend/integration tests, HouseMind includes a **Playwright End-to-End Browser User Journeys suite** (`tests/browser-user-journeys.test.ts`) that boots a full-stack test server (Express + Vite SPA) and drives real browser interactions across 16 user journeys:

1. **New User Onboarding & Currency Selection**: Sets up a new household, configures country/currency, and verifies profile persistence.
2. **Physical Property & Room Mapping**: Creates a home, adds multiple rooms, and verifies spatial hierarchy.
3. **Asset Registration & Maintenance Schedule**: Adds an HVAC system, attaches a filter cleaning schedule, and verifies timeline updates.
4. **Warranty Document Linking**: Registers an extended warranty, links it to an asset, and verifies the `COVERED_BY` relationship.
5. **Universal Issue & Contractor Estimate**: Logs a water heater leak ticket, flags safety hazard, and checks Command Center alert escalation.
6. **Financial Document Upload & Ingestion**: Uploads an electricity invoice, inspects OCR candidate fields, edits amount, and commits.
7. **Ledger Transaction & Cash Flow Recalculation**: Creates salary and expense transactions, verifying net cash flow calculation.
8. **What-If Expense Simulation**: Simulates a major appliance replacement, reviewing 12-month cash impact and opportunity cost.
9. **Grounded Copilot Household Q&A**: Asks Copilot about upcoming maintenance risks, verifying grounded asset citations.
10. **Agent Action Proposal & Approval**: Generates a maintenance task via Copilot and confirms it via the UI approval dialog.
11. **Morning Brief Interaction**: Reads the 4-part daily briefing and clicks an action deep-link directly to an overdue bill.
12. **Cross-Domain Graph Exploration**: Explores the dynamic household graph, verifying nodes and edge linkages.
13. **Global Search Experience**: Performs instant sub-5ms queries for assets, bills, and tickets with keyboard navigation.
14. **Help Center & Troubleshooting**: Searches help documentation and accesses domain walkthrough articles.
15. **Data Privacy & Surgical Demo Deletion**: Seeds showcase data, verifies isolation, and triggers surgical removal of demo records.
16. **Full Account Data Wipe**: Executes confirmed account reset, verifying complete cleanup of all user records.

```bash
# To run browser user journeys (requires Playwright browser binaries):
npm run test:browser
```

---

## 5. Static Code Quality & Build Verification

The codebase is continuously validated for TypeScript syntax, type safety, and production build artifact integrity:

```bash
# 1. Static Type Checking (Zero Errors)
npm run lint

# 2. Production Build Verification (Client SPA + Bundled Server)
npm run build
```

Both checks pass cleanly with zero warnings or errors.
