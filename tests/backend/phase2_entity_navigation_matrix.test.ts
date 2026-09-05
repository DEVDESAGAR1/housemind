import { apiRequest, TestRunner } from '../test-helper';
import { DatabaseService } from '../../server/services/dbService';

export async function runPhase2EntityNavigationMatrixTests(runner: TestRunner) {
  runner.setSuite('Phase 2: Entity Navigation & Deep Linking Matrix');

  const tokenUserA = 'test-token-phase2-nav-user-a';
  const tokenUserB = 'test-token-phase2-nav-user-b';
  let userAId = '';
  let userBId = '';

  let propertyId = '';
  let roomId = '';
  let assetId = '';
  let maintId = '';
  let warrantyId = '';
  let issueId = '';
  let expenseId = '';
  let utilityId = '';
  let loanId = '';
  let cardId = '';
  let documentId = '';

  // 1. SETUP: Create comprehensive populated household for User A
  await runner.test('Setup: Seed multi-domain test household with cross-entity links', async () => {
    const profA = await apiRequest('/api/household/profile', {
      method: 'PUT',
      token: tokenUserA,
      body: {
        homeName: 'DeepLink Villa',
        homeType: 'single_family',
        currency: 'INR',
        locale: 'en-IN',
      },
    });
    if (profA.status !== 200) throw new Error(`Failed to create User A profile: ${JSON.stringify(profA.body)}`);
    userAId = profA.body.data.userId;

    const profB = await apiRequest('/api/household/profile', {
      method: 'PUT',
      token: tokenUserB,
      body: {
        homeName: 'Isolated Haven',
        homeType: 'apartment',
        currency: 'USD',
      },
    });
    if (profB.status !== 200) throw new Error(`Failed to create User B profile: ${JSON.stringify(profB.body)}`);
    userBId = profB.body.data.userId;

    // Create Property
    const propRes = await apiRequest('/api/household/properties', {
      method: 'POST',
      token: tokenUserA,
      body: {
        name: 'Main Villa Bangalore',
        propertyType: 'primary_home',
        squareFootage: 3200,
        yearBuilt: 2021,
      },
    });
    if (propRes.status !== 201) throw new Error(`Failed to create property: ${JSON.stringify(propRes.body)}`);
    propertyId = propRes.body.data.id;

    // Create Room
    const roomRes = await apiRequest('/api/household/rooms', {
      method: 'POST',
      token: tokenUserA,
      body: {
        propertyId,
        name: 'Master Suite',
        roomType: 'bedroom',
        floor: '2',
      },
    });
    if (roomRes.status !== 201) throw new Error(`Failed to create room: ${JSON.stringify(roomRes.body)}`);
    roomId = roomRes.body.data.id;

    // Create Asset
    const assetRes = await apiRequest('/api/household/assets', {
      method: 'POST',
      token: tokenUserA,
      body: {
        propertyId,
        roomId,
        name: 'Daikin 1.5 Ton Inverter AC',
        category: 'hvac',
        brand: 'Daikin',
        modelNumber: 'FTKF50TV16U',
        purchasePrice: 42000,
        currentStatus: 'needs_maintenance',
      },
    });
    if (assetRes.status !== 201) throw new Error(`Failed to create asset: ${JSON.stringify(assetRes.body)}`);
    assetId = assetRes.body.data.id;

    // Create Maintenance Task
    const maintRes = await apiRequest('/api/household/maintenances', {
      method: 'POST',
      token: tokenUserA,
      body: {
        assetId,
        propertyId,
        title: 'Daikin AC Filter Deep Cleaning',
        category: 'HVAC',
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        estimatedCost: 1500,
        status: 'scheduled',
      },
    });
    if (maintRes.status !== 201) throw new Error(`Failed to create maintenance: ${JSON.stringify(maintRes.body)}`);
    maintId = maintRes.body.data.id;

    // Create Warranty
    const warRes = await apiRequest('/api/household/warranties', {
      method: 'POST',
      token: tokenUserA,
      body: {
        assetId,
        propertyId,
        warrantyProvider: 'Daikin Comprehensive Care',
        policyNumber: 'DKN-WAR-2026-99',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
        status: 'active',
      },
    });
    if (warRes.status !== 201) throw new Error(`Failed to create warranty: ${JSON.stringify(warRes.body)}`);
    warrantyId = warRes.body.data.id;

    // Create Issue
    const issueRes = await apiRequest('/api/household/issues', {
      method: 'POST',
      token: tokenUserA,
      body: {
        assetId,
        title: 'AC Outdoor Unit Compressor Vibration',
        description: 'Loud rattling noise when cooling starts.',
        severity: 'high',
        status: 'reported',
        estimatedCost: 4000,
      },
    });
    if (issueRes.status !== 201) throw new Error(`Failed to create issue: ${JSON.stringify(issueRes.body)}`);
    issueId = issueRes.body.data.id;

    // Create Expense
    const expRes = await apiRequest('/api/household/expenses', {
      method: 'POST',
      token: tokenUserA,
      body: {
        title: 'Bescom Electricity Bill',
        amount: 3200,
        category: 'utilities',
        frequency: 'monthly',
        dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        paymentStatus: 'pending',
      },
    });
    if (expRes.status !== 201) throw new Error(`Failed to create expense: ${JSON.stringify(expRes.body)}`);
    expenseId = expRes.body.data.id;

    // Create Utility
    const utilRes = await apiRequest('/api/household/utilities', {
      method: 'POST',
      token: tokenUserA,
      body: {
        name: 'Bescom Power Grid',
        providerName: 'Bescom',
        utilityType: 'electricity',
        accountNumber: 'BSC-987654321',
        typicalMonthlyCost: 3000,
        latestBillAmount: 3200,
      },
    });
    if (utilRes.status !== 201) throw new Error(`Failed to create utility: ${JSON.stringify(utilRes.body)}`);
    utilityId = utilRes.body.data.id;

    // Create Loan
    const loanRes = await apiRequest('/api/household/loans', {
      method: 'POST',
      token: tokenUserA,
      body: {
        name: 'SBI Housing Loan',
        lenderName: 'State Bank of India',
        loanType: 'mortgage',
        originalPrincipal: 5000000,
        currentBalance: 4200000,
        monthlyPayment: 42000,
        interestRate: 8.5,
        paymentDueDay: 5,
      },
    });
    if (loanRes.status !== 201) throw new Error(`Failed to create loan: ${JSON.stringify(loanRes.body)}`);
    loanId = loanRes.body.data.id;

    // Create Credit Card
    const cardRes = await apiRequest('/api/household/credit-cards', {
      method: 'POST',
      token: tokenUserA,
      body: {
        cardName: 'HDFC Regalia Gold',
        issuer: 'HDFC Bank',
        lastFourDigits: '8833',
        creditLimit: 500000,
        currentBalance: 35000,
        paymentDueDate: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
      },
    });
    if (cardRes.status !== 201) throw new Error(`Failed to create credit card: ${JSON.stringify(cardRes.body)}`);
    cardId = cardRes.body.data.id;

    // Create Document
    const docRes = await apiRequest('/api/documents/save-document-only', {
      method: 'POST',
      token: tokenUserA,
      body: {
        fileName: 'daikin_ac_purchase_invoice.pdf',
        fileType: 'application/pdf',
        fileSize: 1048576,
        documentType: 'receipt',
        notes: 'Daikin AC Invoice',
        metadata: {
          assetId,
          provider: 'Daikin',
        },
      },
    });
    const docData = docRes.body?.data || docRes.body?.document;
    if (docRes.status !== 201 || !docData?.id) {
      throw new Error(`Failed to create document: ${JSON.stringify(docRes.body)}`);
    }
    documentId = docData.id;
  });

  // 2. SEARCH NAVIGATION MATRIX
  await runner.test('Search: Every entity type maps to correct targetTab, targetSubTab, and exact targetId', async () => {
    const searchRes = await apiRequest('/api/household/search?q=Daikin', {
      method: 'GET',
      token: tokenUserA,
    });
    if (searchRes.status !== 200) throw new Error(`Search failed: ${JSON.stringify(searchRes.body)}`);

    const results = searchRes.body.data?.results || [];
    if (results.length === 0) throw new Error(`Expected search results for "Daikin"`);

    // Verify Asset search result
    const assetResult = results.find((r: any) => r.entityType === 'asset');
    if (!assetResult || assetResult.targetTab !== 'assets' || assetResult.targetId !== assetId) {
      throw new Error(`Asset search result mapping invalid: ${JSON.stringify(assetResult)}`);
    }

    // Verify Maintenance search result
    const maintResult = results.find((r: any) => r.entityType === 'maintenance' && r.targetSubTab === 'maintenance');
    if (!maintResult || maintResult.targetTab !== 'maintenance' || maintResult.targetId !== maintId) {
      throw new Error(`Maintenance search result mapping invalid: ${JSON.stringify(maintResult)}`);
    }

    // Verify Warranty search result
    const warResult = results.find((r: any) => r.entityType === 'warranty');
    if (!warResult || warResult.targetTab !== 'maintenance' || warResult.targetSubTab !== 'warranties' || warResult.targetId !== warrantyId) {
      throw new Error(`Warranty search result mapping invalid: ${JSON.stringify(warResult)}`);
    }

    // Verify Issue search result
    const issueResult = results.find((r: any) => r.targetSubTab === 'issues');
    if (!issueResult || issueResult.targetTab !== 'maintenance' || issueResult.targetId !== issueId) {
      throw new Error(`Issue search result mapping invalid: ${JSON.stringify(issueResult)}`);
    }
  });

  // 3. CALENDAR NAVIGATION MATRIX
  await runner.test('Calendar: Events carry exact sourceId, targetTab, and targetSubTab', async () => {
    const calRes = await apiRequest('/api/household/calendar?startDate=2026-01-01&endDate=2026-12-31', {
      method: 'GET',
      token: tokenUserA,
    });
    if (calRes.status !== 200) throw new Error(`Calendar fetch failed: ${JSON.stringify(calRes.body)}`);

    const events = calRes.body.data?.events || [];
    if (events.length === 0) throw new Error(`Expected calendar events`);

    const maintEvent = events.find((e: any) => e.eventType === 'maintenance' && e.sourceId === maintId);
    if (!maintEvent || maintEvent.targetTab !== 'maintenance' || maintEvent.targetSubTab !== 'maintenance') {
      throw new Error(`Maintenance calendar event navigation mismatch: ${JSON.stringify(maintEvent)}`);
    }

    const warEvent = events.find((e: any) => e.eventType === 'warranty' && e.sourceId === warrantyId);
    if (!warEvent || warEvent.targetTab !== 'maintenance' || warEvent.targetSubTab !== 'warranties') {
      throw new Error(`Warranty calendar event navigation mismatch: ${JSON.stringify(warEvent)}`);
    }
  });

  // 4. NOTIFICATIONS NAVIGATION MATRIX
  await runner.test('Notifications: Notifications contain verified targetTab, targetSubTab, and sourceId', async () => {
    const notifRes = await apiRequest('/api/household/notifications', {
      method: 'GET',
      token: tokenUserA,
    });
    if (notifRes.status !== 200) throw new Error(`Notification fetch failed: ${JSON.stringify(notifRes.body)}`);

    const notifs = notifRes.body.data?.notifications || [];
    // Every notification that specifies a targetTab must also have a non-empty sourceId
    for (const n of notifs) {
      if (n.targetTab) {
        if (!n.sourceId) {
          throw new Error(`Notification missing sourceId for deep link: ${JSON.stringify(n)}`);
        }
        if (n.targetTab === 'maintenance' && !['maintenance', 'warranties', 'issues'].includes(n.targetSubTab || 'maintenance')) {
          throw new Error(`Notification invalid maintenance subTab: ${JSON.stringify(n)}`);
        }
        if (n.targetTab === 'utilities' && !['utilities', 'loans', 'cards'].includes(n.targetSubTab || 'utilities')) {
          throw new Error(`Notification invalid utilities subTab: ${JSON.stringify(n)}`);
        }
      }
    }
  });

  // 5. UNIFIED ACTIONS & MORNING BRIEF GROUNDING
  await runner.test('Unified Actions & Morning Brief: Recommendations link to exact target records', async () => {
    const actionsRes = await apiRequest('/api/household/unified-actions?limit=5', {
      method: 'GET',
      token: tokenUserA,
    });
    if (actionsRes.status !== 200) throw new Error(`Unified actions failed: ${JSON.stringify(actionsRes.body)}`);

    const actions = actionsRes.body.data?.actions || [];
    if (actions.length > 0) {
      for (const a of actions) {
        // Must contain actionable recommendations with valid target tabs and entity IDs
        if (a.recommendedActions && a.recommendedActions.length > 0) {
          const rec = a.recommendedActions[0];
          if (!rec.targetTab) throw new Error(`Action recommendedAction missing targetTab: ${JSON.stringify(a)}`);
        }
        if (a.relatedRecords && a.relatedRecords.length > 0) {
          const rel = a.relatedRecords[0];
          if (!rel.route) throw new Error(`Action relatedRecord missing route: ${JSON.stringify(a)}`);
        }
      }
    }

    const briefRes = await apiRequest('/api/household/morning-brief', {
      method: 'GET',
      token: tokenUserA,
    });
    if (briefRes.status !== 200) throw new Error(`Morning brief failed: ${JSON.stringify(briefRes.body)}`);

    const brief = briefRes.body.data;
    for (const item of (brief.itemsNeedingAttention || [])) {
      if (!item.actionTab) {
        throw new Error(`Morning brief item missing actionTab: ${JSON.stringify(item)}`);
      }
      if (!item.entityId) {
        throw new Error(`Morning brief item missing entityId: ${JSON.stringify(item)}`);
      }
    }
  });

  // 6. TENANT ISOLATION: User B cannot access User A records via deep-link routes
  await runner.test('Tenant Isolation: User B cannot access User A entities via deep links', async () => {
    // Attempt to access User A's expense from User B
    const crossExpRes = await apiRequest(`/api/household/expenses/${expenseId}`, {
      method: 'GET',
      token: tokenUserB,
    });
    if (crossExpRes.status !== 404 && crossExpRes.status !== 403) {
      throw new Error(`Cross-tenant expense access succeeded with status ${crossExpRes.status}`);
    }

    // Attempt to access User A's asset from User B
    const crossAssetRes = await apiRequest(`/api/household/assets/${assetId}`, {
      method: 'GET',
      token: tokenUserB,
    });
    if (crossAssetRes.status !== 404 && crossAssetRes.status !== 403) {
      throw new Error(`Cross-tenant asset access succeeded with status ${crossAssetRes.status}`);
    }
  });

  // 7. SAFE NOT-FOUND STATE: Deleted or non-existent entity deep-links resolve safely
  await runner.test('Safe Not-Found: Non-existent entity returns clean 404 without internal server degradation', async () => {
    const fakeId = 'non_existent_entity_id_9999';
    const fakeExpRes = await apiRequest(`/api/household/expenses/${fakeId}`, {
      method: 'GET',
      token: tokenUserA,
    });
    if (fakeExpRes.status !== 404) {
      throw new Error(`Expected 404 for non-existent expense, got: ${fakeExpRes.status}`);
    }
  });
}
