import fs from 'fs';
import path from 'path';
import { TestRunner } from '../test-helper';
import { DatabaseService } from '../../server/services/dbService';
import { NotificationService } from '../../server/services/notificationService';
import { CalendarService } from '../../server/services/calendarService';

export async function runBrowserIdentityPaidBillTests(runner: TestRunner): Promise<void> {
  runner.setSuite('Unit: Browser Identity, Favicon & Paid Bill Lifecycle');

  await runner.test('root_html_contains_accurate_housemind_title_and_no_generic_starters', () => {
    const indexPath = path.resolve(process.cwd(), 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');

    // Title verification
    if (!html.includes('<title>HouseMind — AI-Powered Household Intelligence</title>')) {
      throw new Error('Default title must be "HouseMind — AI-Powered Household Intelligence"');
    }

    // Ensure no generic starter title
    const genericForbidden = ['Vite', 'React App', 'AI Studio', 'starter-app', 'Gemini 2', 'Gemini 1.5'];
    for (const term of genericForbidden) {
      if (html.includes(`<title>${term}`) || html.includes(`<title>${term.toLowerCase()}`)) {
        throw new Error(`Forbidden generic title term found: "${term}"`);
      }
    }
  });

  await runner.test('root_html_contains_required_basic_metadata_and_theme_color', () => {
    const indexPath = path.resolve(process.cwd(), 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');

    const expectedDesc =
      'HouseMind is an AI-powered household and financial intelligence platform that helps organize properties, assets, maintenance, finances, documents, and household actions in one place.';

    if (!html.includes(`<meta name="description" content="${expectedDesc}"`)) {
      throw new Error('Meta description does not match expected platform description.');
    }

    if (!html.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0"')) {
      throw new Error('Missing standard viewport meta tag.');
    }

    if (!html.includes('<meta name="theme-color" content="#4f46e5"')) {
      throw new Error('Missing theme-color meta tag.');
    }
  });

  await runner.test('root_html_excludes_social_and_open_graph_metadata', () => {
    const indexPath = path.resolve(process.cwd(), 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');

    if (html.includes('property="og:') || html.includes('name="twitter:')) {
      throw new Error('Open Graph and Twitter metadata should not be present.');
    }
  });

  await runner.test('favicon_svg_exists_and_is_valid_svg_asset', () => {
    const faviconPath = path.resolve(process.cwd(), 'public', 'favicon.svg');
    if (!fs.existsSync(faviconPath)) {
      throw new Error('public/favicon.svg does not exist.');
    }

    const svgContent = fs.readFileSync(faviconPath, 'utf-8');
    if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
      throw new Error('public/favicon.svg is not valid SVG markup.');
    }
    if (!svgContent.includes('#4f46e5')) {
      throw new Error('Favicon SVG should use HouseMind brand indigo (#4f46e5).');
    }

    const indexPath = path.resolve(process.cwd(), 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    if (!html.includes('<link rel="icon" type="image/svg+xml" href="/favicon.svg"')) {
      throw new Error('index.html must link to /favicon.svg');
    }
  });

  await runner.test('route_title_mapping_supports_all_existing_tabs', () => {
    const appPath = path.resolve(process.cwd(), 'src', 'App.tsx');
    const appCode = fs.readFileSync(appPath, 'utf-8');

    const expectedMappings: Record<string, string> = {
      dashboard: 'HouseMind — Command Center',
      calendar: 'HouseMind — Calendar',
      properties: 'HouseMind — Properties',
      assets: 'HouseMind — Assets',
      maintenance: 'HouseMind — Maintenance',
      utilities: 'HouseMind — Utilities & Debt',
      finances: 'HouseMind — Finances',
      documents: 'HouseMind — Documents',
      simulator: 'HouseMind — Scenario Simulator',
      copilot: 'HouseMind — Household Copilot',
      help: 'HouseMind — Help Center',
    };

    for (const [tab, title] of Object.entries(expectedMappings)) {
      if (!appCode.includes(`'${title}'`) && !appCode.includes(`"${title}"`)) {
        throw new Error(`Tab "${tab}" title mapping for "${title}" is missing in App.tsx`);
      }
    }
  });

  await runner.test('paid_utility_bill_persists_in_database_and_refreshes_state', async () => {
    const testUserId = `test_user_paid_bill_${Date.now()}`;
    const property = await DatabaseService.createProperty(testUserId, {
      name: 'Primary Residence',
      propertyType: 'single_family',
      address: '100 Main St',
      city: 'Austin',
      state: 'TX',
      country: 'US',
    });

    const utility = await DatabaseService.createUtility(testUserId, {
      propertyId: property.id,
      name: 'City Electric Utility',
      provider: 'City Power & Light',
      utilityType: 'electricity',
      accountNumber: 'ELEC-987654',
      latestBillAmount: 145.5,
      paymentDueDay: 15,
      isPaidThisMonth: false,
    });

    if (utility.isPaidThisMonth !== false) {
      throw new Error('Initial utility should be unpaid.');
    }

    // Mark utility as paid
    const updated = await DatabaseService.updateUtility(testUserId, utility.id, {
      isPaidThisMonth: true,
    });

    if (!updated || updated.isPaidThisMonth !== true) {
      throw new Error('Updated utility must have isPaidThisMonth set to true.');
    }

    // Verify persistence across fetch
    const list = await DatabaseService.listUtilities(testUserId);
    const persisted = list.find((u) => u.id === utility.id);
    if (!persisted || persisted.isPaidThisMonth !== true) {
      throw new Error('Paid utility state must persist in database.');
    }
    if (persisted.name !== 'City Electric Utility' || persisted.accountNumber !== 'ELEC-987654') {
      throw new Error('All bill details (name, account number) must remain intact and readable.');
    }
  });

  await runner.test('paid_utility_suppresses_notifications_and_marks_calendar_event_paid', async () => {
    const testUserId = `test_user_cross_domain_${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

    const property = await DatabaseService.createProperty(testUserId, {
      name: 'Cross Domain Residence',
      propertyType: 'single_family',
      address: '200 Oak Ave',
      city: 'Seattle',
      state: 'WA',
      country: 'US',
    });

    // 1. Unpaid utility creates due notification and unpaid calendar event
    const unpaidUtil = await DatabaseService.createUtility(testUserId, {
      propertyId: property.id,
      name: 'Water & Waste Dept',
      provider: 'Metro Water',
      utilityType: 'water',
      latestBillAmount: 85,
      nextDueDate: today,
      isPaidThisMonth: false,
    });

    const notifsBefore = await NotificationService.getNotifications(testUserId);
    const utilNotifBefore = notifsBefore.notifications.find((n) => n.sourceId === unpaidUtil.id);
    if (!utilNotifBefore) {
      throw new Error('Unpaid utility due today must generate a notification.');
    }

    const calBefore = await CalendarService.getCalendarEvents(testUserId);
    const calEventBefore = calBefore.events.find((e) => e.sourceId === unpaidUtil.id);
    if (!calEventBefore || calEventBefore.status === 'paid') {
      throw new Error('Unpaid utility calendar event must not be marked paid.');
    }

    // 2. Mark utility as paid
    await DatabaseService.updateUtility(testUserId, unpaidUtil.id, {
      isPaidThisMonth: true,
    });

    // Verify notification suppression
    const notifsAfter = await NotificationService.getNotifications(testUserId);
    const utilNotifAfter = notifsAfter.notifications.find((n) => n.sourceId === unpaidUtil.id);
    if (utilNotifAfter) {
      throw new Error('Paid utility must suppress active bill due notifications.');
    }

    // Verify calendar event status marked as paid
    const calAfter = await CalendarService.getCalendarEvents(testUserId);
    const calEventAfter = calAfter.events.find((e) => e.sourceId === unpaidUtil.id);
    if (!calEventAfter || calEventAfter.status !== 'paid' || !calEventAfter.isPaid) {
      throw new Error('Paid utility calendar event must have status "paid" and isPaid true.');
    }
  });

  await runner.test('footer_branding_and_auth_state_separation_verified', () => {
    const footerPath = path.resolve(process.cwd(), 'src', 'components', 'Footer.tsx');
    const footerCode = fs.readFileSync(footerPath, 'utf-8');

    // Verify branding
    if (!footerCode.includes('HouseMind — Privacy-First Household Operating System')) {
      throw new Error('Footer branding must be "HouseMind — Privacy-First Household Operating System"');
    }
    if (footerCode.includes('HouseMind — Enterprise Zero-Trust Household Operating System')) {
      throw new Error('Footer must not contain legacy "Enterprise Zero-Trust" branding');
    }

    // Verify logged-out public product items
    const loggedOutProductItems = [
      'Command Center',
      'Household Intelligence',
      'Asset & Maintenance Management',
      'Documents & Upload',
      'Financial Intelligence',
    ];
    for (const item of loggedOutProductItems) {
      if (!footerCode.includes(`<li className="text-slate-400">${item}</li>`)) {
        throw new Error(`Logged-out product item "${item}" must be present as descriptive text.`);
      }
    }

    // Verify logged-out resources shows Story of HouseMind linking to Hashnode and hides Health Diagnostics Guide / Guided Tours
    const hashnodeUrl = 'https://sagardev.hashnode.dev/from-a-lost-warranty-to-housemind-building-an-ai-powered-household-operating-system';
    if (!footerCode.includes('Story of HouseMind') || !footerCode.includes(hashnodeUrl)) {
      throw new Error('Public footer must contain "Story of HouseMind" linking directly to the Hashnode article.');
    }

    // Verify logged-in resources retains Help Center & FAQs, Guided Tours, and Health Diagnostics Guide
    if (!footerCode.includes('Help Center & FAQs') || !footerCode.includes("onOpenTour('health')") || !footerCode.includes("Health Diagnostics Guide")) {
      throw new Error('Help Center & FAQs, Guided Tours, and Health Diagnostics Guide should remain available when authenticated.');
    }

    // Verify Account section has Sign In with Google for logged-out and Sign Out for logged-in
    if (!footerCode.includes('Sign In with Google') || !footerCode.includes('Sign Out')) {
      throw new Error('Footer must conditionally render Sign In with Google vs Sign Out based on auth state.');
    }
  });
}
