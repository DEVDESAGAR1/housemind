import crypto from 'crypto';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  HouseholdProfile,
  Expense,
  Asset,
  Transaction,
  DocumentRecord,
  HouseholdInsight,
  CopilotConversation,
  Scenario,
  PrivacyCenterSummary,
  DataSourceConnection,
  ImportedSourceMetadata,
} from '../../src/types';

// In-Memory Multi-Tenant Master Storage (isolated strictly per userId)
interface UserDataStore {
  profile: Record<string, any>;
  expenses: Map<string, any>;
  assets: Map<string, any>;
  transactions: Map<string, any>;
  documents: Map<string, any>;
  insights: Map<string, any>;
  conversations: Map<string, any>;
  scenarios: Map<string, any>;
}

const multiTenantStore = new Map<string, UserDataStore>();

export function getOrCreateUserStore(userId: string): UserDataStore {
  let store = multiTenantStore.get(userId);
  if (!store) {
    store = {
      profile: {
        userId,
        homeName: 'My Household',
        homeType: 'single_family',
        yearBuilt: 2015,
        squareFootage: 2200,
        currency: 'USD',
        primaryHeating: 'Heat Pump',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      expenses: new Map(),
      assets: new Map(),
      transactions: new Map(),
      documents: new Map(),
      insights: new Map(),
      conversations: new Map(),
      scenarios: new Map(),
    };
    multiTenantStore.set(userId, store);
  }
  return store;
}

/**
 * REST Helper to serialize JS object to Firestore Document Fields
 */
function encodeFirestoreFields(data: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      fields[k] = encodeValue(v);
    }
  }
  return fields;
}

function encodeValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(encodeValue) } };
  }
  if (typeof val === 'object') {
    return { mapValue: { fields: encodeFirestoreFields(val) } };
  }
  return { stringValue: String(val) };
}

function decodeFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  if (!fields) return result;
  for (const [k, v] of Object.entries(fields)) {
    result[k] = decodeValue(v);
  }
  return result;
}

function decodeValue(val: any): any {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in val) return decodeFirestoreFields(val.mapValue.fields || {});
  return null;
}

/**
 * Universal Database Service with strict user-isolation and zero-permission-error fallback
 */
export class DatabaseService {
  private static readonly SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

