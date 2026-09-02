import React from 'react';
import {
  Sparkles,
  Building2,
  Home,
  Wrench,
  ShieldCheck,
  Zap,
  Wallet,
  FileText,
  SlidersHorizontal,
  Bell,
  Search,
  Lock,
  Layers,
  HelpCircle,
  Upload,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  ExternalLink,
  LifeBuoy,
  CreditCard,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { NavigationTab } from '../Navbar';

export interface HelpArticle {
  id: string;
  category: HelpCategoryId;
  title: string;
  shortDescription: string;
  readTime: string;
  iconName: string;
  keywords: string[];
  contentSections: {
    heading: string;
    body: string;
    points?: string[];
    callout?: {
      type: 'info' | 'warning' | 'tip' | 'success';
      text: string;
    };
  }[];
  actionLink?: {
    label: string;
    targetTab?: NavigationTab;
    modalAction?: 'upload' | 'profile' | 'search' | 'notifications' | 'preferences';
  };
}

export type HelpCategoryId =
  | 'getting-started'
  | 'household-home'
  | 'financials'
  | 'upload-scan'
  | 'household-health'
  | 'command-center'
  | 'calendar'
  | 'notifications'
  | 'search'
  | 'profile-data'
  | 'copilot'
  | 'privacy-security';

export interface HelpCategory {
  id: HelpCategoryId;
  title: string;
  description: string;
  iconName: string;
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: '11-step quick start guide to setting up your household operating system.',
    iconName: 'Sparkles',
  },
  {
    id: 'command-center',
    title: 'Command Center',
    description: 'Overview of health metrics, urgent action items, and domain snapshots.',
    iconName: 'Building2',
  },
  {
    id: 'household-home',
    title: 'Home, Assets & Upkeep',
    description: 'Managing properties, rooms, appliances, maintenance schedules, and warranties.',
    iconName: 'Home',
  },
  {
    id: 'financials',
    title: 'Finances, Debts & Bills',
    description: 'Tracking recurring expenses, utilities, mortgage loans, credit cards, and CSV exports.',
    iconName: 'Wallet',
  },
  {
    id: 'upload-scan',
    title: 'AI Document Intake & Scan',
    description: 'The Upload → Extract → Review → Edit → Save workflow for receipts and documents.',
    iconName: 'Upload',
  },
  {
    id: 'household-health',
    title: 'Household Health Score',
    description: 'The 4 pillars of household vitality, completeness indices, and scoring states.',
    iconName: 'ShieldCheck',
  },
  {
    id: 'calendar',
    title: 'Household Calendar',
    description: 'Aggregating bills, maintenance tasks, debt EMIs, and warranties in one timeline.',
    iconName: 'Calendar',
  },
  {
    id: 'notifications',
    title: 'Notifications & Alerts',
    description: 'Alert tiers, lead notice windows, email digests, and reminder preferences.',
    iconName: 'Bell',
  },
  {
    id: 'search',
    title: 'Global Search',
    description: 'Instant cross-domain search across properties, assets, debts, and documents.',
    iconName: 'Search',
  },
  {
    id: 'profile-data',
    title: 'Profile & Data Controls',
    description: 'Residence specs, currencies, JSON vault backups, CSV ledgers, and data wipes.',
    iconName: 'Database',
  },
  {
    id: 'copilot',
    title: 'AI Copilot Assistant',
    description: 'Understanding deterministic system logic versus generative AI capabilities.',
    iconName: 'Sparkles',
  },
  {
    id: 'privacy-security',
    title: 'Privacy & Security',
    description: 'Multi-tenant isolation, server-side keys, AI data boundary, and zero lock-in.',
    iconName: 'Lock',
  },
];

