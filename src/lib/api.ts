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
  TransactionCandidate,
  HouseholdHealthReport,
  HouseholdHealthAiExplanation,
  GlobalSearchResponse,
  HouseholdCalendarResponse,
  HouseholdNotificationsResponse,
  NotificationPreferences,
  HouseholdNotification,
  HouseholdMorningBrief,
  AgentActionProposal,
  AgentActionExecutionResult,
  AgentActivityTimelineResponse,
  HouseholdMemoryItem,
  HouseholdMemoriesResponse,
  HouseholdIssue,
  HouseholdIssueCandidate,
  HouseholdIssueStatus,
  HouseholdIssueSeverity,
  IssueIntelligenceReport,
  ResolutionChecklistItem,
  PossibleRelatedIssue,
  RecurringFailureSignal,
  IssueWarrantyIntelligence,
  IssueMaintenanceIntelligence,
  RecommendedNextStep,
  StructuredResolutionSummary,
  CrossDomainInsightsResponse,
  CrossDomainInsight,
  HouseholdTimelineResponse,
  HouseholdGraphResponse,
  UnifiedHouseholdActionsResponse,
  UnifiedHouseholdAction,
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
  let token: string | undefined;

  if (currentUser) {
    token = await currentUser.getIdToken();
  } else if (typeof window !== 'undefined' && (window as any).__PLAYWRIGHT_TEST_USER__) {
    // Isolated to local automated Playwright test runner fixture (tree-shaken in production builds)
    const testUser = (window as any).__PLAYWRIGHT_TEST_USER__;
    token = typeof testUser.getIdToken === 'function' ? await testUser.getIdToken() : testUser.testToken;
  }

  if (!token) {
    throw new Error('User is not authenticated');
  }

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

  async getAssetRelationships(id: string): Promise<{
    asset: HomeAsset;
    warranties: any[];
    maintenances: any[];
    expenses: any[];
    documents: any[];
    calendarEvents: any[];
  }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/assets/${encodeURIComponent(id)}/relationships`, {
      method: 'GET',
      headers,
    });
    return handleResponse<{
      asset: HomeAsset;
      warranties: any[];
      maintenances: any[];
      expenses: any[];
      documents: any[];
      calendarEvents: any[];
    }>(res);
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

  async sendCopilotMessage(message: string, conversationId?: string): Promise<CopilotChatResponse> {
    return this.sendCopilotChat({ message, conversationId });
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

  async getMorningBrief(): Promise<HouseholdMorningBrief> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/morning-brief', {
      method: 'GET',
      headers,
    });
    return handleResponse<HouseholdMorningBrief>(res);
  },

  async dismissMorningBriefToday(): Promise<{ dismissedDate: string; isDismissedToday: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/morning-brief/dismiss-today', {
      method: 'POST',
      headers,
    });
    return handleResponse<{ dismissedDate: string; isDismissedToday: boolean }>(res);
  },

  async getAgentAction(actionId: string): Promise<AgentActionProposal> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/copilot/actions/${encodeURIComponent(actionId)}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<AgentActionProposal>(res);
  },

  async approveAgentAction(actionId: string): Promise<AgentActionExecutionResult> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/copilot/actions/${encodeURIComponent(actionId)}/approve`, {
      method: 'POST',
      headers,
    });
    return handleResponse<AgentActionExecutionResult>(res);
  },

  async cancelAgentAction(actionId: string): Promise<{ success: boolean; message: string; proposal?: AgentActionProposal }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/copilot/actions/${encodeURIComponent(actionId)}/cancel`, {
      method: 'POST',
      headers,
    });
    return handleResponse<{ success: boolean; message: string; proposal?: AgentActionProposal }>(res);
  },

  async getAgentActivity(params?: { limit?: number; offset?: number; eventType?: string }): Promise<AgentActivityTimelineResponse> {
    const headers = await getAuthHeader();
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    if (params?.eventType) query.append('eventType', params.eventType);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`/api/copilot/activity${qs}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<AgentActivityTimelineResponse>(res);
  },

  // Global Household Discovery & Search
  async searchHousehold(query: string, category = 'all', limit = 40): Promise<GlobalSearchResponse> {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (category && category !== 'all') params.append('category', category);
    if (limit) params.append('limit', String(limit));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/household/search${qs}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<GlobalSearchResponse>(res);
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

  async getHomeCommandCenterSummary(): Promise<HomeCommandCenterSummary> {
    return this.getCommandCenterSummary();
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

  async getMaintenanceTasks(assetId?: string, propertyId?: string): Promise<MaintenanceTask[]> {
    return this.getMaintenances(assetId, propertyId);
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

  // Household Issues / Tickets (Phase 24.2)
  async getIssues(filters?: {
    assetId?: string;
    propertyId?: string;
    roomId?: string;
    status?: HouseholdIssueStatus;
    severity?: HouseholdIssueSeverity;
    category?: string;
  }): Promise<HouseholdIssue[]> {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    if (filters?.assetId) params.append('assetId', filters.assetId);
    if (filters?.propertyId) params.append('propertyId', filters.propertyId);
    if (filters?.roomId) params.append('roomId', filters.roomId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.category) params.append('category', filters.category);
    const url = `/api/household/issues${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { method: 'GET', headers });
    return handleResponse<HouseholdIssue[]>(res);
  },

  async getIssue(id: string): Promise<HouseholdIssue> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/issues/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<HouseholdIssue>(res);
  },

  async createIssue(data: Partial<HouseholdIssue>): Promise<HouseholdIssue> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/issues', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<HouseholdIssue>(res);
  },

  async updateIssue(id: string, data: Partial<HouseholdIssue>): Promise<HouseholdIssue> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/issues/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<HouseholdIssue>(res);
  },

  async transitionIssueStatus(
    id: string,
    newStatus: HouseholdIssueStatus,
    options?: { note?: string; resolution?: string; actualCost?: number }
  ): Promise<HouseholdIssue> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/issues/${encodeURIComponent(id)}/transition`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ newStatus, ...options }),
    });
    return handleResponse<HouseholdIssue>(res);
  },

  async addIssueActivity(
    id: string,
    action: string,
    note?: string
  ): Promise<HouseholdIssue> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/issues/${encodeURIComponent(id)}/activity`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, note }),
    });
    return handleResponse<HouseholdIssue>(res);
  },

  async deleteIssue(id: string): Promise<{ id: string; deleted: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/issues/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ id: string; deleted: boolean }>(res);
  },

  async extractIssueCandidate(input: string, contextAssetId?: string): Promise<HouseholdIssueCandidate> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/issues/extract', {
      method: 'POST',
      headers,
      body: JSON.stringify({ input, contextAssetId }),
    });
    return handleResponse<HouseholdIssueCandidate>(res);
  },

  async getIssueIntelligence(id: string): Promise<IssueIntelligenceReport> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/issues/${encodeURIComponent(id)}/intelligence`, {
      method: 'GET',
      headers,
    });
    return handleResponse<IssueIntelligenceReport>(res);
  },

  async linkRelatedIssues(id: string, targetIssueId: string, reason?: string): Promise<{ success: boolean; issue: HouseholdIssue }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/issues/${encodeURIComponent(id)}/link-related`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetIssueId, reason }),
    });
    return handleResponse<{ success: boolean; issue: HouseholdIssue }>(res);
  },

  async unlinkRelatedIssue(id: string, targetIssueId: string): Promise<{ success: boolean; issue: HouseholdIssue }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/issues/${encodeURIComponent(id)}/unlink-related`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetIssueId }),
    });
    return handleResponse<{ success: boolean; issue: HouseholdIssue }>(res);
  },

  async updateIssueChecklist(id: string, checklist: ResolutionChecklistItem[]): Promise<HouseholdIssue> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/issues/${encodeURIComponent(id)}/checklist`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ checklist }),
    });
    return handleResponse<HouseholdIssue>(res);
  },

  async updateIssueRootCause(id: string, rootCause: string): Promise<HouseholdIssue> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/issues/${encodeURIComponent(id)}/root-cause`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ rootCause }),
    });
    return handleResponse<HouseholdIssue>(res);
  },

  async getHouseholdRecurringInsights(): Promise<any[]> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/issues/recurring-insights', {
      method: 'GET',
      headers,
    });
    return handleResponse<any[]>(res);
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
  async uploadDocument(
    file: File,
    documentType?: string
  ): Promise<{
    success: boolean;
    document: HouseholdDocument;
    candidatesCount: number;
    duplicatesCount: number;
    isDuplicateDocument?: boolean;
    existingDocument?: HouseholdDocument | null;
    message: string;
  }> {
    const headers = await getAuthHeader();
    // Remove Content-Type header so browser sets multipart/form-data boundary properly
    delete (headers as Record<string, string>)['Content-Type'];

    const formData = new FormData();
    formData.append('file', file);
    if (documentType) {
      formData.append('documentType', documentType);
    }

    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse<{
      success: boolean;
      document: HouseholdDocument;
      candidatesCount: number;
      duplicatesCount: number;
      isDuplicateDocument?: boolean;
      existingDocument?: HouseholdDocument | null;
      message: string;
    }>(res);
  },

  async checkDuplicateDocument(
    fileName: string,
    fileSize?: number
  ): Promise<{
    success: boolean;
    isDuplicate: boolean;
    existingDocument?: HouseholdDocument | null;
    message: string;
  }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/documents/check-duplicate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ fileName, fileSize }),
    });
    return handleResponse<{
      success: boolean;
      isDuplicate: boolean;
      existingDocument?: HouseholdDocument | null;
      message: string;
    }>(res);
  },

  async saveDocumentOnly(payload: {
    documentId?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    documentType?: string;
    notes?: string;
  }): Promise<{ success: boolean; document: HouseholdDocument; message: string }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/documents/save-document-only', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; document: HouseholdDocument; message: string }>(res);
  },

  async confirmImport(
    documentId: string,
    candidates: TransactionCandidate[],
    accountOverride?: string,
    notes?: string
  ): Promise<{ success: boolean; message: string; confirmedCount: number }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/imports/${encodeURIComponent(documentId)}/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ candidates, accountOverride, notes }),
    });
    return handleResponse<{ success: boolean; message: string; confirmedCount: number }>(res);
  },

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

  // ==========================================
  // Phase 3: Household Health Intelligence API
  // ==========================================

  async getHouseholdHealth(includeAiExplanation = false): Promise<HouseholdHealthReport> {
    const headers = await getAuthHeader();
    const query = includeAiExplanation ? '?includeAiExplanation=true' : '';
    const res = await fetch(`/api/intelligence/health${query}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<HouseholdHealthReport>(res);
  },

  async explainHouseholdHealth(): Promise<HouseholdHealthAiExplanation> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/intelligence/health/explain', {
      method: 'POST',
      headers,
    });
    return handleResponse<HouseholdHealthAiExplanation>(res);
  },

  // ==========================================
  // Phase 6: Household Calendar & Notifications API
  // ==========================================

  async getCalendarEvents(params?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    q?: string;
  }): Promise<HouseholdCalendarResponse> {
    const headers = await getAuthHeader();
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.q) searchParams.append('q', params.q);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`/api/household/calendar/events${query}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<HouseholdCalendarResponse>(res);
  },

  async getNotifications(): Promise<HouseholdNotificationsResponse> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/notifications', {
      method: 'GET',
      headers,
    });
    return handleResponse<HouseholdNotificationsResponse>(res);
  },

  async markNotificationRead(id: string): Promise<{ id: string; isRead: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PUT',
      headers,
    });
    return handleResponse<{ id: string; isRead: boolean }>(res);
  },

  async markNotificationUnread(id: string): Promise<{ id: string; isRead: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/notifications/${encodeURIComponent(id)}/unread`, {
      method: 'PUT',
      headers,
    });
    return handleResponse<{ id: string; isRead: boolean }>(res);
  },

  async markAllNotificationsRead(): Promise<{ markedCount: number }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/notifications/read-all', {
      method: 'PUT',
      headers,
    });
    return handleResponse<{ markedCount: number }>(res);
  },

  async dismissNotification(id: string): Promise<{ id: string; dismissed: boolean }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/notifications/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ id: string; dismissed: boolean }>(res);
  },

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/notifications/preferences', {
      method: 'GET',
      headers,
    });
    return handleResponse<NotificationPreferences>(res);
  },

  async updateNotificationPreferences(
    prefs: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/notifications/preferences', {
      method: 'PUT',
      headers,
      body: JSON.stringify(prefs),
    });
    return handleResponse<NotificationPreferences>(res);
  },

  async testEmailDigest(): Promise<{ delivered: boolean; queuedCount: number; message: string }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/notifications/email-digest-test', {
      method: 'POST',
      headers,
    });
    return handleResponse<{ delivered: boolean; queuedCount: number; message: string }>(res);
  },

  async exportHouseholdData(): Promise<any> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/export', {
      method: 'GET',
      headers,
    });
    return handleResponse<any>(res);
  },

  // Household Memory (Phase 20)
  async getHouseholdMemories(confirmedOnly: boolean = false): Promise<HouseholdMemoriesResponse> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/memory?confirmedOnly=${confirmedOnly}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<HouseholdMemoriesResponse>(res);
  },

  async createHouseholdMemory(data: Partial<HouseholdMemoryItem>): Promise<HouseholdMemoryItem> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/memory', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<HouseholdMemoryItem>(res);
  },

  async confirmHouseholdMemory(id: string): Promise<HouseholdMemoryItem> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/memory/${encodeURIComponent(id)}/confirm`, {
      method: 'PUT',
      headers,
    });
    return handleResponse<HouseholdMemoryItem>(res);
  },

  async deleteHouseholdMemory(id: string): Promise<{ success: boolean; message: string }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/memory/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // ==========================================
  // PHASE 24.4: CROSS-DOMAIN HOUSEHOLD INTELLIGENCE
  // ==========================================

  async getCrossDomainInsights(params?: {
    priority?: string;
    type?: string;
    includeDismissed?: boolean;
    limit?: number;
  }): Promise<CrossDomainInsightsResponse> {
    const headers = await getAuthHeader();
    const query = new URLSearchParams();
    if (params?.priority) query.set('priority', params.priority);
    if (params?.type) query.set('type', params.type);
    if (params?.includeDismissed) query.set('includeDismissed', 'true');
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await fetch(`/api/household/cross-domain-insights?${query.toString()}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<CrossDomainInsightsResponse>(res);
  },

  async dismissCrossDomainInsight(insightId: string, fingerprint?: string): Promise<{ success: boolean; message: string }> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/cross-domain-insights/dismiss', {
      method: 'POST',
      headers,
      body: JSON.stringify({ insightId, fingerprint }),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async getHouseholdTimeline(params?: {
    domain?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<HouseholdTimelineResponse> {
    const headers = await getAuthHeader();
    const query = new URLSearchParams();
    if (params?.domain) query.set('domain', params.domain);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await fetch(`/api/household/timeline?${query.toString()}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<HouseholdTimelineResponse>(res);
  },

  async getHouseholdGraph(): Promise<HouseholdGraphResponse> {
    const headers = await getAuthHeader();
    const res = await fetch('/api/household/graph', {
      method: 'GET',
      headers,
    });
    return handleResponse<HouseholdGraphResponse>(res);
  },

  // ==========================================
  // PHASE 24.5: UNIFIED HOUSEHOLD ACTIONS
  // ==========================================

  async getUnifiedActions(params?: {
    priority?: string;
    domain?: string;
    status?: string;
    limit?: number;
  }): Promise<UnifiedHouseholdActionsResponse> {
    const headers = await getAuthHeader();
    const query = new URLSearchParams();
    if (params?.priority) query.set('priority', params.priority);
    if (params?.domain) query.set('domain', params.domain);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await fetch(`/api/household/unified-actions?${query.toString()}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<UnifiedHouseholdActionsResponse>(res);
  },

  async dismissUnifiedAction(actionId: string, fingerprint?: string): Promise<{ success: boolean; message: string }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/unified-actions/${actionId}/dismiss`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fingerprint }),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async snoozeUnifiedAction(
    actionId: string,
    durationDays = 7,
    fingerprint?: string
  ): Promise<{ success: boolean; snoozedUntil: string; message: string }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/unified-actions/${actionId}/snooze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ durationDays, fingerprint }),
    });
    return handleResponse<{ success: boolean; snoozedUntil: string; message: string }>(res);
  },

  async completeUnifiedAction(
    actionId: string,
    fingerprint?: string
  ): Promise<{ success: boolean; completedAt: string; message: string }> {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/household/unified-actions/${actionId}/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fingerprint }),
    });
    return handleResponse<{ success: boolean; completedAt: string; message: string }>(res);
  },
};



