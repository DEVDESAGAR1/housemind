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
  Property,
  Room,
  Warranty,
  MaintenanceTask,
  UtilityAccount,
  HouseholdLoan,
  CreditCardAccount,
  HomeCommandCenterSummary,
  HouseholdMemoryItem,
  AssetRelationships,
  HouseholdIssue,
  HouseholdIssueStatus,
  HouseholdIssueSeverity,
  HouseholdIssueActivityItem,
} from '../../src/types';
import { evaluateIssueSafety } from './issueSafetyService';

export const VALID_ISSUE_TRANSITIONS: Record<HouseholdIssueStatus, HouseholdIssueStatus[]> = {
  reported: ['triaged', 'scheduled', 'in_progress', 'cancelled'],
  triaged: ['scheduled', 'in_progress', 'waiting_parts', 'cancelled'],
  scheduled: ['in_progress', 'waiting_parts', 'resolved', 'cancelled'],
  in_progress: ['waiting_parts', 'resolved', 'scheduled', 'cancelled'],
  waiting_parts: ['in_progress', 'scheduled', 'resolved', 'cancelled'],
  resolved: ['verified', 'closed', 'in_progress'],
  verified: ['closed', 'in_progress'],
  closed: ['reported', 'triaged'],
  cancelled: ['reported', 'triaged'],
};

