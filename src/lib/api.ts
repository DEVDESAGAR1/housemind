import { auth } from './firebase';
import {
  HouseholdProfile,
  HouseholdExpense,
  HomeAsset,
  ConversationSummary,
  ConversationDetail,
  CopilotChatResponse,
  HouseholdInsight,
  GeminiInsightExplanation,
  InsightStatus,
  FinancialTransaction,
  FinancialSummary,
  HouseholdDocument,
  Scenario,
  ScenarioType,
  ScenarioInput,
  ScenarioBaselineMetrics,
  ScenarioProjectedMetrics,
  AffordabilityIndicator,
  ScenarioGeminiExplanation,
  ScenarioComparison,
  Property,
  Room,
  Warranty,
  MaintenanceTask,
  UtilityAccount,
  HouseholdLoan,
  CreditCardAccount,
  HomeCommandCenterSummary,
  ExtractedEntityReviewData,
  HouseholdEntityType,
} from '../types';


export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

async function getAuthHeader(): Promise<HeadersInit> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }

  const token = await currentUser.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    error: { code: 'NETWORK_ERROR', message: 'Failed to parse server response' },
  }));

  if (!res.ok || !json.success) {
    const errorMsg = json.error?.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).code = json.error?.code || 'UNKNOWN_ERROR';
    (err as any).details = json.error?.details;
    throw err;
  }

  return json.data as T;
}

export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(url, { method: 'GET', headers });
    const json: ApiResponse<T> = await res.json().catch(() => ({
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Failed to parse server response' },
    }));
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'REQUEST_ERROR',
        message: err.message || 'Error executing request',
      },
    };
  }
}

