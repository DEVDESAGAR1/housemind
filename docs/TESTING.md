# HouseMind Quality Assurance, Verification & Testing Suite

> **Verification Status:** ALL 394 AUTOMATED TESTS PASSING (100%)  
> **Total Test Suites:** 46 Domains & Subsystems across 7 Architectural Layers • **Test Harness:** Pure Node.js / TypeScript (`tsx`)  
> **Browser Journeys:** 25 Interactive Playwright Browser User Journeys (100% Passed)

---

## 1. Overview & Testing Philosophy

HouseMind enforces strict verification standards across all 24 household domains. Because the platform manages physical property assets, warranty contracts, legal documents, and financial cash flows, reliability is non-negotiable.

The testing architecture adheres to four core principles:

1. **Zero-Mock Business Logic**: Financial calculations (burn rate, net cash flow, EMI amortization), health scoring, and graph edge traversal run through actual production services rather than mocked stubs.
2. **Strict Multi-Tenant Isolation Verification**: Every suite creates multiple isolated test tenants and verifies that cross-tenant read, write, or mutation attempts are strictly denied.
3. **Deterministic Fallback Guarantees**: Copilot and Morning Brief test suites simulate both upstream AI connectivity and simulated upstream quota depletion (`RESOURCE_EXHAUSTED` 429), verifying that the system degrades gracefully into deterministic factual narratives without crashing or hallucinating.
4. **Permanent Regression Defense**: Critical bug fixes (SSRF URL traversal, polynomial ReDoS regex, date formatting, format string sanitization, CORS origin checks, CSP frameAncestors) have dedicated regression tests ensuring past issues never reoccur.

---

## 2. Test Suite Execution & Summary

### Primary Verification Suite (`npm test`)

The primary test runner (`tests/run-all.ts`) executes all 46 backend, security, intelligence, and integration test suites against an in-memory full-stack test harness.

```bash
# Run the complete automated test suite
npm test
```

### Verified Test Results

```text
===============================================================
  TEST EXECUTION SUMMARY
===============================================================
  Total Tests Executed: 394
  Passed:               394 (100%)
  Failed:               0
===============================================================
ALL TESTS PASSED SUCCESSFULLY.
```

---

## 3. Test Suites Breakdown Across 7 Architectural Layers

The 394 automated tests are organized into 46 distinct test suites across 7 architectural layers:

### Layer 1: Deterministic Mathematical & Structural Unit Tests (`tests/unit/`)
| # | Suite Name | File | Focus Areas |
| :--- | :--- | :--- | :--- |
| **1** | Financial Math & Amortization | `unit/financial-math.test.ts` | EMI loan formulas, monthly burn rate, credit utilization, zero-interest edge cases |
| **2** | Guided Tour Structure & Target Selectors | `unit/tour-validator.test.ts` | 11 walkthrough definitions, step progression integrity, valid target selectors |
| **3** | Household Health Scoring Algorithm | `unit/health-calculator.test.ts` | 4 pillars (Financial, Asset, Maintenance, Urgency), 0-100 composite scoring, provisional state |

### Layer 2: Core Domain & Service Foundations (`tests/backend/`)
| # | Suite Name | File | Focus Areas |
| :--- | :--- | :--- | :--- |
| **4** | Authentication & Authorization | `backend/auth.test.ts` | JWT bearer token verification, missing token rejection, expired tokens, tenant ID extraction |
| **5** | Security & Rate Limiting | `backend/security.test.ts` | IP spoofing defense, tiered sliding-window rate limiters, SSRF path traversal blocking, CORS regex rules |
| **6** | Household Profile Management | `backend/profile.test.ts` | Currency localization, country benchmarks, profile CRUD, square footage updates |
| **7** | Recurring Expenses Lifecycle | `backend/expenses.test.ts` | Bill frequency calculation, auto-pay flags, active/paused statuses, monthly normalization |
| **8** | Home Assets & Equipment | `backend/assets.test.ts` | Asset lifecycle, age calculation, lifespan estimates, replacement cost projection, condition scoring |
| **9** | Intelligence & Cash Flow | `backend/intelligence.test.ts` | Monthly burn rate, replacement capital reserves, runway calculation, savings rate |
| **10** | Financial Ledger & Transactions | `backend/transactions.test.ts` | Credit/Debit/Transfer classification, double-counting defense, balance computation |
| **11** | Document Pipeline & Staging | `backend/documents.test.ts` | File upload limits, OCR candidate extraction, two-stage review (`pending_review` -> `confirmed`) |
| **12** | Grounded Copilot & Safety | `backend/copilot.test.ts` | Grounded tool execution, prompt injection defense, source citations, context sanitization |
| **13** | What-If Scenario Simulator | `backend/scenarios.test.ts` | 12-month financial impact projection, opportunity cost evaluation, multi-scenario comparison |
| **14** | Error Recovery & Resiliency | `backend/error-handling.test.ts` | Missing payload validation, malformed JSON recovery, server error masking, 404 handlers |
| **15** | Home Systems & Entity Extraction | `backend/phase10_home_systems.test.ts` | Natural-language equipment extraction, model/serial extraction, room assignment |
| **16** | Permanent Regression Protections | `backend/regression_phase1.test.ts` | ReDoS linear-time parser verification, SSRF host whitelist, format string safety |

