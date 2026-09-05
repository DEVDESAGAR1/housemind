import fs from 'fs';
import path from 'path';
import { apiRequest, TestRunner } from '../test-helper';

export async function runDocumentsTests(runner: TestRunner) {
  runner.setSuite('Document Intake, Verification & Transaction Extraction');

  const token = 'test-token-doc-user';
  let uploadedDocId = '';
  let candidates: any[] = [];

  await runner.test('uploads and parses bank statement CSV extracting candidates without premature ledger commitment', async () => {
    const csvContent = `Date,Description,Debit,Credit,Balance,Category
2026-08-01,TechCorp Net Payroll Direct Deposit,,4500.00,7240.50,Salary
2026-08-02,ACH Autopay First National Mortgage,1850.00,,5390.50,Housing
2026-08-05,City Power & Electric Utility,210.00,,5180.50,Utilities`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, 'bank-statement-aug2026.csv');
    formData.append('documentType', 'bank_statement');

    const res = await apiRequest('/api/documents/upload', {
      method: 'POST',
      token,
      formData,
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const doc = res.body?.document;
    if (!doc || !doc.id) {
      throw new Error('Document record missing from upload response');
    }

    uploadedDocId = doc.id;
    candidates = doc.transactionCandidates || [];

    if (doc.status !== 'pending_review') {
      throw new Error(`Expected document status 'pending_review', got ${doc.status}`);
    }

    if (candidates.length < 3) {
      throw new Error(`Expected at least 3 candidates extracted, got ${candidates.length}`);
    }

    // Verify unconfirmed candidates have NOT yet become transactions in the user ledger
    const txRes = await apiRequest('/api/transactions', { token });
    if (txRes.body.transactions.length !== 0) {
      throw new Error('Unconfirmed document candidates leaked into transactions ledger before explicit review!');
    }
  });

  await runner.test('returns document review payload with extracted candidate list', async () => {
    const res = await apiRequest(`/api/documents/${uploadedDocId}`, { token });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }
    if (res.body.document.id !== uploadedDocId) {
      throw new Error('Document ID mismatch');
    }
  });

  await runner.test('commits confirmed candidate items to user transactions ledger upon explicit approval', async () => {
    const res = await apiRequest(`/api/imports/${uploadedDocId}/confirm`, {
      method: 'POST',
      token,
      body: {
        documentId: uploadedDocId,
        candidates: candidates.map((c) => ({ ...c, selected: true })),
        accountOverride: 'Primary Checking (*4822)',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK for confirm, got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    if (res.body.confirmedCount !== candidates.length) {
      throw new Error(`Expected ${candidates.length} confirmed, got ${res.body.confirmedCount}`);
    }

    // Verify transactions now exist in ledger
    const txRes = await apiRequest('/api/transactions', { token });
    if (txRes.body.transactions.length !== candidates.length) {
      throw new Error(`Expected ${candidates.length} transactions in ledger, found ${txRes.body.transactions.length}`);
    }
  });

  await runner.test('detects and flags duplicate transactions on re-upload of matching statement data', async () => {
    const csvContent = `Date,Description,Debit,Credit,Balance,Category
2026-08-01,TechCorp Net Payroll Direct Deposit,,4500.00,7240.50,Salary
2026-08-02,ACH Autopay First National Mortgage,1850.00,,5390.50,Housing
2026-08-20,New Unique Coffee Purchase,5.50,,5175.00,Dining`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, 'bank-statement-aug2026-v2.csv');

    const res = await apiRequest('/api/documents/upload', {
      method: 'POST',
      token,
      formData,
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}`);
    }

    const newCandidates = res.body.document.transactionCandidates || [];
    const dups = newCandidates.filter((c: any) => c.isDuplicate);

    if (dups.length === 0) {
      throw new Error('Duplicate detection failed to flag identical fingerprint transactions');
    }
  });

  await runner.test('rejects document import flow without creating ledger transactions', async () => {
    // Upload a doc to reject
    const blob = new Blob(['Date,Description,Debit\n2026-08-01,Test To Reject,100.00'], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, 'reject-test.csv');

    const upRes = await apiRequest('/api/documents/upload', {
      method: 'POST',
      token,
      formData,
    });

    const docId = upRes.body.document.id;
    const initialTxCount = (await apiRequest('/api/transactions', { token })).body.transactions.length;

    const rejRes = await apiRequest(`/api/imports/${docId}/reject`, {
      method: 'POST',
      token,
      body: {
        documentId: docId,
        reason: 'Incorrect statement period',
      },
    });

    if (rejRes.status !== 200) {
      throw new Error(`Expected 200 OK for rejection, got ${rejRes.status}`);
    }

    const docRes = await apiRequest(`/api/documents/${docId}`, { token });
    if (docRes.body.document.status !== 'rejected') {
      throw new Error(`Expected document status 'rejected', got ${docRes.body.document.status}`);
    }

    const finalTxCount = (await apiRequest('/api/transactions', { token })).body.transactions.length;
    if (finalTxCount !== initialTxCount) {
      throw new Error('Rejected document created unwanted transactions in ledger!');
    }
  });

  await runner.test('checks for pre-upload duplicate file records accurately', async () => {
    const checkRes = await apiRequest('/api/documents/check-duplicate', {
      method: 'POST',
      token,
      body: {
        fileName: 'bank-statement-aug2026.csv',
      },
    });

    if (checkRes.status !== 200) {
      throw new Error(`Expected 200 OK for check-duplicate, got ${checkRes.status}`);
    }

    if (!checkRes.body.isDuplicate) {
      throw new Error('Expected isDuplicate to be true for previously uploaded file name');
    }
  });

  await runner.test('saves standalone document records directly without child entity generation', async () => {
    const res = await apiRequest('/api/documents/save-document-only', {
      method: 'POST',
      token,
      body: {
        fileName: 'homeowner-manual.pdf',
        fileType: 'application/pdf',
        fileSize: 1048576,
        documentType: 'other',
        notes: 'Home appliances user guide archive',
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created for save-document-only, got ${res.status}`);
    }

    const doc = res.body.document;
    if (!doc || !doc.id || doc.status !== 'confirmed') {
      throw new Error('Document was not saved with status confirmed');
    }
  });
}