export const api = {
  // Data Sources
  async getDataSourcesSummary() {
    return apiGet<any>('/api/household/data-sources');
  },

  // Health
  async checkHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch('/api/health');
    const json = await res.json();
    return json;
  },

  // Household Profile
  async getProfile(): Promise<HouseholdProfile> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/profile', { method: 'GET', headers });
    return handleResponse<HouseholdProfile>(res);
  },

  async updateProfile(profile: Partial<HouseholdProfile>): Promise<HouseholdProfile> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/profile', {
      method: 'PUT',
      headers,
      body: JSON.stringify(profile),
    });
    return handleResponse<HouseholdProfile>(res);
  },

  // Expenses
  async getExpenses(): Promise<HouseholdExpense[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/expenses', { method: 'GET', headers });
    return handleResponse<HouseholdExpense[]>(res);
  },

  async createExpense(expense: Omit<HouseholdExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<HouseholdExpense> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/expenses', {
      method: 'POST',
      headers,
      body: JSON.stringify(expense),
    });
    return handleResponse<HouseholdExpense>(res);
  },

  async updateExpense(id: string, expense: Partial<HouseholdExpense>): Promise<HouseholdExpense> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/expenses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(expense),
    });
    return handleResponse<HouseholdExpense>(res);
  },

  async deleteExpense(id: string): Promise<{ id: string; deleted: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/expenses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ id: string; deleted: boolean }>(res);
  },

  // Assets
  async getAssets(): Promise<HomeAsset[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/assets', { method: 'GET', headers });
    return handleResponse<HomeAsset[]>(res);
  },

  async createAsset(asset: Omit<HomeAsset, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<HomeAsset> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/assets', {
      method: 'POST',
      headers,
      body: JSON.stringify(asset),
    });
    return handleResponse<HomeAsset>(res);
  },

  async updateAsset(id: string, asset: Partial<HomeAsset>): Promise<HomeAsset> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/assets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(asset),
    });
    return handleResponse<HomeAsset>(res);
  },

  async deleteAsset(id: string): Promise<{ id: string; deleted: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/assets/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ id: string; deleted: boolean }>(res);
  },

  // Demo Data Seeding & Cleanup
  async seedDemoData(): Promise<{ profileCreated: boolean; expensesCount: number; assetsCount: number }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/demo-seed', {
      method: 'POST',
      headers,
    });
    return handleResponse<{ profileCreated: boolean; expensesCount: number; assetsCount: number }>(res);
  },

  async removeDemoData(): Promise<{ deletedCount: number; details: Record<string, number> }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/demo-remove', {
      method: 'POST',
      headers,
    });
    return handleResponse<{ deletedCount: number; details: Record<string, number> }>(res);
  },

  async resetUserData(confirm = true): Promise<{ success: boolean; message: string }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/reset-data', {
      method: 'POST',
      headers,
      body: JSON.stringify({ confirm }),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // Gemini Copilot AI Endpoints
  async sendCopilotChat(params: {
    message: string;
    conversationId?: string;
  }): Promise<CopilotChatResponse> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/copilot/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    return handleResponse<CopilotChatResponse>(res);
  },

  async getCopilotConversations(): Promise<ConversationSummary[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/copilot/conversations', {
      method: 'GET',
      headers,
    });
    return handleResponse<ConversationSummary[]>(res);
  },

  async getCopilotConversation(id: string): Promise<ConversationDetail> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/copilot/conversations/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<ConversationDetail>(res);
  },

  async deleteCopilotConversation(id: string): Promise<{ id: string; deleted: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/copilot/conversations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ id: string; deleted: boolean }>(res);
  },

  // Household Intelligence & Investigator Endpoints
  async getInsights(params?: { status?: string; severity?: string }): Promise<HouseholdInsight[]> {
    const headers = await getAuthHeader();
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.severity) searchParams.append('severity', params.severity);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';

    const res = await fetch(`/api/intelligence/insights${query}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<HouseholdInsight[]>(res);
  },

  async refreshInsights(): Promise<HouseholdInsight[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/intelligence/insights/refresh', {
      method: 'POST',
      headers,
    });
    return handleResponse<HouseholdInsight[]>(res);
  },

  async explainInsight(id: string): Promise<GeminiInsightExplanation> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/intelligence/insights/${encodeURIComponent(id)}/explain`, {
      method: 'POST',
      headers,
    });
    return handleResponse<GeminiInsightExplanation>(res);
  },

  async updateInsightStatus(
    id: string,
    status: InsightStatus
  ): Promise<{ id: string; status: InsightStatus; updatedAt: string }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/intelligence/insights/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });
    return handleResponse<{ id: string; status: InsightStatus; updatedAt: string }>(res);
  },

  // Financial Transactions Endpoints
  async getTransactions(params?: Record<string, string>): Promise<FinancialTransaction[]> {
    const headers = await getAuthHeader();
    const searchParams = new URLSearchParams(params);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`/api/transactions${query}`, { headers });
    const json = await res.json();
    return json.transactions || [];
  },

  async getFinancialSummary(currency: string = 'USD'): Promise<FinancialSummary> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/transactions/summary?currency=${encodeURIComponent(currency)}`, {
      headers,
    });
    const json = await res.json();
    return json.summary;
  },

  // Documents Endpoints
  async getDocuments(): Promise<HouseholdDocument[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/documents', { headers });
    const json = await res.json();
    return json.documents || [];
  },

  async getDocument(id: string): Promise<HouseholdDocument> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/documents/${encodeURIComponent(id)}`, { headers });
    const json = await res.json();
    return json.document;
  },

  // ==========================================
  // Phase 6: What-If Simulator & Decision Intelligence
  // ==========================================
  async getScenarioBaseline(): Promise<ScenarioBaselineMetrics> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/scenarios/baseline', { headers });
    return handleResponse<ScenarioBaselineMetrics>(res);
  },

  async simulateScenario(
    type: ScenarioType,
    inputs: ScenarioInput
  ): Promise<{
    type: ScenarioType;
    inputs: ScenarioInput;
    baselineMetrics: ScenarioBaselineMetrics;
    projectedMetrics: ScenarioProjectedMetrics;
    affordability: AffordabilityIndicator;
  }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/scenarios/simulate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ type, inputs }),
    });
    return handleResponse<{
      type: ScenarioType;
      inputs: ScenarioInput;
      baselineMetrics: ScenarioBaselineMetrics;
      projectedMetrics: ScenarioProjectedMetrics;
      affordability: AffordabilityIndicator;
    }>(res);
  },

  async getScenarios(): Promise<Scenario[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/scenarios', { headers });
    return handleResponse<Scenario[]>(res);
  },

  async getScenario(id: string): Promise<Scenario> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/scenarios/${encodeURIComponent(id)}`, { headers });
    return handleResponse<Scenario>(res);
  },

  async createScenario(payload: {
    title: string;
    description?: string;
    type: ScenarioType;
    inputs: ScenarioInput;
    isPinned?: boolean;
  }): Promise<Scenario> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/scenarios', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return handleResponse<Scenario>(res);
  },

  async updateScenario(
    id: string,
    payload: {
      title?: string;
      description?: string;
      type?: ScenarioType;
      inputs?: ScenarioInput;
      isPinned?: boolean;
    }
  ): Promise<Scenario> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/scenarios/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    return handleResponse<Scenario>(res);
  },

  async duplicateScenario(id: string): Promise<Scenario> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/scenarios/${encodeURIComponent(id)}/duplicate`, {
      method: 'POST',
      headers,
    });
    return handleResponse<Scenario>(res);
  },

  async recalculateScenario(id: string): Promise<Scenario> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/scenarios/${encodeURIComponent(id)}/recalculate`, {
      method: 'POST',
      headers,
    });
    return handleResponse<Scenario>(res);
  },

  async explainScenarioWithGemini(id: string): Promise<ScenarioGeminiExplanation> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/scenarios/${encodeURIComponent(id)}/explain`, {
      method: 'POST',
      headers,
    });
    return handleResponse<ScenarioGeminiExplanation>(res);
  },

  async deleteScenario(id: string): Promise<{ id: string; deleted: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/scenarios/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ id: string; deleted: boolean }>(res);
  },

  async compareScenarios(scenarioIds: string[]): Promise<ScenarioComparison> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/scenarios/compare', {
      method: 'POST',
      headers,
      body: JSON.stringify({ scenarioIds }),
    });
    return handleResponse<ScenarioComparison>(res);
  },

  // ==========================================
  // PHASE 10: HOME COMMAND CENTER & MANAGEMENT
  // ==========================================

  // Command Center
  async getCommandCenterSummary(): Promise<HomeCommandCenterSummary> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/command-center', { method: 'GET', headers });
    return handleResponse<HomeCommandCenterSummary>(res);
  },

  // Properties
  async getProperties(): Promise<Property[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/properties', { method: 'GET', headers });
    return handleResponse<Property[]>(res);
  },

  async getProperty(id: string): Promise<Property> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/properties/${encodeURIComponent(id)}`, { method: 'GET', headers });
    return handleResponse<Property>(res);
  },

  async createProperty(data: Partial<Property>): Promise<Property> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/properties', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<Property>(res);
  },

  async updateProperty(id: string, data: Partial<Property>): Promise<Property> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/properties/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<Property>(res);
  },

  async deleteProperty(id: string): Promise<{ id: string; deleted: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/properties/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ id: string; deleted: boolean }>(res);
  },

  // Rooms
  async getRooms(propertyId?: string): Promise<Room[]> {
    const headers = await getAuthHeader();
    const url = propertyId
      ? `/api/household/rooms?propertyId=${encodeURIComponent(propertyId)}`
      : '/api/household/rooms';
    const res = await fetch(url, { method: 'GET', headers });
    return handleResponse<Room[]>(res);
  },

  async createRoom(data: Partial<Room>): Promise<Room> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/rooms', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<Room>(res);
  },

  async updateRoom(id: string, data: Partial<Room>): Promise<Room> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/rooms/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<Room>(res);
  },

  async deleteRoom(id: string): Promise<{ id: string; deleted: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/rooms/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ id: string; deleted: boolean }>(res);
  },

  // Warranties
  async getWarranties(assetId?: string, propertyId?: string): Promise<Warranty[]> {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    if (assetId) params.append('assetId', assetId);
    if (propertyId) params.append('propertyId', propertyId);
    const url = `/api/household/warranties${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { method: 'GET', headers });
    return handleResponse<Warranty[]>(res);
  },

  async createWarranty(data: Partial<Warranty>): Promise<Warranty> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/warranties', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<Warranty>(res);
  },

  async updateWarranty(id: string, data: Partial<Warranty>): Promise<Warranty> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/warranties/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<Warranty>(res);
  },

  async deleteWarranty(id: string): Promise<{ id: string; deleted: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/warranties/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ id: string; deleted: boolean }>(res);
  },

  // Maintenances
  async getMaintenances(assetId?: string, propertyId?: string): Promise<MaintenanceTask[]> {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    if (assetId) params.append('assetId', assetId);
    if (propertyId) params.append('propertyId', propertyId);
    const url = `/api/household/maintenances${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { method: 'GET', headers });
    return handleResponse<MaintenanceTask[]>(res);
  },

  async createMaintenance(data: Partial<MaintenanceTask>): Promise<MaintenanceTask> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/maintenances', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<MaintenanceTask>(res);
  },

  async updateMaintenance(id: string, data: Partial<MaintenanceTask>): Promise<MaintenanceTask> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/maintenances/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<MaintenanceTask>(res);
  },

  async deleteMaintenance(id: string): Promise<{ id: string; deleted: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/maintenances/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ id: string; deleted: boolean }>(res);
  },

  // Utilities
  async getUtilities(propertyId?: string): Promise<UtilityAccount[]> {
    const headers = await getAuthHeader();
    const url = propertyId
      ? `/api/household/utilities?propertyId=${encodeURIComponent(propertyId)}`
      : '/api/household/utilities';
    const res = await fetch(url, { method: 'GET', headers });
    return handleResponse<UtilityAccount[]>(res);
  },

  async createUtility(data: Partial<UtilityAccount>): Promise<UtilityAccount> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/utilities', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<UtilityAccount>(res);
  },

  async updateUtility(id: string, data: Partial<UtilityAccount>): Promise<UtilityAccount> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/utilities/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<UtilityAccount>(res);
  },

  async deleteUtility(id: string): Promise<{ id: string; deleted: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/utilities/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ id: string; deleted: boolean }>(res);
  },

  // Loans
  async getLoans(propertyId?: string): Promise<HouseholdLoan[]> {
    const headers = await getAuthHeader();
    const url = propertyId
      ? `/api/household/loans?propertyId=${encodeURIComponent(propertyId)}`
      : '/api/household/loans';
    const res = await fetch(url, { method: 'GET', headers });
    return handleResponse<HouseholdLoan[]>(res);
  },

  async createLoan(data: Partial<HouseholdLoan>): Promise<HouseholdLoan> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/loans', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<HouseholdLoan>(res);
  },

  async updateLoan(id: string, data: Partial<HouseholdLoan>): Promise<HouseholdLoan> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/loans/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<HouseholdLoan>(res);
  },

  async deleteLoan(id: string): Promise<{ id: string; deleted: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/loans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ id: string; deleted: boolean }>(res);
  },

  // Credit Cards
  async getCreditCards(): Promise<CreditCardAccount[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/credit-cards', { method: 'GET', headers });
    return handleResponse<CreditCardAccount[]>(res);
  },

  async createCreditCard(data: Partial<CreditCardAccount>): Promise<CreditCardAccount> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/credit-cards', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<CreditCardAccount>(res);
  },

  async updateCreditCard(id: string, data: Partial<CreditCardAccount>): Promise<CreditCardAccount> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/credit-cards/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<CreditCardAccount>(res);
  },

  async deleteCreditCard(id: string): Promise<{ id: string; deleted: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/credit-cards/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ id: string; deleted: boolean }>(res);
  },

  // AI Document-First Entity Extraction & Review
  async extractEntityFromDoc(
    documentId: string,
    targetEntityType?: HouseholdEntityType,
    notes?: string
  ): Promise<ExtractedEntityReviewData> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/extract-entity-from-doc', {
      method: 'POST',
      headers,
      body: JSON.stringify({ documentId, targetEntityType, notes }),
    });
    return handleResponse<ExtractedEntityReviewData>(res);
  },

  async saveExtractedEntity(
    entityType: HouseholdEntityType,
    entityData: Record<string, any>,
    sourceDocumentId?: string
  ): Promise<{ success: boolean; entityId: string; entityType: HouseholdEntityType; entity: any }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/save-extracted-entity', {
      method: 'POST',
      headers,
      body: JSON.stringify({ entityType, entityData, sourceDocumentId }),
    });
    return handleResponse<{ success: boolean; entityId: string; entityType: HouseholdEntityType; entity: any }>(res);
  },
};


