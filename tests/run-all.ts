import { TestRunner, stopTestServer } from './test-helper';
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
import { runFinancialFlowIntegrationTests } from './integration/financial-flow.test';
import { runDocumentFlowIntegrationTests } from './integration/document-flow.test';
import { runIntelligenceFlowIntegrationTests } from './integration/intelligence-flow.test';
import { runPersistenceIntegrationTests } from './integration/persistence.test';
import { runPrivacyTests } from './backend/privacy.test';
import { runPhase10HomeSystemsTests } from './backend/phase10_home_systems.test';
import { runRegressionPhase1Tests } from './backend/regression_phase1.test';
import { runHealthIntelligenceTests } from './backend/health_intelligence.test';
import { runCommandCenterTests } from './backend/command_center.test';
import { runGlobalSearchTests } from './backend/global_search.test';
import { runE2EJourneysTests } from './integration/e2e-journeys.test';
import { runAgentOrchestratorTests } from './backend/agent_orchestrator.test';
import { runAgentToolsPermissionsTests } from './backend/agent_tools_permissions.test';
import { runMorningBriefTests } from './backend/morning_brief.test';
import { runAgentActionApprovalTests } from './backend/agent_action_approval.test';
import { runAgentActivityUITests } from './backend/agent_activity_ui.test';
import { runAgentNotificationsMemoryTests } from './backend/agent_notifications_memory.test';
import { runUnifiedCopilotUXTests } from './backend/unified_copilot_ux.test';
import { runIssueIntelligenceTests } from './backend/issue_intelligence.test';
import { runCrossDomainIntelligenceTests } from './backend/cross_domain_intelligence.test';
import { runUnifiedHouseholdActionsTests } from './backend/unified_household_actions.test';
import { runMorningBriefUXTests } from './backend/morning_brief_ux.test';
import { runDemoHouseholdAlignmentTests } from './backend/demo_household_alignment.test';
import { runUIUXCopilotHelpTests } from './backend/ui_ux_copilot_help.test';
import { runAnalyticsObservabilityTests } from './backend/analytics_observability.test';
import { runSecretsHardeningTests } from './backend/secrets_hardening.test';

async function main() {
  console.log('\n===============================================================');
  console.log('  HOUSEMIND PHASE 1 PRODUCTION RELIABILITY & E2E REGRESSION SUITE');
  console.log('===============================================================\n');

  process.env.NODE_ENV = 'test';
  const runner = new TestRunner();
  const suiteStartTime = performance.now();

  try {
    // Backend Suites
    console.log('--- 1. Authentication & Multi-Tenant Authorization ---');
    await runAuthTests(runner);

    console.log('\n--- 2. Security, Rate Limiting & Proxy Resiliency ---');
    await runSecurityTests(runner);

    console.log('\n--- 3. Household Profile Management ---');
    await runProfileTests(runner);

    console.log('\n--- 4. Recurring Expenses Lifecycle ---');
    await runExpensesTests(runner);

    console.log('\n--- 5. Home Assets & Appliances Lifecycle ---');
    await runAssetsTests(runner);

    console.log('\n--- 6. Intelligence, Burn Rate & Replacement Forecasts ---');
    await runIntelligenceTests(runner);

    console.log('\n--- 7. Financial Transactions & Ledger Overview ---');
    await runTransactionsTests(runner);

    console.log('\n--- 8. Financial Document Ingestion & Candidate Review ---');
    await runDocumentsTests(runner);

    console.log('\n--- 9. Grounded AI Copilot Chat & Injection Defenses ---');
    await runCopilotTests(runner);

    console.log('\n--- 10. What-If Simulator & Decision Intelligence ---');
    await runScenariosTests(runner);

    console.log('\n--- 11. Error Recovery & Graceful Degradation ---');
    await runErrorHandlingTests(runner);

    console.log('\n--- 12. Phase 10: Run the Home Systems & AI Entity Extraction ---');
    await runPhase10HomeSystemsTests(runner);

    console.log('\n--- 13. Phase 1: Permanent Regression Protections & Resilience ---');
    await runRegressionPhase1Tests(runner);

    // Integration Suites
    console.log('\n--- 14. Integration: End-to-End Financial Intelligence Flow ---');
    await runFinancialFlowIntegrationTests(runner);

    console.log('\n--- 15. Integration: Document Processing & Import Flow ---');
    await runDocumentFlowIntegrationTests(runner);

    console.log('\n--- 16. Integration: Intelligence & AI Copilot Synergy ---');
    await runIntelligenceFlowIntegrationTests(runner);

    console.log('\n--- 17. Integration: Database Service & State Persistence ---');
    await runPersistenceIntegrationTests(runner);

    console.log('\n--- 18. Privacy-First Architecture & Demo Data Deletion ---');
    await runPrivacyTests(runner);

    console.log('\n--- 19. Production E2E Household User Journeys (E2E-01 to E2E-08) ---');
    await runE2EJourneysTests(runner);

    console.log('\n--- 20. Phase 3: Household Health Intelligence Engine ---');
    await runHealthIntelligenceTests(runner);

    console.log('\n--- 21. Phase 4: Household Command Center Intelligence ---');
    await runCommandCenterTests(runner);

    console.log('\n--- 22. Phase 5: Global Search & Household-Wide Discovery ---');
    await runGlobalSearchTests(runner);

    console.log('\n--- 23. Phase 15A: Household Agent & Orchestrator Foundation ---');
    await runAgentOrchestratorTests(runner);

    console.log('\n--- 24. Phase 16: Controlled Agent Tools & Permission Engine ---');
    await runAgentToolsPermissionsTests(runner);

    console.log('\n--- 25. Phase 17: Household Morning Brief / Killer Agent Workflow ---');
    await runMorningBriefTests(runner);

    console.log('\n--- 26. Phase 18: Human Approval + Safe Action Execution ---');
    await runAgentActionApprovalTests(runner);

    console.log('\n--- 27. Phase 19: Agent Activity Timeline + Copilot UI Polish ---');
    await runAgentActivityUITests(runner);

    console.log('\n--- 28. Phase 20: Agent Notifications + Controlled Household Context & Memory ---');
    await runAgentNotificationsMemoryTests(runner);

    console.log('\n--- 29. Phase 22: Unified Agentic Copilot UX Across the Entire Application ---');
    await runUnifiedCopilotUXTests(runner);

    console.log('\n--- 30. Phase 24.3: Issue Intelligence & Resolution Intelligence ---');
    await runIssueIntelligenceTests(runner);

    console.log('\n--- 31. Phase 24.4: Universal Cross-Domain Household Intelligence ---');
    await runCrossDomainIntelligenceTests(runner);

    console.log('\n--- 32. Phase 24.5: Unified Household Intelligence & Action Layer ---');
    await runUnifiedHouseholdActionsTests(runner);

    console.log('\n--- 33. Phase 24.6: Morning Brief Popup-First UX ---');
    await runMorningBriefUXTests(runner);

    console.log('\n--- 34. Phase 24.7: Existing Demo Household Intelligence Alignment & Indian Localization ---');
    await runDemoHouseholdAlignmentTests(runner);

    console.log('\n--- 35. Phase 25: Full Product UI/UX Excellence + Copilot + Help & Support ---');
    await runUIUXCopilotHelpTests(runner);

    console.log('\n--- 36. Phase 27: Free GA4 + Production Observability ---');
    await runAnalyticsObservabilityTests(runner);

    console.log('\n--- 37. Phase 28: Google Cloud Secret Manager + Production Secrets Hardening ---');
    await runSecretsHardeningTests(runner);
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