export const HELP_ARTICLES: HelpArticle[] = [
  // 1. Getting Started
  {
    id: 'getting-started-guide',
    category: 'getting-started',
    title: '11-Step Quick Start Guide for New Households',
    shortDescription: 'Master HouseMind from account setup to autonomous schedule tracking.',
    readTime: '4 min read',
    iconName: 'Sparkles',
    keywords: ['start', 'guide', 'onboarding', 'setup', 'new', 'checklist', 'intro', 'first steps'],
    contentSections: [
      {
        heading: '1. Sign In and Establish Your Household Profile',
        body: 'Authenticate securely and set your primary residence name, physical location, property archetype (e.g. Single-Family, Apartment), and regional currency.',
        points: [
          'Choose your home currency (e.g. USD, EUR, GBP, CAD, AUD, JPY, INR).',
          'Configure timezone and date formatting to ensure accurate calendar alerts.',
        ],
      },
      {
        heading: '2. Register Properties & Rooms',
        body: 'Add your primary residence and define key areas (Kitchen, Utility Room, Garage, HVAC Closet). Linking rooms to equipment makes maintenance effortless.',
      },
      {
        heading: '3. Catalog Home Assets & Major Equipment',
        body: 'Input major appliances (HVAC heat pump, water heater, refrigerator, roof, solar inverter). Record purchase dates, serial numbers, and estimated lifespans.',
      },
      {
        heading: '4. Record Utilities, Debts & Recurring Bills',
        body: 'Log your electricity, gas, water, internet accounts, mortgage loans, and credit cards with payment due dates and billing cadences.',
      },
      {
        heading: '5. Upload Household Documents & Receipts',
        body: 'Drag and drop invoices, appliance manuals, closing docs, or insurance policies into Global Upload for automated entity extraction.',
      },
      {
        heading: '6. Review & Confirm AI-Extracted Entities',
        body: 'HouseMind adheres to a strict Review Before Save workflow. Inspect extracted prices, model numbers, and warranty dates before adding them to your records.',
      },
      {
        heading: '7. Monitor Command Center & Health Report',
        body: 'Visit your Command Center to view your 0–100 Household Health Score, actionable recommendations, and urgent "Needs Attention" items.',
      },
      {
        heading: '8. Check Your Unified Calendar',
        body: 'Review all upcoming maintenance cadences, bill due dates, and loan EMIs in single-month or agenda views.',
      },
      {
        heading: '9. Configure Notification Rules & Advance Lead Windows',
        body: 'Set advance notice periods (e.g., 7 days for bills, 14 days for maintenance) and test your weekly email digest.',
      },
      {
        heading: '10. Leverage Global Search (⌘K / Ctrl+K)',
        body: 'Instantly find any appliance model, contractor receipt, debt balance, or filter replacement guide in seconds.',
      },
      {
        heading: '11. Consult AI Copilot for Household Strategy',
        body: 'Ask Copilot questions like "When was my HVAC last serviced?", "What are my total debt obligations this month?", or "How do I winterize my pipes?".',
        callout: {
          type: 'tip',
          text: 'You can test all HouseMind features instantly by loading realistic Demo Data from the Profile menu, and remove it with one click when you are ready to input your own records.',
        },
      },
    ],
    actionLink: {
      label: 'Open Command Center',
      targetTab: 'dashboard',
    },
  },

  // 2. Command Center Help
  {
    id: 'command-center-overview',
    category: 'command-center',
    title: 'Command Center: Your Household Cockpit',
    shortDescription: 'How HouseMind prioritizes urgent alerts, upcoming obligations, and domain snapshots.',
    readTime: '3 min read',
    iconName: 'Building2',
    keywords: ['command center', 'dashboard', 'needs attention', 'health', 'priorities', 'snapshots'],
    contentSections: [
      {
        heading: 'The Priority Hierarchy',
        body: 'The Command Center is engineered to eliminate cognitive overload by bubbling up what matters most right now:',
        points: [
          'Household Health Banner: Real-time 0–100 vitality rating across all 4 pillars.',
          'Needs Attention: High-priority items requiring immediate action (e.g. overdue bills, critical maintenance, expiring warranties).',
          'What Should I Do Next?: Deterministic, high-value suggestions to optimize maintenance and reduce household risk.',
          'Upcoming Obligations Schedule: Grouped 7-day, 14-day, and 30-day timeline of financial and upkeep commitments.',
          'Domain Snapshots: Quick pulse checks on Home, Assets, Finances, and Upkeep.',
          'Recent Activity: Chronological audit trail of added documents, completed tasks, and updated records.',
        ],
      },
      {
        heading: 'Automated Insight Investigation',
        body: 'Clicking "Investigate" on any insight card opens a dedicated breakdown comparing your historical expenditure or maintenance cadence with AI-generated explanations.',
      },
    ],
    actionLink: {
      label: 'Go to Command Center',
      targetTab: 'dashboard',
    },
  },

  // 3. Household & Home Help
  {
    id: 'household-home-management',
    category: 'household-home',
    title: 'Managing Properties, Rooms, Assets & Maintenance',
    shortDescription: 'Keep detailed records of physical infrastructure, warranty policies, and upkeep routines.',
    readTime: '4 min read',
    iconName: 'Home',
    keywords: ['properties', 'rooms', 'assets', 'appliances', 'maintenance', 'warranties', 'tasks'],
    contentSections: [
      {
        heading: 'Properties & Room Structures',
        body: 'Every household can manage one or more physical properties (primary residence, vacation cottage, rental unit). Rooms allow you to pinpoint the exact location of assets (e.g. Kitchen, Utility Basement, Garage).',
      },
      {
        heading: 'Asset & Major Equipment Tracking',
        body: 'Register heating, cooling, plumbing, and electrical systems. HouseMind tracks manufacture dates, estimated lifespans, serial numbers, replacement costs, and condition ratings.',
        points: [
          'Condition Ratings: Excellent, Good, Fair, Poor, or Needs Replacement.',
          'Preventative Alerts: The intelligence engine flags aging equipment approaching its end-of-life before failure occurs.',
        ],
      },
      {
        heading: 'Maintenance Cadences & Task History',
        body: 'Create recurring tasks (e.g., HVAC filter change every 90 days, gutter cleaning every 6 months, water heater flush every 12 months). Marking a task completed automatically logs the date and schedules the next cycle.',
      },
      {
        heading: 'Warranty Policies & Claim Details',
        body: 'Link manufacturer or extended warranties directly to registered assets. Record policy numbers, provider contacts, coverage expiration dates, and deductible amounts.',
      },
      {
        heading: 'Manual Entry vs. AI Document Scan',
        body: 'You can create assets, maintenance logs, and warranties manually via structured dialogs, or simply upload an invoice or user manual to extract them automatically.',
      },
    ],
    actionLink: {
      label: 'View Properties & Rooms',
      targetTab: 'properties',
    },
  },

  // 4. Financial Help
  {
    id: 'financial-management-guide',
    category: 'financials',
    title: 'Financial Tracking, Loans, Debts & Ledger Export',
    shortDescription: 'Organize household bills, loan amortization, credit cards, and CSV exports.',
    readTime: '4 min read',
    iconName: 'Wallet',
    keywords: ['finances', 'expenses', 'bills', 'utilities', 'loans', 'mortgage', 'credit cards', 'debt', 'csv', 'ledger'],
    contentSections: [
      {
        heading: 'Recurring Expenses & Utility Accounts',
        body: 'Categorize recurring outflows such as electric, gas, water, internet, trash, streaming services, and subscriptions. Mark payments as paid to keep records accurate.',
      },
      {
        heading: 'Mortgage Loans & Debt Amortization',
        body: 'Track principal balances, annual interest rates, monthly EMIs, start dates, and lender contact details for mortgages, home equity lines of credit (HELOC), and auto loans.',
      },
      {
        heading: 'Credit Card Accounts',
        body: 'Monitor credit limits, current outstanding balances, utilization ratios, payment due dates, and AutoPay status.',
      },
      {
        heading: 'Financial Ledger CSV Export',
        body: 'Export your complete financial ledger into a clean spreadsheet (CSV) containing recurring bills, loan amortizations, and credit card commitments with a single click in Profile → Data Vault.',
      },
      {
        heading: 'Organizational Disclaimer',
        body: 'HouseMind is an organizational and informational management tool designed to help you track household commitments. It does not provide certified financial advisory, banking, or tax accounting services.',
        callout: {
          type: 'info',
          text: 'HouseMind calculations are strictly deterministic. We never estimate or guess payment amounts without your explicit confirmation.',
        },
      },
    ],
    actionLink: {
      label: 'Open Finances Hub',
      targetTab: 'finances',
    },
  },

  // 5. Upload & Scan Help
  {
    id: 'upload-scan-workflow',
    category: 'upload-scan',
    title: 'AI Document Intake: The 6-Step Verification Workflow',
    shortDescription: 'How Multimodal Document AI extracts entities while ensuring 100% human-in-the-loop review.',
    readTime: '3 min read',
    iconName: 'Upload',
    keywords: ['upload', 'scan', 'ocr', 'ai intake', 'extraction', 'review before save', 'receipts', 'invoices', 'pdf'],
    contentSections: [
      {
        heading: 'The 6-Step Workflow: Upload → Extract → Review → Edit → Confirm → Save',
        body: 'To prevent inaccurate AI data from polluting your records, HouseMind enforces a strict verification process:',
        points: [
          '1. Upload: Drag and drop PDFs, PNGs, JPGs, or WebP files (up to 10MB).',
          '2. Extract: Multimodal Gemini vision AI parses vendor, date, line items, monetary amounts, model numbers, and warranty durations.',
          '3. Review: The system presents extracted values alongside an AI confidence indicator.',
          '4. Edit: Modify any field, assign category tags, or select linked properties/assets.',
          '5. Confirm: Choose whether to save the extracted entity (Asset, Warranty, Expense, or Task) or save the file as a raw Document only.',
          '6. Save: Entity is saved to your isolated database, and document is archived in the Vault.',
        ],
      },
      {
        heading: 'Duplicate Detection & Entity Linking',
        body: 'If a document matches an existing receipt date and amount, HouseMind alerts you to prevent duplicate expense entries.',
      },
      {
        heading: 'Review Before Save Guarantee',
        body: 'No AI-extracted data is committed to your permanent database without your explicit confirmation.',
        callout: {
          type: 'success',
          text: 'You can launch Global Upload from any screen by clicking the "Upload" button in the top navigation bar or pressing the upload action in the Document Manager.',
        },
      },
    ],
    actionLink: {
      label: 'Launch Global Upload',
      modalAction: 'upload',
    },
  },

  // 6. Household Health Score Help
  {
    id: 'household-health-score-guide',
    category: 'household-health',
    title: 'Understanding Your Household Health Score',
    shortDescription: 'The 4 pillars of household vitality, completeness indices, and scoring states.',
    readTime: '3 min read',
    iconName: 'ShieldCheck',
    keywords: ['health score', 'vitality', 'pillars', 'completeness', 'provisional', 'deductions', 'ratings'],
    contentSections: [
      {
        heading: 'The Four Pillars of Household Health',
        body: 'The Household Health Engine evaluates your home across four balanced pillars (25 points each = 100 max):',
        points: [
          '1. Home & Spaces (25%): Physical residence specs, room completeness, and structural info.',
          '2. Assets & Equipment (25%): Appliance condition ratings, warranty coverage, and age distribution.',
          '3. Financial Health (25%): Debt utilization, on-time bill payment consistency, and recurring cost stability.',
          '4. Documents & Records (25%): Stored receipts, operational manuals, and insurance documentation.',
        ],
      },
      {
        heading: 'Scoring Evaluation States',
        body: 'The score reflects the completeness of your records:',
        points: [
          'Insufficient Data (Setup Required): When fewer than 2 domains have data. The score displays "Setup Required" instead of a misleading zero.',
          'Provisional Rating: When baseline data exists but certain domains (e.g. warranties or docs) are uncataloged.',
          'Sufficient Data: Full holistic score with granular positive signals and risk deductions.',
        ],
      },
      {
        heading: 'Positive Signals vs. Risk Deductions',
        body: 'Points are awarded for active warranties, completed preventative maintenance, and low credit utilization. Deductions occur for overdue tasks, past-due bills, and aging critical equipment.',
      },
    ],
    actionLink: {
      label: 'Review Household Health',
      targetTab: 'dashboard',
    },
  },

  // 7. Calendar Help
  {
    id: 'calendar-guide',
    category: 'calendar',
    title: 'Unified Household Calendar & Schedule',
    shortDescription: 'A synchronized agenda of bills, maintenance, loans, and warranty expirations.',
    readTime: '3 min read',
    iconName: 'Calendar',
    keywords: ['calendar', 'agenda', 'schedule', 'bills', 'maintenance', 'due dates', 'timeline', 'derived events'],
    contentSections: [
      {
        heading: 'Derived Event Aggregation',
        body: 'The Calendar automatically calculates dates from your records without manual entry:',
        points: [
          'Recurring Bills & Utilities: Due dates based on monthly/quarterly billing cycles.',
          'Maintenance Tasks: Next scheduled service dates based on recurrence rules.',
          'Loan EMIs & Credit Card Due Dates: Monthly repayment deadlines.',
          'Warranty Expirations: Precise policy end dates for registered appliances.',
        ],
      },
      {
        heading: 'Month Grid & Agenda Timeline Views',
        body: 'Toggle between a visual full-month grid and a detailed chronological agenda view. Filter by event category (Finances, Maintenance, Debts, Warranties) to focus on specific obligations.',
      },
      {
        heading: 'Monthly Financial Commitments Summary',
        body: 'The header displays total projected obligations for the selected month, helping you anticipate cash flow requirements.',
      },
    ],
    actionLink: {
      label: 'Open Household Calendar',
      targetTab: 'calendar',
    },
  },

  // 8. Notifications Help
  {
    id: 'notifications-alerts-guide',
    category: 'notifications',
    title: 'Notifications, Urgency Tiers & Delivery Rules',
    shortDescription: 'Manage in-app alert banners, advance notice lead times, and weekly email digests.',
    readTime: '3 min read',
    iconName: 'Bell',
    keywords: ['notifications', 'alerts', 'lead times', 'email digest', 'critical', 'warning', 'preferences'],
    contentSections: [
      {
        heading: 'The Three Notification Tiers',
        body: 'HouseMind categorizes alerts into three clear urgency levels:',
        points: [
          'Critical (Red): Overdue bills, critical equipment breakdowns, or emergency maintenance.',
          'Warning (Amber): Obligations due within 7 days, expiring warranties, or scheduled service.',
          'Info (Blue): System updates, completed task confirmations, or newly extracted document entities.',
        ],
      },
      {
        heading: 'Configurable Advance Lead Windows',
        body: 'Customize how far in advance you receive alerts in Profile → Notification Rules:',
        points: [
          'Bills & Debts: 3, 7 (default), 14, or 30 days before due date.',
          'Maintenance Tasks: 7, 14 (default), 30, or 60 days before scheduled service.',
          'Warranty Expirations: 14, 30 (default), 60, or 90 days before policy expiration.',
        ],
      },
      {
        heading: 'Delivery Channels & Email Digest Test',
        body: 'Enable or disable in-app notifications and scheduled email digests. Use the "Test Email" button in Profile → Notification Rules to simulate your upcoming weekly digest.',
      },
    ],
    actionLink: {
      label: 'Configure Notification Rules',
      modalAction: 'preferences',
    },
  },

  // 9. Global Search Help
  {
    id: 'global-search-guide',
    category: 'search',
    title: 'Global Search: Instant Cross-Domain Discovery',
    shortDescription: 'Find any property, asset, maintenance task, debt, or document in milliseconds.',
    readTime: '2 min read',
    iconName: 'Search',
    keywords: ['search', 'find', 'hotkey', 'cmd+k', 'ctrl+k', 'discovery', 'lookup', 'filter'],
    contentSections: [
      {
        heading: 'Accessing Global Search (⌘K / Ctrl+K)',
        body: 'Press ⌘K (Mac) or Ctrl+K (Windows/Linux) anywhere in the application, or click the search bar in the header to open the Search modal.',
      },
      {
        heading: 'Cross-Domain Indexing',
        body: 'Search queries simultaneously scan across all 13 household domains:',
        points: [
          'Properties & Rooms (e.g., "Main Residence", "Garage")',
          'Assets & Equipment (e.g., "Bosch Dishwasher", "Carrier HVAC")',
          'Maintenance Tasks (e.g., "Replace Air Filter", "Roof Inspection")',
          'Warranties (e.g., "Samsung 5-Year Compressor")',
          'Expenses & Utilities (e.g., "Pacific Gas & Electric", "Internet Fiber")',
          'Loans & Credit Cards (e.g., "Chase Sapphire", "Wells Fargo Mortgage")',
          'Documents & Vault Files (e.g., "Settlement Agreement.pdf", "HVAC Manual")',
        ],
      },
      {
        heading: 'Category Filtering & Direct Navigation',
        body: 'Filter results by domain tabs (All, Properties, Assets, Maintenance, Financial, Documents). Selecting any result immediately opens the relevant record.',
      },
    ],
    actionLink: {
      label: 'Open Search',
      modalAction: 'search',
    },
  },

  // 10. Profile & Data Controls Help
  {
    id: 'profile-data-controls-guide',
    category: 'profile-data',
    title: 'Profile, Localization, Vault Backups & Data Governance',
    shortDescription: 'Manage residence specs, multi-currency settings, exports, and complete data deletion.',
    readTime: '4 min read',
    iconName: 'Database',
    keywords: ['profile', 'specs', 'currency', 'timezone', 'export', 'json', 'csv', 'delete', 'demo data', 'reset'],
    contentSections: [
      {
        heading: 'Physical Residence Specs & Regional Localization',
        body: 'Configure your home address, year built, square footage, primary HVAC systems, currency (USD, EUR, GBP, CAD, AUD, JPY, INR, and more), timezone, and locale.',
      },
      {
        heading: 'One-Click Data Portability (Zero Vendor Lock-in)',
        body: 'Download your data at any time from Profile → Data Vault & Export:',
        points: [
          'Complete JSON Vault Backup: Full snapshot of all properties, rooms, assets, tasks, warranties, debts, and documents.',
          'Financial Ledger (CSV): Clean spreadsheet of recurring bills, loans, EMIs, and credit commitments.',
        ],
      },
      {
        heading: 'Demo Data Removal vs. Permanent Account Wipe',
        body: 'HouseMind strictly isolates sample demo data from your real entries:',
        points: [
          'Remove Demo Data: Deletes only pre-seeded sample records while preserving your user-created assets and documents.',
          'Permanent Account Reset: Purges all data associated with your user ID. Requires typing "DELETE MY DATA" to prevent accidental data loss.',
        ],
      },
    ],
    actionLink: {
      label: 'Open Profile & Data Controls',
      modalAction: 'profile',
    },
  },

  // 11. AI Copilot Help
  {
    id: 'ai-copilot-guide',
    category: 'copilot',
    title: 'AI Copilot: Deterministic Systems vs. Generative Intelligence',
    shortDescription: 'How Copilot assists your household strategy while respecting strict privacy boundaries.',
    readTime: '3 min read',
    iconName: 'Sparkles',
    keywords: ['copilot', 'ai', 'gemini', 'grounding', 'privacy', 'deterministic', 'assistant', 'chat'],
    contentSections: [
      {
        heading: 'Deterministic Logic vs. Generative AI',
        body: 'HouseMind draws a clear distinction between calculation rules and generative AI:',
        points: [
          'Deterministic Logic: Health score formulas, debt balances, interest calculations, calendar dates, and search indexing are 100% mathematical and rule-based.',
          'Generative AI: Copilot explanations, unstructured document extraction, and maintenance troubleshooting use Gemini models.',
        ],
      },
      {
        heading: 'Household Grounding & Boundaries',
        body: 'Copilot is strictly grounded in your active household data (properties, appliances, recurring obligations). It does not guess random facts about your home.',
      },
      {
        heading: 'Sample Prompts to Try',
        body: 'Try asking Copilot:',
        points: [
          '"What upcoming bills do I have due in the next 14 days?"',
          '"Which home appliances are older than 8 years?"',
          '"Summarize my monthly debt service across all loans and credit cards."',
          '"What maintenance is recommended before winter starts?"',
        ],
      },
    ],
    actionLink: {
      label: 'Chat with AI Copilot',
      targetTab: 'copilot',
    },
  },

  // 12. Security & Privacy Governance
  {
    id: 'privacy-security-governance',
    category: 'privacy-security',
    title: 'Security Architecture, Tenant Isolation & Privacy Boundaries',
    shortDescription: 'How your household data is isolated, protected, and kept private.',
    readTime: '3 min read',
    iconName: 'Lock',
    keywords: ['privacy', 'security', 'isolation', 'tenant', 'encryption', 'api keys', 'boundary', 'redaction'],
    contentSections: [
      {
        heading: 'Tenant UID Isolation',
        body: 'Every record created in HouseMind is strictly bound to your authenticated user identity. Cross-account queries or discovery are strictly blocked at the API layer.',
      },
      {
        heading: 'Server-Side Credential Protection',
        body: 'All AI models and external services are called through protected server-side endpoints. API keys are never exposed in browser code or client bundles.',
      },
      {
        heading: 'The AI Data Boundary (What is Shared vs. Redacted)',
        body: 'When utilizing AI document extraction or Copilot:',
        points: [
          'Shared for Context: Aggregated summaries, appliance model numbers, room names, task descriptions.',
          'Never Transmitted or Grounded: Sensitive account credentials, credit card CVVs/PANs, or unredacted personal identifiers.',
        ],
      },
      {
        heading: 'Transparent Engineering Standards',
        body: 'We do not make inflated marketing claims such as "100% impenetrable" or "absolute privacy". Instead, we implement industry-standard tenant isolation, role validation, and full data exportability.',
      },
    ],
    actionLink: {
      label: 'Review Profile & Privacy Hub',
      modalAction: 'profile',
    },
  },
];

export function searchHelpArticles(query: string, categoryFilter?: HelpCategoryId): HelpArticle[] {
  const normalized = query.trim().toLowerCase();

  return HELP_ARTICLES.filter((article) => {
    if (categoryFilter && article.category !== categoryFilter) {
      return false;
    }

    if (!normalized) return true;

    // Match title
    if (article.title.toLowerCase().includes(normalized)) return true;
    // Match short description
    if (article.shortDescription.toLowerCase().includes(normalized)) return true;
    // Match keywords
    if (article.keywords.some((k) => k.toLowerCase().includes(normalized))) return true;
    // Match section headings and bodies
    return article.contentSections.some(
      (sec) =>
        sec.heading.toLowerCase().includes(normalized) ||
        sec.body.toLowerCase().includes(normalized) ||
        (sec.points && sec.points.some((p) => p.toLowerCase().includes(normalized)))
    );
  });
}
