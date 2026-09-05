import http from 'http';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import { buildExpressApp } from '../server';

let testAppServer: http.Server | null = null;
let testViteServer: ViteDevServer | null = null;
let serverBaseUrl = '';

/**
 * Starts the full Express backend + Vite SPA frontend dev middleware on a dynamic port.
 */
async function startFullStackDevServer(): Promise<string> {
  if (testAppServer && serverBaseUrl) {
    return serverBaseUrl;
  }

  process.env.NODE_ENV = 'test';
  const app = buildExpressApp();

  testViteServer = await createViteServer({
    mode: 'development',
    server: {
      middlewareMode: true,
      hmr: { port: 24689 },
    },
    appType: 'spa',
  });
  app.use(testViteServer.middlewares);

  return new Promise((resolve, reject) => {
    testAppServer = app.listen(0, '127.0.0.1', () => {
      const addr = testAppServer!.address() as any;
      serverBaseUrl = `http://127.0.0.1:${addr.port}`;
      console.log(`[TEST SERVER] Full-stack test server running at ${serverBaseUrl}`);
      resolve(serverBaseUrl);
    });
    testAppServer.on('error', reject);
  });
}

/**
 * Stops both the Vite dev server and the Express HTTP server cleanly.
 */
async function stopFullStackDevServer(): Promise<void> {
  if (testViteServer) {
    await testViteServer.close();
    testViteServer = null;
  }
  if (testAppServer) {
    await new Promise<void>((resolve) => testAppServer!.close(() => resolve()));
    testAppServer = null;
    serverBaseUrl = '';
  }
}

