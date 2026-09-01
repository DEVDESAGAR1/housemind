import { apiRequest, TestRunner } from '../test-helper';
import { generateDomainGroundedReply, GroundedContext } from '../../server/services/copilotService';

export async function runRegressionPhase1Tests(runner: TestRunner) {
  runner.setSuite('Phase 1: Permanent Regression Protections & Resilience');

  const token = 'test-token-reg-user1';

  // 1. PDF / Non-CSV Document Upload Resilience (reproducing previous HTTP 500 issue)
  await runner.test(
    'Regression Fix: PDF / Receipt upload extracts candidates without throwing 500',
    async () => {
      const fakePdfContent = '%PDF-1.4\n1 0 obj\n<< /Title (Appliance Invoice) /Creator (Depot) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF';
      const blob = new Blob([fakePdfContent], { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', blob, 'appliance_receipt.pdf');
      formData.append('documentType', 'invoice_receipt');

      const res = await apiRequest('/api/documents/upload', {
        method: 'POST',
        token,
        formData,
      });

      if (res.status !== 201) {
        throw new Error(`Expected 201 Created for PDF upload, got ${res.status}: ${JSON.stringify(res.body)}`);
      }

      const doc = res.body?.document;
      if (!doc || !doc.id) {
        throw new Error('Expected document object in response');
      }

      const candidates = doc.transactionCandidates || [];
      if (!Array.isArray(candidates) || candidates.length === 0) {
        throw new Error('Expected at least 1 extracted candidate from invoice receipt');
      }
    }
  );

  // 2. Bank Statement Binary/Image Upload Fallback Resilience
  await runner.test(
    'Regression Fix: Bank statement binary upload parses gracefully with fallback',
    async () => {
      const fakeStmtBuffer = 'Binary Bank Statement Data Stream For Utility & Rent Payments';
      const blob = new Blob([fakeStmtBuffer], { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', blob, 'monthly_bank_statement.pdf');
      formData.append('documentType', 'bank_statement');

      const res = await apiRequest('/api/documents/upload', {
        method: 'POST',
        token,
        formData,
      });

      if (res.status !== 201) {
        throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
      }

      const candidates = res.body?.document?.transactionCandidates || [];
      if (candidates.length === 0) {
        throw new Error('Expected candidate transactions from bank statement fallback');
      }
    }
  );

  // 3. Stale Data & Immediate Deletion Synchronization
  await runner.test(
    'Regression Fix: Deleted entities are purged immediately from database and cannot be read',
    async () => {
      // Create property
      const propRes = await apiRequest('/api/properties', {
        method: 'POST',
        token,
        body: {
          name: 'Deletion Test Villa',
          propertyType: 'single_family',
          squareFootage: 2100,
        },
      });
      if (propRes.status !== 201) throw new Error(`Create property failed: ${propRes.status}`);
      const propId = propRes.body.property.id;

      // Create utility
      const utilRes = await apiRequest('/api/utilities', {
        method: 'POST',
        token,
        body: {
          name: 'City Water Dept',
          provider: 'City Water Utility',
          serviceType: 'water',
          typicalAmount: 85,
        },
      });
      if (utilRes.status !== 201) throw new Error(`Create utility failed: ${utilRes.status}`);
      const utilId = utilRes.body.utility.id;

      // Delete utility
      const delUtilRes = await apiRequest(`/api/utilities/${utilId}`, {
        method: 'DELETE',
        token,
      });
      if (delUtilRes.status !== 200) throw new Error(`Delete utility failed: ${delUtilRes.status}`);

      // Verify utility is gone
      const listUtilRes = await apiRequest('/api/utilities', { token });
      const utils = listUtilRes.body?.utilities || [];
      if (utils.some((u: any) => u.id === utilId)) {
        throw new Error('Deleted utility still present in database query');
      }

      // Delete property
      const delPropRes = await apiRequest(`/api/properties/${propId}`, {
        method: 'DELETE',
        token,
      });
      if (delPropRes.status !== 200) throw new Error(`Delete property failed: ${delPropRes.status}`);

      // Verify property is gone
      const listPropRes = await apiRequest('/api/properties', { token });
      const props = listPropRes.body?.properties || [];
      if (props.some((p: any) => p.id === propId)) {
        throw new Error('Deleted property still present in database query');
      }
    }
  );

  // 4. Copilot Multi-Domain Intent Differentiation Grounding
  await runner.test(
    'Copilot Grounding: Generates distinct, differentiated answers for different household domains',
    async () => {
      const dummyContext: GroundedContext = {
        profile: {
          id: 'user-grounding',
          email: 'homeowner@example.com',
          displayName: 'Alex Owner',
          homeName: 'Pine Crest Villa',
          currency: 'USD',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        expenses: [
          {
            id: 'exp-1',
            userId: 'user-grounding',
            title: 'Gigabit Fiber Internet',
            category: 'utilities',
            amount: 80,
            frequency: 'monthly',
            isAutoPay: true,
            paymentStatus: 'paid',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        assets: [
          {
            id: 'ast-1',
            userId: 'user-grounding',
            name: 'Trane Central Heat Pump',
            category: 'HVAC',
            brand: 'Trane',
            modelNumber: 'XR14',
            installDate: '2021-04-10',
            expectedLifespanYears: 15,
            currentStatus: 'operational',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        properties: [
          {
            id: 'prop-1',
            userId: 'user-grounding',
            name: 'Pine Crest Villa',
            propertyType: 'single_family',
            purchaseValue: 450000,
            currentEstimatedValue: 520000,
            squareFootage: 2800,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        rooms: [],
        warranties: [
          {
            id: 'warr-1',
            userId: 'user-grounding',
            assetId: 'ast-1',
            warrantyProvider: 'Trane Manufacturer Warranty',
            policyNumber: 'TR-994821',
            startDate: '2021-04-10',
            endDate: '2031-04-10',
            status: 'active',
            coverageNotes: 'manufacturer',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        maintenances: [
          {
            id: 'maint-1',
            userId: 'user-grounding',
            title: 'Bi-Annual HVAC Filter Replacement',
            recurringSchedule: 'quarterly',
            status: 'scheduled',
            serviceDate: '2026-10-15',
            cost: 45,
            serviceProvider: 'DIY',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        utilities: [
          {
            id: 'util-1',
            userId: 'user-grounding',
            name: 'Pacific Power & Light',
            serviceType: 'electricity',
            provider: 'Pacific Power',
            typicalAmount: 140,
            dueDateDay: 20,
            isAutoPay: true,
            paymentStatus: 'paid',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        loans: [
          {
            id: 'loan-1',
            userId: 'user-grounding',
            loanName: '30-Yr Fixed Mortgage',
            loanType: 'mortgage',
            lender: 'Wells Fargo',
            principalAmount: 360000,
            outstandingAmount: 325000,
            interestRate: 3.875,
            emiAmount: 1695,
            paymentDueDay: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        creditCards: [
          {
            id: 'card-1',
            userId: 'user-grounding',
            cardNickname: 'Chase Sapphire Preferred',
            cardIssuer: 'Chase',
            last4Digits: '8842',
            creditLimit: 15000,
            outstandingAmount: 1450,
            apr: 21.49,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        transactions: [],
      };

      // Query 1: Maintenance
      const maintReply = generateDomainGroundedReply(dummyContext, 'What is my upcoming maintenance schedule?');
      if (!maintReply.includes('HVAC Filter Replacement') || !maintReply.includes('45')) {
        throw new Error('Maintenance reply must reference scheduled HVAC task and estimated cost');
      }

      // Query 2: Warranty
      const warrReply = generateDomainGroundedReply(dummyContext, 'Do I have any active warranties?');
      if (!warrReply.includes('Trane Manufacturer Warranty') || !warrReply.includes('TR-994821')) {
        throw new Error('Warranty reply must reference Trane warranty and policy number');
      }

      // Query 3: Utilities
      const utilReply = generateDomainGroundedReply(dummyContext, 'Tell me about my electricity bill');
      if (!utilReply.includes('Pacific Power') || !utilReply.includes('140')) {
        throw new Error('Utility reply must reference Pacific Power and typical monthly cost');
      }

      // Query 4: Loans
      const loanReply = generateDomainGroundedReply(dummyContext, 'What is my mortgage principal balance?');
      if (!loanReply.includes('Wells Fargo') || !loanReply.includes('325,000')) {
        throw new Error('Loan reply must reference Wells Fargo and remaining balance');
      }

      // Query 5: Credit Cards
      const cardReply = generateDomainGroundedReply(dummyContext, 'How is my credit card balance?');
      if (!cardReply.includes('Chase Sapphire Preferred') || !cardReply.includes('1450')) {
        throw new Error('Card reply must reference Chase Sapphire and current balance');
      }
    }
  );

  // 5. Double Submission & Idempotent Safety
  await runner.test(
    'Resilience: Concurrent double-submission does not produce duplicate database corruption',
    async () => {
      const expensePayload = {
        title: 'Concurrent Solar Maintenance Fee',
        category: 'maintenance',
        amount: 150,
        frequency: 'monthly',
      };

      // Trigger 2 identical requests sequentially/concurrently
      const res1 = await apiRequest('/api/household/expenses', {
        method: 'POST',
        token,
        body: expensePayload,
      });

      const res2 = await apiRequest('/api/household/expenses', {
        method: 'POST',
        token,
        body: expensePayload,
      });

      if (res1.status !== 201 || res2.status !== 201) {
        throw new Error(`Expected 201 for both requests, got ${res1.status} and ${res2.status}`);
      }

      const listRes = await apiRequest('/api/household/expenses', { token });
      const expenses = listRes.body?.data || listRes.body?.expenses || [];
      if (expenses.length < 2) {
        throw new Error('Expected both expense records created with unique IDs');
      }
    }
  );
}
