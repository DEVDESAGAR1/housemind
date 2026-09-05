import { NavigationTab } from '../Navbar';

export interface TourStep {
  targetSelector?: string; // CSS selector of target element, or undefined for centered card
  tab?: NavigationTab;     // Tab that should be active during this step
  subTab?: string;         // Subtab if applicable
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface GuidedTour {
  id: string;
  title: string;
  shortDescription: string;
  category: 'overview' | 'core' | 'intelligence' | 'financial';
  steps: TourStep[];
}

export const HOUSEMIND_TOURS: Record<string, GuidedTour> = {
  'overview': {
    id: 'overview',
    title: 'HouseMind Complete Overview',
    shortDescription: 'Discover how HouseMind connects data, intelligence, and unified actions across your home.',
    category: 'overview',
    steps: [
      {
        title: 'Welcome to HouseMind',
        description: 'HouseMind is an intelligent household operating system that connects your properties, assets, maintenance, bills, and documents into a unified command view.',
        placement: 'center',
        tab: 'dashboard',
      },
      {
        targetSelector: '#nav-tab-dashboard',
        tab: 'dashboard',
        title: 'Command Center',
        description: 'Your daily cockpit. See critical obligations, overdue tasks, household health status, and urgent issues needing attention at a single glance.',
        placement: 'bottom',
      },
      {
        targetSelector: '#nav-tab-assets',
        tab: 'assets',
        title: 'Properties & Assets',
        description: 'Catalog your physical spaces, rooms, and high-value appliances with purchase dates, warranty lifespans, and spatial relationships.',
        placement: 'bottom',
      },
      {
        targetSelector: '#nav-tab-maintenance',
        tab: 'maintenance',
        title: 'Maintenance & Warranties',
        description: 'Track recurring service schedules, active warranty coverage, and open repair tickets with step-by-step diagnostic checklists.',
        placement: 'bottom',
      },
      {
        targetSelector: '#nav-tab-expenses',
        tab: 'expenses',
        title: 'Finances & Commitments',
        description: 'Consolidate recurring utility bills, loan amortizations, credit cards, and cash flow obligations with real-time currency conversions.',
        placement: 'bottom',
      },
      {
        targetSelector: '#nav-tab-documents',
        tab: 'documents',
        title: 'Upload & Scan Vault',
        description: 'Extract structure from receipts, invoices, and warranties using zero-trust local OCR and entity mapping.',
        placement: 'bottom',
      },
      {
        targetSelector: '#nav-tab-copilot',
        tab: 'copilot',
        title: 'Household Copilot',
        description: 'Ask natural-language questions grounded in verified household data with deterministic facts and cited sources.',
        placement: 'bottom',
      },
    ],
  },

  'command_center': {
    id: 'command_center',
    title: 'Command Center Walkthrough',
    shortDescription: 'Master the daily operating screen, health metrics, and prioritized attention triage.',
    category: 'core',
    steps: [
      {
        tab: 'dashboard',
        title: 'Command Center Cockpit',
        description: 'Your central home operations hub. It synthesizes signals across all household domains into an actionable daily triage view so you always know what matters.',
        placement: 'center',
      },
      {
        targetSelector: '#command-center-health-widget',
        tab: 'dashboard',
        title: 'Household Health Score',
        description: 'A composite 0–100 score across 4 pillars. Click any pillar to inspect underlying signals, positive habits, and steps to improve household reliability.',
        placement: 'bottom',
      },
      {
        targetSelector: '#command-center-unified-actions',
        tab: 'dashboard',
        title: 'Unified Action Center',
        description: 'The single source of truth for actionable tasks. Open an action to inspect the underlying evidence, snooze for later, or complete it in one click.',
        placement: 'top',
      },
      {
        targetSelector: '#command-center-upcoming-schedule',
        tab: 'dashboard',
        title: 'Upcoming Obligations',
        description: 'Consolidated timeline for the next 30 days. See upcoming bill due dates, scheduled maintenance visits, and warranty milestones at a glance.',
        placement: 'top',
      },
    ],
  },

  'health': {
    id: 'health',
    title: 'Household Health & Diagnostic Pillars',
    shortDescription: 'Learn how your 4-pillar health score is calculated and how to improve it.',
    category: 'intelligence',
    steps: [
      {
        tab: 'dashboard',
        title: '4-Pillar Health Diagnostic',
        description: 'HouseMind calculates your health score objectively using 4 pillars: Documentation, Maintenance, Financial Safety, and Risk Mitigation.',
        placement: 'center',
      },
      {
        targetSelector: '#command-center-health-widget',
        tab: 'dashboard',
        title: 'Health Breakdown',
        description: 'Click the health score at any time to inspect specific risk factors, positive habits, and actionable steps to raise your score.',
        placement: 'bottom',
      },
    ],
  },

  'upload_scan': {
    id: 'upload_scan',
    title: 'Upload & Scan Document Pipeline',
    shortDescription: 'From document upload to automated OCR entity extraction and permanent storage.',
    category: 'core',
    steps: [
      {
        tab: 'documents',
        title: 'Document Processing Flow',
        description: 'HouseMind processes PDFs, receipts, and invoices through a 5-step pipeline: Upload → OCR → Extraction Review → Entity Linking → Verified Save.',
        placement: 'center',
      },
      {
        targetSelector: '#nav-global-upload-btn',
        tab: 'documents',
        title: 'Universal Upload',
        description: 'Click "Upload" from any screen to drop tax invoices, warranty cards, or service slips for automated ingestion.',
        placement: 'bottom',
      },
      {
        tab: 'documents',
        title: 'Review & Entity Linking',
        description: 'Before committing records, review extracted merchant names, line items, and linked equipment to ensure complete accuracy.',
        placement: 'center',
      },
    ],
  },

  'assets_issues': {
    id: 'assets_issues',
    title: 'Assets, Equipment & Issues',
    shortDescription: 'Track equipment specs, service histories, and solve recurring repair tickets.',
    category: 'core',
    steps: [
      {
        targetSelector: '#nav-tab-assets',
        tab: 'assets',
        title: 'Asset Inventory',
        description: 'Keep detailed specs for HVAC, major appliances, water purification, and electronics with purchase receipts and serial numbers.',
        placement: 'bottom',
      },
      {
        targetSelector: '#nav-tab-maintenance',
        tab: 'maintenance',
        subTab: 'issues',
        title: 'Issue & Ticket Management',
        description: 'Log household faults with severity indicators, safety warnings, and step-by-step diagnostic checklists.',
        placement: 'bottom',
      },
    ],
  },

  'finance': {
    id: 'finance',
    title: 'Finances, Debts & Obligations',
    shortDescription: 'Monitor recurring expenses, utility power grids, mortgage amortization, and simulation.',
    category: 'financial',
    steps: [
      {
        targetSelector: '#nav-tab-expenses',
        tab: 'expenses',
        title: 'Expenses & Budget Burn Rate',
        description: 'Track recurring household cash outflows with automated categorization and multi-currency support.',
        placement: 'bottom',
      },
      {
        targetSelector: '#nav-tab-utilities',
        tab: 'utilities',
        title: 'Utilities, Loans & Cards',
        description: 'Manage power, water, gas providers alongside housing loans and credit card payment milestones in one place.',
        placement: 'bottom',
      },
    ],
  },

  'calendar_notifications': {
    id: 'calendar_notifications',
    title: 'Calendar & Notifications Engine',
    shortDescription: 'Stay ahead of upcoming deadlines with unified calendar events and notification rules.',
    category: 'core',
    steps: [
      {
        targetSelector: '#nav-tab-calendar',
        tab: 'calendar',
        title: 'Household Unified Calendar',
        description: 'All maintenance service visits, bill payment dates, and warranty expiries merged into one consolidated timeline.',
        placement: 'bottom',
      },
      {
        targetSelector: '#nav-notifications-btn',
        tab: 'dashboard',
        title: 'Notification Center',
        description: 'Categorized alerts with one-click deep linking directly to the affected asset, warranty, or financial record.',
        placement: 'bottom',
      },
    ],
  },

  'unified_actions': {
    id: 'unified_actions',
    title: 'Unified Actions & Recommendations',
    shortDescription: 'Understand prioritized recommendations, evidence citations, and action controls.',
    category: 'intelligence',
    steps: [
      {
        targetSelector: '#command-center-unified-actions',
        tab: 'dashboard',
        title: 'Action Engine',
        description: 'Unified actions surface deduplicated recommendations based on real-time household telemetry with full explainability.',
        placement: 'top',
      },
    ],
  },

  'cross_domain': {
    id: 'cross_domain',
    title: 'Cross-Domain Intelligence Graph',
    shortDescription: 'See how assets, warranties, maintenance, and expenses interconnect across your home.',
    category: 'intelligence',
    steps: [
      {
        tab: 'dashboard',
        title: 'Interconnected Household Graph',
        description: 'HouseMind correlates data across silos—such as connecting an AC breakdown with an active warranty policy and scheduled repair technician.',
        placement: 'center',
      },
    ],
  },

  'morning_brief': {
    id: 'morning_brief',
    title: 'Morning Brief Daily Synthesis',
    shortDescription: 'Your concise daily executive briefing of what matters today across your home.',
    category: 'intelligence',
    steps: [
      {
        tab: 'dashboard',
        title: 'Morning Executive Summary',
        description: 'The Morning Brief synthesizes yesterday\'s updates, today\'s urgent obligations, and this week\'s key milestones into a single clean modal.',
        placement: 'center',
      },
    ],
  },

  'copilot': {
    id: 'copilot',
    title: 'Household Copilot AI Assistant',
    shortDescription: 'Learn how to query your household with grounded, privacy-preserving AI assistance.',
    category: 'intelligence',
    steps: [
      {
        targetSelector: '#nav-tab-copilot',
        tab: 'copilot',
        title: 'Grounded Household Chat',
        description: 'Ask questions like "When is my AC warranty expiring?" or "What bills are due this week?". Every answer cites exact source records.',
        placement: 'bottom',
      },
      {
        tab: 'copilot',
        title: 'Transparent AI Assistance',
        description: 'Copilot clearly labels AI-assisted responses vs deterministic household facts, never uses your data for training, and gracefully falls back when offline.',
        placement: 'center',
      },
    ],
  },
};