### Layer 3: Cross-Domain Flow & Intelligence Integration (`tests/integration/` & `tests/backend/`)
| # | Suite Name | File | Focus Areas |
| :--- | :--- | :--- | :--- |
| **17** | Financial Flow Integration | `integration/financial-flow.test.ts` | End-to-end flow: Document upload -> candidate review -> ledger transaction -> cash flow recalculation |
| **18** | Document Flow Integration | `integration/document-flow.test.ts` | Multi-page invoice processing, duplicate detection, candidate confirmation, asset linking |
| **19** | Copilot & Intelligence Synergy | `integration/intelligence-flow.test.ts` | Copilot retrieving factual health scores, overdue maintenance, and unconfirmed bills |
| **20** | Multi-Tenant Persistence | `integration/persistence.test.ts` | Cross-user data isolation, concurrent tenant operations, database serialization |
| **21** | Privacy & Data Deletion | `backend/privacy.test.ts` | `isDemo` provenance tracking, surgical demo data removal, total account reset confirmation |
| **22** | Production E2E Household User Journeys | `integration/e2e-journeys.test.ts` | Integration-level multi-step journeys simulating real homeowner scenarios (E2E-01 to E2E-08) |
| **23** | Health Intelligence (4 Pillars) | `backend/health_intelligence.test.ts` | Financial Safety, Asset Condition, Maintenance Readiness, Issue Urgency scoring (0–100) |
| **24** | Command Center Aggregations | `backend/command_center.test.ts` | Unified cockpit feed, priority alert sorting, actionable alert thresholds |
| **25** | Sub-5ms Global Search | `backend/global_search.test.ts` | Multi-domain index queries across assets, expenses, tickets, loans, and documents |

### Layer 4: Agentic Copilot & Workflow Orchestration (`tests/backend/`)
| # | Suite Name | File | Focus Areas |
| :--- | :--- | :--- | :--- |
| **26** | Agent Orchestrator Foundation | `backend/agent_orchestrator.test.ts` | Intent classification, minimal context selection, tool execution dispatch |
| **27** | Controlled Agent Tools & Permissions | `backend/agent_tools_permissions.test.ts` | Read-only tool boundary, destructive operation denial, financial remittance restriction |
| **28** | Daily Morning Brief Generator | `backend/morning_brief.test.ts` | 4-part briefing generation, deadline extraction, proactive maintenance recommendations |
| **29** | Agent Action Proposals & Confirmation | `backend/agent_action_approval.test.ts` | Structured proposal generation, user confirmation flow, execution on approval |
| **30** | Agent Activity Timeline | `backend/agent_activity_ui.test.ts` | Chronological activity logging, tool execution transparency, user audit trail |
| **31** | Agent Memory & User Preferences | `backend/agent_notifications_memory.test.ts` | Household preference storage, alert thresholds, conversational memory persistence |
| **32** | Agent Evaluation & Security | `backend/agent_evaluation_security.test.ts` | System prompt override defense, adversarial jailbreak resilience, context boundary isolation |
| **33** | Unified Copilot Multi-Turn UX | `backend/unified_copilot_ux.test.ts` | Multi-turn conversational continuity, bullet formatting, Markdown rendering, deep-link tags |
| **34** | Universal Issues & Safety Diagnostics | `backend/issue_intelligence.test.ts` | Electrical/gas hazard detection, contractor estimate tracking, ticket resolution workflows |
| **35** | Cross-Domain Intelligence Graph | `backend/cross_domain_intelligence.test.ts` | Dynamic graph generation, edge relationships (`COVERED_BY`, `REPORTED_ON`, `BILLED_UNDER`) |
| **36** | Unified Household Actions Engine | `backend/unified_household_actions.test.ts` | Cross-domain recommendation engine, priority calculation, action deep-link generation |
| **37** | Morning Brief UX & Deep-Links | `backend/morning_brief_ux.test.ts` | Structured 4-part payload formatting, action route deep-links, fallback narrative delivery |
| **38** | Showcase Alignment & Localization | `backend/demo_household_alignment.test.ts` | Multi-currency localization, realistic asset-issue-warranty linkages, tenant scoping |
| **39** | Contextual Help & Widget Support | `backend/ui_ux_copilot_help.test.ts` | Help center routing, article search, floating help launcher |

