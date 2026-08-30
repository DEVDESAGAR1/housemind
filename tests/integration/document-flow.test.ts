import { apiRequest, TestRunner } from '../test-helper';

export async function runDocumentFlowIntegrationTests(runner: TestRunner) {
  runner.setSuite('Integration: Document Processing & Import Lifecycle');

  const userId = 'e2e-doc-user';
  const token = `test-token-${userId}`;

  let docId = '';
  let candidateList: any[] = [];

  await runner.test('E2E: Upload credit card statement and verify candidate extraction', async () => {
    const csvContent = `Date,Description,Amount,Category,Reference
2026-08-12,Whole Foods Market #1024,142.50,Groceries,TXN-991823
2026-08-18,Amazon Marketplace Return Refund,-48.20,Shopping,REF-449102
2026-08-22,Blue Bottle Coffee Espresso,6.50,Dining,TXN-881920`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, 'chase-sapphire-aug2026.csv');
    formData.append('documentType', 'credit_card_statement');

    const uploadRes = await apiRequest('/api/documents/upload', {
      method: 'POST',
      token,
      formData,
    });

    if (uploadRes.status !== 201) {
      throw new Error(`Upload failed: ${uploadRes.status}: ${JSON.stringify(uploadRes.body)}`);
    }

    docId = uploadRes.body.document.id;
    candidateList = uploadRes.body.document.transactionCandidates;

    if (candidateList.length < 3) {
      throw new Error(`Expected at least 3 candidates, got ${candidateList.length}`);
    }
  });

  await runner.test('E2E: User edits a candidate category prior to confirmation', async () => {
    // User modifies category of Whole Foods from Groceries to "Specialty Food"
    candidateList[0].category = 'Specialty Food';

    const confirmRes = await apiRequest(`/api/imports/${docId}/confirm`, {
      method: 'POST',
      token,
      body: {
        documentId: docId,
        candidates: candidateList,
        accountOverride: 'Chase Sapphire Preferred (*9921)',
      },
    });

    if (confirmRes.status !== 200) {
      throw new Error(`Import confirmation failed: ${confirmRes.status}`);
    }
    if (confirmRes.body.confirmedCount !== candidateList.length) {
      throw new Error(`Expected ${candidateList.length} imported, got ${confirmRes.body.confirmedCount}`);
    }
  });

  await runner.test('E2E: Verify imported transactions reflect user overrides in ledger', async () => {
    const listRes = await apiRequest('/api/transactions?account=Chase+Sapphire+Preferred+(*9921)', { token });
    if (listRes.status !== 200) {
      throw new Error(`Failed to fetch account transactions: ${listRes.status}`);
    }

    const modifiedItem = listRes.body.transactions.find((t: any) => t.description.includes('Whole Foods'));
    if (!modifiedItem) {
      throw new Error('Whole Foods transaction not found in ledger');
    }
    if (modifiedItem.category !== 'Specialty Food') {
      throw new Error(`Expected overridden category 'Specialty Food', got '${modifiedItem.category}'`);
    }
  });
}
