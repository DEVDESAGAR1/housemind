import { DatabaseService } from './dbService';

export interface SearchResultItem {
  id: string;
  entityType:
    | 'property'
    | 'room'
    | 'asset'
    | 'maintenance'
    | 'warranty'
    | 'utility'
    | 'expense'
    | 'transaction'
    | 'loan'
    | 'credit_card'
    | 'document';
  category: 'properties' | 'assets' | 'maintenance' | 'warranties' | 'utilities' | 'finances' | 'documents';
  title: string;
  subtitle: string;
  badge: string;
  targetTab: string;
  targetSubTab?: string;
  targetId: string;
  score: number;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface SearchResponse {
  query: string;
  totalMatches: number;
  categoryFilter?: string;
  categories: Array<{
    key: string;
    label: string;
    count: number;
  }>;
  groupedResults: Record<string, SearchResultItem[]>;
  results: SearchResultItem[];
}

/**
 * Normalizes text for case-insensitive, punctuation-resilient search
 */
function normalizeText(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text).toLowerCase().trim();
}

/**
 * Calculates a match score for a given candidate against a query and tokens
 */
function calculateScore(
  primaryText: string,
  secondaryTexts: string[],
  normalizedQuery: string,
  tokens: string[]
): number {
  if (!normalizedQuery) return 0;

  const normPrimary = normalizeText(primaryText);
  const normSecondaries = secondaryTexts.map(normalizeText).filter(Boolean);
  const allText = [normPrimary, ...normSecondaries].join(' ');

  let score = 0;

  // 1. Exact primary match
  if (normPrimary === normalizedQuery) {
    score += 100;
  }
  // 2. Primary starts with query
  else if (normPrimary.startsWith(normalizedQuery)) {
    score += 70;
  }
  // 3. Primary contains query
  else if (normPrimary.includes(normalizedQuery)) {
    score += 40;
  }

  // 4. Secondary exact or prefix match
  for (const sec of normSecondaries) {
    if (sec === normalizedQuery) {
      score += 50;
      break;
    } else if (sec.startsWith(normalizedQuery)) {
      score += 30;
      break;
    } else if (sec.includes(normalizedQuery)) {
      score += 20;
      break;
    }
  }

  // 5. Tokenized multi-word matching
  if (tokens.length > 1) {
    const allTokensMatch = tokens.every((token) => allText.includes(token));
    if (allTokensMatch) {
      score += 25;
    } else {
      const matchingTokens = tokens.filter((token) => allText.includes(token));
      score += matchingTokens.length * 6;
    }
  } else if (tokens.length === 1 && score === 0) {
    if (allText.includes(tokens[0])) {
      score += 15;
    }
  }

  return score;
}

/**
 * Searches across all household data for the authenticated user
 */
