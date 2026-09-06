import { TestRunner, stopTestServer } from './test-helper';

// Unit Test Suites
import { runFinancialMathUnitTests } from './unit/financial-math.test';
import { runTourValidatorUnitTests } from './unit/tour-validator.test';
import { runHealthCalculatorUnitTests } from './unit/health-calculator.test';
import { runBrowserIdentityPaidBillTests } from './unit/browser-identity-paid-bill.test';

// Backend & Domain Integration Suites
import { runAuthTests } from './backend/auth.test';
import { runSecurityTests } from './backend/security.test';
import { runProfileTests } from './backend/profile.test';
import { runExpensesTests } from './backend/expenses.test';
import { runAssetsTests } from './backend/assets.test';
import { runIntelligenceTests } from './backend/intelligence.test';
import { runTransactionsTests } from './backend/transactions.test';
import { runDocumentsTests } from './backend/documents.test';
import { runCopilotTests } from './backend/copilot.test';
import { runScenariosTests } from './backend/scenarios.test';
import { runErrorHandlingTests } from './backend/error-handling.test';
import { runPhase10HomeSystemsTests } from './backend/phase10_home_systems.test';
import { runRegressionPhase1Tests } from './backend/regression_phase1.test';
import { runHealthIntelligenceTests } from './backend/health_intelligence.test';
import { runCommandCenterTests } from './backend/command_center.test';
import { runGlobalSearchTests } from './backend/global_search.test';
import { runAgentOrchestratorTests } from './backend/agent_orchestrator.test';
import { runAgentToolsPermissionsTests } from './backend/agent_tools_permissions.test';
import { runMorningBriefTests } from './backend/morning_brief.test';
import { runAgentActionApprovalTests } from './backend/agent_action_approval.test';
import { runAgentActivityUITests } from './backend/agent_activity_ui.test';
import { runAgentNotificationsMemoryTests } from './backend/agent_notifications_memory.test';
import { runAgentEvaluationSecurityTests } from './backend/agent_evaluation_security.test';
import { runUnifiedCopilotUXTests } from './backend/unified_copilot_ux.test';
import { runIssueIntelligenceTests } from './backend/issue_intelligence.test';
import { runCrossDomainIntelligenceTests } from './backend/cross_domain_intelligence.test';
import { runUnifiedHouseholdActionsTests } from './backend/unified_household_actions.test';
import { runMorningBriefUXTests } from './backend/morning_brief_ux.test';
import { runDemoHouseholdAlignmentTests } from './backend/demo_household_alignment.test';
import { runUIUXCopilotHelpTests } from './backend/ui_ux_copilot_help.test';
import { runAnalyticsObservabilityTests } from './backend/analytics_observability.test';
import { runSecretsHardeningTests } from './backend/secrets_hardening.test';
import { runPhase1ClarityHierarchyBriefTests } from './backend/phase1_clarity_hierarchy_brief.test';
import { runPhase2EntityNavigationMatrixTests } from './backend/phase2_entity_navigation_matrix.test';
import { runPhase3ToursHelpPrivacyAiStatusTests } from './backend/phase3_tours_help_privacy_ai_status.test';
import { runPhase29ACoverageExpansionTests } from './backend/phase29a_coverage_expansion.test';
import { runPhase30SecurityRedTeamTests } from './backend/phase30_security_redteam.test';

// Flow Integration Suites
import { runFinancialFlowIntegrationTests } from './integration/financial-flow.test';
import { runDocumentFlowIntegrationTests } from './integration/document-flow.test';
import { runIntelligenceFlowIntegrationTests } from './integration/intelligence-flow.test';
import { runPersistenceIntegrationTests } from './integration/persistence.test';
import { runPrivacyTests } from './backend/privacy.test';
import { runE2EJourneysTests } from './integration/e2e-journeys.test';

