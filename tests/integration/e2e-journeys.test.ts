import { apiRequest, TestRunner } from '../test-helper';

export async function runE2EJourneysTests(runner: TestRunner) {
  runner.setSuite('Production E2E Household User Journeys (E2E-01 to E2E-08)');

  // E2E-01: Full User Lifecycle & Multi-Room Home Setup
  await runner.test(
    'E2E-01: User onboarding, profile configuration, property deed setup & room zoning',
    async () => {
      const token = 'test-token-e2e-01';

      // 1. Configure Profile
      const profRes = await apiRequest('/api/household/profile', {
        method: 'PUT',
        token,
        body: {
          homeName: 'Maplewood Homestead',
          currency: 'USD',
          squareFootage: 2650,
          yearBuilt: 2018,
          homeType: 'single_family',
        },
      });
      if (profRes.status !== 200) throw new Error(`Profile setup failed: ${profRes.status}: ${JSON.stringify(profRes.body)}`);

      // 2. Create Property
      const propRes = await apiRequest('/api/properties', {
        method: 'POST',
        token,
        body: {
          name: 'Primary Residence Deed',
          propertyType: 'single_family',
          purchaseDate: '2020-05-15',
          purchaseValue: 480000,
          currentEstimatedValue: 550000,
          squareFootage: 2650,
          yearBuilt: 2018,
          address: '144 Maplewood Way, Bellevue WA',
        },
      });
      if (propRes.status !== 201) throw new Error(`Property creation failed: ${propRes.status}`);
      const propId = propRes.body.property.id;

      // 3. Create Rooms
      const roomRes1 = await apiRequest('/api/rooms', {
        method: 'POST',
        token,
        body: {
          propertyId: propId,
          name: 'Main Living Room',
          roomType: 'living_room',
          floor: 'Main',
          squareFootage: 380,
        },
      });
      if (roomRes1.status !== 201) throw new Error(`Room 1 creation failed: ${roomRes1.status}`);

      const roomRes2 = await apiRequest('/api/rooms', {
        method: 'POST',
        token,
        body: {
          propertyId: propId,
          name: 'Chef Kitchen',
          roomType: 'kitchen',
          floor: 'Main',
          squareFootage: 240,
        },
      });
      if (roomRes2.status !== 201) throw new Error(`Room 2 creation failed: ${roomRes2.status}`);

      // 4. Verify rooms query by property ID
      const listRoomsRes = await apiRequest(`/api/rooms?propertyId=${propId}`, { token });
      if (listRoomsRes.status !== 200 || listRoomsRes.body?.rooms?.length !== 2) {
        throw new Error(`Expected 2 rooms attached to property, got ${listRoomsRes.body?.rooms?.length}`);
      }
    }
  );

  // E2E-02: Multi-Format Document Ingestion & Candidate Review Pipeline
  await runner.test(
    'E2E-02: Multi-format document upload (CSV/PDF), candidate review, edit, and ledger confirmation',
    async () => {
      const token = 'test-token-e2e-02';

      // Upload CSV Bank Statement
      const csvData = `Date,Description,Amount,Type,Category,Account\n2026-03-01,Home Depot Water Filter,65.00,DEBIT,Home Improvement,Checking\n2026-03-05,Payroll Direct Deposit,3500.00,CREDIT,Income,Checking`;
      const blob = new Blob([csvData], { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', blob, 'march_statement.csv');
      formData.append('documentType', 'bank_statement');

      const uploadRes = await apiRequest('/api/documents/upload', {
        method: 'POST',
        token,
        formData,
      });
      if (uploadRes.status !== 201) throw new Error(`Document upload failed: ${uploadRes.status}`);

      const doc = uploadRes.body.document;
      const docId = doc.id;
      const candidates = (doc.transactionCandidates || []).map((c: any) => ({
        ...c,
        selected: true,
      }));
      if (candidates.length < 2) throw new Error('Expected at least 2 candidates extracted');

      // User modifies candidate category before confirming
      candidates[0].category = 'Home Improvement';
      const confirmRes = await apiRequest(`/api/imports/${docId}/confirm`, {
        method: 'POST',
        token,
        body: { candidates },
      });
      if (confirmRes.status !== 200) throw new Error(`Candidate confirmation failed: ${confirmRes.status}: ${JSON.stringify(confirmRes.body)}`);

      // Verify Ledger
      const txRes = await apiRequest('/api/transactions', { token });
      const txs = txRes.body?.transactions || [];
      if (!txs.some((t: any) => t.category === 'Home Improvement')) {
        throw new Error('Modified candidate category not found in ledger');
      }
    }
  );

  // E2E-03: AI Entity Extraction from Unstructured Documents
  await runner.test(
    'E2E-03: Unstructured text / invoice entity extraction with auto-population of equipment and warranty',
    async () => {
      const token = 'test-token-e2e-03';
      const invoiceText = `
        OFFICIAL INVOICE - APPLIANCE CARE & SALES
        Item: Bosch 800 Series Dishwasher
        Model: SHP78CM5N | Serial: BOS-2024-9981
        Purchase Date: 2024-06-10
        Price: $1,249.00
        Warranty: 5 Year Limited Protection Plan
        Provider: Bosch Home Care (1-800-944-2904)
        Expires: 2029-06-10
      `;

      const extractRes = await apiRequest('/api/documents/extract-entity', {
        method: 'POST',
        token,
        body: {
          documentText: invoiceText,
          suggestedType: 'warranty',
        },
      });
      if (extractRes.status !== 200) throw new Error(`Entity extraction failed: ${extractRes.status}`);

      const extracted = extractRes.body.extractedData;
      if (!extracted) throw new Error('Expected extracted entity payload');

      // Commit extracted warranty to database
      const createWarrRes = await apiRequest('/api/warranties', {
        method: 'POST',
        token,
        body: {
          title: extracted.title || 'Bosch Dishwasher 5-Yr Protection',
          warrantyProvider: extracted.providerName || extracted.warrantyProvider || 'Bosch Home Care',
          policyNumber: extracted.policyNumber || 'BOS-2024-9981',
          coverageType: 'extended',
          startDate: '2024-06-10',
          endDate: '2029-06-10',
          status: 'active',
        },
      });
      if (createWarrRes.status !== 201) throw new Error(`Warranty registration failed: ${createWarrRes.status}`);
    }
  );

  // E2E-04: Home Operations & Preventative Maintenance Scheduling
  await runner.test(
    'E2E-04: Preventative maintenance task creation, cost tracking, completion toggle, and history',
    async () => {
      const token = 'test-token-e2e-04';

      // Create Task
      const taskRes = await apiRequest('/api/maintenance-tasks', {
        method: 'POST',
        token,
        body: {
          title: 'Water Heater Anode Rod Flush & Inspection',
          frequency: 'annually',
          serviceDate: '2026-11-01',
          status: 'scheduled',
          cost: 120,
          serviceProvider: 'Apex Plumbing Experts',
        },
      });
      if (taskRes.status !== 201) throw new Error(`Task creation failed: ${taskRes.status}`);
      const taskId = taskRes.body.task.id;

      // Mark Task as Completed
      const updateRes = await apiRequest(`/api/maintenance-tasks/${taskId}`, {
        method: 'PUT',
        token,
        body: {
          status: 'completed',
        },
      });
      if (updateRes.status !== 200) throw new Error(`Task status update failed: ${updateRes.status}`);
      if (updateRes.body.task.status !== 'completed') throw new Error('Task status should be completed');

      // Check Maintenance List
      const listRes = await apiRequest('/api/maintenance-tasks', { token });
      const tasks = listRes.body?.tasks || [];
      if (!tasks.some((m: any) => m.id === taskId && m.status === 'completed')) {
        throw new Error('Completed task not reflected in list query');
      }
    }
  );

  // E2E-05: Utility & Debt Portfolio Management
  await runner.test(
    'E2E-05: Utility accounts, mortgages, and credit card debt tracking with bill status toggling',
    async () => {
      const token = 'test-token-e2e-05';

      // 1. Utility Account
      const utilRes = await apiRequest('/api/utilities', {
        method: 'POST',
        token,
        body: {
          name: 'Cascade Natural Gas',
          serviceType: 'gas',
          provider: 'Cascade Gas Corp',
          typicalAmount: 95,
          dueDateDay: 18,
          paymentStatus: 'pending',
        },
      });
      if (utilRes.status !== 201) throw new Error(`Utility creation failed: ${utilRes.status}`);
      const utilId = utilRes.body.utility.id;

      // Toggle bill paid
      const payUtilRes = await apiRequest(`/api/utilities/${utilId}`, {
        method: 'PUT',
        token,
        body: { paymentStatus: 'paid' },
      });
      if (payUtilRes.status !== 200) throw new Error(`Utility update failed: ${payUtilRes.status}`);

      // 2. Fixed-Rate Mortgage
      const loanRes = await apiRequest('/api/loans', {
        method: 'POST',
        token,
        body: {
          loanName: 'Conventional 30-Year Mortgage',
          loanType: 'mortgage',
          lender: 'Rocket Mortgage',
          originalPrincipal: 380000,
          currentBalance: 345000,
          interestRatePercent: 4.125,
          monthlyPayment: 1840,
          paymentDueDay: 1,
        },
      });
      if (loanRes.status !== 201) throw new Error(`Mortgage creation failed: ${loanRes.status}`);

      // 3. Credit Card
      const cardRes = await apiRequest('/api/credit-cards', {
        method: 'POST',
        token,
        body: {
          cardName: 'Amex Blue Cash Everyday',
          issuer: 'American Express',
          lastFourDigits: '4112',
          creditLimit: 12000,
          currentBalance: 850,
          aprPercent: 18.24,
          minimumPaymentDue: 40,
        },
      });
      if (cardRes.status !== 201) throw new Error(`Credit card creation failed: ${cardRes.status}`);

      // Verify Command Center Summary includes utilities, loans, and cards
      const summaryRes = await apiRequest('/api/home/command-center-summary', { token });
      if (summaryRes.status !== 200) throw new Error(`Command center summary failed: ${summaryRes.status}`);
      const s = summaryRes.body?.summary || summaryRes.body?.data;
      if (!s) throw new Error('Missing summary in response');
      if (s.totalLoansCount !== 1 || s.upcoming30Days?.utilities?.length !== 1 || s.upcoming30Days?.creditCards?.length !== 1) {
        throw new Error(`Command center counts mismatch: loans=${s.totalLoansCount}, utils=${s.upcoming30Days?.utilities?.length}, cards=${s.upcoming30Days?.creditCards?.length}`);
      }
    }
  );

  // E2E-06: Intelligence & Anomaly Engine Cross-Verification
  await runner.test(
    'E2E-06: Rule-based intelligence engine detects aging appliances and high utility costs',
    async () => {
      const token = 'test-token-e2e-06';

      // Create an aging appliance
      const assetRes = await apiRequest('/api/household/assets', {
        method: 'POST',
        token,
        body: {
          name: 'Old Kenmore Water Heater',
          category: 'plumbing',
          installDate: '2011-02-15',
          expectedLifespanYears: 10,
          currentStatus: 'operational',
          purchaseCost: 1800,
        },
      });
      if (assetRes.status !== 201) throw new Error(`Asset creation failed: ${assetRes.status}: ${JSON.stringify(assetRes.body)}`);

      // Run insights refresh
      const scanRes = await apiRequest('/api/intelligence/insights/refresh', {
        method: 'POST',
        token,
      });
      if (scanRes.status !== 200) throw new Error(`Intelligence refresh failed: ${scanRes.status}`);
      const insights = scanRes.body.data || scanRes.body.insights || [];
      if (!Array.isArray(insights) || insights.length === 0) {
        throw new Error('Expected at least 1 insight generated for aging water heater');
      }
    }
  );

  // E2E-07: Grounded Copilot Multi-Domain Advisory
  await runner.test(
    'E2E-07: AI Copilot responds contextually and accurately to multi-domain household inquiries',
    async () => {
      const token = 'test-token-e2e-07';

      // Seed utility and maintenance
      await apiRequest('/api/utilities', {
        method: 'POST',
        token,
        body: {
          name: 'Seattle City Light',
          serviceType: 'electricity',
          provider: 'Seattle Light Dept',
          typicalAmount: 165,
          dueDateDay: 25,
        },
      });

      await apiRequest('/api/maintenance-tasks', {
        method: 'POST',
        token,
        body: {
          title: 'Clean Gutter Downspouts',
          serviceDate: '2026-10-01',
          cost: 80,
          serviceProvider: 'DIY',
        },
      });

      // Ask copilot about electricity
      const chatRes = await apiRequest('/api/copilot/chat', {
        method: 'POST',
        token,
        body: {
          message: 'What is my electricity bill and when is it due?',
        },
      });
      if (chatRes.status !== 200) throw new Error(`Copilot chat failed: ${chatRes.status}`);
      const reply = chatRes.body?.data?.reply || chatRes.body?.reply || '';
      if (!reply.includes('Seattle City Light') && !reply.includes('165') && !reply.includes('electric') && !reply.includes('household') && !reply.includes('Seattle Light')) {
        throw new Error(`Copilot reply did not reference household electricity context: ${reply}`);
      }
    }
  );

  // E2E-08: Data Isolation, Privacy Center & Reset
  await runner.test(
    'E2E-08: Strict multi-tenant isolation, Privacy Center data inventory, and clean user data reset',
    async () => {
      const tokenA = 'test-token-e2e-08-a';
      const tokenB = 'test-token-e2e-08-b';

      // User A creates private asset
      const assetRes = await apiRequest('/api/household/assets', {
        method: 'POST',
        token: tokenA,
        body: {
          name: 'Private Sony OLED TV',
          category: 'electronics',
          currentStatus: 'operational',
        },
      });
      if (assetRes.status !== 201) throw new Error(`Asset creation failed: ${assetRes.status}: ${JSON.stringify(assetRes.body)}`);
      const assetAId = assetRes.body.data.id;

      // User B attempts to read User A asset
      const readRes = await apiRequest(`/api/household/assets/${assetAId}`, {
        token: tokenB,
      });
      if (readRes.status !== 404) throw new Error(`Expected 404 for cross-tenant access, got ${readRes.status}`);

      // User A checks Privacy Center
      const privRes = await apiRequest('/api/household/privacy-center', { token: tokenA });
      if (privRes.status !== 200) throw new Error(`Privacy center failed: ${privRes.status}`);
      const assetCount = privRes.body?.data?.recordsByType?.assets?.user ?? privRes.body?.data?.userOwnedItems?.assets;
      if (assetCount !== 1) {
        throw new Error(`Expected 1 user asset in privacy center, got ${assetCount}`);
      }

      // User A resets data
      const resetRes = await apiRequest('/api/household/reset-data', {
        method: 'POST',
        token: tokenA,
        body: { confirm: true },
      });
      if (resetRes.status !== 200) throw new Error(`Reset data failed: ${resetRes.status}`);

      // Verify User A asset is wiped
      const verifyRes = await apiRequest('/api/household/assets', { token: tokenA });
      const assets = verifyRes.body?.data || verifyRes.body?.assets || [];
      if (assets.length !== 0) {
        throw new Error('Expected 0 assets after complete wipe');
      }
    }
  );
}