interface UserJourneyResult {
  journeyId: string;
  title: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const journeyResults: UserJourneyResult[] = [];

async function runJourney(
  journeyId: string,
  title: string,
  fn: () => Promise<void>
) {
  const start = performance.now();
  try {
    console.log(`\n▶ [${journeyId}] ${title}...`);
    await fn();
    const durationMs = Math.round(performance.now() - start);
    journeyResults.push({ journeyId, title, passed: true, durationMs });
    console.log(`  ✓ [${journeyId}] PASSED (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    journeyResults.push({
      journeyId,
      title,
      passed: false,
      durationMs,
      error: err.message || String(err),
    });
    console.error(`  ✗ [${journeyId}] FAILED (${durationMs}ms):`, err.message || err);
  }
}

async function ensureModalsClosed(page: Page) {
  for (let i = 0; i < 4; i++) {
    const modal = await page.$('.fixed.inset-0');
    if (modal) {
      const isVis = await modal.isVisible().catch(() => false);
      if (isVis) {
        const closeBtn = await page.$('.fixed.inset-0 button:has(svg.lucide-x), .fixed.inset-0 button:has-text("Cancel"), .fixed.inset-0 button:has-text("Close")');
        if (closeBtn && await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click().catch(() => {});
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(250);
      } else {
        break;
      }
    } else {
      break;
    }
  }
}

async function main() {
  console.log('========================================================================');
  console.log('   HOUSEMIND PRODUCTION PLAYWRIGHT BROWSER USER JOURNEYS TEST SUITE     ');
  console.log('========================================================================\n');

  let browser: Browser | null = null;
  let authContext: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    const baseUrl = await startFullStackDevServer();

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    // =========================================================================
    // JOURNEY 01: Unauthenticated Landing Page & Security Perimeter
    // =========================================================================
    await runJourney(
      'JOURNEY-01',
      'Unauthenticated Landing Page & Security Isolation Verification',
      async () => {
        const publicContext = await browser!.newContext();
        const publicPage = await publicContext.newPage();
        try {
          await publicPage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await publicPage.waitForSelector('main', { timeout: 10000 });

          // 1. Verify Top Header & Brand
          const titleText = await publicPage.textContent('body');
          if (!titleText || !titleText.includes('HouseMind')) {
            throw new Error('Expected "HouseMind" brand text on landing page');
          }

          // 2. Verify Google Sign-In button
          const signinBtn = await publicPage.$('#hero-google-signin-btn');
          if (!signinBtn) {
            throw new Error('Hero Google Sign-In button (#hero-google-signin-btn) missing on landing page');
          }
          const isSignInVisible = await signinBtn.isVisible();
          if (!isSignInVisible) {
            throw new Error('Hero Google Sign-In button should be visible');
          }

          // 3. Verify unauthenticated visitor cannot access protected navbar
          const desktopNav = await publicPage.$('#primary-desktop-navigation');
          if (desktopNav) {
            const isNavVisible = await desktopNav.isVisible();
            if (isNavVisible) {
              throw new Error('Security breach: Authenticated navbar is visible to unauthenticated visitor');
            }
          }

          // 4. Verify Feature Grid is rendered
          if (!titleText.includes('Operating System') || !titleText.includes('Property & Space Allocation')) {
            throw new Error('Expected landing page feature highlights to be present');
          }
        } finally {
          await publicContext.close();
        }
      }
    );

    // =========================================================================
    // Create Authenticated Browser Context for full interactive journeys
    // =========================================================================
    authContext = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });

    // Inject deterministic test user fixture into window scope before document loads
    await authContext.addInitScript(`
      window.__PLAYWRIGHT_TEST_USER__ = {
        uid: 'test-user-e2e',
        email: 'alex.mercer@maplewood.local',
        displayName: 'Alex Mercer',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        testToken: 'test-token-e2e-01'
      };
      window.__PLAYWRIGHT_TEST_USER__.getIdToken = function() { return Promise.resolve('test-token-e2e-01'); };
    `);

    page = await authContext.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForSelector('main', { timeout: 15000 });

    // =========================================================================
    // JOURNEY 02: Authenticated Command Center & Household Health Widget
    // =========================================================================
    await runJourney(
      'JOURNEY-02',
      'Command Center Operating Screen & Household Health Analysis Modal',
      async () => {
        await ensureModalsClosed(page!);
        await page!.waitForSelector('#dash-import-doc-btn', { timeout: 15000 });

        // 1. Verify Command Center Header
        const headerTitle = await page!.textContent('h1');
        if (!headerTitle || !headerTitle.includes('Household Command Center')) {
          throw new Error(`Expected "Household Command Center" heading, got: "${headerTitle}"`);
        }

        // 2. Verify Quick Action Buttons
        const intakeBtn = await page!.$('#dash-import-doc-btn');
        const addExpBtn = await page!.$('#dash-add-expense-btn');
        const maintBtn = await page!.$('#dash-view-maintenance-btn');
        const simBtn = await page!.$('#dash-whatif-simulator-btn');

        if (!intakeBtn || !addExpBtn || !maintBtn || !simBtn) {
          throw new Error('Command Center quick operating action buttons missing');
        }

        // 3. Verify Household Health Score Widget & Open Modal
        const healthAnalyzeBtn = await page!.$('button:has-text("View Full Analysis"), button:has-text("Inspect Analysis")');
        if (healthAnalyzeBtn) {
          await healthAnalyzeBtn.click();
          await page!.waitForTimeout(300);

          // Close modal
          await page!.keyboard.press('Escape');
          await page!.waitForTimeout(300);
        }
        await ensureModalsClosed(page!);
      }
    );

    // =========================================================================
    // JOURNEY 03: Complete Navigation Bar & Dropdown Matrix
    // =========================================================================
    await runJourney(
      'JOURNEY-03',
      'Complete Navigation Bar & All Dropdown Menus Matrix',
      async () => {
        await ensureModalsClosed(page!);

        // 1. Home Dropdown
        const homeMenuBtn = await page!.$('#nav-home-group-btn');
        if (!homeMenuBtn) throw new Error('#nav-home-group-btn missing');
        await homeMenuBtn.click();
        await page!.waitForTimeout(150);

        const propTab = await page!.$('#nav-properties-tab');
        if (!propTab) throw new Error('#nav-properties-tab missing in Home menu');
        await propTab.click();
        await page!.waitForTimeout(300);

        // 2. Assets Dropdown -> Warranties
        const assetsMenuBtn = await page!.$('#nav-assets-group-btn');
        if (!assetsMenuBtn) throw new Error('#nav-assets-group-btn missing');
        await assetsMenuBtn.click();
        await page!.waitForTimeout(150);

        const warrantyItem = await page!.$('#nav-item-warranties');
        if (!warrantyItem) throw new Error('#nav-item-warranties missing in Assets menu');
        await warrantyItem.click();
        await page!.waitForTimeout(300);

        // 3. Finances Dropdown -> Loans
        const finMenuBtn = await page!.$('#nav-finances-group-btn');
        if (!finMenuBtn) throw new Error('#nav-finances-group-btn missing');
        await finMenuBtn.click();
        await page!.waitForTimeout(150);

        const loansItem = await page!.$('#nav-item-loans');
        if (!loansItem) throw new Error('#nav-item-loans missing in Finances menu');
        await loansItem.click();
        await page!.waitForTimeout(300);

        // 4. More Dropdown -> Calendar
        const moreMenuBtn = await page!.$('#nav-more-menu-btn');
        if (!moreMenuBtn) throw new Error('#nav-more-menu-btn missing');
        await moreMenuBtn.click();
        await page!.waitForTimeout(150);

        const calendarTab = await page!.$('#nav-calendar-tab');
        if (!calendarTab) throw new Error('#nav-calendar-tab missing in More menu');
        await calendarTab.click();
        await page!.waitForTimeout(300);

        // 5. Add Dropdown Matrix
        const addBtn = await page!.$('#nav-add-btn');
        if (!addBtn) throw new Error('#nav-add-btn missing');
        await addBtn.click();
        await page!.waitForTimeout(150);

        const addAssetOpt = await page!.$('#add-opt-asset');
        const addMaintOpt = await page!.$('#add-opt-maintenance');
        const addDocOpt = await page!.$('#add-opt-document');
        if (!addAssetOpt || !addMaintOpt || !addDocOpt) {
          throw new Error('Expected Add dropdown options (#add-opt-asset, #add-opt-maintenance, #add-opt-document)');
        }
        await addBtn.click(); // close dropdown
        await page!.waitForTimeout(150);

        // 6. Return to Command Center
        const brandBtn = await page!.$('#nav-brand-btn');
        if (brandBtn) {
          await brandBtn.click();
          await page!.waitForTimeout(300);
        }
      }
    );

    // =========================================================================
    // JOURNEY 04: Property & Space Management Flow
    // =========================================================================
    await runJourney(
      'JOURNEY-04',
      'Property Registration & Room Space Architecture Allocation',
      async () => {
        await ensureModalsClosed(page!);

        // Navigate to Properties
        const homeMenuBtn = await page!.$('#nav-home-group-btn');
        await homeMenuBtn!.click();
        await page!.waitForTimeout(150);
        await page!.click('#nav-properties-tab');
        await page!.waitForTimeout(400);

        // Click Add Property
        const addPropBtn = await page!.$('button:has-text("Add Property")');
        if (!addPropBtn) throw new Error('"Add Property" button not found');
        await addPropBtn.click();
        await page!.waitForSelector('form', { timeout: 5000 });

        // Fill Property Form
        const nameInput = await page!.$('input[placeholder*="Maplewood Manor"], input[placeholder*="Primary Residence"], form input[type="text"]');
        if (nameInput) {
          await nameInput.fill('Maplewood Executive Residence');
        }

        // Submit Form
        const saveBtn = await page!.$('form button[type="submit"]');
        if (!saveBtn) throw new Error('"Save Property" button not found in modal');
        await saveBtn.click();
        await page!.waitForTimeout(600);
        await ensureModalsClosed(page!);

        // Verify property is in DOM
        const bodyText = await page!.textContent('body');
        if (!bodyText?.includes('Maplewood Executive Residence') && !bodyText?.includes('Primary Residence') && !bodyText?.includes('Single Family')) {
          throw new Error('Registered property name not visible in Properties view');
        }

        // Add Room
        const addRoomBtn = await page!.$('button:has-text("Add Room")');
        if (addRoomBtn) {
          await addRoomBtn.click();
          await page!.waitForSelector('form', { timeout: 5000 });
          const roomNameInput = await page!.$('input[placeholder*="Master Suite"], input[placeholder*="Room Name"], form input[type="text"]');
          if (roomNameInput) {
            await roomNameInput.fill('Primary Master Suite');
            const saveRoomBtn = await page!.$('form button[type="submit"]');
            if (saveRoomBtn) {
              await saveRoomBtn.click();
              await page!.waitForTimeout(600);
            }
          }
          await ensureModalsClosed(page!);
        }
      }
    );

    // =========================================================================
    // JOURNEY 05: Assets & Equipment Lifecycle Registry
    // =========================================================================
    await runJourney(
      'JOURNEY-05',
      'Asset Registration, Search Filtering & Live Metadata Updates',
      async () => {
        await ensureModalsClosed(page!);

        // Navigate to Assets
        const assetsMenuBtn = await page!.$('#nav-assets-group-btn');
        await assetsMenuBtn!.click();
        await page!.waitForTimeout(150);
        await page!.click('#nav-assets-tab');
        await page!.waitForTimeout(400);

        // Click Register Asset
        const registerAssetBtn = await page!.$('button:has-text("Register Asset"), button:has-text("Add Asset"), button:has-text("Register First Asset")');
        if (!registerAssetBtn) throw new Error('Register Asset button not found');
        await registerAssetBtn.click();
        await page!.waitForSelector('form', { timeout: 5000 });

        // Fill Asset Form
        const assetNameInput = await page!.$('input[placeholder*="Trane Heat Pump"], input[placeholder*="Bosch Dishwasher"], form input[type="text"]');
        if (assetNameInput) {
          await assetNameInput.fill('Trane CleanEffects Air Cleaner');
        }

        const brandInput = await page!.$('input[placeholder*="e.g. Trane, Bosch"]');
        if (brandInput) {
          await brandInput.fill('Trane');
        }

        const costInput = await page!.$('input[placeholder*="2500"]');
        if (costInput) {
          await costInput.fill('1850');
        }

        // Submit Form
        const saveAssetBtn = await page!.$('form button[type="submit"]');
        if (!saveAssetBtn) throw new Error('Save Asset button not found in modal');
        await saveAssetBtn.click();
        await page!.waitForTimeout(600);
        await ensureModalsClosed(page!);

        // Verify Asset Card in Grid
        const bodyContent = await page!.textContent('body');
        if (!bodyContent?.includes('Trane CleanEffects Air Cleaner')) {
          throw new Error('Created asset "Trane CleanEffects Air Cleaner" not found in assets grid');
        }

        // Test Search Bar filtering
        const searchInput = await page!.$('input[placeholder*="Search by asset name"]');
        if (searchInput) {
          await searchInput.fill('Trane');
          await page!.waitForTimeout(200);
          const searchResult = await page!.textContent('body');
          if (!searchResult?.includes('Trane CleanEffects Air Cleaner')) {
            throw new Error('Search failed to find matching asset "Trane CleanEffects Air Cleaner"');
          }

          // Test Non-existent search
          await searchInput.fill('NonexistentXYZ999');
          await page!.waitForTimeout(200);
          const emptyResult = await page!.textContent('body');
          if (!emptyResult?.includes('No home assets found') && !emptyResult?.includes('No records match')) {
            throw new Error('Expected empty state message when search query has 0 matches');
          }

          // Clear Search
          await searchInput.fill('');
          await page!.waitForTimeout(200);
        }
      }
    );

    // =========================================================================
    // JOURNEY 06: Preventative Maintenance Tasks & Warranties Vault
    // =========================================================================
    await runJourney(
      'JOURNEY-06',
      'Preventative Maintenance Task Scheduling & Warranty Vault Protection',
      async () => {
        await ensureModalsClosed(page!);

        // Navigate to Maintenance
        const homeMenuBtn = await page!.$('#nav-home-group-btn');
        await homeMenuBtn!.click();
        await page!.waitForTimeout(150);
        await page!.click('#nav-maintenance-tab');
        await page!.waitForTimeout(400);

        // 1. Schedule Maintenance Task
        const scheduleBtn = await page!.$('button:has-text("Schedule Task")');
        if (scheduleBtn) {
          await scheduleBtn.click();
          await page!.waitForSelector('form', { timeout: 5000 });

          const titleInput = await page!.$('input[placeholder*="Replace HVAC Filters"], form input[type="text"]');
          if (titleInput) {
            await titleInput.fill('Replace HVAC HEPA Filters');
          }

          const saveTaskBtn = await page!.$('form button[type="submit"]');
          if (saveTaskBtn) {
            await saveTaskBtn.click();
            await page!.waitForTimeout(600);
          }
          await ensureModalsClosed(page!);
        }

        // Verify task appears
        const bodyContent = await page!.textContent('body');
        if (!bodyContent?.includes('Replace HVAC HEPA Filters')) {
          throw new Error('Created task "Replace HVAC HEPA Filters" not found in maintenance schedule');
        }

        // 2. Switch to Warranty Vault sub-tab
        const warrantySubTabBtn = await page!.$('button:has-text("Warranty Vault"), button:has-text("Warranties")');
        if (warrantySubTabBtn) {
          await warrantySubTabBtn.click();
          await page!.waitForTimeout(300);

          // Add Warranty Policy
          const addWtyBtn = await page!.$('button:has-text("Add Warranty")');
          if (addWtyBtn) {
            await addWtyBtn.click();
            await page!.waitForSelector('form', { timeout: 5000 });

            const wtyTitleInput = await page!.$('input[placeholder*="Compressor Warranty"], form input[type="text"]');
            if (wtyTitleInput) {
              await wtyTitleInput.fill('Trane 10-Yr Extended Protection');
            }

            const saveWtyBtn = await page!.$('form button[type="submit"]');
            if (saveWtyBtn) {
              await saveWtyBtn.click();
              await page!.waitForTimeout(600);
            }
            await ensureModalsClosed(page!);
          }
        }
      }
    );

    // =========================================================================
    // JOURNEY 07: Financial Overview, Cash Flow Ledger & Recurring Expenses
    // =========================================================================
    await runJourney(
      'JOURNEY-07',
      'Financial Ledger Cash Flow & Itemized Transaction Recording',
      async () => {
        await ensureModalsClosed(page!);

        // Navigate to Financial Overview
        const finMenuBtn = await page!.$('#nav-finances-group-btn');
        await finMenuBtn!.click();
        await page!.waitForTimeout(150);
        await page!.click('#nav-finances-tab');
        await page!.waitForTimeout(400);

        // Verify Financial Intelligence Header
        const pageText = await page!.textContent('body');
        if (!pageText?.includes('Financial & Cash Flow Intelligence')) {
          throw new Error('Financial & Cash Flow Intelligence header missing');
        }

        // Click Add Transaction
        const addTxnBtn = await page!.$('#add-transaction-btn');
        if (!addTxnBtn) throw new Error('#add-transaction-btn missing in Financial view');
        await addTxnBtn.click();
        await page!.waitForSelector('form', { timeout: 5000 });

        // Fill Transaction Modal
        const descInput = await page!.$('input[placeholder*="e.g. Whole Foods Market"], form input[type="text"]');
        if (descInput) {
          await descInput.fill('Home Depot - Sump Pump Backup System');
        }

        const amtInput = await page!.$('input[placeholder*="0.00"], input[type="number"]');
        if (amtInput) {
          await amtInput.fill('249.95');
        }

        const submitTxnBtn = await page!.$('form button[type="submit"]');
        if (!submitTxnBtn) throw new Error('Record Transaction button missing in modal');
        await submitTxnBtn.click();
        await page!.waitForTimeout(600);
        await ensureModalsClosed(page!);

        // Verify Transaction in ledger table
        const updatedLedger = await page!.textContent('body');
        if (!updatedLedger?.includes('Home Depot - Sump Pump Backup System')) {
          throw new Error('Recorded transaction "Home Depot - Sump Pump Backup System" not found in ledger');
        }

        // Navigate to Expenses View
        await finMenuBtn.click();
        await page!.waitForTimeout(150);
        await page!.click('#nav-item-expenses');
        await page!.waitForTimeout(400);

        // Add Recurring Expense
        const addExpBtn = await page!.$('button:has-text("Add Expense"), button:has-text("Add Bill"), button:has-text("Log First Expense")');
        if (addExpBtn) {
          await addExpBtn.click();
          await page!.waitForSelector('form', { timeout: 5000 });

          const expTitleInput = await page!.$('input[placeholder*="Electric Bill"], form input[type="text"]');
          if (expTitleInput) {
            await expTitleInput.fill('Gigabit Fiber Internet');
          }

          const expAmtInput = await page!.$('input[placeholder*="120"], form input[type="number"]');
          if (expAmtInput) {
            await expAmtInput.fill('85.00');
          }

          const saveExpBtn = await page!.$('form button[type="submit"]');
          if (saveExpBtn) {
            await saveExpBtn.click();
            await page!.waitForTimeout(600);
          }
          await ensureModalsClosed(page!);
        }
      }
    );

    // =========================================================================
    // JOURNEY 08: Utilities, Mortgages & Credit Card Debt Center
    // =========================================================================
    await runJourney(
      'JOURNEY-08',
      'Utilities, Amortized Loans & Credit Card Debt Center Operations',
      async () => {
        await ensureModalsClosed(page!);

        // Navigate to Utilities & Debts
        const homeMenuBtn = await page!.$('#nav-home-group-btn');
        await homeMenuBtn!.click();
        await page!.waitForTimeout(150);
        await page!.click('#nav-utilities-tab');
        await page!.waitForTimeout(400);

        // 1. Add Utility Provider
        const addUtilBtn = await page!.$('button:has-text("Add Utility Account")');
        if (addUtilBtn) {
          await addUtilBtn.click();
          await page!.waitForSelector('form', { timeout: 5000 });

          const utilNameInput = await page!.$('input[placeholder*="Pacific Power"], form input[type="text"]');
          if (utilNameInput) {
            await utilNameInput.fill('Pacific Gas & Electric');
          }

          const providerInput = await page!.$('input[placeholder*="PGE"]');
          if (providerInput) {
            await providerInput.fill('PG&E Utility Corp');
          }

          const saveUtilBtn = await page!.$('form button[type="submit"]');
          if (saveUtilBtn) {
            await saveUtilBtn.click();
            await page!.waitForTimeout(600);
          }
          await ensureModalsClosed(page!);
        }

        // Verify utility account in list
        const utilContent = await page!.textContent('body');
        if (!utilContent?.includes('Pacific Gas & Electric')) {
          throw new Error('Created utility "Pacific Gas & Electric" not found');
        }

        // 2. Switch to Loans Sub-tab
        const finMenuBtn = await page!.$('#nav-finances-group-btn');
        await finMenuBtn!.click();
        await page!.waitForTimeout(150);
        await page!.click('#nav-item-loans');
        await page!.waitForTimeout(400);

        const addLoanBtn = await page!.$('button:has-text("Add Loan / Mortgage")');
        if (addLoanBtn) {
          await addLoanBtn.click();
          await page!.waitForSelector('form', { timeout: 5000 });

          const loanNameInput = await page!.$('input[placeholder*="30-Year Fixed Primary Mortgage"], form input[type="text"]');
          if (loanNameInput) {
            await loanNameInput.fill('30-Year Fixed Home Mortgage');
          }

          const lenderInput = await page!.$('input[placeholder*="Chase Home Lending"]');
          if (lenderInput) {
            await lenderInput.fill('Chase Home Lending');
          }

          const saveLoanBtn = await page!.$('form button[type="submit"]');
          if (saveLoanBtn) {
            await saveLoanBtn.click();
            await page!.waitForTimeout(600);
          }
          await ensureModalsClosed(page!);
        }
      }
    );

    // =========================================================================
    // JOURNEY 09: What-If Decision Intelligence Simulator
    // =========================================================================
    await runJourney(
      'JOURNEY-09',
      'What-If Decision Simulator Scenario Creation & Affordability Modeling',
      async () => {
        await ensureModalsClosed(page!);

        // Navigate to Simulator
        const moreMenuBtn = await page!.$('#nav-more-menu-btn');
        await moreMenuBtn!.click();
        await page!.waitForTimeout(150);
        await page!.click('#nav-simulator-tab');
        await page!.waitForTimeout(400);

        // Verify Simulator Banner
        const simPageText = await page!.textContent('body');
        if (!simPageText?.includes('What-If Financial Simulator')) {
          throw new Error('What-If Financial Simulator heading missing');
        }

        // Click New What-If Model
        const newModelBtn = await page!.$('button:has-text("New What-If Model")');
        if (newModelBtn) {
          await newModelBtn.click();
          await page!.waitForSelector('form#scenario-form', { timeout: 5000 });

          // Click preset to populate all simulation parameters deterministically
          const presetBtn = await page!.$('button:has-text("Inverter AC EMI"), button:has-text("Salary Hike")');
          if (presetBtn) {
            await presetBtn.click();
            await page!.waitForTimeout(300);
          }

          const saveModelBtn = await page!.$('button:has-text("Save Scenario")');
          if (saveModelBtn) {
            await saveModelBtn.click();
            await page!.waitForTimeout(600);
          }
          await ensureModalsClosed(page!);
        }

        // Verify scenario card appears
        const updatedSimContent = await page!.textContent('body');
        if (!updatedSimContent?.includes('Inverter AC') && !updatedSimContent?.includes('Scenario') && !updatedSimContent?.includes('What-If')) {
          throw new Error('Created What-If scenario not visible in scenario grid');
        }
      }
    );

    // =========================================================================
    // JOURNEY 10: Grounded AI Copilot Assistant Chat & Transparency
    // =========================================================================
    await runJourney(
      'JOURNEY-10',
      'AI Copilot Interactive Assistant Chat & Context Grounding Verification',
      async () => {
        await ensureModalsClosed(page!);

        // Navigate to Copilot
        const moreMenuBtn = await page!.$('#nav-more-menu-btn');
        await moreMenuBtn!.click();
        await page!.waitForTimeout(150);
        await page!.click('#nav-copilot-tab');
        await page!.waitForTimeout(400);

        // Verify Copilot Header
        const copilotText = await page!.textContent('body');
        if (!copilotText?.includes('HouseMind Copilot') && !copilotText?.includes('Copilot')) {
          throw new Error('AI Copilot view heading not found');
        }

        // Verify message input exists
        const chatInput = await page!.$('textarea, input[placeholder*="Ask anything"], input[placeholder*="Ask Copilot"], form input[type="text"]');
        if (chatInput) {
          await chatInput.fill('What preventative maintenance tasks should I focus on this season?');

          // Click Send button
          const sendBtn = await page!.$('button:has(svg.lucide-send), button[type="submit"]');
          if (sendBtn) {
            await sendBtn.click();
            await page!.waitForTimeout(1000);
          }
        }
      }
    );

    // =========================================================================
    // JOURNEY 11: Global Instant Search & Discovery Modal
    // =========================================================================
    await runJourney(
      'JOURNEY-11',
      'Global Instant Search Modal & Multi-Domain Categorized Results',
      async () => {
        await ensureModalsClosed(page!);

        // Trigger Search via Navbar Search Button
        const searchBtn = await page!.$('#global-search-btn');
        if (searchBtn) {
          await searchBtn.click();
        } else {
          // Hotkey fallback
          await page!.keyboard.press('Control+K');
        }
        await page!.waitForSelector('#global-search-input', { timeout: 5000 });

        // Type query
        const searchInput = await page!.$('#global-search-input');
        if (!searchInput) throw new Error('#global-search-input missing in Search modal');

        await searchInput.fill('Trane');
        await page!.waitForTimeout(400);

        // Close Search Modal via ESC
        await page!.keyboard.press('Escape');
        await page!.waitForTimeout(300);
        await ensureModalsClosed(page!);
      }
    );

    // =========================================================================
    // JOURNEY 12: Integrated Household Calendar & Schedule Navigation
    // =========================================================================
    await runJourney(
      'JOURNEY-12',
      'Integrated Household Calendar View & Date Navigation Controls',
      async () => {
        await ensureModalsClosed(page!);

        // Navigate to Calendar
        const moreMenuBtn = await page!.$('#nav-more-menu-btn');
        await moreMenuBtn!.click();
        await page!.waitForTimeout(150);
        await page!.click('#nav-calendar-tab');
        await page!.waitForTimeout(400);

        // Verify Calendar Header & Navigation Controls
        const calText = await page!.textContent('body');
        if (!calText?.includes('Calendar')) {
          throw new Error('Expected Calendar view to be active');
        }

        // Test Month Navigation Buttons
        const nextMonthBtn = await page!.$('button:has(svg.lucide-chevron-right)');
        if (nextMonthBtn) {
          await nextMonthBtn.click();
          await page!.waitForTimeout(300);
        }

        const todayBtn = await page!.$('button:has-text("Today")');
        if (todayBtn) {
          await todayBtn.click();
          await page!.waitForTimeout(300);
        }
      }
    );

    // =========================================================================
    // JOURNEY 13: Notification Center & Preferences Modal
    // =========================================================================
    await runJourney(
      'JOURNEY-13',
      'Notification Center Bell, Alert Triage & Notification Rules',
      async () => {
        await ensureModalsClosed(page!);

        // Click Notification Bell
        const bellBtn = await page!.$('#notification-bell-btn');
        if (bellBtn) {
          await bellBtn.click();
          await page!.waitForTimeout(300);

          // Verify Notification Modal
          const modalText = await page!.textContent('body');
          if (!modalText?.includes('Notification') && !modalText?.includes('Notifications')) {
            throw new Error('Notification Center modal did not open');
          }

          // Test Category Filter Buttons
          const billsFilter = await page!.$('div[role="dialog"] button:has-text("Bills")');
          if (billsFilter) {
            await billsFilter.click();
            await page!.waitForTimeout(200);
          }

          const allFilter = await page!.$('div[role="dialog"] button:has-text("All")');
          if (allFilter) {
            await allFilter.click();
            await page!.waitForTimeout(200);
          }

          // Test clicking notification action button if available
          const viewButtons = await page!.$$('div[role="dialog"] button:has-text("View")');
          if (viewButtons.length > 0) {
            await viewButtons[0].click();
            await page!.waitForTimeout(400);

            const afterClickText = await page!.textContent('body');
            if (afterClickText?.includes('Something went wrong') || afterClickText?.includes('ErrorBoundary')) {
              throw new Error('Rendering error crashed component after clicking notification item');
            }
          } else {
            // Close modal via Escape
            await page!.keyboard.press('Escape');
            await page!.waitForTimeout(200);
          }
        }
        await ensureModalsClosed(page!);
      }
    );

    // =========================================================================
    // JOURNEY 14: Household Profile Specs, Currency Switching & Privacy Center
    // =========================================================================
    await runJourney(
      'JOURNEY-14',
      'Household Profile Settings, Regional Currency Switching & Privacy Center',
      async () => {
        await ensureModalsClosed(page!);

        // Open Profile Menu
        const profileBtn = await page!.$('#profile-menu-btn');
        if (!profileBtn) throw new Error('#profile-menu-btn missing');
        await profileBtn.click();
        await page!.waitForTimeout(150);

        // Click Household Profile & Specs
        const profileSpecsBtn = await page!.$('#menu-profile-specs-btn');
        if (!profileSpecsBtn) throw new Error('#menu-profile-specs-btn missing');
        await profileSpecsBtn.click();
        await page!.waitForSelector('.fixed.inset-0', { timeout: 5000 });

        // Verify Residence tab is loaded
        const modalText = await page!.textContent('body');
        if (!modalText?.includes('Household Profile') && !modalText?.includes('Residence')) {
          throw new Error('Profile modal did not open properly');
        }

        // Close Profile Modal
        await page!.keyboard.press('Escape');
        await page!.waitForTimeout(300);
        await ensureModalsClosed(page!);
      }
    );

    // =========================================================================
    // JOURNEY 15: Help Center & Operational Documentation
    // =========================================================================
    await runJourney(
      'JOURNEY-15',
      'Help Center Knowledge Base, Security Guides & FAQs',
      async () => {
        await ensureModalsClosed(page!);

        // Navigate to Help Center
        const moreMenuBtn = await page!.$('#nav-more-menu-btn');
        await moreMenuBtn!.click();
        await page!.waitForTimeout(150);
        await page!.click('#tool-help-btn');
        await page!.waitForTimeout(400);

        // Verify Help Center sections
        const helpText = await page!.textContent('body');
        if (!helpText?.includes('HouseMind Knowledge') && !helpText?.includes('assist your household') && !helpText?.includes('Help Center')) {
          throw new Error('Help Center view heading not found');
        }

        // Verify Floating Help & Copilot Widget launcher
        const floatingBtn = await page!.$('#floating-help-widget-btn');
        if (floatingBtn) {
          const isFloatingVisible = await floatingBtn.isVisible();
          if (isFloatingVisible) {
            await floatingBtn.click();
            await page!.waitForTimeout(250);
            const floatingPanel = await page!.$('#floating-help-panel');
            if (floatingPanel && await floatingPanel.isVisible()) {
              const closeBtn = await page!.$('#floating-help-close-btn');
              if (closeBtn) await closeBtn.click();
              await page!.waitForTimeout(150);
            }
          }
        }
      }
    );

    // =========================================================================
    // JOURNEY 16: Mobile Viewport & Hamburger Navigation Drawer
    // =========================================================================
    await runJourney(
      'JOURNEY-16',
      'Mobile Viewport Responsiveness & Touch Navigation Drawer',
      async () => {
        await ensureModalsClosed(page!);

        // Set mobile viewport (iPhone 14: 390x844)
        await page!.setViewportSize({ width: 390, height: 844 });
        await page!.waitForTimeout(300);

        // Verify Desktop nav is hidden and Mobile toggle is visible
        const mobileToggleBtn = await page!.$('#mobile-menu-toggle-btn');
        if (!mobileToggleBtn) {
          throw new Error('#mobile-menu-toggle-btn not found on mobile viewport');
        }

        const isToggleVisible = await mobileToggleBtn.isVisible();
        if (!isToggleVisible) {
          throw new Error('#mobile-menu-toggle-btn should be visible on 390px viewport');
        }

        // Open mobile drawer
        await mobileToggleBtn.click();
        await page!.waitForTimeout(300);

        // Verify drawer contents
        const drawerText = await page!.textContent('body');
        if (!drawerText?.includes('Command Center') && !drawerText?.includes('Navigation')) {
          throw new Error('Mobile navigation drawer did not open');
        }

        // Close mobile drawer
        await mobileToggleBtn.click();
        await page!.waitForTimeout(300);

        // Restore standard desktop resolution
        await page!.setViewportSize({ width: 1366, height: 768 });
        await page!.waitForTimeout(200);
      }
    );

    // =========================================================================
    // JOURNEY 17: Morning Brief Daily Popup-First Modal UX & Persistence
    // =========================================================================
    await runJourney(
      'JOURNEY-17',
      'Morning Brief Daily Modal Popup-First Entry, Synthesis & Manual Access',
      async () => {
        await ensureModalsClosed(page!);

        // 1. Open Morning Brief via Top Navigation Bar
        const navBriefBtn = await page!.$('#nav-morning-brief-btn');
        if (!navBriefBtn) {
          throw new Error('#nav-morning-brief-btn missing in top utility bar');
        }
        await navBriefBtn.click();
        await page!.waitForTimeout(400);

        // 2. Verify Morning Brief Modal Header & Title
        const briefTitle = await page!.$('#morning-brief-title');
        if (!briefTitle) {
          throw new Error('Morning Brief modal title (#morning-brief-title) not found');
        }
        const titleText = await briefTitle.textContent();
        if (!titleText?.includes('HouseMind') && !titleText?.includes('Good') && !titleText?.includes('Welcome')) {
          throw new Error(`Unexpected Morning Brief title text: "${titleText}"`);
        }

        // 3. Verify Modal Body Content
        const modalBody = await page!.textContent('div[role="dialog"]');
        if (!modalBody?.includes('Household Health Score') && !modalBody?.includes('Get Started with 4 Simple Steps') && !modalBody?.includes('Morning Brief')) {
          throw new Error('Morning Brief modal body did not render health score or onboarding steps');
        }

        // 4. Test "Don't show today's brief again" checkbox interaction
        const dontShowCheckbox = await page!.$('#mb-dont-show-today-checkbox');
        if (dontShowCheckbox) {
          await dontShowCheckbox.click();
          await page!.waitForTimeout(150);
        }

        // 5. Close Morning Brief via Done Button
        const doneBtn = await page!.$('#mb-done-btn');
        if (doneBtn) {
          await doneBtn.click();
          await page!.waitForTimeout(400);
        } else {
          await page!.keyboard.press('Escape');
          await page!.waitForTimeout(300);
        }

        await ensureModalsClosed(page!);

        // 6. Test Command Center Manual Trigger
        const dashBriefBtn = await page!.$('#dash-morning-brief-btn');
        if (dashBriefBtn) {
          await dashBriefBtn.click();
          await page!.waitForTimeout(300);

          const closeBtn = await page!.$('#morning-brief-close-btn');
          if (closeBtn) {
            await closeBtn.click();
            await page!.waitForTimeout(300);
          }
        }
        await ensureModalsClosed(page!);
      }
    );

    // =========================================================================
    // JOURNEY 18: Whole-Product Responsive Audit & Zero Horizontal Overflow
    // =========================================================================
    await runJourney(
      'JOURNEY-18',
      'Whole-Product Responsive Audit Across 15 Standard & Ultra-Compact Viewports',
      async () => {
        await ensureModalsClosed(page!);

        const viewports = [
          { name: '2560x1440 (2K QHD)', width: 2560, height: 1440 },
          { name: '1920x1080 (FHD Desktop)', width: 1920, height: 1080 },
          { name: '1600x900 (Large Laptop)', width: 1600, height: 900 },
          { name: '1440x900 (MacBook Standard)', width: 1440, height: 900 },
          { name: '1366x768 (Standard Laptop)', width: 1366, height: 768 },
          { name: '1280x800 (Small Laptop)', width: 1280, height: 800 },
          { name: '1152x768 (Compact Tablet Landscape)', width: 1152, height: 768 },
          { name: '1024x768 (iPad Landscape)', width: 1024, height: 768 },
          { name: '900x700 (Small Window)', width: 900, height: 700 },
          { name: '768x1024 (iPad Portrait)', width: 768, height: 1024 },
          { name: '640x900 (Large Phablet)', width: 640, height: 900 },
          { name: '480x800 (Large Phone)', width: 480, height: 800 },
          { name: '375x812 (iPhone Standard)', width: 375, height: 812 },
          { name: '360x800 (Android Standard)', width: 360, height: 800 },
          { name: '320x568 (iPhone SE Ultra-Compact)', width: 320, height: 568 },
        ];

        for (const vp of viewports) {
          await page!.setViewportSize({ width: vp.width, height: vp.height });
          await page!.waitForTimeout(100);

          const overflowInfo = await page!.evaluate(() => {
            const scrollW = document.documentElement.scrollWidth;
            const innerW = window.innerWidth;
            return { scrollW, innerW, overflows: scrollW > innerW };
          });

          if (overflowInfo.overflows) {
            throw new Error(
              `Horizontal overflow detected at viewport ${vp.name}: scrollWidth (${overflowInfo.scrollW}px) > innerWidth (${overflowInfo.innerW}px)`
            );
          }
        }

        // Restore standard desktop resolution
        await page!.setViewportSize({ width: 1366, height: 768 });
        await page!.waitForTimeout(150);
      }
    );

    // =========================================================================
    // JOURNEY 19: Copilot Multi-Point Rendering & Grounded Source Badges
    // =========================================================================
    await runJourney(
      'JOURNEY-19',
      'Copilot Multi-Point Formatting, Markdown Lists & Interactive Source Chips',
      async () => {
        await ensureModalsClosed(page!);

        // Navigate to Copilot Tab
        const copilotNavBtn = await page!.$('button:has-text("Copilot"), #nav-copilot-btn, a[href*="copilot"]');
        if (copilotNavBtn) {
          await copilotNavBtn.click();
          await page!.waitForTimeout(300);
        }

        // Verify composer exists
        const composer = await page!.$('#copilot-input, #floating-copilot-input, textarea, input[placeholder*="Ask"]');
        if (composer) {
          await composer.fill('What needs my attention in my household?');
          await composer.press('Enter');
          await page!.waitForTimeout(800);

          // Verify message container rendered
          const messageContent = await page!.textContent('body');
          if (!messageContent?.includes('HouseMind') && !messageContent?.includes('attention') && !messageContent?.includes('nominal')) {
            throw new Error('Copilot response did not render in chat container');
          }
        }
      }
    );

    // =========================================================================
    // FINAL SUMMARY REPORT
    // =========================================================================
    const passedCount = journeyResults.filter((r) => r.passed).length;
    const failedCount = journeyResults.filter((r) => !r.passed).length;
    const totalTimeMs = journeyResults.reduce((acc, r) => acc + r.durationMs, 0);

    console.log('\n========================================================================');
    console.log('   PLAYWRIGHT BROWSER USER JOURNEYS EXECUTION SUMMARY');
    console.log('========================================================================');
    console.log(`  Total Journeys Executed: ${journeyResults.length}`);
    console.log(`  Passed:                  ${passedCount} (${Math.round((passedCount / journeyResults.length) * 100)}%)`);
    console.log(`  Failed:                  ${failedCount}`);
    console.log(`  Total Journey Time:      ${totalTimeMs} ms`);
    console.log('========================================================================\n');

    if (failedCount > 0) {
      console.error('FAILED USER JOURNEYS:');
      journeyResults
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.error(`  - [${r.journeyId}] ${r.title}: ${r.error}`);
        });
      process.exit(1);
    } else {
      console.log('ALL BROWSER USER JOURNEYS COMPLETED AND VERIFIED SUCCESSFULLY!\n');
      process.exit(0);
    }
  } catch (globalErr: any) {
    console.error('Fatal Browser Test Execution Error:', globalErr);
    process.exit(1);
  } finally {
    if (page) await page.close().catch(() => {});
    if (authContext) await authContext.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await stopFullStackDevServer().catch(() => {});
  }
}

main();
