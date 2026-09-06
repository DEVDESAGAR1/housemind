import {
  Property,
  HomeAsset,
  MaintenanceTask,
  WarrantyPolicy,
  HouseholdIssue,
  UtilityAccount,
  HouseholdLoan,
  CreditCardAccount,
  HouseholdExpense,
  HouseholdDocument,
} from '../types';
import { NavigationTab } from '../components/Navbar';

export interface CopilotActionInput {
  actionType?: 'create' | 'view' | 'edit' | 'mutate' | 'navigate';
  tab?: string;
  subTab?: string;
  entityId?: string;
  entityType?: 'property' | 'asset' | 'maintenance' | 'warranty' | 'issue' | 'utility' | 'loan' | 'card' | 'expense' | 'document' | string;
  title?: string;
  actionLabel?: string;
  reason?: string;
}

export interface HouseholdEntitiesContext {
  properties?: Property[];
  assets?: HomeAsset[];
  tasks?: MaintenanceTask[];
  warranties?: WarrantyPolicy[];
  issues?: HouseholdIssue[];
  utilities?: UtilityAccount[];
  loans?: HouseholdLoan[];
  creditCards?: CreditCardAccount[];
  expenses?: HouseholdExpense[];
  documents?: HouseholdDocument[];
}

export type AutoOpenTarget =
  | 'property'
  | 'asset'
  | 'maintenance'
  | 'warranty'
  | 'issue'
  | 'utility'
  | 'loan'
  | 'card'
  | 'expense'
  | null;

export interface ResolvedActionResult {
  status: 'resolved' | 'unavailable';
  intent: 'create' | 'view' | 'edit' | 'navigate';
  targetTab: NavigationTab;
  subTab?: string;
  entityId?: string;
  autoOpenTarget?: AutoOpenTarget;
  message?: string;
}

/**
 * Checks if text signals a creation / Add action
 */
function isCreationText(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return (
    lower.startsWith('add') ||
    lower.startsWith('create') ||
    lower.startsWith('new') ||
    lower.startsWith('register') ||
    lower.startsWith('setup') ||
    lower.startsWith('log') ||
    lower.startsWith('report') ||
    lower.startsWith('upload') ||
    lower.includes('add your home') ||
    lower.includes('add home') ||
    lower.includes('add property') ||
    lower.includes('add asset') ||
    lower.includes('add bill') ||
    lower.includes('add maintenance') ||
    lower.includes('add issue') ||
    lower.includes('add document')
  );
}

/**
 * Resolves any Copilot action into a deterministic navigation / creation / detail target.
 * Never causes scrolling, never anchors to missing elements.
 */