### Layer 5: Security, Secrets & Privacy Hardening (`tests/backend/`)
| # | Suite Name | File | Focus Areas |
| :--- | :--- | :--- | :--- |
| **40** | GA4 Analytics Observability & PII Exclusion | `backend/analytics_observability.test.ts` | GA4 parameter sanitization: zero PII, zero monetary figures, zero prompts/queries |
| **41** | Google Cloud Secret Manager & Production Secrets | `backend/secrets_hardening.test.ts` | Google Cloud Secret Manager resolution, masking in logs, `/api/health` secret confidentiality |

### Layer 6: Product Clarity, Navigation Matrix & Guided Tours (`tests/backend/`)
| # | Suite Name | File | Focus Areas |
| :--- | :--- | :--- | :--- |
| **42** | UX Clarity & State-Aware Briefing | `backend/phase1_clarity_hierarchy_brief.test.ts` | Visual hierarchy, contextual evidence transparency, onboarding state awareness |
| **43** | Entity Navigation & Deep Linking Matrix | `backend/phase2_entity_navigation_matrix.test.ts` | Cross-domain exact source entity routing, sub-tab targeting, invalid route fallback |
| **44** | Guided Tours, Help & AI Status | `backend/phase3_tours_help_privacy_ai_status.test.ts` | 11 walkthrough definitions, Help Center search, footer policies, safe AI status probe |
| **45** | Comprehensive Coverage Expansion | `backend/phase29a_coverage_expansion.test.ts` | Edge-case graph consistency, oversized upload rejection, zero-percent interest simulations |

### Layer 7: Security Red-Team & Adversarial Certification (`tests/backend/`)
| # | Suite Name | File | Focus Areas |
| :--- | :--- | :--- | :--- |
| **46** | Security Hardening & Adversarial Red-Team | `backend/phase30_security_redteam.test.ts` | Attacker token rejection, full multi-domain IDOR denial, SSRF blocking, prompt injection immunity, CSP verification |

---

## 4. Playwright Browser User Journeys

In addition to the 394 automated backend/integration tests, HouseMind includes a **Playwright End-to-End Browser User Journeys suite** (`tests/browser-user-journeys.test.ts`) that boots a full-stack test server (Express + Vite SPA) and drives real browser interactions across **25 certified user journeys**:

1. **JOURNEY-01**: Production Authentication Boundary & Protected Route Isolation
2. **JOURNEY-02**: Google Firebase ID Token Authenticated Session Establishment
3. **JOURNEY-03**: Command Center Executive Cockpit & Needs Attention Triage
4. **JOURNEY-04**: Core Household Graph Lifecycle: Property → Room → Asset → Warranty
5. **JOURNEY-05**: Maintenance Task Diagnostics, Step Checklists & Vendor Assignment
6. **JOURNEY-06**: Household Issues Triage, Auto-Diagnostics & Lifecycle Transitions
7. **JOURNEY-07**: Financial Management: Bank Statement CSV Intake & Transaction Ledger
8. **JOURNEY-08**: Utilities, Debts & Loan EMI Amortization Management
9. **JOURNEY-09**: What-If Financial Decision Simulator & Monthly Cashflow Projections
10. **JOURNEY-10**: Document Vault, Zero-Trust OCR Ingestion & Entity Extractor Review
11. **JOURNEY-11**: Global Household Search (Cmd+K) & Exact Cross-Domain Entity Deep Links
12. **JOURNEY-12**: Household Calendar Agenda, Due-Date Markers & Category Filtering
13. **JOURNEY-13**: Notification Center Alert Triage, Category Channels & Preferences
14. **JOURNEY-14**: Household Profile Settings, Regional Currency Switching & Privacy Center
15. **JOURNEY-15**: Help Center Knowledge Base, Security Guides & FAQs
16. **JOURNEY-16**: Mobile Viewport Responsiveness & Touch Navigation Drawer (390px iPhone)
17. **JOURNEY-17**: Morning Brief Daily Modal Popup-First Entry, Synthesis & Manual Access
18. **JOURNEY-18**: Whole-Product Responsive Audit Across 15 Standard & Compact Viewports (Zero horizontal overflow)
19. **JOURNEY-19**: Copilot Multi-Point Formatting, Markdown Lists & Interactive Source Chips
20. **JOURNEY-20**: Interactive Guided Tours Certification across 11 Walkthroughs, Spotlight & Storage Persistence
21. **JOURNEY-21**: Copilot Multi-Turn Conversational Reasoning, Grounded Context & Follow-Up Understanding
22. **JOURNEY-22**: Copilot State Freshness & Non-Staleness Across Household Mutations
23. **JOURNEY-23**: Copilot Adversarial Prompt Injection Defense, Financial Safeguards & Secret Leak Resistance
24. **JOURNEY-24**: Untrusted Document Upload, Zero-Trust OCR Ingestion & Injection Immunity
25. **JOURNEY-25**: Unified Actions Lifecycle, Evidence Transparency & Dynamic Health Refresh

```bash
# To run all 25 Playwright browser user journeys:
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
