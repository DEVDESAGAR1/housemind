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

async function main() {
  console.log('\n===============================================================');
  console.log('  HOUSEMIND PHASE 5 RELEASE CANDIDATE TEST SUITE EXECUTION');
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

    // Integration Suites
    console.log('\n--- 11. Integration: End-to-End Financial Intelligence Flow ---');
    await runFinancialFlowIntegrationTests(runner);

    console.log('\n--- 12. Integration: Document Processing & Import Flow ---');
    await runDocumentFlowIntegrationTests(runner);

    console.log('\n--- 13. Integration: Intelligence & AI Copilot Synergy ---');
    await runIntelligenceFlowIntegrationTests(runner);

    console.log('\n--- 14. Integration: Database Service & State Persistence ---');
    await runPersistenceIntegrationTests(runner);
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