export function resolveCopilotAction(
  input: CopilotActionInput,
  context: HouseholdEntitiesContext
): ResolvedActionResult {
  const tab = (input.tab || '').toLowerCase().trim();
  const title = input.title || '';
  const actionLabel = input.actionLabel || '';
  const entityId = input.entityId?.trim() || '';
  const combinedText = `${title} ${actionLabel}`.toLowerCase();

  const isExplicitCreate = input.actionType === 'create';
  const isCreateIntent = isExplicitCreate || isCreationText(actionLabel) || isCreationText(title);

  // ==========================================
  // 1. CREATION ACTIONS (Add / Create / New)
  // ==========================================
  if (isCreateIntent) {
    // A. Property / Home
    if (
      tab === 'properties' ||
      combinedText.includes('home') ||
      combinedText.includes('property') ||
      combinedText.includes('residence')
    ) {
      return {
        status: 'resolved',
        intent: 'create',
        targetTab: 'properties',
        autoOpenTarget: 'property',
      };
    }

    // B. Asset / Appliance
    if (
      tab === 'assets' ||
      combinedText.includes('asset') ||
      combinedText.includes('appliance') ||
      combinedText.includes('equipment')
    ) {
      return {
        status: 'resolved',
        intent: 'create',
        targetTab: 'assets',
        autoOpenTarget: 'asset',
      };
    }

    // C. Warranty
    if (combinedText.includes('warranty') || combinedText.includes('guarantee')) {
      return {
        status: 'resolved',
        intent: 'create',
        targetTab: 'maintenance',
        subTab: 'warranties',
        autoOpenTarget: 'warranty',
      };
    }

    // D. Issue / Defect
    if (
      combinedText.includes('issue') ||
      combinedText.includes('defect') ||
      combinedText.includes('breakage') ||
      combinedText.includes('repair need')
    ) {
      return {
        status: 'resolved',
        intent: 'create',
        targetTab: 'maintenance',
        subTab: 'issues',
        autoOpenTarget: 'issue',
      };
    }

    // E. Maintenance Task
    if (
      tab === 'maintenance' ||
      combinedText.includes('maintenance') ||
      combinedText.includes('task') ||
      combinedText.includes('filter') ||
      combinedText.includes('service')
    ) {
      return {
        status: 'resolved',
        intent: 'create',
        targetTab: 'maintenance',
        subTab: 'maintenance',
        autoOpenTarget: 'maintenance',
      };
    }

    // F. Debt / Loan
    if (combinedText.includes('loan') || combinedText.includes('mortgage')) {
      return {
        status: 'resolved',
        intent: 'create',
        targetTab: 'utilities',
        subTab: 'loans',
        autoOpenTarget: 'loan',
      };
    }

    // G. Credit Card
    if (combinedText.includes('card') || combinedText.includes('credit')) {
      return {
        status: 'resolved',
        intent: 'create',
        targetTab: 'utilities',
        subTab: 'cards',
        autoOpenTarget: 'card',
      };
    }

    // H. Utility / Bill
    if (
      tab === 'utilities' ||
      combinedText.includes('utility') ||
      combinedText.includes('electric') ||
      combinedText.includes('gas') ||
      combinedText.includes('water') ||
      combinedText.includes('internet') ||
      combinedText.includes('trash') ||
      combinedText.includes('bill')
    ) {
      return {
        status: 'resolved',
        intent: 'create',
        targetTab: 'utilities',
        subTab: 'utilities',
        autoOpenTarget: 'utility',
      };
    }

    // I. Expense
    if (tab === 'expenses' || combinedText.includes('expense')) {
      return {
        status: 'resolved',
        intent: 'create',
        targetTab: 'expenses',
        autoOpenTarget: 'expense',
      };
    }

    // J. Document
    if (tab === 'documents' || combinedText.includes('document') || combinedText.includes('upload') || combinedText.includes('scan')) {
      return {
        status: 'resolved',
        intent: 'create',
        targetTab: 'documents',
        autoOpenTarget: null,
      };
    }

    // Default create fallback: if tab is specified, route to that tab with entity creation
    if (tab === 'properties') return { status: 'resolved', intent: 'create', targetTab: 'properties', autoOpenTarget: 'property' };
    if (tab === 'assets') return { status: 'resolved', intent: 'create', targetTab: 'assets', autoOpenTarget: 'asset' };
    if (tab === 'maintenance') return { status: 'resolved', intent: 'create', targetTab: 'maintenance', autoOpenTarget: 'maintenance' };
    if (tab === 'utilities') return { status: 'resolved', intent: 'create', targetTab: 'utilities', autoOpenTarget: 'utility' };
    if (tab === 'expenses') return { status: 'resolved', intent: 'create', targetTab: 'expenses', autoOpenTarget: 'expense' };
    if (tab === 'documents') return { status: 'resolved', intent: 'create', targetTab: 'documents', autoOpenTarget: null };
  }

  // ==========================================
  // 2. EXISTING ENTITY VIEW / DETAIL ACTIONS
  // ==========================================
  if (entityId) {
    const lowerId = String(entityId).toLowerCase().trim();

    // Check Property
    const propMatch = (context.properties || []).find(
      (p) => p && (p.id === entityId || (p.name || '').toLowerCase() === lowerId)
    );
    if (propMatch) {
      return {
        status: 'resolved',
        intent: input.actionType === 'edit' ? 'edit' : 'view',
        targetTab: 'properties',
        entityId: propMatch.id,
      };
    }

    // Check Asset
    const assetMatch = (context.assets || []).find(
      (a) =>
        a &&
        (a.id === entityId ||
          (a.name || '').toLowerCase() === lowerId ||
          (Boolean(a.brand) && lowerId.includes((a.brand || '').toLowerCase())))
    );
    if (assetMatch) {
      return {
        status: 'resolved',
        intent: input.actionType === 'edit' ? 'edit' : 'view',
        targetTab: 'assets',
        entityId: assetMatch.id,
      };
    }

    // Check Maintenance Task
    const taskMatch = (context.tasks || []).find(
      (t) => t && (t.id === entityId || (t.title || '').toLowerCase() === lowerId)
    );
    if (taskMatch) {
      return {
        status: 'resolved',
        intent: input.actionType === 'edit' ? 'edit' : 'view',
        targetTab: 'maintenance',
        subTab: 'maintenance',
        entityId: taskMatch.id,
      };
    }

    // Check Warranty
    const warrantyMatch = (context.warranties || []).find(
      (w) =>
        w &&
        (w.id === entityId ||
          (w.title && (w.title || '').toLowerCase() === lowerId) ||
          (w.providerName && (w.providerName || '').toLowerCase() === lowerId))
    );
    if (warrantyMatch) {
      return {
        status: 'resolved',
        intent: input.actionType === 'edit' ? 'edit' : 'view',
        targetTab: 'maintenance',
        subTab: 'warranties',
        entityId: warrantyMatch.id,
      };
    }

    // Check Issue
    const issueMatch = (context.issues || []).find(
      (i) => i && (i.id === entityId || (i.title || '').toLowerCase() === lowerId)
    );
    if (issueMatch) {
      return {
        status: 'resolved',
        intent: input.actionType === 'edit' ? 'edit' : 'view',
        targetTab: 'maintenance',
        subTab: 'issues',
        entityId: issueMatch.id,
      };
    }

    // Check Utility
    const utilMatch = (context.utilities || []).find(
      (u) =>
        u &&
        (u.id === entityId ||
          (u.providerName || '').toLowerCase() === lowerId ||
          (u.utilityType || '').toLowerCase() === lowerId)
    );
    if (utilMatch) {
      return {
        status: 'resolved',
        intent: input.actionType === 'edit' ? 'edit' : 'view',
        targetTab: 'utilities',
        subTab: 'utilities',
        entityId: utilMatch.id,
      };
    }

    // Check Loan
    const loanMatch = (context.loans || []).find(
      (l) => l && (l.id === entityId || (l.name || '').toLowerCase() === lowerId)
    );
    if (loanMatch) {
      return {
        status: 'resolved',
        intent: input.actionType === 'edit' ? 'edit' : 'view',
        targetTab: 'utilities',
        subTab: 'loans',
        entityId: loanMatch.id,
      };
    }

    // Check Card
    const cardMatch = (context.creditCards || []).find(
      (c) => c && (c.id === entityId || (c.cardName || '').toLowerCase() === lowerId)
    );
    if (cardMatch) {
      return {
        status: 'resolved',
        intent: input.actionType === 'edit' ? 'edit' : 'view',
        targetTab: 'utilities',
        subTab: 'cards',
        entityId: cardMatch.id,
      };
    }

    // Check Expense
    const expenseMatch = (context.expenses || []).find(
      (e) => e && (e.id === entityId || (e.title || '').toLowerCase() === lowerId)
    );
    if (expenseMatch) {
      return {
        status: 'resolved',
        intent: input.actionType === 'edit' ? 'edit' : 'view',
        targetTab: 'expenses',
        entityId: expenseMatch.id,
      };
    }

    // Check Document
    const docMatch = (context.documents || []).find(
      (d) => d && (d.id === entityId || (d.fileName || '').toLowerCase() === lowerId)
    );
    if (docMatch) {
      return {
        status: 'resolved',
        intent: input.actionType === 'edit' ? 'edit' : 'view',
        targetTab: 'documents',
        entityId: docMatch.id,
      };
    }

    // If an entity was explicitly targeted but does not exist:
    // P0.3: Missing destination/card = NO SCROLL. Do NOT scroll to bottom or fake navigation.
    return {
      status: 'unavailable',
      intent: 'view',
      targetTab: (isValidTab(tab) ? (tab as NavigationTab) : 'dashboard'),
      message: `The referenced record ("${input.title || entityId}") is unavailable or has been removed.`,
    };
  }

  // ==========================================
  // 3. TAB NAVIGATION
  // ==========================================
  if (isValidTab(tab)) {
    return {
      status: 'resolved',
      intent: 'navigate',
      targetTab: tab as NavigationTab,
      subTab: input.subTab,
    };
  }

  // Fallback: Dashboard
  return {
    status: 'resolved',
    intent: 'navigate',
    targetTab: 'dashboard',
  };
}

function isValidTab(tab: string): boolean {
  const validTabs: NavigationTab[] = [
    'dashboard',
    'properties',
    'assets',
    'maintenance',
    'utilities',
    'finances',
    'expenses',
    'documents',
    'calendar',
    'copilot',
    'help',
  ];
  return validTabs.includes(tab as NavigationTab);
}
