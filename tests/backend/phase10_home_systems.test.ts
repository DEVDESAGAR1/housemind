import { apiRequest, TestRunner } from '../test-helper';

export async function runPhase10HomeSystemsTests(runner: TestRunner) {
  runner.setSuite('Phase 10: Run the Home Systems & AI Extraction');

  const token1 = 'test-token-phase10-user1';
  const token2 = 'test-token-phase10-user2';

  let prop1Id = '';
  let room1Id = '';
  let warranty1Id = '';
  let task1Id = '';
  let util1Id = '';
  let loan1Id = '';
  let card1Id = '';

  // 1. Property Management
  await runner.test('Create a property record with specifications', async () => {
    const res = await apiRequest('/api/properties', {
      method: 'POST',
      token: token1,
      body: {
        name: 'Maple Valley Residence',
        address: '742 Evergreen Terrace',
        propertyType: 'single_family',
        squareFootage: 2400,
        yearBuilt: 2012,
        notes: 'Primary residence with solar panels',
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    if (!res.body?.property?.id || res.body.property.name !== 'Maple Valley Residence') {
      throw new Error('Invalid property response payload');
    }
    prop1Id = res.body.property.id;
  });

  await runner.test('List user properties preserves multi-tenant isolation', async () => {
    const res1 = await apiRequest('/api/properties', { token: token1 });
    if (res1.status !== 200 || res1.body?.properties?.length !== 1) {
      throw new Error(`Expected 1 property for user 1, got ${res1.body?.properties?.length}`);
    }

    const res2 = await apiRequest('/api/properties', { token: token2 });
    if (res2.status !== 200 || res2.body?.properties?.length !== 0) {
      throw new Error(`Expected 0 properties for user 2, got ${res2.body?.properties?.length}`);
    }
  });

  // 2. Room Layout Management
  await runner.test('Create a room linked to a property', async () => {
    const res = await apiRequest('/api/rooms', {
      method: 'POST',
      token: token1,
      body: {
        name: 'Gourmet Kitchen',
        roomType: 'kitchen',
        propertyId: prop1Id,
        floorLevel: 1,
        notes: 'Equipped with induction cooktop and smart fridge',
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    if (!res.body?.room?.id || res.body.room.propertyId !== prop1Id) {
      throw new Error('Room not properly created or linked to property');
    }
    room1Id = res.body.room.id;
  });

  await runner.test('List rooms filtered by property ID', async () => {
    const res = await apiRequest(`/api/rooms?propertyId=${prop1Id}`, { token: token1 });
    if (res.status !== 200 || res.body?.rooms?.length !== 1) {
      throw new Error(`Expected 1 room for property, got ${res.body?.rooms?.length}`);
    }
  });

  // 3. Warranties Management
  await runner.test('Create warranty policy record with coverage dates', async () => {
    const res = await apiRequest('/api/warranties', {
      method: 'POST',
      token: token1,
      body: {
        title: 'Carrier HVAC 10-Year Compressor Warranty',
        providerName: 'Carrier Comfort Guard',
        policyNumber: 'CAR-992-8812',
        coverageType: 'parts_and_labor',
        startDate: '2020-06-01',
        expirationDate: '2030-06-01',
        supportPhone: '1-800-CARRIER',
        propertyId: prop1Id,
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    if (!res.body?.warranty?.id || res.body.warranty.policyNumber !== 'CAR-992-8812') {
      throw new Error('Warranty policy creation failed');
    }
    warranty1Id = res.body.warranty.id;
  });

  // 4. Maintenance Tasks Management
  await runner.test('Create and track scheduled maintenance task', async () => {
    const res = await apiRequest('/api/maintenance-tasks', {
      method: 'POST',
      token: token1,
      body: {
        title: 'Replace Whole-House HEPA Filter',
        category: 'hvac',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        estimatedCost: 65,
        recurrenceIntervalMonths: 6,
        propertyId: prop1Id,
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    if (!res.body?.task?.id || res.body.task.status !== 'pending') {
      throw new Error('Maintenance task creation failed');
    }
    task1Id = res.body.task.id;
  });

  await runner.test('Update maintenance task completion status', async () => {
    const res = await apiRequest(`/api/maintenance-tasks/${task1Id}`, {
      method: 'PUT',
      token: token1,
      body: {
        status: 'completed',
        actualCost: 60,
        completedAt: new Date().toISOString(),
      },
    });

    if (res.status !== 200 || res.body?.task?.status !== 'completed') {
      throw new Error('Failed to update task to completed');
    }
  });

  // 5. Utility Accounts Management
  await runner.test('Create and configure utility account', async () => {
    const res = await apiRequest('/api/utilities', {
      method: 'POST',
      token: token1,
      body: {
        name: 'Pacific Power Electricity',
        utilityType: 'electricity',
        providerName: 'Pacificorp',
        accountNumber: 'PP-49910-82',
        paymentDueDay: 18,
        typicalMonthlyCost: 145,
        latestBillAmount: 162,
        autoPayEnabled: true,
        isPaidThisMonth: false,
        propertyId: prop1Id,
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    if (!res.body?.utility?.id || res.body.utility.utilityType !== 'electricity') {
      throw new Error('Utility creation failed');
    }
    util1Id = res.body.utility.id;
  });

  // 6. Household Loans / Mortgages
  await runner.test('Create and track mortgage/loan account', async () => {
    const res = await apiRequest('/api/loans', {
      method: 'POST',
      token: token1,
      body: {
        name: '30-Year Primary Mortgage',
        loanType: 'mortgage',
        lenderName: 'Wells Fargo Home Mortgage',
        accountNumber: 'WF-MORT-8812',
        originalPrincipal: 400000,
        currentBalance: 360000,
        interestRatePercent: 4.125,
        monthlyPayment: 1938,
        paymentDueDay: 1,
        maturityYear: 2051,
        propertyId: prop1Id,
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    if (!res.body?.loan?.id || res.body.loan.currentBalance !== 360000) {
      throw new Error('Loan account creation failed');
    }
    loan1Id = res.body.loan.id;
  });

  // 7. Credit Cards
  await runner.test('Create revolving credit card account', async () => {
    const res = await apiRequest('/api/credit-cards', {
      method: 'POST',
      token: token1,
      body: {
        cardName: 'Chase Sapphire Preferred',
        issuer: 'Chase',
        lastFourDigits: '9182',
        creditLimit: 15000,
        currentBalance: 2450,
        aprPercent: 21.49,
        minimumPaymentDue: 60,
        paymentDueDate: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
        autoPayEnabled: true,
      },
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    if (!res.body?.creditCard?.id || res.body.creditCard.creditLimit !== 15000) {
      throw new Error('Credit card account creation failed');
    }
    card1Id = res.body.creditCard.id;
  });

  // 8. Command Center Summary Aggregation
  await runner.test('Home Command Center aggregates metrics across all home systems', async () => {
    const res = await apiRequest('/api/home/command-center-summary', { token: token1 });
    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}`);
    }

    const s = res.body?.summary;
    if (!s) throw new Error('Missing summary payload');
    if (s.totalProperties !== 1) throw new Error(`Expected 1 property, got ${s.totalProperties}`);
    if (s.totalRooms !== 1) throw new Error(`Expected 1 room, got ${s.totalRooms}`);
    if (s.totalLoansCount !== 1) throw new Error(`Expected 1 loan, got ${s.totalLoansCount}`);
    if (s.totalOutstandingLoanDebt !== 360000) {
      throw new Error(`Expected $360,000 loan debt, got ${s.totalOutstandingLoanDebt}`);
    }
    if (s.totalCreditCardDebt !== 2450) {
      throw new Error(`Expected $2,450 card debt, got ${s.totalCreditCardDebt}`);
    }
    if (s.overallCreditUtilizationPercent !== 16) {
      throw new Error(`Expected 16% credit utilization, got ${s.overallCreditUtilizationPercent}%`);
    }
  });

  // 9. AI Entity Extraction
  await runner.test('Extract structured warranty entity from unstructured document text', async () => {
    const res = await apiRequest('/api/documents/extract-entity', {
      method: 'POST',
      token: token1,
      body: {
        documentText: 'RECEIPT & WARRANTY: Bosch 800 Series Dishwasher purchased 2023-05-15. Warranty expires 2028-05-15. Policy #BSH-88912. Provider Bosch Home Appliances.',
        suggestedType: 'warranty',
      },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
    if (!res.body?.extractedData || res.body.entityType !== 'warranty') {
      throw new Error('Failed to extract warranty entity from document text');
    }
    if (!res.body.extractedData.title && !res.body.extractedData.providerName) {
      throw new Error('Extracted data missing required title or provider');
    }
  });
}