export async function searchHousehold(
  userId: string,
  query: string,
  categoryFilter?: string,
  limit = 40
): Promise<SearchResponse> {
  const cleanQuery = (query || '').trim();
  const normalizedQuery = cleanQuery.toLowerCase();
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  const categoriesConfig = [
    { key: 'all', label: 'All' },
    { key: 'properties', label: 'Properties & Rooms' },
    { key: 'assets', label: 'Assets & Equipment' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'warranties', label: 'Warranties' },
    { key: 'utilities', label: 'Utilities & Bills' },
    { key: 'finances', label: 'Finances & Debts' },
    { key: 'documents', label: 'Documents' },
  ];

  // If query is blank, return empty result structure with zero counts
  if (!cleanQuery) {
    return {
      query: '',
      totalMatches: 0,
      categoryFilter: categoryFilter || 'all',
      categories: categoriesConfig.map((c) => ({ ...c, count: 0 })),
      groupedResults: {
        properties: [],
        assets: [],
        maintenance: [],
        warranties: [],
        utilities: [],
        finances: [],
        documents: [],
      },
      results: [],
    };
  }

  // Fetch all tenant-isolated data concurrently
  const [
    properties,
    rooms,
    assets,
    maintenanceTasks,
    warranties,
    utilities,
    expenses,
    transactions,
    loans,
    creditCards,
    documents,
  ] = await Promise.all([
    DatabaseService.listProperties(userId),
    DatabaseService.listRooms(userId),
    DatabaseService.listAssets(userId),
    DatabaseService.listMaintenances(userId),
    DatabaseService.listWarranties(userId),
    DatabaseService.listUtilities(userId),
    DatabaseService.listExpenses(userId),
    DatabaseService.listTransactions(userId),
    DatabaseService.listLoans(userId),
    DatabaseService.listCreditCards(userId),
    DatabaseService.listDocuments(userId),
  ]);

  const propertyMap = new Map(properties.map((p) => [p.id, p.name]));
  const roomMap = new Map(rooms.map((r) => [r.id, r.name]));
  const assetMap = new Map(assets.map((a) => [a.id, a.name]));

  const rawResults: SearchResultItem[] = [];

  // 1. Properties
  for (const p of properties) {
    const addressStr = p.address
      ? `${p.address.street || ''} ${p.address.city || ''} ${p.address.region || ''} ${p.address.postalCode || ''}`.trim()
      : '';
    const score = calculateScore(
      p.name,
      [p.propertyType, addressStr, p.notes || '', String(p.yearBuilt || ''), String(p.squareFootage || '')],
      normalizedQuery,
      tokens
    );
    if (score > 0) {
      rawResults.push({
        id: `prop_${p.id}`,
        entityType: 'property',
        category: 'properties',
        title: p.name,
        subtitle: `Property • ${p.propertyType || 'Residential'}${p.address?.city ? ` • ${p.address.city}` : ''}`,
        badge: p.propertyType || 'Property',
        targetTab: 'properties',
        targetId: p.id,
        score,
        metadata: {
          squareFootage: p.squareFootage,
          yearBuilt: p.yearBuilt,
          estimatedValue: p.currentEstimatedValue || p.purchaseValue,
        },
      });
    }
  }

  // 2. Rooms
  for (const r of rooms) {
    const parentProp = r.propertyId ? propertyMap.get(r.propertyId) : undefined;
    const score = calculateScore(
      r.name,
      [r.roomType || r.type, parentProp || '', r.notes || '', String(r.floor || r.floorLevel || '')],
      normalizedQuery,
      tokens
    );
    if (score > 0) {
      rawResults.push({
        id: `room_${r.id}`,
        entityType: 'room',
        category: 'properties',
        title: r.name,
        subtitle: `Room • ${r.roomType || r.type || 'Standard'}${parentProp ? ` in ${parentProp}` : ''}`,
        badge: r.roomType || r.type || 'Room',
        targetTab: 'properties',
        targetId: r.id,
        score,
        metadata: {
          propertyId: r.propertyId,
          floor: r.floor || r.floorLevel,
        },
      });
    }
  }

  // 3. Assets & Equipment
  for (const a of assets) {
    const parentRoom = a.roomId ? roomMap.get(a.roomId) : undefined;
    const parentProp = a.propertyId ? propertyMap.get(a.propertyId) : undefined;
    const score = calculateScore(
      a.name,
      [
        a.category,
        a.brand || '',
        a.modelNumber || '',
        a.serialNumber || '',
        a.currentStatus || '',
        a.maintenanceNotes || '',
        parentRoom || '',
        parentProp || '',
      ],
      normalizedQuery,
      tokens
    );
    if (score > 0) {
      const locationText = [parentRoom, parentProp].filter(Boolean).join(' • ');
      rawResults.push({
        id: `ast_${a.id}`,
        entityType: 'asset',
        category: 'assets',
        title: a.brand ? `${a.brand} ${a.name}` : a.name,
        subtitle: `Asset • ${a.category || 'Equipment'}${locationText ? ` • ${locationText}` : ''} • Status: ${a.currentStatus || 'operational'}`,
        badge: a.category || 'Asset',
        targetTab: 'assets',
        targetId: a.id,
        score,
        metadata: {
          brand: a.brand,
          modelNumber: a.modelNumber,
          serialNumber: a.serialNumber,
          status: a.currentStatus,
          purchaseCost: a.purchaseCost,
        },
      });
    }
  }

  // 4. Maintenance Tasks
  for (const m of maintenanceTasks) {
    const assetName = m.assetId ? assetMap.get(m.assetId) : undefined;
    const propName = m.propertyId ? propertyMap.get(m.propertyId) : undefined;
    const score = calculateScore(
      m.title,
      [
        m.description || '',
        m.serviceProvider || m.serviceProviderName || '',
        m.category || '',
        m.status || '',
        assetName || '',
        propName || '',
      ],
      normalizedQuery,
      tokens
    );
    if (score > 0) {
      const context = [assetName, m.serviceProvider || m.serviceProviderName].filter(Boolean).join(' • ');
      rawResults.push({
        id: `maint_${m.id}`,
        entityType: 'maintenance',
        category: 'maintenance',
        title: m.title,
        subtitle: `Maintenance • ${context ? context + ' • ' : ''}Due: ${m.dueDate || m.serviceDate || 'Scheduled'} • ${m.status || 'pending'}`,
        badge: m.status === 'completed' ? 'Completed' : 'Maintenance',
        targetTab: 'maintenance',
        targetSubTab: 'tasks',
        targetId: m.id,
        score,
        metadata: {
          serviceProvider: m.serviceProvider || m.serviceProviderName,
          status: m.status,
          dueDate: m.dueDate || m.serviceDate,
          cost: m.estimatedCost || m.actualCost || m.cost,
        },
      });
    }
  }

  // 5. Warranties
  for (const w of warranties) {
    const assetName = w.assetId ? assetMap.get(w.assetId) : undefined;
    const providerName = w.warrantyProvider || w.providerName || 'Warranty';
    const score = calculateScore(
      w.title || providerName,
      [
        providerName,
        w.policyNumber || '',
        w.coverageType || '',
        w.status || '',
        w.notes || w.coverageNotes || '',
        assetName || '',
      ],
      normalizedQuery,
      tokens
    );
    if (score > 0) {
      rawResults.push({
        id: `warr_${w.id}`,
        entityType: 'warranty',
        category: 'warranties',
        title: w.title || `${providerName} Warranty`,
        subtitle: `Warranty • Policy: ${w.policyNumber || 'N/A'}${assetName ? ` • ${assetName}` : ''} • Expires: ${w.endDate || w.expiryDate || 'Active'}`,
        badge: w.status === 'expired' ? 'Expired' : 'Warranty',
        targetTab: 'maintenance',
        targetSubTab: 'warranties',
        targetId: w.id,
        score,
        metadata: {
          provider: providerName,
          policyNumber: w.policyNumber,
          endDate: w.endDate || w.expiryDate,
          status: w.status,
        },
      });
    }
  }

  // 6. Utilities & Bills
  for (const u of utilities) {
    const propName = u.propertyId ? propertyMap.get(u.propertyId) : undefined;
    const providerName = u.provider || u.providerName || u.name;
    const score = calculateScore(
      u.name || providerName,
      [
        u.utilityType || u.serviceType,
        providerName,
        u.accountNumber || u.accountIdentifier || '',
        u.billingCycle || '',
        u.notes || '',
        propName || '',
      ],
      normalizedQuery,
      tokens
    );
    if (score > 0) {
      rawResults.push({
        id: `util_${u.id}`,
        entityType: 'utility',
        category: 'utilities',
        title: `${providerName} (${u.utilityType || u.serviceType})`,
        subtitle: `Utility • ${u.billingCycle || 'Monthly'}${u.typicalMonthlyCost || u.typicalAmount ? ` • Avg ~$${u.typicalMonthlyCost || u.typicalAmount}` : ''}${u.accountNumber || u.accountIdentifier ? ` • Acct: ••••${(u.accountNumber || u.accountIdentifier || '').slice(-4)}` : ''}`,
        badge: u.utilityType || u.serviceType || 'Utility',
        targetTab: 'utilities',
        targetSubTab: 'utilities',
        targetId: u.id,
        score,
        metadata: {
          utilityType: u.utilityType || u.serviceType,
          typicalAmount: u.typicalMonthlyCost || u.typicalAmount,
          isAutoPay: u.autoPayEnabled ?? u.isAutoPay,
        },
      });
    }
  }

  // 7. Expenses
  for (const exp of expenses) {
    const score = calculateScore(
      exp.title,
      [
        exp.category,
        exp.paymentStatus || '',
        exp.notes || '',
        exp.frequency || '',
        String(exp.amount || ''),
      ],
      normalizedQuery,
      tokens
    );
    if (score > 0) {
      rawResults.push({
        id: `exp_${exp.id}`,
        entityType: 'expense',
        category: 'finances',
        title: exp.title,
        subtitle: `Expense • ${exp.category} • $${Number(exp.amount || 0).toLocaleString()} • ${exp.frequency || 'one-time'}`,
        badge: exp.paymentStatus === 'paid' ? 'Paid' : 'Expense',
        targetTab: 'expenses',
        targetId: exp.id,
        score,
        metadata: {
          category: exp.category,
          amount: exp.amount,
          frequency: exp.frequency,
        },
      });
    }
  }

  // 8. Transactions
  for (const tx of transactions) {
    const score = calculateScore(
      tx.description || tx.merchant || 'Transaction',
      [
        tx.merchant || '',
        tx.category || '',
        tx.source || tx.account || '',
        tx.notes || '',
        String(tx.amount || ''),
      ],
      normalizedQuery,
      tokens
    );
    if (score > 0) {
      rawResults.push({
        id: `tx_${tx.id}`,
        entityType: 'transaction',
        category: 'finances',
        title: tx.merchant ? `${tx.merchant} - ${tx.description}` : tx.description,
        subtitle: `Transaction • ${tx.category || 'General'} • $${Number(tx.amount || 0).toLocaleString()} • ${tx.date || ''}`,
        badge: 'Transaction',
        targetTab: 'finances',
        targetId: tx.id,
        score,
        metadata: {
          merchant: tx.merchant,
          category: tx.category,
          amount: tx.amount,
          date: tx.date,
        },
      });
    }
  }

  // 9. Loans
  for (const l of loans) {
    const loanTitle = l.name || l.loanName;
    const lenderName = l.lenderName || l.lender;
    const score = calculateScore(
      loanTitle,
      [
        lenderName,
        l.loanType || '',
        l.accountNumber || '',
        l.status || '',
        l.notes || '',
        String(l.monthlyPayment || l.emiAmount || ''),
      ],
      normalizedQuery,
      tokens
    );
    if (score > 0) {
      const monthlyAmount = l.monthlyPayment || l.emiAmount || 0;
      const balance = l.currentBalance || l.outstandingAmount || 0;
      rawResults.push({
        id: `loan_${l.id}`,
        entityType: 'loan',
        category: 'finances',
        title: loanTitle,
        subtitle: `Loan • Lender: ${lenderName} • Payment: $${Number(monthlyAmount).toLocaleString()}/mo • Balance: $${Number(balance).toLocaleString()}`,
        badge: 'Loan',
        targetTab: 'utilities',
        targetSubTab: 'loans',
        targetId: l.id,
        score,
        metadata: {
          lender: lenderName,
          emiAmount: monthlyAmount,
          outstandingAmount: balance,
          status: l.status,
        },
      });
    }
  }

  // 10. Credit Cards
  for (const cc of creditCards) {
    const cardTitle = cc.cardName || cc.cardNickname || 'Credit Card';
    const issuerName = cc.issuer || cc.cardIssuer;
    const last4 = cc.lastFourDigits || cc.last4Digits || '';
    const score = calculateScore(
      cardTitle,
      [
        issuerName,
        last4,
        cc.notes || '',
        String(cc.creditLimit || ''),
      ],
      normalizedQuery,
      tokens
    );
    if (score > 0) {
      const balance = cc.currentBalance || cc.outstandingAmount || 0;
      rawResults.push({
        id: `cc_${cc.id}`,
        entityType: 'credit_card',
        category: 'finances',
        title: `${cardTitle} •••• ${last4}`,
        subtitle: `Credit Card • ${issuerName} • Limit: $${Number(cc.creditLimit || 0).toLocaleString()} • Balance: $${Number(balance).toLocaleString()}`,
        badge: 'Card',
        targetTab: 'utilities',
        targetSubTab: 'cards',
        targetId: cc.id,
        score,
        metadata: {
          issuer: issuerName,
          last4,
          outstanding: balance,
        },
      });
    }
  }

  // 11. Documents
  for (const doc of documents) {
    const summaryStr = doc.extractedSummary ? JSON.stringify(doc.extractedSummary) : '';
    const score = calculateScore(
      doc.fileName || 'Household Document',
      [
        doc.documentType || '',
        doc.status || '',
        summaryStr,
        doc.notes || '',
      ],
      normalizedQuery,
      tokens
    );
    if (score > 0) {
      rawResults.push({
        id: `doc_${doc.id}`,
        entityType: 'document',
        category: 'documents',
        title: doc.fileName || 'Household Document',
        subtitle: `Document • ${doc.documentType?.replace('_', ' ') || 'Record'} • Status: ${doc.status || 'active'}`,
        badge: doc.documentType?.replace('_', ' ') || 'Document',
        targetTab: 'documents',
        targetId: doc.id,
        score,
        metadata: {
          documentType: doc.documentType,
          status: doc.status,
          uploadedAt: doc.uploadedAt || doc.createdAt,
        },
      });
    }
  }

  // Sort overall by score descending
  rawResults.sort((a, b) => b.score - a.score);

  // Calculate category counts
  const categoryCounts: Record<string, number> = {
    all: rawResults.length,
    properties: 0,
    assets: 0,
    maintenance: 0,
    warranties: 0,
    utilities: 0,
    finances: 0,
    documents: 0,
  };

  const groupedResults: Record<string, SearchResultItem[]> = {
    properties: [],
    assets: [],
    maintenance: [],
    warranties: [],
    utilities: [],
    finances: [],
    documents: [],
  };

  for (const item of rawResults) {
    if (categoryCounts[item.category] !== undefined) {
      categoryCounts[item.category]++;
      groupedResults[item.category].push(item);
    }
  }

  const filteredResults =
    categoryFilter && categoryFilter !== 'all'
      ? rawResults.filter((r) => r.category === categoryFilter)
      : rawResults;

  const categories = categoriesConfig.map((cat) => ({
    key: cat.key,
    label: cat.label,
    count: categoryCounts[cat.key] || 0,
  }));

  return {
    query: cleanQuery,
    totalMatches: rawResults.length,
    categoryFilter: categoryFilter || 'all',
    categories,
    groupedResults,
    results: filteredResults.slice(0, limit),
  };
}