  /**
   * Builds and strictly validates Firestore REST API URLs to prevent SSRF and path traversal attacks.
   */
  private static buildFirestoreUrl(
    pathSegments: string[],
    queryParams?: Record<string, string>
  ): string {
    const rawProjectId = firebaseConfig.projectId || 'hack2skillnewproject';
    const rawDbId = firebaseConfig.firestoreDatabaseId || '(default)';

    if (!this.SAFE_ID_REGEX.test(rawProjectId)) {
      throw new Error('Invalid Firebase Project ID configuration.');
    }

    for (const segment of pathSegments) {
      if (!this.SAFE_ID_REGEX.test(segment)) {
        throw new Error(`Invalid identifier in path segment: "${segment}"`);
      }
    }

    const encodedSegments = pathSegments.map((s) => encodeURIComponent(s)).join('/');
    const basePath = `/v1/projects/${encodeURIComponent(rawProjectId)}/databases/${encodeURIComponent(rawDbId)}/documents/${encodedSegments}`;

    const url = new URL(basePath, 'https://firestore.googleapis.com');

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.set(key, value);
      }
    }

    // Explicit SSRF protection assert: strictly HTTPS and strictly firestore.googleapis.com
    if (url.protocol !== 'https:' || url.hostname !== 'firestore.googleapis.com') {
      throw new Error('Untrusted destination URL rejected.');
    }

    return url.toString();
  }

  /**
   * Safe outbound request wrapper ensuring only validated Google Firestore endpoints are contacted.
   */
  private static async safeFirestoreFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'firestore.googleapis.com') {
      throw new Error('Security policy violation: outbound request blocked.');
    }
    return fetch(url, options);
  }

  // --- PROFILE ---
  static async getProfile(userId: string, userToken?: string): Promise<any> {
    const store = getOrCreateUserStore(userId);
    if (userToken && !userToken.startsWith('test-token-')) {
      try {
        const url = this.buildFirestoreUrl(['users', userId, 'profile', 'current']);
        const res = await this.safeFirestoreFetch(url, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        if (res.ok) {
          const json = await res.json();
          const data = decodeFirestoreFields(json.fields);
          store.profile = { ...store.profile, ...data };
          return store.profile;
        }
      } catch {
        // Fallback to isolated user store seamlessly
      }
    }
    return store.profile;
  }

  static async setProfile(userId: string, data: any, userToken?: string): Promise<any> {
    const store = getOrCreateUserStore(userId);
    const updated = {
      ...store.profile,
      ...data,
      userId,
      updatedAt: new Date().toISOString(),
    };
    store.profile = updated;

    if (userToken && !userToken.startsWith('test-token-')) {
      try {
        const url = this.buildFirestoreUrl(['users', userId, 'profile', 'current']);
        await this.safeFirestoreFetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({ fields: encodeFirestoreFields(updated) }),
        });
      } catch {
        // Fallback
      }
    }
    return updated;
  }

  // --- EXPENSES ---
  static async listExpenses(userId: string, userToken?: string): Promise<Expense[]> {
    const store = getOrCreateUserStore(userId);
    return Array.from(store.expenses.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  static async getExpense(userId: string, id: string): Promise<Expense | null> {
    const store = getOrCreateUserStore(userId);
    return store.expenses.get(id) || null;
  }

  static async createExpense(userId: string, data: any, customId?: string): Promise<Expense> {
    const store = getOrCreateUserStore(userId);
    const id = customId || `exp_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    const expense: Expense = {
      id,
      userId,
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.expenses.set(id, expense);
    return expense;
  }

  static async updateExpense(userId: string, id: string, data: any): Promise<Expense | null> {
    const store = getOrCreateUserStore(userId);
    const existing = store.expenses.get(id);
    if (!existing) return null;
    const updated: Expense = {
      ...existing,
      ...data,
      id,
      userId,
      updatedAt: new Date().toISOString(),
    };
    store.expenses.set(id, updated);
    return updated;
  }

  static async deleteExpense(userId: string, id: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    return store.expenses.delete(id);
  }

  // --- ASSETS ---
  static async listAssets(userId: string): Promise<Asset[]> {
    const store = getOrCreateUserStore(userId);
    return Array.from(store.assets.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  static async getAsset(userId: string, id: string): Promise<Asset | null> {
    const store = getOrCreateUserStore(userId);
    return store.assets.get(id) || null;
  }

  static async createAsset(userId: string, data: any, customId?: string): Promise<Asset> {
    const store = getOrCreateUserStore(userId);
    const id = customId || `ast_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    const asset: Asset = {
      id,
      userId,
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.assets.set(id, asset);
    return asset;
  }

  static async updateAsset(userId: string, id: string, data: any): Promise<Asset | null> {
    const store = getOrCreateUserStore(userId);
    const existing = store.assets.get(id);
    if (!existing) return null;
    const updated: Asset = {
      ...existing,
      ...data,
      id,
      userId,
      updatedAt: new Date().toISOString(),
    };
    store.assets.set(id, updated);
    return updated;
  }

  static async deleteAsset(userId: string, id: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    return store.assets.delete(id);
  }

  // --- TRANSACTIONS ---
  static async listTransactions(userId: string): Promise<Transaction[]> {
    const store = getOrCreateUserStore(userId);
    return Array.from(store.transactions.values()).sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
  }

  static async getTransaction(userId: string, id: string): Promise<Transaction | null> {
    const store = getOrCreateUserStore(userId);
    return store.transactions.get(id) || null;
  }

  static async createTransaction(userId: string, data: any, customId?: string): Promise<Transaction> {
    const store = getOrCreateUserStore(userId);
    const id = customId || `tx_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    const tx: Transaction = {
      id,
      userId,
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.transactions.set(id, tx);
    return tx;
  }

  static async updateTransaction(userId: string, id: string, data: any): Promise<Transaction | null> {
    const store = getOrCreateUserStore(userId);
    const existing = store.transactions.get(id);
    if (!existing) return null;
    const updated: Transaction = {
      ...existing,
      ...data,
      id,
      userId,
      updatedAt: new Date().toISOString(),
    };
    store.transactions.set(id, updated);
    return updated;
  }

  static async deleteTransaction(userId: string, id: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    return store.transactions.delete(id);
  }

  // --- DOCUMENTS ---
  static async listDocuments(userId: string): Promise<DocumentRecord[]> {
    const store = getOrCreateUserStore(userId);
    return Array.from(store.documents.values()).sort(
      (a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime()
    );
  }

  static async getDocument(userId: string, id: string): Promise<DocumentRecord | null> {
    const store = getOrCreateUserStore(userId);
    return store.documents.get(id) || null;
  }

  static async saveDocument(userId: string, doc: DocumentRecord): Promise<DocumentRecord> {
    const store = getOrCreateUserStore(userId);
    store.documents.set(doc.id, { ...doc, userId });
    return doc;
  }

  static async deleteDocument(userId: string, id: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    return store.documents.delete(id);
  }

  // --- INSIGHTS ---
  static async listInsights(userId: string): Promise<HouseholdInsight[]> {
    const store = getOrCreateUserStore(userId);
    return Array.from(store.insights.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  static async getInsight(userId: string, id: string): Promise<HouseholdInsight | null> {
    const store = getOrCreateUserStore(userId);
    return store.insights.get(id) || null;
  }

  static async saveInsights(userId: string, insights: HouseholdInsight[]): Promise<void> {
    const store = getOrCreateUserStore(userId);
    insights.forEach((ins) => {
      store.insights.set(ins.id, { ...ins, userId });
    });
  }

  static async updateInsight(userId: string, id: string, patch: Partial<HouseholdInsight>): Promise<HouseholdInsight | null> {
    const store = getOrCreateUserStore(userId);
    const existing = store.insights.get(id);
    if (!existing) return null;
    const updated: HouseholdInsight = {
      ...existing,
      ...patch,
      id,
      userId,
      updatedAt: new Date().toISOString(),
    };
    store.insights.set(id, updated);
    return updated;
  }

  // --- CONVERSATIONS ---
  static async listConversations(userId: string): Promise<CopilotConversation[]> {
    const store = getOrCreateUserStore(userId);
    return Array.from(store.conversations.values()).sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
  }

  static async getConversation(userId: string, id: string): Promise<CopilotConversation | null> {
    const store = getOrCreateUserStore(userId);
    return store.conversations.get(id) || null;
  }

  static async saveConversation(userId: string, conv: CopilotConversation): Promise<CopilotConversation> {
    const store = getOrCreateUserStore(userId);
    store.conversations.set(conv.id, { ...conv, userId });
    return conv;
  }

  // --- SCENARIOS (WHAT-IF SIMULATOR) ---
  static async listScenarios(userId: string, userToken?: string): Promise<Scenario[]> {
    const store = getOrCreateUserStore(userId);
    if (userToken && !userToken.startsWith('test-token-')) {
      try {
        const url = this.buildFirestoreUrl(['users', userId, 'scenarios']);
        const res = await this.safeFirestoreFetch(url, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        if (res.ok) {
          const json = await res.json();
          const items: Scenario[] = (json.documents || []).map((doc: any) => {
            const data = decodeFirestoreFields(doc.fields);
            const id = doc.name.split('/').pop();
            return { ...data, id, userId };
          });
          items.forEach((s) => store.scenarios.set(s.id, s));
        }
      } catch {
        // Fallback gracefully to in-memory store
      }
    }

    return Array.from(store.scenarios.values()).sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
    );
  }

  static async getScenario(userId: string, id: string, userToken?: string): Promise<Scenario | null> {
    const store = getOrCreateUserStore(userId);
    if (store.scenarios.has(id)) {
      return store.scenarios.get(id);
    }

    if (userToken && !userToken.startsWith('test-token-')) {
      try {
        const url = this.buildFirestoreUrl(['users', userId, 'scenarios', id]);
        const res = await this.safeFirestoreFetch(url, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        if (res.ok) {
          const json = await res.json();
          const data = decodeFirestoreFields(json.fields);
          const item: Scenario = { ...data, id, userId } as Scenario;
          store.scenarios.set(id, item);
          return item;
        }
      } catch {
        // Fallback
      }
    }

    return null;
  }

  static async createScenario(
    userId: string,
    scenarioData: Omit<Scenario, 'id' | 'userId' | 'createdAt' | 'updatedAt'> | Scenario,
    customId?: string,
    userToken?: string
  ): Promise<Scenario> {
    const store = getOrCreateUserStore(userId);
    const id = customId || (scenarioData as any).id || `scen_${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();

    const newScenario: Scenario = {
      ...scenarioData,
      id,
      userId,
      createdAt: (scenarioData as any).createdAt || nowIso,
      updatedAt: nowIso,
    } as Scenario;

    store.scenarios.set(id, newScenario);

    if (userToken && !userToken.startsWith('test-token-')) {
      try {
        const url = this.buildFirestoreUrl(['users', userId, 'scenarios'], { documentId: id });
        await this.safeFirestoreFetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields: encodeFirestoreFields(newScenario) }),
        });
      } catch {
        // In-memory fallback
      }
    }

    return newScenario;
  }

  static async updateScenario(
    userId: string,
    id: string,
    patch: Partial<Scenario>,
    userToken?: string
  ): Promise<Scenario | null> {
    const store = getOrCreateUserStore(userId);
    const existing = await this.getScenario(userId, id, userToken);
    if (!existing) return null;

    const nowIso = new Date().toISOString();
    const updated: Scenario = {
      ...existing,
      ...patch,
      id,
      userId,
      updatedAt: nowIso,
    };

    store.scenarios.set(id, updated);

    if (userToken && !userToken.startsWith('test-token-')) {
      try {
        const url = this.buildFirestoreUrl(['users', userId, 'scenarios', id]);
        await this.safeFirestoreFetch(url, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields: encodeFirestoreFields(updated) }),
        });
      } catch {
        // In-memory fallback
      }
    }

    return updated;
  }

  static async deleteScenario(userId: string, id: string, userToken?: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    const deleted = store.scenarios.delete(id);

    if (userToken && !userToken.startsWith('test-token-')) {
      try {
        const url = this.buildFirestoreUrl(['users', userId, 'scenarios', id]);
        await this.safeFirestoreFetch(url, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${userToken}` },
        });
      } catch {
        // Fallback
      }
    }

    return deleted;
  }

  // --- IDEMPOTENT DEMO SEED ---
  static async seedDemoData(userId: string): Promise<{
    profiles: number;
    expenses: number;
    assets: number;
    transactions: number;
    documents: number;
    insights: number;
    conversations: number;
    scenarios?: number;
  }> {
    const store = getOrCreateUserStore(userId);
    const nowIso = new Date().toISOString();

    // 1. Profile
    store.profile = {
      userId,
      displayName: 'Demo Household Owner',
      homeName: 'Maplewood Haven',
      homeType: 'single_family',
      yearBuilt: 2016,
      squareFootage: 2450,
      currency: 'USD',
      primaryHeating: 'Heat Pump',
      createdAt: store.profile.createdAt || nowIso,
      updatedAt: nowIso,
    };

    // 2. Realistic Expenses (Deterministic IDs)
    const demoExpenses = [
      {
        id: 'demo_exp_mortgage',
        title: 'Primary Mortgage Payment',
        category: 'mortgage_rent',
        amount: 1850.0,
        frequency: 'monthly',
        dueDate: '2026-09-01',
        isAutoPay: true,
        paymentStatus: 'paid',
        notes: 'Fixed 30-year residential mortgage.',
      },
      {
        id: 'demo_exp_electric',
        title: 'Electric & Cooling Utility',
        category: 'utilities',
        amount: 210.0,
        frequency: 'monthly',
        dueDate: '2026-09-15',
        isAutoPay: true,
        paymentStatus: 'pending',
        notes: 'Summer cooling baseline. Increased from $165 last season.',
      },
      {
        id: 'demo_exp_water',
        title: 'Municipal Water & Sewer',
        category: 'utilities',
        amount: 68.0,
        frequency: 'monthly',
        dueDate: '2026-09-20',
        isAutoPay: true,
        paymentStatus: 'pending',
        notes: 'Bi-monthly metered city water.',
      },
      {
        id: 'demo_exp_internet',
        title: 'Fiber Optic Gigabit Internet',
        category: 'services',
        amount: 80.0,
        frequency: 'monthly',
        dueDate: '2026-09-08',
        isAutoPay: true,
        paymentStatus: 'paid',
        notes: 'Dedicated synchronous fiber line.',
      },
      {
        id: 'demo_exp_insurance',
        title: 'Homeowners Insurance Comprehensive',
        category: 'insurance',
        amount: 1250.0,
        frequency: 'annual',
        dueDate: '2026-11-01',
        isAutoPay: false,
        paymentStatus: 'pending',
        notes: 'Full replacement value hazard policy.',
      },
      {
        id: 'demo_exp_groceries',
        title: 'Household Groceries & Consumables',
        category: 'groceries',
        amount: 620.0,
        frequency: 'monthly',
        dueDate: '2026-09-30',
        isAutoPay: false,
        paymentStatus: 'paid',
        notes: 'Estimated monthly fresh pantry spend.',
      },
    ];

    demoExpenses.forEach((e) => {
      store.expenses.set(e.id, {
        ...e,
        userId,
        isDemo: true,
        sourceMetadata: {
          userId,
          sourceType: 'demo_seed',
          dataType: 'expense',
          importedAt: nowIso,
          userConfirmed: true,
          processingStatus: 'confirmed',
          deletionStatus: 'active',
          isDemo: true,
        },
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    });

    // 3. Realistic Assets (Deterministic IDs)
    const demoAssets = [
      {
        id: 'demo_ast_hvac',
        name: 'Trane XV20i Inverter Heat Pump',
        category: 'hvac',
        brand: 'Trane',
        modelNumber: 'XV20i-4TTR0',
        serialNumber: 'TRN-2018-9941A',
        installDate: '2019-04-12',
        warrantyExpiryDate: '2026-09-30', // Expiring within 30-60 days!
        expectedLifespanYears: 15,
        purchaseCost: 8500,
        currentStatus: 'operational',
        roomLocation: 'Utility Closet & Exterior Yard',
        maintenanceNotes: 'Annual compressor inspection completed spring 2026. Filter size 20x25x4 MERV 11.',
      },
      {
        id: 'demo_ast_water_heater',
        name: 'Rheem Hybrid Electric Water Heater',
        category: 'plumbing',
        brand: 'Rheem',
        modelNumber: 'PROG50-38N',
        serialNumber: 'RHM-2021-4822',
        installDate: '2021-08-20',
        warrantyExpiryDate: '2031-08-20',
        expectedLifespanYears: 12,
        purchaseCost: 1650,
        currentStatus: 'operational',
        roomLocation: 'Basement Mechanical Room',
        maintenanceNotes: 'Anode rod inspected 2025. Tank drained annually.',
      },
      {
        id: 'demo_ast_dishwasher',
        name: 'Bosch 800 Series Dishwasher',
        category: 'kitchen',
        brand: 'Bosch',
        modelNumber: 'SHP878ZD5N',
        serialNumber: 'BSH-2022-7719',
        installDate: '2022-03-15',
        warrantyExpiryDate: '2024-03-15',
        expectedLifespanYears: 10,
        purchaseCost: 1100,
        currentStatus: 'needs_maintenance', // Needs maintenance flag!
        roomLocation: 'Kitchen',
        maintenanceNotes: 'Drain pump filter requires clearing. Error code E15 cleared.',
      },
      {
        id: 'demo_ast_roof',
        name: 'CertainTeed Landmark Architectural Roof',
        category: 'roofing_exterior',
        brand: 'CertainTeed',
        modelNumber: 'Landmark Pro',
        installDate: '2018-06-01',
        warrantyExpiryDate: '2048-06-01',
        expectedLifespanYears: 30,
        purchaseCost: 14000,
        currentStatus: 'operational',
        roomLocation: 'Main Roof & Gables',
        maintenanceNotes: 'Gutter clearing and flashing check performed bi-annually.',
      },
      {
        id: 'demo_ast_fridge',
        name: 'LG French Door Smart Refrigerator',
        category: 'major_appliance',
        brand: 'LG',
        modelNumber: 'LRFCS25D3S',
        serialNumber: 'LG-2023-9011',
        installDate: '2023-01-10',
        warrantyExpiryDate: '2028-01-10',
        expectedLifespanYears: 12,
        purchaseCost: 1900,
        currentStatus: 'operational',
        roomLocation: 'Kitchen',
        maintenanceNotes: 'Water filter replaced every 6 months (LT1000P).',
      },
    ];

    demoAssets.forEach((a) => {
      store.assets.set(a.id, {
        ...a,
        userId,
        isDemo: true,
        sourceMetadata: {
          userId,
          sourceType: 'demo_seed',
          dataType: 'asset',
          importedAt: nowIso,
          userConfirmed: true,
          processingStatus: 'confirmed',
          deletionStatus: 'active',
          isDemo: true,
        },
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    });

    // 4. Realistic Financial Transactions (Deterministic IDs)
    const demoTransactions = [
      {
        id: 'demo_tx_salary',
        type: 'CREDIT',
        amount: 4500.0,
        currency: 'USD',
        date: '2026-08-01',
        description: 'Direct Deposit - TechCorp Systems Salary',
        category: 'Salary',
        accountName: 'Chase Premier Checking',
        source: 'salary_slip',
        confidence: 0.99,
        isSalary: true,
        isRecurring: true,
        fingerprint: 'fp_demo_salary_001',
      },
      {
        id: 'demo_tx_mortgage',
        type: 'DEBIT',
        amount: 1850.0,
        currency: 'USD',
        date: '2026-08-02',
        description: 'ACH Autopay - First National Mortgage Loan',
        category: 'Housing',
        accountName: 'Chase Premier Checking',
        source: 'statement_import',
        confidence: 0.98,
        isSalary: false,
        isRecurring: true,
        fingerprint: 'fp_demo_mortgage_002',
      },
      {
        id: 'demo_tx_utility',
        type: 'DEBIT',
        amount: 210.0,
        currency: 'USD',
        date: '2026-08-05',
        description: 'AutoDebit - City Power & Electric Utility',
        category: 'Utilities',
        accountName: 'Chase Premier Checking',
        source: 'statement_import',
        confidence: 0.95,
        isSalary: false,
        isRecurring: true,
        fingerprint: 'fp_demo_utility_003',
      },
      {
        id: 'demo_tx_internet',
        type: 'DEBIT',
        amount: 80.0,
        currency: 'USD',
        date: '2026-08-08',
        description: 'Autopay - FiberLink Communications',
        category: 'Services',
        accountName: 'Chase Premier Checking',
        source: 'bill_scan',
        confidence: 0.97,
        isSalary: false,
        isRecurring: true,
        fingerprint: 'fp_demo_internet_004',
      },
      {
        id: 'demo_tx_groceries',
        type: 'DEBIT',
        amount: 142.5,
        currency: 'USD',
        date: '2026-08-12',
        description: 'POS Purchase - Whole Foods Market #1024',
        category: 'Groceries',
        accountName: 'Amex Everyday Credit Card',
        source: 'statement_import',
        confidence: 0.92,
        isSalary: false,
        isRecurring: false,
        fingerprint: 'fp_demo_grocery_005',
      },
      {
        id: 'demo_tx_transfer',
        type: 'TRANSFER',
        amount: 600.0,
        currency: 'USD',
        date: '2026-08-15',
        description: 'Online Transfer to High Yield Emergency Savings',
        category: 'Savings',
        accountName: 'Chase Premier Checking',
        source: 'statement_import',
        confidence: 0.99,
        isSalary: false,
        isRecurring: true,
        fingerprint: 'fp_demo_transfer_006',
      },
      {
        id: 'demo_tx_refund',
        type: 'CREDIT',
        amount: 48.2,
        currency: 'USD',
        date: '2026-08-18',
        description: 'Refund Credit - Amazon Marketplace Returned Item',
        category: 'Shopping',
        accountName: 'Amex Everyday Credit Card',
        source: 'statement_import',
        confidence: 0.94,
        isSalary: false,
        isRecurring: false,
        fingerprint: 'fp_demo_refund_007',
      },
      {
        id: 'demo_tx_coffee',
        type: 'DEBIT',
        amount: 6.5,
        currency: 'USD',
        date: '2026-08-22',
        description: 'Blue Bottle Coffee Espresso',
        category: 'Dining',
        accountName: 'Amex Everyday Credit Card',
        source: 'receipt_scan',
        confidence: 0.88,
        isSalary: false,
        isRecurring: false,
        fingerprint: 'fp_demo_coffee_008',
      },
    ];

    demoTransactions.forEach((t) => {
      store.transactions.set(t.id, {
        ...t,
        userId,
        isDemo: true,
        sourceMetadata: {
          userId,
          sourceType: 'demo_seed',
          dataType: 'transaction',
          importedAt: nowIso,
          userConfirmed: true,
          processingStatus: 'confirmed',
          deletionStatus: 'active',
          isDemo: true,
        },
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    });

    // 5. Realistic Documents (Deterministic IDs)
    const demoDocuments = [
      {
        id: 'demo_doc_bank_statement',
        userId,
        fileName: 'Chase_Checking_August2026_Statement.pdf',
        fileType: 'application/pdf',
        fileSizeBytes: 245100,
        uploadedAt: nowIso,
        status: 'confirmed',
        docType: 'bank_statement',
        institution: 'Chase Bank NA',
        accountNumberMasked: '****4822',
        statementPeriod: {
          startDate: '2026-08-01',
          endDate: '2026-08-31',
        },
        rawTextPreview: 'CHASE PREMIER CHECKING STATEMENT\nPeriod: 08/01/2026 to 08/31/2026\nAccount Ending: 4822',
        extractedCandidates: [],
        confidence: 0.98,
      },
      {
        id: 'demo_doc_salary_slip',
        userId,
        fileName: 'TechCorp_Salary_Slip_August2026.pdf',
        fileType: 'application/pdf',
        fileSizeBytes: 128400,
        uploadedAt: nowIso,
        status: 'pending_review',
        docType: 'salary_slip',
        institution: 'TechCorp Systems Inc',
        accountNumberMasked: 'Direct Deposit',
        statementPeriod: {
          startDate: '2026-08-01',
          endDate: '2026-08-15',
        },
        rawTextPreview: 'TECHCORP SYSTEMS INC - EARNINGS STATEMENT\nGross Pay: $5,800.00\nDeductions: $1,300.00\nNet Pay: $4,500.00',
        extractedCandidates: [
          {
            tempId: 'cand_sal_1',
            type: 'CREDIT',
            amount: 4500.0,
            currency: 'USD',
            date: '2026-08-01',
            description: 'TechCorp Net Payroll Direct Deposit',
            category: 'Salary',
            accountName: 'Chase Premier Checking',
            source: 'salary_slip',
            confidence: 0.99,
            isSalary: true,
            isRecurring: true,
            status: 'pending',
          },
        ],
        confidence: 0.99,
      },
    ];

    demoDocuments.forEach((d) => {
      store.documents.set(d.id, {
        ...d,
        userId,
        isDemo: true,
        sourceMetadata: {
          userId,
          sourceType: 'demo_seed',
          dataType: 'document',
          importedAt: nowIso,
          userConfirmed: true,
          processingStatus: 'confirmed',
          deletionStatus: 'active',
          isDemo: true,
        },
      });
    });

    // 6. Deterministic Insights
    const demoInsights = [
      {
        id: 'ins_demo_warranty_hvac',
        userId,
        fingerprint: 'fp_demo_warranty_hvac',
        type: 'warranty_expiry',
        severity: 'high',
        title: 'Warranty expiring in 31 days: Trane XV20i Inverter Heat Pump',
        description: 'Manufacturer warranty coverage expires on 2026-09-30. Schedule a certified preventative inspection to address covered items.',
        whyDetected: 'Deterministic rule: asset warranty expiry is within the 60-day notification horizon.',
        relatedEntityIds: ['demo_ast_hvac'],
        relatedEntityType: 'asset',
        calculatedValues: {
          daysRemaining: 31,
          warrantyExpiryDate: '2026-09-30',
        },
        evidence: {
          facts: [
            'Asset: Trane XV20i Inverter Heat Pump',
            'Install Date: 2019-04-12',
            'Warranty Expiry: 2026-09-30',
          ],
          calculation: 'Today is 2026-08-30. Expiry 2026-09-30 is 31 days remaining (< 60 days threshold).',
        },
        status: 'new',
        createdAt: nowIso,
        updatedAt: nowIso,
        geminiExplanation: null,
      },
      {
        id: 'ins_demo_maintenance_dishwasher',
        userId,
        fingerprint: 'fp_demo_maintenance_dishwasher',
        type: 'maintenance_due',
        severity: 'medium',
        title: 'Maintenance required: Bosch 800 Series Dishwasher',
        description: 'Dishwasher has an active needs_maintenance flag. Drain pump filter requires clearing.',
        whyDetected: 'Deterministic rule: asset status equals needs_maintenance.',
        relatedEntityIds: ['demo_ast_dishwasher'],
        relatedEntityType: 'asset',
        calculatedValues: {
          currentStatus: 'needs_maintenance',
        },
        evidence: {
          facts: [
            'Asset: Bosch 800 Series Dishwasher',
            'Status: needs_maintenance',
            'Notes: Drain pump filter requires clearing.',
          ],
          calculation: 'Asset status is needs_maintenance.',
        },
        status: 'new',
        createdAt: nowIso,
        updatedAt: nowIso,
        geminiExplanation: null,
      },
      {
        id: 'ins_demo_expense_increase_electric',
        userId,
        fingerprint: 'fp_demo_expense_increase_electric',
        type: 'expense_increase',
        severity: 'medium',
        title: 'Cost increase detected: Electric & Cooling Utility (+27.3%)',
        description: 'Electric utility increased from $165.00 to $210.00 (+27.3%).',
        whyDetected: 'Deterministic threshold: expense increase exceeds 15% baseline jump.',
        relatedEntityIds: ['demo_exp_electric'],
        relatedEntityType: 'expense',
        calculatedValues: {
          previousAmount: 165.0,
          currentAmount: 210.0,
          percentIncrease: 27.3,
        },
        evidence: {
          facts: [
            'Current Amount: $210.00',
            'Baseline Amount: $165.00',
          ],
          calculation: '(210.00 - 165.00) / 165.00 = +27.3% (> 15% threshold)',
        },
        status: 'new',
        createdAt: nowIso,
        updatedAt: nowIso,
        geminiExplanation: null,
      },
      {
        id: 'ins_demo_large_expense_mortgage',
        userId,
        fingerprint: 'fp_demo_large_expense_mortgage',
        type: 'large_expense',
        severity: 'high',
        title: 'High concentration: Primary Mortgage Payment represents 48% of monthly budget',
        description: 'Mortgage payment of $1,850.00 accounts for 48% of your total recurring household burn rate.',
        whyDetected: 'Deterministic rule: single expense exceeds 40% of monthly household spending.',
        relatedEntityIds: ['demo_exp_mortgage'],
        relatedEntityType: 'expense',
        calculatedValues: {
          currentAmount: 1850.0,
          percentShare: 48.0,
        },
        evidence: {
          facts: [
            'Expense: Primary Mortgage Payment ($1,850.00)',
            'Total Monthly Recurring Spend: $3,832.00',
          ],
          calculation: '$1,850.00 / $3,832.00 = 48.3% (> 40% threshold)',
        },
        status: 'new',
        createdAt: nowIso,
        updatedAt: nowIso,
        geminiExplanation: null,
      },
    ];

    demoInsights.forEach((i) => {
      store.insights.set(i.id, {
        ...i,
        userId,
        isDemo: true,
        sourceMetadata: {
          userId,
          sourceType: 'demo_seed',
          dataType: 'maintenance_log',
          importedAt: nowIso,
          userConfirmed: true,
          processingStatus: 'confirmed',
          deletionStatus: 'active',
          isDemo: true,
        },
      });
    });

    // 7. Realistic Conversation (Deterministic ID)
    const demoConv: CopilotConversation = {
      id: 'demo_conv_welcome',
      userId,
      isDemo: true,
      title: 'Household Overview & Cash Flow',
      createdAt: nowIso,
      updatedAt: nowIso,
      messages: [
        {
          id: 'msg_1',
          role: 'user',
          content: 'What is my current monthly net cash flow and what appliances need attention?',
          timestamp: nowIso,
        },
        {
          id: 'msg_2',
          role: 'assistant',
          content: 'Based on your verified financial ledger and equipment records:\n\n1. **Monthly Cash Flow**: You have received **$4,500.00** in salary income and **$48.20** in refunds (Total Credits: **$4,548.20**). Your total debits equal **$2,319.00**, leaving a **positive net cash flow of +$2,229.20** (Savings Rate: **49.0%**).\n\n2. **Appliance & Equipment Alerts**:\n- **Bosch 800 Series Dishwasher**: Flagged for maintenance (drain pump filter clearing).\n- **Trane XV20i Heat Pump**: Manufacturer warranty expires in **31 days** (2026-09-30).\n\nWould you like me to prepare a preventative service checklist or analyze your utility spending trends?',
          timestamp: nowIso,
        },
      ],
    };

    store.conversations.set(demoConv.id, demoConv);

    // 7. Realistic Demo Scenarios
    const demoScenario: Scenario = {
      id: 'demo_scen_inverter_ac',
      userId,
      isDemo: true,
      sourceMetadata: {
        userId,
        sourceType: 'demo_seed',
        dataType: 'scenario',
        importedAt: nowIso,
        userConfirmed: true,
        processingStatus: 'confirmed',
        deletionStatus: 'active',
        isDemo: true,
      },
      title: 'Upgrade to 5-Star Dual Inverter AC',
      description: 'Simulating purchase of energy-efficient dual inverter heat pump AC with 12-month zero-cost EMI.',
      type: 'appliance_purchase',
      inputs: {
        purchaseCost: 1500,
        downPayment: 300,
        loanPrincipal: 1200,
        annualInterestRate: 0,
        tenureMonths: 12,
        processingFee: 25,
        applianceName: 'Daikin 1.5 Ton 5-Star Inverter AC',
        applianceCategory: 'hvac',
        applianceLifespanYears: 10,
        applianceMonthlyOperatingCost: 35,
        notes: 'Includes 10-year compressor warranty.',
      },
      baselineMetrics: {
        monthlyIncome: 4500,
        monthlyRecurringExpenses: 2208,
        monthlyDiscretionaryExpenses: 111,
        totalMonthlyExpenses: 2319,
        netMonthlySurplus: 2181,
        savingsRate: 48.5,
        currency: 'USD',
      },
      projectedMetrics: {
        projectedMonthlyIncome: 4500,
        projectedMonthlyExpenses: 2454, // 2319 + 100 EMI + 35 operating
        projectedNetSurplus: 2046,
        projectedSavingsRate: 45.5,
        surplusDelta: -135,
        savingsRateDelta: -3.0,
        monthlyEmiPayment: 100,
        totalInterestPayable: 0,
        totalLoanCost: 1225, // 1200 + 25 fee
        oneTimeCashImpact: 325, // 300 down + 25 fee
        annualSurplusImpact: -1620,
        debtToIncomeRatio: 2.2,
        expenseToIncomeRatio: 54.5,
      },
      affordability: {
        status: 'highly_affordable',
        financialPressureScore: 12,
        verdictTitle: 'Highly Affordable & Value Accrediting',
        verdictSummary: 'Comfortable margin: Leaves $2,046 monthly surplus buffer (45.5% savings rate) during the 12-month financing period.',
        warnings: [],
        positiveFlags: [
          'Monthly surplus ($2,046) comfortably covers the $100 EMI (over 20x coverage)',
          'High post-decision savings rate preserved (45.5% vs recommended 20%)',
          'Zero percent interest rate avoids long-term finance drag',
        ],
        debtToIncomeRatio: 2.2,
        expenseToIncomeRatio: 54.5,
      },
      geminiExplanation: {
        executiveSummary: 'Purchasing the 5-Star Inverter AC on a 12-month zero-interest plan is well within your safe financial threshold and maintains a robust 45.5% savings rate.',
        riskAnalysis: [
          'Minimal liquidity risk given low $300 down payment.',
          'Slight increase in monthly operating power is offset by energy efficiency.',
        ],
        opportunityCost: 'Choosing zero-cost EMI over upfront cash preserves $1,200 in high-yield liquid reserves.',
        strategicRecommendation: 'Proceed with the purchase and set up automated payments for the 12-month tenure.',
        generatedAt: nowIso,
      },
      isPinned: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    store.scenarios.set(demoScenario.id, demoScenario);

    return {
      profiles: 1,
      expenses: store.expenses.size,
      assets: store.assets.size,
      transactions: store.transactions.size,
      documents: store.documents.size,
      insights: store.insights.size,
      conversations: store.conversations.size,
      scenarios: store.scenarios.size,
    };
  }

  /**
   * Safely clears ONLY demo/starter records for a user without affecting user-authored records
   */
  static clearDemoData(userId: string): {
    deletedCount: number;
    details: {
      expenses: number;
      assets: number;
      transactions: number;
      documents: number;
      insights: number;
      scenarios: number;
      conversations: number;
    };
    remainingCount: number;
    userRecordsCount: number;
  } {
    const store = getOrCreateUserStore(userId);
    const details = {
      expenses: 0,
      assets: 0,
      transactions: 0,
      documents: 0,
      insights: 0,
      scenarios: 0,
      conversations: 0,
    };

    const isDemoRecord = (id: string, item?: any): boolean => {
      if (!id) return false;
      if (
        id.startsWith('demo_') ||
        id.startsWith('ins_demo_') ||
        id.startsWith('scen_demo_') ||
        id.startsWith('cand_sal_')
      ) {
        return true;
      }
      if (item && (item.isDemo === true || item.source === 'demo_seed')) {
        return true;
      }
      return false;
    };

    // 1. Expenses
    for (const [id, exp] of Array.from(store.expenses.entries())) {
      if (isDemoRecord(id, exp)) {
        store.expenses.delete(id);
        details.expenses++;
      }
    }

    // 2. Assets
    for (const [id, ast] of Array.from(store.assets.entries())) {
      if (isDemoRecord(id, ast)) {
        store.assets.delete(id);
        details.assets++;
      }
    }

    // 3. Transactions
    for (const [id, tx] of Array.from(store.transactions.entries())) {
      if (isDemoRecord(id, tx)) {
        store.transactions.delete(id);
        details.transactions++;
      }
    }

    // 4. Documents
    for (const [id, doc] of Array.from(store.documents.entries())) {
      if (isDemoRecord(id, doc)) {
        store.documents.delete(id);
        details.documents++;
      }
    }

    // 5. Insights
    for (const [id, ins] of Array.from(store.insights.entries())) {
      if (isDemoRecord(id, ins)) {
        store.insights.delete(id);
        details.insights++;
      }
    }

    // 6. Scenarios
    for (const [id, scn] of Array.from(store.scenarios.entries())) {
      if (isDemoRecord(id, scn)) {
        store.scenarios.delete(id);
        details.scenarios++;
      }
    }

    // 7. Conversations
    for (const [id, cnv] of Array.from(store.conversations.entries())) {
      if (isDemoRecord(id, cnv)) {
        store.conversations.delete(id);
        details.conversations++;
      }
    }

    const deletedCount =
      details.expenses +
      details.assets +
      details.transactions +
      details.documents +
      details.insights +
      details.scenarios +
      details.conversations;

    const remainingUserRecords =
      store.expenses.size +
      store.assets.size +
      store.transactions.size +
      store.documents.size +
      store.insights.size +
      store.scenarios.size +
      store.conversations.size;

    return {
      deletedCount,
      details,
      remainingCount: remainingUserRecords,
      userRecordsCount: remainingUserRecords,
    };
  }

  /**
   * Retrieves comprehensive privacy and data governance statistics
   */
  static getPrivacySummary(userId: string): PrivacyCenterSummary {
    const store = getOrCreateUserStore(userId);

    const isDemo = (id: string, item?: any): boolean => {
      if (!id) return false;
      if (
        id.startsWith('demo_') ||
        id.startsWith('ins_demo_') ||
        id.startsWith('scen_demo_') ||
        id.startsWith('cand_sal_')
      ) {
        return true;
      }
      if (item && (item.isDemo === true || item.source === 'demo_seed' || item.sourceType === 'demo_seed')) {
        return true;
      }
      return false;
    };

    const countBreakdown = (map: Map<string, any>) => {
      let demo = 0;
      let user = 0;
      for (const [id, item] of map.entries()) {
        if (isDemo(id, item)) {
          demo++;
        } else {
          user++;
        }
      }
      return { total: map.size, user, demo };
    };

    const txBreakdown = countBreakdown(store.transactions);
    const expBreakdown = countBreakdown(store.expenses);
    const astBreakdown = countBreakdown(store.assets);
    const docBreakdown = countBreakdown(store.documents);
    const scnBreakdown = countBreakdown(store.scenarios);
    const cnvBreakdown = countBreakdown(store.conversations);

    const totalRecords =
      txBreakdown.total +
      expBreakdown.total +
      astBreakdown.total +
      docBreakdown.total +
      scnBreakdown.total +
      cnvBreakdown.total;

    const demoRecordsCount =
      txBreakdown.demo +
      expBreakdown.demo +
      astBreakdown.demo +
      docBreakdown.demo +
      scnBreakdown.demo +
      cnvBreakdown.demo;

    const userRecordsCount = totalRecords - demoRecordsCount;

    const sources: DataSourceConnection[] = [
      {
        id: 'src_manual_upload',
        sourceType: 'manual_upload',
        name: 'Manual Document Ingestion & Parser',
        description: 'Bank statements, salary slips, utility bills, receipts uploaded manually with explicit review & confirmation before committing.',
        status: docBreakdown.user > 0 ? 'active' : 'ready',
        statusLabel: docBreakdown.user > 0 ? `${docBreakdown.user} User Document(s) Stored` : 'Ready for Ingestion',
        isConfigured: true,
        recordsCount: docBreakdown.total,
        demoRecordsCount: docBreakdown.demo,
        canDisconnect: false,
      },
      {
        id: 'src_manual_entry',
        sourceType: 'manual_entry',
        name: 'Manual Entry & Verification',
        description: 'Direct user-entered expenses, equipment records, and custom what-if financial variables.',
        status: userRecordsCount > 0 ? 'active' : 'ready',
        statusLabel: userRecordsCount > 0 ? `${userRecordsCount} User Record(s)` : 'Ready',
        isConfigured: true,
        recordsCount: totalRecords,
        demoRecordsCount: demoRecordsCount,
        canDisconnect: false,
      },
      {
        id: 'src_google_drive',
        sourceType: 'google_drive',
        name: 'Google Drive Connector (Architecture Ready)',
        description: 'Folder-scoped read-only ingestion for monthly PDF bank statements and recurring bills with strict local authorization.',
        status: 'ready',
        statusLabel: 'Architecture Ready (OAuth Disabled / User Disconnected)',
        isConfigured: false,
        scope: 'https://www.googleapis.com/auth/drive.readonly (designated folder only)',
        recordsCount: 0,
        demoRecordsCount: 0,
        canDisconnect: true,
      },
      {
        id: 'src_gmail',
        sourceType: 'gmail',
        name: 'Gmail Financial Search (Architecture Ready)',
        description: 'Narrow financial query ingestion for digital utility invoices, receipts, and salary notices.',
        status: 'ready',
        statusLabel: 'Architecture Ready (OAuth Disabled / User Disconnected)',
        isConfigured: false,
        scope: 'https://www.googleapis.com/auth/gmail.readonly (financial query restricted)',
        recordsCount: 0,
        demoRecordsCount: 0,
        canDisconnect: true,
      },
      {
        id: 'src_demo_seed',
        sourceType: 'demo_seed',
        name: 'Sample Household Starter Dataset',
        description: 'Deterministic demo records including sample mortgage, utilities, heat pump warranty, and inverter AC scenario.',
        status: demoRecordsCount > 0 ? 'active' : 'disconnected',
        statusLabel: demoRecordsCount > 0 ? `${demoRecordsCount} Demo Record(s) Active` : 'Clean (No Demo Data)',
        isConfigured: demoRecordsCount > 0,
        recordsCount: demoRecordsCount,
        demoRecordsCount: demoRecordsCount,
        canDisconnect: true,
      },
    ];

    return {
      userId,
      authStatus: 'authenticated',
      isolationLevel: 'STRICT_USER_ISOLATED',
      dataRetentionPolicy: 'Strict tenant UID isolation. Zero cross-household visibility. Explicit user-initiated deletion guarantees.',
      totalRecords,
      userRecordsCount,
      demoRecordsCount,
      recordsByType: {
        transactions: txBreakdown,
        expenses: expBreakdown,
        assets: astBreakdown,
        documents: docBreakdown,
        scenarios: scnBreakdown,
        conversations: cnvBreakdown,
      },
      sources,
      aiPrivacyBoundary: {
        status: 'MINIMAL_RELEVANT_CONTEXT_ONLY',
        description: 'HouseMind strictly limits data sent to Gemini to the minimum relevant fields needed for your query.',
        sharedElements: [
          'Aggregated category spending totals & monthly recurring sums',
          'Current country/currency/timezone settings for localized calculation',
          'Appliance warranty deadlines & maintenance status flags',
          'Specific scenario inputs explicitly simulated by the user',
        ],
        strictlyRedactedElements: [
          'Full unmasked bank account numbers, PANs, card CVVs, and routing numbers',
          'Personal Identifiable Information (SSN, National IDs, passwords)',
          'Raw unparsed PDF document binaries or non-relevant files',
          'Records from any other household or system tenant',
        ],
        retentionGuarantee: 'AI context payloads are ephemeral, never stored for model training or shared with third parties.',
      },
    };
  }

  // Clear data for test isolation & full user data reset
  static clearUserData(userId: string): { resetCount: number } {
    const store = getOrCreateUserStore(userId);
    const count =
      store.expenses.size +
      store.assets.size +
      store.transactions.size +
      store.documents.size +
      store.insights.size +
      store.scenarios.size +
      store.conversations.size;

    multiTenantStore.delete(userId);
    return { resetCount: count };
  }

  static clearAll(): void {
    multiTenantStore.clear();
  }
}