// In-Memory Multi-Tenant Master Storage (isolated strictly per userId)
interface UserDataStore {
  profile: Record<string, any>;
  properties: Map<string, any>;
  rooms: Map<string, any>;
  expenses: Map<string, any>;
  assets: Map<string, any>;
  warranties: Map<string, any>;
  maintenances: Map<string, any>;
  issues: Map<string, HouseholdIssue>;
  utilities: Map<string, any>;
  loans: Map<string, any>;
  creditCards: Map<string, any>;
  transactions: Map<string, any>;
  documents: Map<string, any>;
  insights: Map<string, any>;
  conversations: Map<string, any>;
  scenarios: Map<string, any>;
  memories: Map<string, any>;
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
      properties: new Map(),
      rooms: new Map(),
      expenses: new Map(),
      assets: new Map(),
      warranties: new Map(),
      maintenances: new Map(),
      issues: new Map(),
      utilities: new Map(),
      loans: new Map(),
      creditCards: new Map(),
      transactions: new Map(),
      documents: new Map(),
      insights: new Map(),
      conversations: new Map(),
      scenarios: new Map(),
      memories: new Map(),
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
  static async listExpenses(userId: string, userToken?: string, assetId?: string): Promise<Expense[]> {
    const store = getOrCreateUserStore(userId);
    let items = Array.from(store.expenses.values());
    if (assetId) {
      items = items.filter((e) => e.assetId === assetId);
    }
    return items.sort(
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
  static async listAssets(userId: string, category?: string): Promise<Asset[]> {
    const store = getOrCreateUserStore(userId);
    let items = Array.from(store.assets.values());
    if (category && category !== 'all') {
      const lowerCat = category.toLowerCase().trim();
      items = items.filter(
        (a) =>
          (a.category || '').toLowerCase() === lowerCat ||
          (a.customCategory || '').toLowerCase() === lowerCat ||
          (a.subcategory || '').toLowerCase() === lowerCat ||
          (a.assetType || '').toLowerCase() === lowerCat
      );
    }
    return items.sort(
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

  /**
   * Phase 24.1: Retrieves comprehensive connected relationships for a specific asset
   * Connects warranty, maintenance, issues/tasks, expenses, documents, calendar, and notifications
   */
  static async getAssetRelationships(userId: string, assetId: string): Promise<AssetRelationships | null> {
    const store = getOrCreateUserStore(userId);
    const asset = store.assets.get(assetId);
    if (!asset) return null;

    const property = asset.propertyId ? store.properties.get(asset.propertyId) || null : null;
    const room = asset.roomId ? store.rooms.get(asset.roomId) || null : null;

    // Connected Issues
    const issues = Array.from(store.issues.values()).filter(
      (i: any) => i.assetId === assetId
    );

    // Connected Warranties
    const warranties = Array.from(store.warranties.values()).filter(
      (w: any) =>
        w.assetId === assetId ||
        (Array.isArray(asset.warrantyIds) && asset.warrantyIds.includes(w.id)) ||
        asset.warrantyDocumentId === w.id
    );

    // Connected Maintenance Tasks
    const maintenances = Array.from(store.maintenances.values()).filter(
      (m: any) =>
        m.assetId === assetId ||
        (Array.isArray(asset.maintenanceTaskIds) && asset.maintenanceTaskIds.includes(m.id))
    );

    // Connected Expenses
    const expenses = Array.from(store.expenses.values()).filter(
      (e: any) =>
        e.assetId === assetId ||
        (Array.isArray(asset.expenseIds) && asset.expenseIds.includes(e.id))
    );

    // Connected Documents
    const documents = Array.from(store.documents.values()).filter(
      (d: any) =>
        d.assetId === assetId ||
        d.id === asset.invoiceDocumentId ||
        d.id === asset.warrantyDocumentId ||
        (Array.isArray(asset.supportingDocumentIds) && asset.supportingDocumentIds.includes(d.id)) ||
        (Array.isArray(asset.documentIds) && asset.documentIds.includes(d.id))
    );

    // Connected Calendar Events
    let calendarEvents: any[] = [];
    try {
      const { CalendarService } = await import('./calendarService');
      const calRes = await CalendarService.getCalendarEvents(userId);
      const warIds = new Set(warranties.map((w: any) => w.id));
      const maintIds = new Set(maintenances.map((m: any) => m.id));
      const expIds = new Set(expenses.map((e: any) => e.id));
      const docIds = new Set(documents.map((d: any) => d.id));

      calendarEvents = calRes.events.filter(
        (ev) =>
          ev.sourceId === assetId ||
          (ev.metadata?.assetName && ev.metadata.assetName.toLowerCase() === asset.name.toLowerCase()) ||
          (ev.metadata?.assetId && ev.metadata.assetId === assetId) ||
          warIds.has(ev.sourceId) ||
          maintIds.has(ev.sourceId) ||
          expIds.has(ev.sourceId) ||
          docIds.has(ev.sourceId)
      );
    } catch {
      calendarEvents = [];
    }

    // Connected Notifications
    let notifications: any[] = [];
    try {
      const { NotificationService } = await import('./notificationService');
      const notifRes = await NotificationService.getNotifications(userId);
      const warIds = new Set(warranties.map((w: any) => w.id));
      const maintIds = new Set(maintenances.map((m: any) => m.id));
      const expIds = new Set(expenses.map((e: any) => e.id));
      const docIds = new Set(documents.map((d: any) => d.id));

      notifications = notifRes.notifications.filter(
        (n) =>
          n.sourceId === assetId ||
          (n.metadata?.assetId && n.metadata.assetId === assetId) ||
          warIds.has(n.sourceId) ||
          maintIds.has(n.sourceId) ||
          expIds.has(n.sourceId) ||
          docIds.has(n.sourceId)
      );
    } catch {
      notifications = [];
    }

    return {
      asset,
      property,
      room,
      issues,
      warranties,
      maintenances,
      expenses,
      documents,
      calendarEvents,
      notifications,
    };
  }

  // --- PROPERTIES ---
  static async listProperties(userId: string): Promise<Property[]> {
    const store = getOrCreateUserStore(userId);
    return Array.from(store.properties.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  static async getProperty(userId: string, id: string): Promise<Property | null> {
    const store = getOrCreateUserStore(userId);
    return store.properties.get(id) || null;
  }

  static async createProperty(userId: string, data: any, customId?: string): Promise<Property> {
    const store = getOrCreateUserStore(userId);
    const id = customId || `prop_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    const property: Property = {
      id,
      userId,
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.properties.set(id, property);
    return property;
  }

  static async updateProperty(userId: string, id: string, data: any): Promise<Property | null> {
    const store = getOrCreateUserStore(userId);
    const existing = store.properties.get(id);
    if (!existing) return null;
    const updated: Property = {
      ...existing,
      ...data,
      id,
      userId,
      updatedAt: new Date().toISOString(),
    };
    store.properties.set(id, updated);
    return updated;
  }

  static async deleteProperty(userId: string, id: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    // When a property is deleted, also update associated rooms and assets if any
    for (const [roomId, room] of store.rooms.entries()) {
      if (room.propertyId === id) {
        store.rooms.delete(roomId);
      }
    }
    return store.properties.delete(id);
  }

  // --- ROOMS ---
  static async listRooms(userId: string, propertyId?: string): Promise<Room[]> {
    const store = getOrCreateUserStore(userId);
    let items = Array.from(store.rooms.values());
    if (propertyId) {
      items = items.filter((r) => r.propertyId === propertyId);
    }
    return items.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  static async getRoom(userId: string, id: string): Promise<Room | null> {
    const store = getOrCreateUserStore(userId);
    return store.rooms.get(id) || null;
  }

  static async createRoom(userId: string, data: any, customId?: string): Promise<Room> {
    const store = getOrCreateUserStore(userId);
    const id = customId || `room_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    const room: Room = {
      id,
      userId,
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.rooms.set(id, room);
    return room;
  }

  static async updateRoom(userId: string, id: string, data: any): Promise<Room | null> {
    const store = getOrCreateUserStore(userId);
    const existing = store.rooms.get(id);
    if (!existing) return null;
    const updated: Room = {
      ...existing,
      ...data,
      id,
      userId,
      updatedAt: new Date().toISOString(),
    };
    store.rooms.set(id, updated);
    return updated;
  }

  static async deleteRoom(userId: string, id: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    return store.rooms.delete(id);
  }

  // --- WARRANTIES ---
  static async listWarranties(userId: string, assetId?: string): Promise<Warranty[]> {
    const store = getOrCreateUserStore(userId);
    let items = Array.from(store.warranties.values());
    if (assetId) {
      items = items.filter((w) => w.assetId === assetId);
    }
    const today = new Date().toISOString().split('T')[0];
    // Dynamic status calculation
    return items
      .map((w) => {
        let status = w.status;
        if (w.endDate) {
          const end = new Date(w.endDate).getTime();
          const now = new Date(today).getTime();
          const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
          if (daysLeft < 0) status = 'expired';
          else if (daysLeft <= 60) status = 'expiring_soon';
          else status = 'active';
        }
        return { ...w, status };
      })
      .sort((a, b) => new Date(a.endDate || 0).getTime() - new Date(b.endDate || 0).getTime());
  }

  static async getWarranty(userId: string, id: string): Promise<Warranty | null> {
    const store = getOrCreateUserStore(userId);
    return store.warranties.get(id) || null;
  }

  static async createWarranty(userId: string, data: any, customId?: string): Promise<Warranty> {
    const store = getOrCreateUserStore(userId);
    const id = customId || `war_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    const warranty: Warranty = {
      id,
      userId,
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.warranties.set(id, warranty);
    return warranty;
  }

  static async updateWarranty(userId: string, id: string, data: any): Promise<Warranty | null> {
    const store = getOrCreateUserStore(userId);
    const existing = store.warranties.get(id);
    if (!existing) return null;
    const updated: Warranty = {
      ...existing,
      ...data,
      id,
      userId,
      updatedAt: new Date().toISOString(),
    };
    store.warranties.set(id, updated);
    return updated;
  }

  static async deleteWarranty(userId: string, id: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    return store.warranties.delete(id);
  }

  // --- MAINTENANCE TASKS ---
  static async listMaintenances(
    userId: string,
    assetId?: string,
    propertyId?: string
  ): Promise<MaintenanceTask[]> {
    const store = getOrCreateUserStore(userId);
    let items = Array.from(store.maintenances.values());
    if (assetId) items = items.filter((m) => m.assetId === assetId);
    if (propertyId) items = items.filter((m) => m.propertyId === propertyId);
    const today = new Date().toISOString().split('T')[0];
    return items
      .map((m) => {
        let status = m.status;
        if (m.status !== 'completed' && m.nextServiceDate) {
          if (m.nextServiceDate < today) status = 'overdue';
          else status = 'scheduled';
        }
        return { ...m, status };
      })
      .sort((a, b) => new Date(a.serviceDate || 0).getTime() - new Date(b.serviceDate || 0).getTime());
  }

  static async getMaintenance(userId: string, id: string): Promise<MaintenanceTask | null> {
    const store = getOrCreateUserStore(userId);
    return store.maintenances.get(id) || null;
  }

  static async createMaintenance(userId: string, data: any, customId?: string): Promise<MaintenanceTask> {
    const store = getOrCreateUserStore(userId);
    const id = customId || `maint_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    const task: any = {
      id,
      userId,
      ...data,
      dueDate: data.serviceDate || data.dueDate,
      estimatedCost: data.cost ?? data.estimatedCost,
      actualCost: data.cost ?? data.actualCost,
      status: data.status || 'scheduled',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.maintenances.set(id, task);
    return task;
  }

  static async updateMaintenance(userId: string, id: string, data: any): Promise<MaintenanceTask | null> {
    const store = getOrCreateUserStore(userId);
    const existing = store.maintenances.get(id);
    if (!existing) return null;
    const updated: any = {
      ...existing,
      ...data,
      dueDate: data.serviceDate ?? data.dueDate ?? (existing as any).dueDate ?? existing.serviceDate,
      estimatedCost: data.cost ?? data.estimatedCost ?? (existing as any).estimatedCost ?? existing.cost,
      actualCost: data.actualCost ?? data.cost ?? (existing as any).actualCost,
      status: data.status ?? existing.status,
      id,
      userId,
      updatedAt: new Date().toISOString(),
    };
    store.maintenances.set(id, updated);
    return updated;
  }

  static async deleteMaintenance(userId: string, id: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    return store.maintenances.delete(id);
  }

  // --- HOUSEHOLD ISSUES / TICKETS (PHASE 24.2) ---
  static async listIssues(
    userId: string,
    filters?: {
      assetId?: string;
      propertyId?: string;
      roomId?: string;
      status?: HouseholdIssueStatus;
      severity?: HouseholdIssueSeverity;
      category?: string;
    }
  ): Promise<HouseholdIssue[]> {
    const store = getOrCreateUserStore(userId);
    let items = Array.from(store.issues.values());

    if (filters?.assetId) items = items.filter((i) => i.assetId === filters.assetId);
    if (filters?.propertyId) items = items.filter((i) => i.propertyId === filters.propertyId);
    if (filters?.roomId) items = items.filter((i) => i.roomId === filters.roomId);
    if (filters?.status) items = items.filter((i) => i.status === filters.status);
    if (filters?.severity) items = items.filter((i) => i.severity === filters.severity);
    if (filters?.category) items = items.filter((i) => i.category === filters.category);

    const severityWeight: Record<HouseholdIssueSeverity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return items.sort((a, b) => {
      // Prioritize active issues before closed/cancelled
      const aClosed = a.status === 'closed' || a.status === 'cancelled';
      const bClosed = b.status === 'closed' || b.status === 'cancelled';
      if (aClosed !== bClosed) return aClosed ? 1 : -1;

      // Prioritize by severity
      const weightDiff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
      if (weightDiff !== 0) return weightDiff;

      // Finally sort by reportedAt descending
      return new Date(b.reportedAt || b.createdAt || 0).getTime() - new Date(a.reportedAt || a.createdAt || 0).getTime();
    });
  }

  static async getIssue(userId: string, id: string): Promise<HouseholdIssue | null> {
    const store = getOrCreateUserStore(userId);
    return store.issues.get(id) || null;
  }

  static async createIssue(
    userId: string,
    data: any,
    customId?: string
  ): Promise<HouseholdIssue> {
    const store = getOrCreateUserStore(userId);
    const id = customId || `issue_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    // Check safety rules deterministically
    const safety = evaluateIssueSafety(data.title, data.description, data.notes);
    let severity: HouseholdIssueSeverity = data.severity || 'medium';
    let safetyWarning = data.safetyWarning;

    if (safety.isSafetyRisk) {
      if (safety.suggestedSeverity === 'critical' || severity !== 'critical') {
        severity = safety.suggestedSeverity || 'high';
      }
      safetyWarning = safety.safetyWarning || safetyWarning;
    }

    const initialActivity: HouseholdIssueActivityItem = {
      id: `act_${crypto.randomUUID()}`,
      timestamp,
      action: 'Issue Reported',
      note: data.notes || (data.description ? `Initial report: ${data.description.slice(0, 100)}` : 'Issue opened in system.'),
      newStatus: data.status || 'reported',
      userId,
    };

    const issue: HouseholdIssue = {
      id,
      userId,
      title: data.title,
      description: data.description || undefined,
      assetId: data.assetId || undefined,
      propertyId: data.propertyId || undefined,
      roomId: data.roomId || undefined,
      category: data.category || 'general',
      subcategory: data.subcategory || undefined,
      severity,
      status: data.status || 'reported',
      reportedAt: data.reportedAt || timestamp,
      dueDate: data.dueDate || undefined,
      scheduledDate: data.scheduledDate || undefined,
      resolvedAt: data.resolvedAt || undefined,
      verifiedAt: data.verifiedAt || undefined,
      closedAt: data.closedAt || undefined,
      notes: data.notes || undefined,
      attachments: data.attachments || [],
      warrantyId: data.warrantyId || undefined,
      maintenanceId: data.maintenanceId || undefined,
      documentIds: data.documentIds || [],
      serviceProvider: data.serviceProvider || undefined,
      serviceProviderContact: data.serviceProviderContact || undefined,
      estimatedCost: typeof data.estimatedCost === 'number' ? data.estimatedCost : undefined,
      actualCost: typeof data.actualCost === 'number' ? data.actualCost : undefined,
      resolution: data.resolution || undefined,
      safetyWarning: safetyWarning || undefined,
      isDemo: data.isDemo || false,
      createdBy: data.createdBy || userId,
      createdAt: timestamp,
      updatedAt: timestamp,
      activityHistory: [initialActivity],
    };

    store.issues.set(id, issue);
    return issue;
  }

  static async updateIssue(
    userId: string,
    id: string,
    data: any
  ): Promise<HouseholdIssue | null> {
    const store = getOrCreateUserStore(userId);
    const existing = store.issues.get(id);
    if (!existing) return null;

    const timestamp = new Date().toISOString();

    // Check safety rules if title or description updated
    let safetyWarning = data.safetyWarning !== undefined ? data.safetyWarning : existing.safetyWarning;
    let severity = data.severity || existing.severity;
    if (data.title || data.description || data.notes) {
      const safety = evaluateIssueSafety(
        data.title || existing.title,
        data.description || existing.description,
        data.notes || existing.notes
      );
      if (safety.isSafetyRisk) {
        if (safety.suggestedSeverity === 'critical' || severity !== 'critical') {
          severity = safety.suggestedSeverity || 'high';
        }
        safetyWarning = safety.safetyWarning || safetyWarning;
      }
    }

    const updated: HouseholdIssue = {
      ...existing,
      ...data,
      id,
      userId,
      severity,
      safetyWarning,
      updatedAt: timestamp,
    };

    store.issues.set(id, updated);
    return updated;
  }

  static async transitionIssueStatus(
    userId: string,
    id: string,
    newStatus: HouseholdIssueStatus,
    options?: {
      note?: string;
      resolution?: string;
      actualCost?: number;
    }
  ): Promise<HouseholdIssue> {
    const store = getOrCreateUserStore(userId);
    const existing = store.issues.get(id);
    if (!existing) {
      throw new Error('Issue not found.');
    }

    const currentStatus = existing.status;
    if (currentStatus === newStatus) {
      return existing;
    }

    const allowed = VALID_ISSUE_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from "${currentStatus}" to "${newStatus}". Allowed transitions: ${allowed.join(', ')}`
      );
    }

    const timestamp = new Date().toISOString();
    const patch: Partial<HouseholdIssue> = {
      status: newStatus,
      updatedAt: timestamp,
    };

    if (newStatus === 'resolved') {
      patch.resolvedAt = timestamp;
      if (options?.resolution) patch.resolution = options.resolution;
      if (typeof options?.actualCost === 'number') patch.actualCost = options.actualCost;
    } else if (newStatus === 'verified') {
      patch.verifiedAt = timestamp;
    } else if (newStatus === 'closed') {
      patch.closedAt = timestamp;
    }

    const activityItem: HouseholdIssueActivityItem = {
      id: `act_${crypto.randomUUID()}`,
      timestamp,
      action: `Status changed from ${currentStatus} to ${newStatus}`,
      note: options?.note || options?.resolution || undefined,
      previousStatus: currentStatus,
      newStatus,
      userId,
    };

    const updated: HouseholdIssue = {
      ...existing,
      ...patch,
      activityHistory: [...(existing.activityHistory || []), activityItem],
    };

    store.issues.set(id, updated);
    return updated;
  }

  static async addIssueActivity(
    userId: string,
    id: string,
    action: string,
    note?: string
  ): Promise<HouseholdIssue> {
    const store = getOrCreateUserStore(userId);
    const existing = store.issues.get(id);
    if (!existing) throw new Error('Issue not found.');

    const activityItem: HouseholdIssueActivityItem = {
      id: `act_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      action,
      note,
      userId,
    };

    const updated: HouseholdIssue = {
      ...existing,
      updatedAt: new Date().toISOString(),
      activityHistory: [...(existing.activityHistory || []), activityItem],
    };

    store.issues.set(id, updated);
    return updated;
  }

  static async deleteIssue(userId: string, id: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    return store.issues.delete(id);
  }

  // --- UTILITIES ---
  static async listUtilities(userId: string, propertyId?: string): Promise<UtilityAccount[]> {
    const store = getOrCreateUserStore(userId);
    let items = Array.from(store.utilities.values());
    if (propertyId) items = items.filter((u) => u.propertyId === propertyId);
    return items.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  static async getUtility(userId: string, id: string): Promise<UtilityAccount | null> {
    const store = getOrCreateUserStore(userId);
    return store.utilities.get(id) || null;
  }

  static async createUtility(userId: string, data: any, customId?: string): Promise<UtilityAccount> {
    const store = getOrCreateUserStore(userId);
    const id = customId || `util_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    const utility: any = {
      id,
      userId,
      ...data,
      utilityType: data.serviceType || data.utilityType,
      providerName: data.provider || data.providerName,
      accountNumber: data.accountIdentifier || data.accountNumber,
      typicalMonthlyCost: data.typicalAmount ?? data.typicalMonthlyCost,
      autoPayEnabled: data.isAutoPay ?? data.autoPayEnabled,
      paymentDueDay: data.dueDateDay ?? data.paymentDueDay,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.utilities.set(id, utility);
    return utility;
  }

  static async updateUtility(userId: string, id: string, data: any): Promise<UtilityAccount | null> {
    const store = getOrCreateUserStore(userId);
    const existing = store.utilities.get(id);
    if (!existing) return null;
    const updated: any = {
      ...existing,
      ...data,
      utilityType: data.serviceType || data.utilityType || (existing as any).utilityType || existing.serviceType,
      providerName: data.provider || data.providerName || (existing as any).providerName || existing.provider,
      accountNumber: data.accountIdentifier || data.accountNumber || (existing as any).accountNumber || existing.accountIdentifier,
      typicalMonthlyCost: data.typicalAmount ?? data.typicalMonthlyCost ?? (existing as any).typicalMonthlyCost ?? existing.typicalAmount,
      autoPayEnabled: data.isAutoPay ?? data.autoPayEnabled ?? (existing as any).autoPayEnabled ?? existing.isAutoPay,
      paymentDueDay: data.dueDateDay ?? data.paymentDueDay ?? (existing as any).paymentDueDay ?? existing.dueDateDay,
      id,
      userId,
      updatedAt: new Date().toISOString(),
    };
    store.utilities.set(id, updated);
    return updated;
  }

  static async deleteUtility(userId: string, id: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    return store.utilities.delete(id);
  }

  // --- LOANS & EMI ---
  static async listLoans(userId: string, propertyId?: string): Promise<HouseholdLoan[]> {
    const store = getOrCreateUserStore(userId);
    let list = Array.from(store.loans.values());
    if (propertyId) {
      list = list.filter((l) => l.propertyId === propertyId);
    }
    return list.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  static async getLoan(userId: string, id: string): Promise<HouseholdLoan | null> {
    const store = getOrCreateUserStore(userId);
    return store.loans.get(id) || null;
  }

  static async createLoan(userId: string, data: any, customId?: string): Promise<HouseholdLoan> {
    const store = getOrCreateUserStore(userId);
    const id = customId || `loan_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    const loan: any = {
      id,
      userId,
      ...data,
      name: data.loanName || data.name,
      lenderName: data.lender || data.lenderName,
      originalPrincipal: data.principalAmount ?? data.originalPrincipal,
      currentBalance: data.outstandingAmount ?? data.currentBalance,
      interestRatePercent: data.interestRate ?? data.interestRatePercent,
      monthlyPayment: data.emiAmount ?? data.monthlyPayment,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.loans.set(id, loan);
    return loan;
  }

  static async updateLoan(userId: string, id: string, data: any): Promise<HouseholdLoan | null> {
    const store = getOrCreateUserStore(userId);
    const existing = store.loans.get(id);
    if (!existing) return null;
    const updated: any = {
      ...existing,
      ...data,
      name: data.loanName || data.name || (existing as any).name || existing.loanName,
      lenderName: data.lender || data.lenderName || (existing as any).lenderName || existing.lender,
      originalPrincipal: data.principalAmount ?? data.originalPrincipal ?? (existing as any).originalPrincipal ?? existing.principalAmount,
      currentBalance: data.outstandingAmount ?? data.currentBalance ?? (existing as any).currentBalance ?? existing.outstandingAmount,
      interestRatePercent: data.interestRate ?? data.interestRatePercent ?? (existing as any).interestRatePercent ?? existing.interestRate,
      monthlyPayment: data.emiAmount ?? data.monthlyPayment ?? (existing as any).monthlyPayment ?? existing.emiAmount,
      id,
      userId,
      updatedAt: new Date().toISOString(),
    };
    store.loans.set(id, updated);
    return updated;
  }

  static async deleteLoan(userId: string, id: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    return store.loans.delete(id);
  }

  // --- CREDIT CARDS ---
  static async listCreditCards(userId: string): Promise<CreditCardAccount[]> {
    const store = getOrCreateUserStore(userId);
    return Array.from(store.creditCards.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  static async getCreditCard(userId: string, id: string): Promise<CreditCardAccount | null> {
    const store = getOrCreateUserStore(userId);
    return store.creditCards.get(id) || null;
  }

  static async createCreditCard(userId: string, data: any, customId?: string): Promise<CreditCardAccount> {
    const store = getOrCreateUserStore(userId);
    const id = customId || `cc_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    const cc: any = {
      id,
      userId,
      ...data,
      cardName: data.cardNickname || data.cardName,
      issuer: data.cardIssuer || data.issuer,
      lastFourDigits: data.last4Digits || data.lastFourDigits,
      currentBalance: data.outstandingAmount ?? data.currentBalance,
      aprPercent: data.interestRateAPR ?? data.aprPercent,
      autoPayEnabled: data.isAutoPay ?? data.autoPayEnabled,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    store.creditCards.set(id, cc);
    return cc;
  }

  static async updateCreditCard(userId: string, id: string, data: any): Promise<CreditCardAccount | null> {
    const store = getOrCreateUserStore(userId);
    const existing = store.creditCards.get(id);
    if (!existing) return null;
    const updated: any = {
      ...existing,
      ...data,
      cardName: data.cardNickname || data.cardName || (existing as any).cardName || existing.cardNickname,
      issuer: data.cardIssuer || data.issuer || (existing as any).issuer || existing.cardIssuer,
      lastFourDigits: data.last4Digits || data.lastFourDigits || (existing as any).lastFourDigits || existing.last4Digits,
      currentBalance: data.outstandingAmount ?? data.currentBalance ?? (existing as any).currentBalance ?? existing.outstandingAmount,
      aprPercent: data.interestRateAPR ?? data.aprPercent ?? (existing as any).aprPercent ?? existing.interestRateAPR,
      autoPayEnabled: data.isAutoPay ?? data.autoPayEnabled ?? (existing as any).autoPayEnabled ?? existing.isAutoPay,
      id,
      userId,
      updatedAt: new Date().toISOString(),
    };
    store.creditCards.set(id, updated);
    return updated;
  }

  static async deleteCreditCard(userId: string, id: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    return store.creditCards.delete(id);
  }

  // --- HOME COMMAND CENTER SUMMARY ---
  static async getHomeCommandCenterSummary(userId: string): Promise<HomeCommandCenterSummary> {
    const store = getOrCreateUserStore(userId);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const properties = Array.from(store.properties.values());
    const rooms = Array.from(store.rooms.values());
    const assets = Array.from(store.assets.values());
    const warranties = Array.from(store.warranties.values());
    const maintenances = Array.from(store.maintenances.values());
    const utilities = Array.from(store.utilities.values());
    const loans = Array.from(store.loans.values());
    const creditCards = Array.from(store.creditCards.values());
    const expenses = Array.from(store.expenses.values());
    const documents = Array.from(store.documents.values());

    // 1. Today & Urgent Tasks
    const urgentTasks: HomeCommandCenterSummary['today']['urgentTasks'] = [];
    let overdueCount = 0;
    let dueTodayCount = 0;

    // Check overdue/due expenses
    for (const exp of expenses) {
      if (exp.paymentStatus !== 'paid' && exp.dueDate) {
        if (exp.dueDate < todayStr) {
          overdueCount++;
          urgentTasks.push({
            id: `urg_exp_${exp.id}`,
            type: 'overdue_payment',
            title: `Overdue: ${exp.title}`,
            amount: exp.amount,
            dueDate: exp.dueDate,
            severity: 'critical',
          });
        } else if (exp.dueDate === todayStr) {
          dueTodayCount++;
          urgentTasks.push({
            id: `urg_exp_${exp.id}`,
            type: 'bill_due',
            title: `Due Today: ${exp.title}`,
            amount: exp.amount,
            dueDate: exp.dueDate,
            severity: 'high',
          });
        }
      }
    }

    // Check overdue/due credit cards
    for (const cc of creditCards) {
      if (cc.paymentStatus !== 'paid' && cc.paymentDueDate) {
        if (cc.paymentDueDate < todayStr) {
          overdueCount++;
          urgentTasks.push({
            id: `urg_cc_${cc.id}`,
            type: 'overdue_payment',
            title: `Overdue Card Bill: ${cc.cardNickname} (*${cc.last4Digits})`,
            amount: cc.outstandingAmount,
            dueDate: cc.paymentDueDate,
            severity: 'critical',
          });
        } else if (cc.paymentDueDate === todayStr) {
          dueTodayCount++;
          urgentTasks.push({
            id: `urg_cc_${cc.id}`,
            type: 'bill_due',
            title: `Card Payment Due: ${cc.cardNickname}`,
            amount: cc.minimumDue || cc.outstandingAmount,
            dueDate: cc.paymentDueDate,
            severity: 'high',
          });
        }
      }
    }

    // Check maintenance overdue
    for (const m of maintenances) {
      const dueDate = m.nextServiceDate || m.serviceDate;
      if (m.status !== 'completed' && dueDate) {
        if (dueDate < todayStr) {
          overdueCount++;
          urgentTasks.push({
            id: `urg_maint_${m.id}`,
            type: 'maintenance_due',
            title: `Overdue Service: ${m.title}`,
            dueDate,
            severity: 'high',
          });
        } else if (dueDate === todayStr) {
          dueTodayCount++;
          urgentTasks.push({
            id: `urg_maint_${m.id}`,
            type: 'maintenance_due',
            title: `Service Due Today: ${m.title}`,
            dueDate,
            severity: 'medium',
          });
        }
      }
    }

    // Check warranties expiring soon (< 30 days)
    for (const w of warranties) {
      if (w.endDate && w.endDate >= todayStr && w.endDate <= in30Days) {
        const daysLeft = Math.max(
          0,
          Math.ceil(
            (new Date(w.endDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
          )
        );
        urgentTasks.push({
          id: `urg_war_${w.id}`,
          type: 'warranty_expiring',
          title: `Warranty Expiring: ${w.warrantyProvider}`,
          subtitle: `${daysLeft} days remaining`,
          dueDate: w.endDate,
          severity: daysLeft <= 7 ? 'high' : 'medium',
        });
      }
    }

    // Check open household issues / tickets requiring attention
    const issues = Array.from(store.issues.values());
    for (const issue of issues) {
      if (issue.status !== 'resolved' && issue.status !== 'closed' && issue.status !== 'cancelled') {
        if (issue.severity === 'critical') {
          overdueCount++;
          urgentTasks.push({
            id: `urg_issue_${issue.id}`,
            type: 'issue_attention',
            title: `Critical Issue: ${issue.title}`,
            dueDate: issue.dueDate || issue.scheduledDate,
            severity: 'critical',
          });
        } else if (issue.dueDate && issue.dueDate < todayStr) {
          overdueCount++;
          urgentTasks.push({
            id: `urg_issue_${issue.id}`,
            type: 'issue_attention',
            title: `Overdue Issue: ${issue.title}`,
            dueDate: issue.dueDate,
            severity: 'high',
          });
        } else if (issue.dueDate === todayStr || issue.scheduledDate === todayStr) {
          dueTodayCount++;
          urgentTasks.push({
            id: `urg_issue_${issue.id}`,
            type: 'issue_attention',
            title: `Issue Action Today: ${issue.title}`,
            dueDate: issue.dueDate || issue.scheduledDate,
            severity: issue.severity === 'high' ? 'high' : 'medium',
          });
        }
      }
    }

    // 2. Upcoming 30 Days Breakdown
    const upcomingEmis = loans
      .filter((l) => l.status === 'active')
      .map((l) => {
        const dueDay = l.paymentDueDay || 1;
        const dueFormatted = `${todayStr.slice(0, 7)}-${String(dueDay).padStart(2, '0')}`;
        return {
          id: l.id,
          name: l.loanName,
          amount: l.emiAmount,
          dueDate: dueFormatted,
          lender: l.lender,
        };
      });

    const upcomingCreditCards = creditCards.map((cc) => ({
      id: cc.id,
      nickname: cc.cardNickname,
      last4: cc.last4Digits,
      amount: cc.outstandingAmount,
      dueDate: cc.paymentDueDate,
      isAutoPay: cc.isAutoPay,
    }));

    const upcomingUtilities = utilities.map((u) => ({
      id: u.id,
      name: u.name,
      provider: u.provider,
      amount: u.latestBillAmount || u.typicalAmount,
      dueDate: u.nextDueDate || `${todayStr.slice(0, 7)}-${String(u.dueDateDay || 15).padStart(2, '0')}`,
      isAutoPay: u.isAutoPay,
    }));

    const upcomingWarranties = warranties
      .filter((w) => w.endDate && w.endDate >= todayStr && w.endDate <= in30Days)
      .map((w) => {
        const targetAsset = w.assetId ? store.assets.get(w.assetId) : null;
        const daysRemaining = Math.max(
          0,
          Math.ceil(
            (new Date(w.endDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
          )
        );
        return {
          id: w.id,
          provider: w.warrantyProvider,
          assetName: targetAsset?.name,
          expiryDate: w.endDate,
          daysRemaining,
        };
      });

    const upcomingMaintenance = maintenances
      .filter((m) => {
        const d = m.nextServiceDate || m.serviceDate;
        return m.status !== 'completed' && d >= todayStr && d <= in30Days;
      })
      .map((m) => {
        const targetAsset = m.assetId ? store.assets.get(m.assetId) : null;
        return {
          id: m.id,
          title: m.title,
          targetName: targetAsset?.name,
          dueDate: m.nextServiceDate || m.serviceDate,
          status: m.status,
        };
      });

    const upcomingBillsAndExpenses = expenses
      .filter((e) => e.dueDate && e.dueDate >= todayStr && e.dueDate <= in30Days)
      .map((e) => ({
        id: e.id,
        title: e.title,
        amount: e.amount,
        dueDate: e.dueDate,
        category: e.category,
        isAutoPay: e.isAutoPay,
      }));

    const totalUpcomingObligations =
      upcomingEmis.reduce((sum, e) => sum + e.amount, 0) +
      upcomingCreditCards.reduce((sum, c) => sum + c.amount, 0) +
      upcomingUtilities.reduce((sum, u) => sum + u.amount, 0) +
      upcomingBillsAndExpenses.reduce((sum, b) => sum + b.amount, 0);

    // 3. Home Spaces
    const totalAssetValuation = assets.reduce(
      (sum, a) => sum + (a.currentEstimatedValue || a.purchaseCost || 0),
      0
    );
    const totalPropertyValuation = properties.reduce(
      (sum, p) => sum + (p.currentEstimatedValue || p.purchaseValue || 0),
      0
    );
    const assetsNeedingAttention = assets.filter(
      (a) => a.currentStatus === 'needs_maintenance' || a.currentStatus === 'critical'
    ).length;

    // 4. Financial Obligations (Monthly Sums)
    const monthlyLoansTotal = loans
      .filter((l) => l.status === 'active')
      .reduce((sum, l) => sum + (l.emiAmount || 0), 0);

    const monthlyUtilitiesTotal = utilities.reduce(
      (sum, u) => sum + (u.typicalAmount || u.latestBillAmount || 0),
      0
    );

    const monthlyCreditCardsTotal = creditCards.reduce(
      (sum, cc) => sum + (cc.outstandingAmount || 0),
      0
    );

    const monthlyRecurringExpensesTotal = expenses
      .filter((e) => e.frequency === 'monthly')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalMonthlyObligations =
      monthlyLoansTotal +
      monthlyUtilitiesTotal +
      monthlyCreditCardsTotal +
      monthlyRecurringExpensesTotal;

    // 5. Documents
    const recentDocs = documents
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);

    const totalOutstandingLoanDebt = loans.reduce((sum, l) => sum + (l.outstandingAmount ?? (l as any).currentBalance ?? 0), 0);
    const totalCreditCardDebt = creditCards.reduce((sum, cc) => sum + (cc.outstandingAmount ?? (cc as any).currentBalance ?? 0), 0);
    const totalCreditLimit = creditCards.reduce((sum, cc) => sum + (cc.creditLimit || 0), 0);
    const overallCreditUtilizationPercent = totalCreditLimit > 0 ? Math.round((totalCreditCardDebt / totalCreditLimit) * 100) : 0;

    return {
      totalProperties: properties.length,
      totalRooms: rooms.length,
      totalAssetsCount: assets.length,
      totalLoansCount: loans.length,
      totalOutstandingLoanDebt,
      totalCreditCardDebt,
      totalCreditLimit,
      overallCreditUtilizationPercent,
      today: {
        urgentTasks,
        overdueCount,
        dueTodayCount,
      },
      upcoming30Days: {
        totalObligationsAmount: totalUpcomingObligations,
        emis: upcomingEmis,
        creditCards: upcomingCreditCards,
        utilities: upcomingUtilities,
        billsAndExpenses: upcomingBillsAndExpenses,
        warrantiesExpiring: upcomingWarranties,
        maintenanceTasks: upcomingMaintenance,
      },
      homeSpaces: {
        propertiesCount: properties.length,
        roomsCount: rooms.length,
        assetsCount: assets.length,
        totalAssetValuation,
        totalPropertyValuation,
        assetsNeedingAttention,
      },
      financialObligations: {
        monthlyLoansTotal,
        monthlyUtilitiesTotal,
        monthlyCreditCardsTotal,
        monthlyRecurringExpensesTotal,
        totalMonthlyObligations,
      },
      documents: {
        totalDocuments: documents.length,
        expiringDocumentsCount: upcomingWarranties.length,
        recentDocuments: recentDocs,
      },
    };
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

  static async deleteConversation(userId: string, id: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    return store.conversations.delete(id);
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
        name: 'Trane XV20i Variable Speed Heat Pump',
        category: 'hvac',
        propertyId: 'demo_prop_primary',
        roomId: 'demo_room_hvac_pad',
        brand: 'Trane',
        modelNumber: '4TWV0036A1000A',
        serialNumber: 'TRN-2016-88912',
        installDate: '2016-09-15',
        warrantyExpiryDate: '2026-09-30', // Expiring in 30 days!
        expectedLifespanYears: 15,
        purchaseCost: 8500,
        currentEstimatedValue: 7200,
        currentStatus: 'operational',
        roomLocation: 'Exterior HVAC Pad',
        maintenanceNotes: 'Annual tune-up completed May 2026. Coil cleaned. Warranty expires September 2026.',
      },
      {
        id: 'demo_ast_water_heater',
        name: 'Rheem Performance Platinum 50 Gal Hybrid',
        category: 'plumbing',
        propertyId: 'demo_prop_primary',
        roomId: 'demo_room_hvac_pad',
        brand: 'Rheem',
        modelNumber: 'XE50T10H45U0',
        serialNumber: 'RHM-2022-44120',
        installDate: '2022-03-10',
        warrantyExpiryDate: '2032-03-10',
        expectedLifespanYears: 12,
        purchaseCost: 1650,
        currentEstimatedValue: 1400,
        currentStatus: 'operational',
        roomLocation: 'Utility Closet',
        maintenanceNotes: 'Anode rod inspected. Heat pump filter cleaned quarterly.',
      },
      {
        id: 'demo_ast_dishwasher',
        name: 'Bosch 800 Series Dishwasher',
        category: 'kitchen',
        propertyId: 'demo_prop_primary',
        roomId: 'demo_room_kitchen',
        brand: 'Bosch',
        modelNumber: 'SHP78CM5N',
        serialNumber: 'BSH-2023-10992',
        installDate: '2023-05-18',
        warrantyExpiryDate: '2025-05-18',
        expectedLifespanYears: 10,
        purchaseCost: 1150,
        currentEstimatedValue: 900,
        currentStatus: 'needs_maintenance',
        roomLocation: 'Kitchen',
        maintenanceNotes: 'E24 error code observed intermittently. Drain pump filter requires clearing.',
      },
      {
        id: 'demo_ast_roof',
        name: 'CertainTeed Landmark Pro Architectural Shingle Roof',
        category: 'roofing_exterior',
        propertyId: 'demo_prop_primary',
        brand: 'CertainTeed',
        modelNumber: 'Landmark Pro Max Def',
        serialNumber: 'CT-2016-ROOF',
        installDate: '2016-08-01',
        warrantyExpiryDate: '2046-08-01',
        expectedLifespanYears: 30,
        purchaseCost: 14000,
        currentEstimatedValue: 12500,
        currentStatus: 'operational',
        roomLocation: 'Roof & Exterior',
        maintenanceNotes: 'Inspected post-hailstorm in 2024. Granule retention good. Flashing intact.',
      },
      {
        id: 'demo_ast_fridge',
        name: 'LG French Door Smart Refrigerator',
        category: 'major_appliance',
        propertyId: 'demo_prop_primary',
        roomId: 'demo_room_kitchen',
        brand: 'LG',
        modelNumber: 'LRFCS25D3S',
        serialNumber: 'LG-2023-9011',
        installDate: '2023-01-10',
        warrantyExpiryDate: '2028-01-10',
        expectedLifespanYears: 12,
        purchaseCost: 1900,
        currentEstimatedValue: 1500,
        currentStatus: 'operational',
        roomLocation: 'Kitchen',
        maintenanceNotes: 'Water filter replaced every 6 months (LT1000P).',
      },
      {
        id: 'demo_ast_car',
        name: 'Tesla Model Y Long Range AWD',
        category: 'vehicle',
        propertyId: 'demo_prop_primary',
        roomId: 'demo_room_garage',
        brand: 'Tesla',
        modelNumber: 'Model Y LR',
        serialNumber: '5YJYGDEE8NF-001',
        installDate: '2024-03-12',
        warrantyExpiryDate: '2028-03-12',
        expectedLifespanYears: 12,
        purchaseCost: 48000,
        currentEstimatedValue: 36000,
        currentStatus: 'operational',
        roomLocation: 'Garage',
        maintenanceNotes: 'Tire rotation scheduled at 10,000 miles. Cabin air filter replaced annually.',
      },
      {
        id: 'demo_ast_macbook',
        name: 'Apple MacBook Pro 16" (M3 Max, 64GB)',
        category: 'electronics',
        propertyId: 'demo_prop_primary',
        roomId: 'demo_room_primary_bed',
        brand: 'Apple',
        modelNumber: 'MUW63LL/A',
        serialNumber: 'C02G99XXMD6R',
        installDate: '2024-01-10',
        warrantyExpiryDate: '2027-01-10',
        expectedLifespanYears: 6,
        purchaseCost: 3499,
        currentEstimatedValue: 2900,
        currentStatus: 'operational',
        roomLocation: 'Primary Bedroom / Office',
        maintenanceNotes: 'Protected under AppleCare+ with accidental damage coverage.',
      },
    ];

    // 3b. Properties
    const demoProperties: Property[] = [
      {
        id: 'demo_prop_primary',
        userId,
        name: 'Maplewood Haven',
        propertyType: 'primary_home',
        address: {
          street: '742 Evergreen Terrace',
          city: 'Portland',
          region: 'Oregon',
          postalCode: '97201',
          country: 'United States',
        },
        purchaseDate: '2021-08-15',
        purchaseValue: 485000,
        currentEstimatedValue: 620000,
        ownershipInfo: 'Sole Ownership (Deed in escrow)',
        squareFootage: 2450,
        yearBuilt: 2016,
        notes: 'Primary residential dwelling. 4 bed, 3 bath with attached 2-car garage.',
        linkedLoanId: 'demo_loan_mortgage',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_prop_cabin',
        userId,
        name: 'Whispering Pines Cabin',
        propertyType: 'vacation_home',
        address: {
          street: '12 Timberline Ridge Road',
          city: 'Government Camp',
          region: 'Oregon',
          postalCode: '97028',
          country: 'United States',
        },
        purchaseDate: '2019-11-20',
        purchaseValue: 220000,
        currentEstimatedValue: 265000,
        ownershipInfo: 'Joint Family Trust',
        squareFootage: 1200,
        yearBuilt: 2019,
        notes: 'Rustic retreat cabin with metal standing seam roof and wood stove.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    demoProperties.forEach((p) => {
      store.properties.set(p.id, p);
    });

    // 3c. Rooms
    const demoRooms: Room[] = [
      {
        id: 'demo_room_kitchen',
        userId,
        propertyId: 'demo_prop_primary',
        name: 'Chef Kitchen',
        type: 'kitchen',
        floor: 'Ground Floor',
        notes: 'Open layout with center island and quartz countertops.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_room_living',
        userId,
        propertyId: 'demo_prop_primary',
        name: 'Family Living Room',
        type: 'living_room',
        floor: 'Ground Floor',
        notes: 'Main entertainment and relaxation zone.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_room_primary_bed',
        userId,
        propertyId: 'demo_prop_primary',
        name: 'Primary Bedroom & Suite',
        type: 'bedroom',
        floor: 'Second Floor',
        notes: 'Master suite with private ensuite and desk area.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_room_garage',
        userId,
        propertyId: 'demo_prop_primary',
        name: 'Attached Garage & Workshop',
        type: 'garage',
        floor: 'Ground Floor',
        notes: '2-car bay with Level 2 EV charging station installed.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_room_hvac_pad',
        userId,
        propertyId: 'demo_prop_primary',
        name: 'Utility & Mechanical Zone',
        type: 'utility_area',
        floor: 'Basement / Exterior',
        notes: 'Houses heat pump compressor, water heater, and electrical panel.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_room_cabin_living',
        userId,
        propertyId: 'demo_prop_cabin',
        name: 'Great Room & Fireplace',
        type: 'living_room',
        floor: 'Main Floor',
        notes: 'Cathedral ceiling with timber trusses and wood stove.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    demoRooms.forEach((r) => {
      store.rooms.set(r.id, r);
    });

    // 3d. Warranties
    const demoWarranties: Warranty[] = [
      {
        id: 'demo_war_trane',
        userId,
        assetId: 'demo_ast_hvac',
        propertyId: 'demo_prop_primary',
        warrantyProvider: 'Trane Technologies',
        policyNumber: 'TRN-WARR-88192',
        startDate: '2016-09-30',
        endDate: '2026-09-30', // Expiring in 30 days!
        durationMonths: 120,
        coverageNotes: '10-year limited parts and compressor warranty. Requires annual registered maintenance.',
        contactInfo: {
          phone: '1-800-945-5884',
          website: 'https://www.trane.com/residential/en/warranty-and-registration/',
        },
        status: 'expiring_soon',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_war_rheem',
        userId,
        assetId: 'demo_ast_water_heater',
        propertyId: 'demo_prop_primary',
        warrantyProvider: 'Rheem Care Protection',
        policyNumber: 'RHM-HYB-44120',
        startDate: '2022-03-10',
        endDate: '2032-03-10',
        durationMonths: 120,
        coverageNotes: '10-year limited tank and parts warranty.',
        contactInfo: {
          phone: '1-800-432-8373',
          website: 'https://www.rheem.com',
        },
        status: 'active',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_war_apple',
        userId,
        assetId: 'demo_ast_macbook',
        warrantyProvider: 'AppleCare+ Protection Plan',
        policyNumber: 'APP-C02G99-PLUS',
        startDate: '2024-01-10',
        endDate: '2027-01-10',
        durationMonths: 36,
        coverageNotes: 'Full hardware coverage and unlimited accidental damage protection ($99 screen / $299 other).',
        contactInfo: {
          phone: '1-800-275-2273',
          website: 'https://support.apple.com',
        },
        status: 'active',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_war_bosch',
        userId,
        assetId: 'demo_ast_dishwasher',
        propertyId: 'demo_prop_primary',
        warrantyProvider: 'Bosch Home Protection',
        policyNumber: 'BSH-RET-10992',
        startDate: '2023-05-18',
        endDate: '2025-05-18',
        durationMonths: 24,
        coverageNotes: '2-year standard appliance limited warranty. Expired.',
        contactInfo: {
          phone: '1-800-944-2904',
          website: 'https://www.bosch-home.com',
        },
        status: 'expired',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    demoWarranties.forEach((w) => {
      store.warranties.set(w.id, w);
    });

    // 3e. Maintenance Tasks
    const demoMaintenances: MaintenanceTask[] = [
      {
        id: 'demo_maint_hvac_filter',
        userId,
        title: 'HVAC MERV-13 Filter Replacement',
        assetId: 'demo_ast_hvac',
        propertyId: 'demo_prop_primary',
        roomId: 'demo_room_hvac_pad',
        serviceDate: '2026-06-01',
        nextServiceDate: '2026-09-01', // Due today / immediate!
        cost: 45,
        serviceProvider: 'Self Maintenance / Filtrete',
        contactPhone: '',
        notes: 'Replace 20x25x4 filter to maintain airflow and lower compressor strain.',
        recurringSchedule: 'quarterly',
        status: 'scheduled',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_maint_tesla_tire',
        userId,
        title: 'Tesla Tire Rotation & Pressure Calibration',
        assetId: 'demo_ast_car',
        propertyId: 'demo_prop_primary',
        roomId: 'demo_room_garage',
        serviceDate: '2026-04-10',
        nextServiceDate: '2026-10-10',
        cost: 120,
        serviceProvider: 'Tesla Mobile Service',
        contactPhone: '1-888-518-3752',
        notes: 'Rotate tires every 6,250 - 10,000 miles to maximize tread life.',
        recurringSchedule: 'semi_annual',
        status: 'scheduled',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_maint_water_flush',
        userId,
        title: 'Water Heater Anode Rod Inspection & Tank Flush',
        assetId: 'demo_ast_water_heater',
        propertyId: 'demo_prop_primary',
        roomId: 'demo_room_hvac_pad',
        serviceDate: '2025-09-15',
        nextServiceDate: '2026-09-15',
        cost: 150,
        serviceProvider: 'Apex Plumbing Pros',
        contactPhone: '503-555-0199',
        notes: 'Drain sediment from tank bottom and inspect sacrificial anode rod.',
        recurringSchedule: 'annual',
        status: 'scheduled',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_maint_roof_gutters',
        userId,
        title: 'Roof Gutter Clearing & Downspout Flow Test',
        assetId: 'demo_ast_roof',
        propertyId: 'demo_prop_primary',
        serviceDate: '2026-05-20',
        nextServiceDate: '2026-10-01',
        cost: 180,
        serviceProvider: 'ClearView Gutter Masters',
        contactPhone: '503-555-0144',
        notes: 'Remove pine needles and check downspout splash blocks before autumn rains.',
        recurringSchedule: 'semi_annual',
        status: 'scheduled',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    demoMaintenances.forEach((m) => {
      store.maintenances.set(m.id, m);
    });

    // 3f. Utilities
    const demoUtilities: UtilityAccount[] = [
      {
        id: 'demo_util_electric',
        userId,
        propertyId: 'demo_prop_primary',
        name: 'Grid City Power & Cooling',
        serviceType: 'electricity',
        provider: 'City Power & Light',
        accountIdentifier: 'CPL-99218-01',
        billingCycle: 'monthly',
        dueDateDay: 15,
        nextDueDate: '2026-09-15',
        typicalAmount: 210,
        latestBillAmount: 210,
        paymentStatus: 'pending',
        isAutoPay: true,
        notes: 'Summer peak rate pricing in effect.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_util_water',
        userId,
        propertyId: 'demo_prop_primary',
        name: 'Municipal Water & Sewer Utility',
        serviceType: 'water',
        provider: 'Municipal Water Board',
        accountIdentifier: 'MWB-4819-WTR',
        billingCycle: 'monthly',
        dueDateDay: 20,
        nextDueDate: '2026-09-20',
        typicalAmount: 68,
        latestBillAmount: 68,
        paymentStatus: 'pending',
        isAutoPay: true,
        notes: 'Metered residential rate with wastewater fee.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_util_internet',
        userId,
        propertyId: 'demo_prop_primary',
        name: 'Gigabit Fiber Internet',
        serviceType: 'internet',
        provider: 'FiberLink Telecom',
        accountIdentifier: 'FL-88190-FBR',
        billingCycle: 'monthly',
        dueDateDay: 8,
        nextDueDate: '2026-09-08',
        typicalAmount: 80,
        latestBillAmount: 80,
        paymentStatus: 'paid',
        isAutoPay: true,
        notes: '1 Gbps symmetrical fiber with static IP.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_util_trash',
        userId,
        propertyId: 'demo_prop_primary',
        name: 'Municipal Trash & Composting',
        serviceType: 'trash',
        provider: 'CleanCity Waste Management',
        accountIdentifier: 'CCW-2091-TRSH',
        billingCycle: 'monthly',
        dueDateDay: 25,
        nextDueDate: '2026-09-25',
        typicalAmount: 42,
        latestBillAmount: 42,
        paymentStatus: 'pending',
        isAutoPay: false,
        notes: 'Weekly trash and bi-weekly green yard waste recycling.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    demoUtilities.forEach((u) => {
      store.utilities.set(u.id, u);
    });

    // 3g. Household Loans
    const demoLoans: HouseholdLoan[] = [
      {
        id: 'demo_loan_mortgage',
        userId,
        propertyId: 'demo_prop_primary',
        loanName: 'Primary Home 30-Year Fixed Mortgage',
        loanType: 'home_loan',
        lender: 'First National Mortgage Bank',
        principalAmount: 388000,
        interestRate: 5.75,
        emiAmount: 1850,
        startDate: '2021-08-01',
        endDate: '2051-08-01',
        tenureMonths: 360,
        paymentDueDay: 1,
        outstandingAmount: 356400,
        status: 'active',
        notes: 'Fixed conventional loan with escrow for property taxes.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_loan_auto',
        userId,
        assetId: 'demo_ast_car',
        loanName: 'Tesla Model Y 60-Month Auto Loan',
        loanType: 'vehicle_loan',
        lender: 'Chase Auto Finance',
        principalAmount: 35000,
        interestRate: 4.99,
        emiAmount: 660,
        startDate: '2024-03-01',
        endDate: '2029-03-01',
        tenureMonths: 60,
        paymentDueDay: 12,
        outstandingAmount: 22400,
        status: 'active',
        notes: 'Monthly direct debit scheduled on the 12th.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    demoLoans.forEach((l) => {
      store.loans.set(l.id, l);
    });

    // 3h. Credit Cards
    const demoCreditCards: CreditCardAccount[] = [
      {
        id: 'demo_cc_sapphire',
        userId,
        cardNickname: 'Chase Sapphire Preferred',
        cardIssuer: 'Chase Bank',
        last4Digits: '4821',
        creditLimit: 18000,
        billingCycleDay: 28,
        statementDate: '2026-08-28',
        paymentDueDate: '2026-09-23',
        outstandingAmount: 840,
        minimumDue: 45,
        aprRate: 21.49,
        paymentStatus: 'pending',
        isAutoPay: false,
        notes: 'Primary card for travel and dining points.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'demo_cc_amex',
        userId,
        cardNickname: 'Amex Blue Cash Everyday',
        cardIssuer: 'American Express',
        last4Digits: '9104',
        creditLimit: 12500,
        billingCycleDay: 15,
        statementDate: '2026-08-15',
        paymentDueDate: '2026-09-10',
        outstandingAmount: 320,
        minimumDue: 35,
        aprRate: 19.99,
        paymentStatus: 'paid',
        isAutoPay: true,
        notes: 'Used for 3% cash back on grocery and online retail.',
        isDemo: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    demoCreditCards.forEach((c) => {
      store.creditCards.set(c.id, c);
    });

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

    // 3k. Household Issues / Tickets
    const demoIssues: HouseholdIssue[] = [
      {
        id: 'demo_issue_refrigerator',
        userId,
        title: 'Refrigerator: Ice maker dispenser low water pressure',
        description:
          'Water dispenser stream is intermittent and ice tray fill is delayed. Suspected filter blockage or inlet valve.',
        assetId: 'demo_asset_fridge',
        propertyId: 'demo_prop_primary',
        roomId: 'demo_room_kitchen',
        category: 'appliance',
        severity: 'medium',
        status: 'triaged',
        reportedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        estimatedCost: 120,
        serviceProvider: 'Samsung Certified Appliance Care',
        serviceProviderContact: '1-800-726-7864',
        warrantyId: 'demo_war_fridge',
        notes: 'Checked water main supply; other fixtures have full pressure. Covered under active warranty.',
        createdBy: userId,
        isDemo: true,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        activityHistory: [
          {
            id: 'act_demo_1',
            timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
            action: 'Issue Reported',
            note: 'Initial report by homeowner.',
            newStatus: 'reported',
            userId,
          },
          {
            id: 'act_demo_2',
            timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
            action: 'Status changed from reported to triaged',
            note: 'Triaged by HouseMind. Linked to active warranty demo_war_fridge.',
            previousStatus: 'reported',
            newStatus: 'triaged',
            userId,
          },
        ],
      },
      {
        id: 'demo_issue_hvac',
        userId,
        title: 'HVAC Heat Pump: Outdoor compressor vibration noise',
        description:
          'Vibration noise during high-heat cycle. Needs technician check on rubber isolator mounting pads.',
        assetId: 'demo_asset_hvac',
        propertyId: 'demo_prop_primary',
        category: 'hvac',
        severity: 'high',
        status: 'scheduled',
        reportedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        scheduledDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        serviceProvider: 'Carrier Certified HVAC Specialists',
        serviceProviderContact: '555-019-4822',
        maintenanceId: 'demo_maint_hvac',
        estimatedCost: 180,
        createdBy: userId,
        isDemo: true,
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        activityHistory: [
          {
            id: 'act_demo_3',
            timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
            action: 'Issue Reported',
            newStatus: 'reported',
            userId,
          },
          {
            id: 'act_demo_4',
            timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
            action: 'Status changed from triaged to scheduled',
            note: 'Scheduled diagnostic visit with technician.',
            previousStatus: 'triaged',
            newStatus: 'scheduled',
            userId,
          },
        ],
      },
    ];

    demoIssues.forEach((issue) => {
      store.issues.set(issue.id, issue);
    });

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
      properties: number;
      rooms: number;
      warranties: number;
      maintenances: number;
      utilities: number;
      loans: number;
      creditCards: number;
      issues: number;
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
      properties: 0,
      rooms: 0,
      warranties: 0,
      maintenances: 0,
      utilities: 0,
      loans: 0,
      creditCards: 0,
      issues: 0,
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
      if (item && (item.isDemo === true || item.source === 'demo_seed' || item.sourceType === 'demo_seed')) {
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

    // 8. Properties
    for (const [id, prop] of Array.from(store.properties.entries())) {
      if (isDemoRecord(id, prop)) {
        store.properties.delete(id);
        details.properties++;
      }
    }

    // 9. Rooms
    for (const [id, room] of Array.from(store.rooms.entries())) {
      if (isDemoRecord(id, room)) {
        store.rooms.delete(id);
        details.rooms++;
      }
    }

    // 10. Warranties
    for (const [id, war] of Array.from(store.warranties.entries())) {
      if (isDemoRecord(id, war)) {
        store.warranties.delete(id);
        details.warranties++;
      }
    }

    // 11. Maintenances
    for (const [id, mnt] of Array.from(store.maintenances.entries())) {
      if (isDemoRecord(id, mnt)) {
        store.maintenances.delete(id);
        details.maintenances++;
      }
    }

    // 12. Utilities
    for (const [id, utl] of Array.from(store.utilities.entries())) {
      if (isDemoRecord(id, utl)) {
        store.utilities.delete(id);
        details.utilities++;
      }
    }

    // 13. Loans
    for (const [id, ln] of Array.from(store.loans.entries())) {
      if (isDemoRecord(id, ln)) {
        store.loans.delete(id);
        details.loans++;
      }
    }

    // 14. Credit Cards
    for (const [id, cc] of Array.from(store.creditCards.entries())) {
      if (isDemoRecord(id, cc)) {
        store.creditCards.delete(id);
        details.creditCards++;
      }
    }

    // 15. Issues
    for (const [id, iss] of Array.from(store.issues.entries())) {
      if (isDemoRecord(id, iss)) {
        store.issues.delete(id);
        details.issues++;
      }
    }

    const deletedCount =
      details.expenses +
      details.assets +
      details.transactions +
      details.documents +
      details.insights +
      details.scenarios +
      details.conversations +
      details.properties +
      details.rooms +
      details.warranties +
      details.maintenances +
      details.utilities +
      details.loans +
      details.creditCards +
      details.issues;

    const remainingUserRecords =
      store.expenses.size +
      store.assets.size +
      store.transactions.size +
      store.documents.size +
      store.insights.size +
      store.scenarios.size +
      store.conversations.size +
      store.properties.size +
      store.rooms.size +
      store.warranties.size +
      store.maintenances.size +
      store.issues.size +
      store.utilities.size +
      store.loans.size +
      store.creditCards.size;

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
    const propBreakdown = countBreakdown(store.properties);
    const roomBreakdown = countBreakdown(store.rooms);
    const warBreakdown = countBreakdown(store.warranties);
    const maintBreakdown = countBreakdown(store.maintenances);
    const issBreakdown = countBreakdown(store.issues);
    const utilBreakdown = countBreakdown(store.utilities);
    const loanBreakdown = countBreakdown(store.loans);
    const ccBreakdown = countBreakdown(store.creditCards);

    const totalRecords =
      txBreakdown.total +
      expBreakdown.total +
      astBreakdown.total +
      docBreakdown.total +
      scnBreakdown.total +
      cnvBreakdown.total +
      propBreakdown.total +
      roomBreakdown.total +
      warBreakdown.total +
      maintBreakdown.total +
      issBreakdown.total +
      utilBreakdown.total +
      loanBreakdown.total +
      ccBreakdown.total;

    const demoRecordsCount =
      txBreakdown.demo +
      expBreakdown.demo +
      astBreakdown.demo +
      docBreakdown.demo +
      scnBreakdown.demo +
      cnvBreakdown.demo +
      propBreakdown.demo +
      roomBreakdown.demo +
      warBreakdown.demo +
      maintBreakdown.demo +
      issBreakdown.demo +
      utilBreakdown.demo +
      loanBreakdown.demo +
      ccBreakdown.demo;

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
        description: 'Direct user-entered expenses, properties, equipment records, and custom what-if financial variables.',
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
        description: 'Folder-scoped read-only ingestion for monthly PDF bank statements, warranties, and recurring bills with strict local authorization.',
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
        name: 'Gmail Household Search (Architecture Ready)',
        description: 'Narrow financial and utility invoice ingestion for digital statements, receipts, and service notices.',
        status: 'ready',
        statusLabel: 'Architecture Ready (OAuth Disabled / User Disconnected)',
        isConfigured: false,
        scope: 'https://www.googleapis.com/auth/gmail.readonly (financial & utility query restricted)',
        recordsCount: 0,
        demoRecordsCount: 0,
        canDisconnect: true,
      },
      {
        id: 'src_demo_seed',
        sourceType: 'demo_seed',
        name: 'Sample Household Starter Dataset',
        description: 'Deterministic demo records including sample properties, mortgage, utilities, warranties, and maintenance tasks.',
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
        properties: propBreakdown,
        rooms: roomBreakdown,
        warranties: warBreakdown,
        maintenances: maintBreakdown,
        utilities: utilBreakdown,
        loans: loanBreakdown,
        creditCards: ccBreakdown,
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

  // ==========================================
  // HOUSEHOLD MEMORY STORAGE (ISOLATED PER USER)
  // ==========================================

  static async listMemories(userId: string, confirmedOnly: boolean = false): Promise<HouseholdMemoryItem[]> {
    const store = getOrCreateUserStore(userId);
    let items = Array.from(store.memories.values()) as HouseholdMemoryItem[];
    if (confirmedOnly) {
      items = items.filter((m) => m.confirmed);
    }
    // Newest first
    return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  static async getMemory(userId: string, id: string): Promise<HouseholdMemoryItem | null> {
    const store = getOrCreateUserStore(userId);
    const item = store.memories.get(id);
    return item ? { ...item } : null;
  }

  static async createMemory(userId: string, data: Partial<HouseholdMemoryItem>): Promise<HouseholdMemoryItem> {
    const store = getOrCreateUserStore(userId);
    const id = data.id || `mem_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const memoryItem: HouseholdMemoryItem = {
      id,
      userId,
      category: data.category || 'preference',
      key: data.key || '',
      value: data.value !== undefined ? data.value : '',
      source: data.source || 'user_explicit',
      confirmed: data.confirmed !== undefined ? data.confirmed : true,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    store.memories.set(id, memoryItem);
    return { ...memoryItem };
  }

  static async updateMemory(
    userId: string,
    id: string,
    updates: Partial<HouseholdMemoryItem>
  ): Promise<HouseholdMemoryItem | null> {
    const store = getOrCreateUserStore(userId);
    const existing = store.memories.get(id);
    if (!existing) return null;

    const updated: HouseholdMemoryItem = {
      ...existing,
      ...updates,
      id,
      userId,
      updatedAt: new Date().toISOString(),
    };

    store.memories.set(id, updated);
    return { ...updated };
  }

  static async confirmMemory(userId: string, id: string): Promise<HouseholdMemoryItem | null> {
    return this.updateMemory(userId, id, { confirmed: true });
  }

  static async deleteMemory(userId: string, id: string): Promise<boolean> {
    const store = getOrCreateUserStore(userId);
    return store.memories.delete(id);
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
      store.conversations.size +
      store.properties.size +
      store.rooms.size +
      store.warranties.size +
      store.maintenances.size +
      store.utilities.size +
      store.loans.size +
      store.creditCards.size +
      store.memories.size;

    multiTenantStore.delete(userId);
    return { resetCount: count };
  }

  static clearAll(): void {
    multiTenantStore.clear();
  }
}
