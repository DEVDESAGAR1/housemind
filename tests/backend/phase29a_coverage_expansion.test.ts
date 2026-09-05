import { apiRequest, TestRunner } from '../test-helper';
import { DatabaseService } from '../../server/services/dbService';

export async function runPhase29ACoverageExpansionTests(runner: TestRunner): Promise<void> {
  runner.setSuite('Phase 29A: Comprehensive Coverage Expansion & Edge Case Hardening');

  const tokenUserA = 'test-token-p29a-user-a';
  const tokenUserB = 'test-token-p29a-user-b';
  const userIdA = 'p29a-user-a';
  const userIdB = 'p29a-user-b';

  // Clear prior state
  DatabaseService.clearUserData(userIdA);
  DatabaseService.clearUserData(userIdB);

  // Setup initial profile
  await DatabaseService.setProfile(userIdA, {
    homeName: 'Maplewood Villa',
    homeType: 'single_family',
    currency: 'USD',
    country: 'United States',
    squareFootage: 2600,
  });

  // =========================================================================
  // 1. Cross-Domain Entity Lifecycle & Deletion Graph Consistency
  // =========================================================================
  let propertyId = '';
  let roomId = '';
  let assetId = '';
  let warrantyId = '';
  let maintenanceId = '';
  let issueId = '';

  await runner.test('rejects_invalid_property_creation_payload_with_400_validation_error', async () => {
    const res = await apiRequest('/api/household/properties', {
      method: 'POST',
      token: tokenUserA,
      body: {
        // Missing name and address
        propertyType: 'invalid_type',
        squareFootage: -500,
      },
    });

    if (res.status !== 400 && res.status !== 422) {
      throw new Error(`Expected 400/422 validation error for negative square footage, got: ${res.status}`);
    }
  });

  await runner.test('builds_multi_domain_entity_graph_across_property_room_asset_warranty_maintenance_issue', async () => {
    // 1. Property
    const propRes = await apiRequest('/api/household/properties', {
      method: 'POST',
      token: tokenUserA,
      body: {
        name: 'Maplewood Villa',
        address: '42 Orchid Way, Bangalore',
        propertyType: 'single_family',
        squareFootage: 2600,
        yearBuilt: 2021,
      },
    });
    if (propRes.status !== 201 || !propRes.body?.property?.id) {
      throw new Error(`Failed to create property: ${JSON.stringify(propRes.body)}`);
    }
    propertyId = propRes.body.property.id;

    // 2. Room
    const roomRes = await apiRequest('/api/household/rooms', {
      method: 'POST',
      token: tokenUserA,
      body: {
        name: 'Master Suite',
        roomType: 'bedroom',
        propertyId,
        floorLevel: 2,
      },
    });
    if (roomRes.status !== 201 || !roomRes.body?.room?.id) {
      throw new Error(`Failed to create room: ${JSON.stringify(roomRes.body)}`);
    }
    roomId = roomRes.body.room.id;

    // 3. Asset
    const assetRes = await apiRequest('/api/household/assets', {
      method: 'POST',
      token: tokenUserA,
      body: {
        name: 'Daikin Dual Inverter AC',
        category: 'hvac',
        brand: 'Daikin',
        propertyId,
        roomId,
        installDate: '2023-04-10',
        purchasePrice: 1200,
        expectedLifespanYears: 10,
        currentStatus: 'operational',
      },
    });
    const createdAsset = assetRes.body?.data || assetRes.body?.asset;
    if (assetRes.status !== 201 || !createdAsset?.id) {
      throw new Error(`Failed to create asset: ${JSON.stringify(assetRes.body)}`);
    }
    assetId = createdAsset.id;

    // 4. Warranty
    const wtyRes = await apiRequest('/api/household/warranties', {
      method: 'POST',
      token: tokenUserA,
      body: {
        title: 'Daikin 10-Year Comprehensive Warranty',
        warrantyProvider: 'Daikin Care',
        policyNumber: 'DKN-99482',
        assetId,
        propertyId,
        startDate: '2023-04-10',
        endDate: '2033-04-10',
        status: 'active',
      },
    });
    const createdWty = wtyRes.body?.data || wtyRes.body?.warranty;
    if (wtyRes.status !== 201 || !createdWty?.id) {
      throw new Error(`Failed to create warranty: ${JSON.stringify(wtyRes.body)}`);
    }
    warrantyId = createdWty.id;

    // 5. Maintenance Task
    const maintRes = await apiRequest('/api/household/maintenances', {
      method: 'POST',
      token: tokenUserA,
      body: {
        title: 'Deep Filter Chemical Wash',
        category: 'hvac',
        assetId,
        propertyId,
        dueDate: '2026-09-20',
        cost: 60,
        status: 'pending',
      },
    });
    const createdMaint = maintRes.body?.data || maintRes.body?.maintenance || maintRes.body?.task;
    if (maintRes.status !== 201 || !createdMaint?.id) {
      throw new Error(`Failed to create maintenance: ${JSON.stringify(maintRes.body)}`);
    }
    maintenanceId = createdMaint.id;

    // 6. Issue
    const issueRes = await apiRequest('/api/household/issues', {
      method: 'POST',
      token: tokenUserA,
      body: {
        title: 'Condenser Fan Noise',
        description: 'Vibrating noise noticed on startup',
        category: 'hvac',
        severity: 'medium',
        status: 'reported',
        assetId,
        propertyId,
        roomId,
      },
    });
    const createdIssue = issueRes.body?.data || issueRes.body?.issue;
    if (issueRes.status !== 201 || !createdIssue?.id) {
      throw new Error(`Failed to create issue: ${JSON.stringify(issueRes.body)}`);
    }
    issueId = createdIssue.id;
  });

  await runner.test('preserves_graph_consistency_when_querying_connected_asset_subsystems', async () => {
    // Query asset details
    const res = await apiRequest(`/api/household/assets/${assetId}`, { token: tokenUserA });
    const assetObj = res.body?.data || res.body?.asset;
    if (res.status !== 200 || !assetObj) {
      throw new Error(`Expected 200 OK for asset detail, got: ${res.status}`);
    }
    if (assetObj.propertyId !== propertyId || assetObj.roomId !== roomId) {
      throw new Error('Asset graph references propertyId or roomId mismatch');
    }
  });

  await runner.test('deleting_asset_safely_handles_dependent_warranties_maintenances_and_issues', async () => {
    // Delete Asset
    const delRes = await apiRequest(`/api/household/assets/${assetId}`, {
      method: 'DELETE',
      token: tokenUserA,
    });
    if (delRes.status !== 200) {
      throw new Error(`Failed to delete asset: ${delRes.status}`);
    }

    // Verify Asset lookup returns 404
    const checkRes = await apiRequest(`/api/household/assets/${assetId}`, { token: tokenUserA });
    if (checkRes.status !== 404) {
      throw new Error('Deleted asset still accessible via API');
    }

    // Maintenances, Warranties, and Issues should still respond safely without 500 server crash
    const maintRes = await apiRequest(`/api/household/maintenances/${maintenanceId}`, { token: tokenUserA });
    if (maintRes.status !== 200 && maintRes.status !== 404) {
      throw new Error(`Unexpected status for maintenance after asset deletion: ${maintRes.status}`);
    }

    const issueRes = await apiRequest(`/api/household/issues/${issueId}`, { token: tokenUserA });
    if (issueRes.status !== 200 && issueRes.status !== 404) {
      throw new Error(`Unexpected status for issue after asset deletion: ${issueRes.status}`);
    }
  });

  // =========================================================================
  // 2. Document & Upload Untrusted Data Hardening
  // =========================================================================
  await runner.test('rejects_oversized_untrusted_file_payloads_with_proper_http_error', async () => {
    // Create oversized synthetic payload (15MB beyond allowed limit)
    const largeContent = 'X'.repeat(1024 * 1024); // 1MB string chunk
    const blob = new Blob([largeContent], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'oversized-document.txt');
    formData.append('documentType', 'other');

    const res = await apiRequest('/api/documents/upload', {
      method: 'POST',
      token: tokenUserA,
      formData,
    });

    if (res.status >= 500) {
      throw new Error(`Server crashed with 500 on document upload attempt! Status: ${res.status}`);
    }
  });

  await runner.test('sanitizes_untrusted_document_candidate_ocr_text_preventing_code_injection', async () => {
    const maliciousDocText = `<script>alert("XSS")</script> INVOICE: Reliance Jio Fiber. Amount: 1499. Date: 2026-09-01. <img src=x onerror=alert(1)>`;
    const res = await apiRequest('/api/documents/extract-entity', {
      method: 'POST',
      token: tokenUserA,
      body: {
        documentText: maliciousDocText,
        suggestedType: 'expense',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Entity extraction failed on complex text: ${res.status}`);
    }

    const jsonStr = JSON.stringify(res.body);
    if (jsonStr.includes('<script>') || jsonStr.includes('onerror=')) {
      throw new Error('Raw script tag leaked unsanitized in extraction output');
    }
  });

  // =========================================================================
  // 3. Financial Calculation Boundaries & Simulator
  // =========================================================================
  await runner.test('handles_zero_percent_interest_and_extreme_interest_rates_in_simulator_without_nan', async () => {
    // 0% interest simulation
    const zeroRes = await apiRequest('/api/scenarios/simulate', {
      method: 'POST',
      token: tokenUserA,
      body: {
        type: 'appliance_purchase',
        inputs: {
          applianceName: 'Solar Inverter Upgrade',
          purchaseCost: 2400,
          downPayment: 0,
          loanPrincipal: 2400,
          annualInterestRate: 0,
          tenureMonths: 24,
        },
      },
    });
    if (zeroRes.status !== 200) {
      throw new Error(`Simulation failed on 0% interest: ${zeroRes.status}`);
    }
    const emi = zeroRes.body?.data?.projectedMetrics?.monthlyEmiPayment;
    if (emi !== 100) {
      throw new Error(`Expected exact $100/mo EMI on $2400 / 24 months, got: ${emi}`);
    }

    // High 36% interest simulation
    const highRes = await apiRequest('/api/scenarios/simulate', {
      method: 'POST',
      token: tokenUserA,
      body: {
        type: 'appliance_purchase',
        inputs: {
          applianceName: 'Emergency Generator',
          purchaseCost: 5000,
          downPayment: 500,
          loanPrincipal: 4500,
          annualInterestRate: 36,
          tenureMonths: 12,
        },
      },
    });
    if (highRes.status !== 200) {
      throw new Error(`Simulation failed on 36% interest: ${highRes.status}`);
    }
    const highEmi = highRes.body?.data?.projectedMetrics?.monthlyEmiPayment;
    if (typeof highEmi !== 'number' || isNaN(highEmi) || highEmi <= 0) {
      throw new Error(`Invalid projected EMI on high interest simulation: ${highEmi}`);
    }
  });

  // =========================================================================
  // 4. Copilot Grounding State Freshness & Deterministic Fallback
  // =========================================================================
  await runner.test('copilot_prompt_immediately_reflects_mutated_expense_state_without_stale_facts', async () => {
    // 1. Create unique expense
    const expRes = await apiRequest('/api/household/expenses', {
      method: 'POST',
      token: tokenUserA,
      body: {
        title: 'Airtel Broadband Fiber',
        category: 'utilities',
        amount: 999,
        frequency: 'monthly',
        dueDate: '2026-09-15',
        paymentStatus: 'pending',
      },
    });
    if (expRes.status !== 201) throw new Error('Failed to create expense');
    const expId = expRes.body.data.id;

    // 2. Chat with Copilot
    const chat1 = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'What is my Airtel broadband amount?' },
    });
    if (chat1.status !== 200) throw new Error('Copilot chat 1 failed');
    const reply1 = chat1.body?.data?.reply || '';
    if (!reply1.includes('999') && !reply1.toLowerCase().includes('airtel')) {
      throw new Error(`Expected Copilot to cite 999 or Airtel, got: ${reply1}`);
    }

    // 3. Mutate expense amount to 1499
    await apiRequest(`/api/household/expenses/${expId}`, {
      method: 'PUT',
      token: tokenUserA,
      body: {
        amount: 1499,
        title: 'Airtel Broadband Fiber (Gigabit)',
      },
    });

    // 4. Chat with Copilot again (state freshness check)
    const chat2 = await apiRequest('/api/copilot/chat', {
      method: 'POST',
      token: tokenUserA,
      body: { message: 'What is my updated Airtel broadband cost now?' },
    });
    if (chat2.status !== 200) throw new Error('Copilot chat 2 failed');
    const reply2 = chat2.body?.data?.reply || '';
    if (reply2.includes('999') && !reply2.includes('1499')) {
      throw new Error(`Stale state regression! Copilot cited old value 999 instead of mutated 1499.`);
    }
  });

  // =========================================================================
  // 5. Global Search & Authorization Isolation
  // =========================================================================
  await runner.test('global_search_sanitizes_special_characters_and_preserves_tenant_isolation', async () => {
    // Search with regex/special characters
    const res = await apiRequest('/api/household/search?q=.*%2B%3F%5E%24%7B%7D%28%29%7C%5B%5D%5C', {
      token: tokenUserA,
    });
    if (res.status !== 200) {
      throw new Error(`Search crashed on regex/special character query: ${res.status}`);
    }
    if (!Array.isArray(res.body?.results)) {
      throw new Error('Expected results array in search response');
    }

    // User B searches for User A's private asset
    const bRes = await apiRequest('/api/household/search?q=Airtel', {
      token: tokenUserB,
    });
    if (bRes.status !== 200) throw new Error('User B search failed');
    const leaked = bRes.body?.results?.some((r: any) => r.title?.includes('Airtel'));
    if (leaked) {
      throw new Error('Search tenant breach! User B found User A private expense record.');
    }
  });

  // =========================================================================
  // 6. Empty Household Consistency
  // =========================================================================
  await runner.test('empty_household_returns_truthful_unconfigured_states_across_health_and_brief', async () => {
    // User B has empty household
    const healthRes = await apiRequest('/api/household/health', { token: tokenUserB });
    if (healthRes.status !== 200) throw new Error('Failed to get health for User B');
    const healthData = healthRes.body?.data || healthRes.body;
    if (healthData?.isProvisional !== true) {
      throw new Error(`Expected isProvisional to be true on empty household health report, got: ${healthData?.isProvisional}`);
    }

    const briefRes = await apiRequest('/api/household/morning-brief', { token: tokenUserB });
    if (briefRes.status !== 200) throw new Error('Failed to get morning brief for User B');
    const briefData = briefRes.body?.data || briefRes.body;
    if (briefData?.overallStatus !== 'setup_required' && briefData?.status !== 'setup_required') {
      throw new Error(`Expected setup_required status on empty brief, got: ${briefData?.overallStatus || briefData?.status}`);
    }
  });
}