async function main() {
  console.log('\n===============================================================');
  console.log('  HOUSEMIND COMPLETE AUTOMATED TEST ARCHITECTURE & VERIFICATION');
  console.log('===============================================================\n');

  process.env.NODE_ENV = 'test';
  const runner = new TestRunner();
  const suiteStartTime = performance.now();

  try {
    // =========================================================================
    // LAYER 1: UNIT TEST SUITES (Pure Deterministic Logic)
    // =========================================================================
    console.log('=== LAYER 1: UNIT TEST SUITES ===');
    console.log('--- 1. Unit: Financial Mathematics & EMI Calculations ---');
    await runFinancialMathUnitTests(runner);

    console.log('\n--- 2. Unit: Guided Tour Definitions & Structural Step Validation ---');
    await runTourValidatorUnitTests(runner);

    console.log('\n--- 3. Unit: Household Health Composite Scoring & Weighting ---');
    await runHealthCalculatorUnitTests(runner);

    console.log('\n--- 4. Unit: Browser Identity, Favicon & Paid Bill Lifecycle ---');
    await runBrowserIdentityPaidBillTests(runner);

    // =========================================================================
    // LAYER 2: CORE DOMAIN INTEGRATION SUITES
    // =========================================================================
    console.log('\n=== LAYER 2: CORE DOMAIN & SERVICE INTEGRATION SUITES ===');
    console.log('--- 4. Authentication & Multi-Tenant Authorization ---');
    await runAuthTests(runner);

    console.log('\n--- 5. Security Perimeter, Rate Limiting & Proxy Resiliency ---');
    await runSecurityTests(runner);

    console.log('\n--- 6. Household Profile Management ---');
    await runProfileTests(runner);

    console.log('\n--- 7. Recurring Expenses Lifecycle ---');
    await runExpensesTests(runner);

    console.log('\n--- 8. Home Assets & Appliances Lifecycle ---');
    await runAssetsTests(runner);

    console.log('\n--- 9. Intelligence, Burn Rate & Replacement Forecasts ---');
    await runIntelligenceTests(runner);

    console.log('\n--- 10. Financial Transactions & Ledger Overview ---');
    await runTransactionsTests(runner);

    console.log('\n--- 11. Financial Document Ingestion & Candidate Review ---');
    await runDocumentsTests(runner);

    console.log('\n--- 12. Grounded AI Copilot Chat & Injection Defenses ---');
    await runCopilotTests(runner);

    console.log('\n--- 13. What-If Simulator & Decision Intelligence ---');
    await runScenariosTests(runner);

    console.log('\n--- 14. Error Recovery & Graceful Degradation ---');
    await runErrorHandlingTests(runner);

    console.log('\n--- 15. Home Systems & AI Entity Extraction ---');
    await runPhase10HomeSystemsTests(runner);

    console.log('\n--- 16. Permanent Regression Protections & Resilience ---');
    await runRegressionPhase1Tests(runner);

    // =========================================================================
    // LAYER 3: CROSS-DOMAIN FLOW & INTELLIGENCE INTEGRATION
    // =========================================================================
    console.log('\n=== LAYER 3: CROSS-DOMAIN FLOW & INTELLIGENCE SUITES ===');
    console.log('--- 17. Integration: End-to-End Financial Intelligence Flow ---');
    await runFinancialFlowIntegrationTests(runner);

    console.log('\n--- 18. Integration: Document Processing & Import Flow ---');
    await runDocumentFlowIntegrationTests(runner);

    console.log('\n--- 19. Integration: Intelligence & AI Copilot Synergy ---');
    await runIntelligenceFlowIntegrationTests(runner);

    console.log('\n--- 20. Integration: Database Service & State Persistence ---');
    await runPersistenceIntegrationTests(runner);

    console.log('\n--- 21. Privacy-First Architecture & Demo Data Deletion ---');
    await runPrivacyTests(runner);

    console.log('\n--- 22. Production E2E Household User Journeys (E2E-01 to E2E-08) ---');
    await runE2EJourneysTests(runner);

    console.log('\n--- 23. Household Health Intelligence Engine ---');
    await runHealthIntelligenceTests(runner);

    console.log('\n--- 24. Household Command Center Intelligence ---');
    await runCommandCenterTests(runner);

    console.log('\n--- 25. Global Search & Household-Wide Discovery ---');
    await runGlobalSearchTests(runner);

    // =========================================================================
    // LAYER 4: AGENTIC COPILOT & WORKFLOW ORCHESTRATION
    // =========================================================================
    console.log('\n=== LAYER 4: AGENTIC COPILOT & WORKFLOW SUITES ===');
    console.log('--- 26. Household Agent & Orchestrator Foundation ---');
    await runAgentOrchestratorTests(runner);

    console.log('\n--- 27. Controlled Agent Tools & Permission Engine ---');
    await runAgentToolsPermissionsTests(runner);

    console.log('\n--- 28. Household Morning Brief Workflow ---');
    await runMorningBriefTests(runner);

    console.log('\n--- 29. Human Approval & Safe Action Execution Gate ---');
    await runAgentActionApprovalTests(runner);

    console.log('\n--- 30. Agent Activity Timeline & UI Audit Log ---');
    await runAgentActivityUITests(runner);

    console.log('\n--- 31. Agent Notifications & Controlled Household Memory ---');
    await runAgentNotificationsMemoryTests(runner);

    console.log('\n--- 32. Adversarial Agent Evaluation & Security Hardening ---');
    await runAgentEvaluationSecurityTests(runner);

    console.log('\n--- 33. Unified Agentic Copilot UX Across Application ---');
    await runUnifiedCopilotUXTests(runner);

    // =========================================================================
    // LAYER 5: DOMAIN INTELLIGENCE & USER ASSISTANCE
    // =========================================================================
    console.log('\n=== LAYER 5: DOMAIN INTELLIGENCE & USER ASSISTANCE SUITES ===');
    console.log('--- 34. Issue Intelligence & Resolution Reasoning ---');
    await runIssueIntelligenceTests(runner);

    console.log('\n--- 35. Universal Cross-Domain Household Intelligence ---');
    await runCrossDomainIntelligenceTests(runner);

    console.log('\n--- 36. Unified Household Intelligence & Action Layer ---');
    await runUnifiedHouseholdActionsTests(runner);

    console.log('\n--- 37. Morning Brief Popup-First UX ---');
    await runMorningBriefUXTests(runner);

    console.log('\n--- 38. Demo Household Intelligence Alignment & Indian Localization ---');
    await runDemoHouseholdAlignmentTests(runner);

    console.log('\n--- 39. Full Product UI/UX Excellence & Help Center ---');
    await runUIUXCopilotHelpTests(runner);

    // =========================================================================
    // LAYER 6: SECURITY, SECRETS & OBSERVABILITY
    // =========================================================================
    console.log('\n=== LAYER 6: SECURITY, SECRETS & OBSERVABILITY SUITES ===');
    console.log('--- 40. GA4 Analytics Observability & PII Exclusion ---');
    await runAnalyticsObservabilityTests(runner);

    console.log('\n--- 41. Google Cloud Secret Manager & Production Secrets Hardening ---');
    await runSecretsHardeningTests(runner);

    // =========================================================================
    // LAYER 7: PRODUCT CLARITY, NAVIGATION & TOURS
    // =========================================================================
    console.log('\n=== LAYER 7: CLARITY, NAVIGATION & TOURS SUITES ===');
    console.log('--- 42. UX Clarity, Card Hierarchy & State-Aware Briefing ---');
    await runPhase1ClarityHierarchyBriefTests(runner);

    console.log('\n--- 43. Entity Navigation & Deep Linking Matrix ---');
    await runPhase2EntityNavigationMatrixTests(runner);

    console.log('\n--- 44. Guided Tours, Help & Support, Footer & AI Status ---');
    await runPhase3ToursHelpPrivacyAiStatusTests(runner);

    console.log('\n--- 45. Comprehensive Coverage Expansion & Edge Case Hardening ---');
    await runPhase29ACoverageExpansionTests(runner);

    console.log('\n--- 46. Security Hardening & Adversarial Red-Team Certification ---');
    await runPhase30SecurityRedTeamTests(runner);
  } finally {
    await stopTestServer();
  }

  const totalDurationMs = Math.round(performance.now() - suiteStartTime);
  const summary = runner.getSummary();

  console.log('\n===============================================================');
  console.log('  TEST EXECUTION SUMMARY');
  console.log('===============================================================');
  console.log(`  Total Tests Executed: ${summary.total}`);
  console.log(`  Passed:               ${summary.passed} (${Math.round((summary.passed / summary.total) * 100)}%)`);
  console.log(`  Failed:               ${summary.failed}`);
  console.log(`  Execution Time:       ${totalDurationMs} ms`);
  console.log('===============================================================\n');

  if (summary.failed > 0) {
    console.error('FAILED TESTS:');
    summary.results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.error(`  - [${r.suite}] ${r.name}: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED SUCCESSFULLY.\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
