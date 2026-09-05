import { DatabaseService } from '../../server/services/dbService';

export interface SeededHouseholdGraph {
  userId: string;
  token: string;
  propertyId: string;
  roomId: string;
  assetId: string;
  warrantyId: string;
  maintenanceId: string;
  issueId: string;
  expenseId: string;
  loanId: string;
  creditCardId: string;
  documentId: string;
}

/**
 * Creates an isolated, clean household graph for integration/security testing.
 */
export async function seedStandardHousehold(userId: string, token: string): Promise<SeededHouseholdGraph> {
  DatabaseService.clearUserData(userId);

  await DatabaseService.setProfile(userId, {
    homeName: 'Maplewood Villa',
    homeType: 'single_family',
    currency: 'USD',
    country: 'United States',
    squareFootage: 2600,
  });

  const property = await DatabaseService.createProperty(userId, {
    name: 'Maplewood Villa',
    address: '42 Orchid Way, Bangalore',
    propertyType: 'single_family',
    squareFootage: 2600,
    yearBuilt: 2021,
  });

  const room = await DatabaseService.createRoom(userId, {
    name: 'Master Suite',
    roomType: 'bedroom',
    propertyId: property.id,
    floorLevel: 2,
  });

  const asset = await DatabaseService.createAsset(userId, {
    name: 'Daikin Dual Inverter AC',
    category: 'hvac',
    brand: 'Daikin',
    propertyId: property.id,
    roomId: room.id,
    installDate: '2023-04-10',
    purchasePrice: 1200,
    expectedLifespanYears: 10,
    currentStatus: 'operational',
  });

  const warranty = await DatabaseService.createWarranty(userId, {
    title: 'Daikin 10-Year Comprehensive Warranty',
    warrantyProvider: 'Daikin Care',
    policyNumber: 'DKN-99482',
    assetId: asset.id,
    propertyId: property.id,
    startDate: '2023-04-10',
    endDate: '2033-04-10',
    status: 'active',
  });

  const maintenance = await DatabaseService.createMaintenance(userId, {
    title: 'Deep Filter Chemical Wash',
    category: 'hvac',
    assetId: asset.id,
    propertyId: property.id,
    serviceDate: '2026-09-20',
    dueDate: '2026-09-20',
    cost: 60,
    status: 'pending',
  });

  const issue = await DatabaseService.createIssue(userId, {
    title: 'Condenser Fan Noise',
    description: 'Vibrating noise noticed on startup',
    category: 'hvac',
    severity: 'medium',
    status: 'reported',
    assetId: asset.id,
    propertyId: property.id,
    roomId: room.id,
  });

  const expense = await DatabaseService.createExpense(userId, {
    title: 'Bangalore Electricity Supply (BESCOM)',
    category: 'utilities',
    amount: 145,
    frequency: 'monthly',
    dueDate: '2026-09-15',
    paymentStatus: 'pending',
  });

  const loan = await DatabaseService.createLoan(userId, {
    loanName: 'Primary Home Mortgage',
    loanType: 'mortgage',
    lender: 'HDFC Bank',
    principalAmount: 385000,
    outstandingAmount: 342000,
    emiAmount: 2150,
    interestRate: 8.5,
    paymentDueDay: 5,
  });

  const creditCard = await DatabaseService.createCreditCard(userId, {
    cardNickname: 'Infinia Rewards',
    cardIssuer: 'HDFC',
    last4Digits: '4821',
    creditLimit: 15000,
    outstandingAmount: 1850,
    paymentStatus: 'pending',
  });

  const document = await DatabaseService.saveDocument(userId, {
    id: `doc_${userId}_deed_01`,
    userId,
    fileName: 'property_purchase_deed.pdf',
    documentType: 'property_deed',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  return {
    userId,
    token,
    propertyId: property.id,
    roomId: room.id,
    assetId: asset.id,
    warrantyId: warranty.id,
    maintenanceId: maintenance.id,
    issueId: issue.id,
    expenseId: expense.id,
    loanId: loan.id,
    creditCardId: creditCard.id,
    documentId: document.id,
  };
}
