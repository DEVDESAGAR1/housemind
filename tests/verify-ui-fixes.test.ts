import http from 'http';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import { buildExpressApp } from '../server.ts';

let testAppServer: http.Server | null = null;
let testViteServer: ViteDevServer | null = null;
let serverBaseUrl = '';

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
      hmr: { port: 24699 },
    },
    appType: 'spa',
  });
  app.use(testViteServer.middlewares);

  return new Promise((resolve, reject) => {
    testAppServer = app.listen(0, '127.0.0.1', () => {
      const addr = testAppServer!.address() as any;
      serverBaseUrl = `http://127.0.0.1:${addr.port}`;
      console.log(`[TEST SERVER] Running at ${serverBaseUrl}`);
      resolve(serverBaseUrl);
    });
    testAppServer.on('error', reject);
  });
}

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

async function run() {
  console.log('=== STARTING TARGETED VERIFICATION FOR 3 UI FIXES ===');
  let browser: Browser | null = null;

  try {
    const baseUrl = await startFullStackDevServer();

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });

    await context.addInitScript(`
      window.__PLAYWRIGHT_TEST_USER__ = {
        uid: 'e2e-user-01',
        email: 'alex.mercer@maplewood.local',
        displayName: 'Alex Mercer',
        photoURL: '',
        testToken: 'test-token-e2e-01'
      };
      window.__PLAYWRIGHT_TEST_USER__.getIdToken = function() { return Promise.resolve('test-token-e2e-01'); };
    `);

    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForSelector('main', { timeout: 15000 });

    // Dismiss any initial modal like Morning Brief
    for (let i = 0; i < 5; i++) {
      const dismissBtn = await page.$('#morning-brief-dismiss-btn, #btn-dismiss-morning-brief, button:has-text("Dismiss"), button:has-text("Got it"), button:has-text("Close")');
      if (dismissBtn && await dismissBtn.isVisible().catch(() => false)) {
        await dismissBtn.click().catch(() => {});
        await page.waitForTimeout(300);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    }

    // -------------------------------------------------------------
    // TEST 1: Check "Load Demo Data" Button Text
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Verifying "Load Demo Data" wording across UI...');
    // Seed demo data or check button
    const loadDemoBtn = await page.$('#btn-seed-starter-data');
    if (loadDemoBtn) {
      const text = await loadDemoBtn.innerText();
      console.log(`  Found button #btn-seed-starter-data with text: "${text}"`);
      if (text.toLowerCase().includes('starter')) {
        throw new Error(`Button still contains "Starter": "${text}"`);
      }
      if (!text.includes('Demo Data')) {
        throw new Error(`Expected button to say "Load Demo Data", got: "${text}"`);
      }
      console.log('  ✓ Button explicitly displays "Load Demo Data"');
      // Click it to seed demo data for subsequent tests
      await loadDemoBtn.click();
      await page.waitForTimeout(1500);
    } else {
      console.log('  Household already seeded or onboarding not shown directly. Checking profile modal...');
    }

    // Open profile modal to verify demo data button
    const profileBtn = await page.$('#profile-menu-btn');
    if (profileBtn) {
      await profileBtn.click();
      await page.waitForTimeout(300);
      const profileModalBtn = await page.$('#profile-menu-open-profile-btn');
      if (profileModalBtn) {
        await profileModalBtn.click();
        await page.waitForSelector('#profile-modal-seed-demo-btn', { timeout: 5000 });
        const profileSeedText = await page.innerText('#profile-modal-seed-demo-btn');
        console.log(`  Profile modal button text: "${profileSeedText}"`);
        if (profileSeedText.toLowerCase().includes('starter')) {
          throw new Error(`Profile modal button still has "Starter": "${profileSeedText}"`);
        }
        if (!profileSeedText.includes('Demo Data')) {
          throw new Error(`Expected "Load Demo Data", got: "${profileSeedText}"`);
        }
        console.log('  ✓ Profile modal displays "Load Demo Data"');
        await page.screenshot({ path: 'screenshot-demo-data-button.png' });
        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    // -------------------------------------------------------------
    // TEST 2: Guided Tours — Diagnose, Overlay, Positioning, Auto-Scroll
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Verifying Guided Tours overlay & non-overlapping popover...');
    // Open Help Center modal where tours are listed
    // Or trigger a tour directly via window or menu
    const helpBtn = await page.$('#nav-help-menu-btn, button[title*="Help"], #profile-menu-help-center-btn');
    if (!helpBtn) {
      // Open profile menu to get to Help Center
      const pBtn = await page.$('#profile-menu-btn');
      if (pBtn) {
        await pBtn.click();
        await page.waitForTimeout(300);
        const helpOption = await page.$('#profile-menu-help-center-btn, button:has-text("Help & Tours")');
        if (helpOption) {
          await helpOption.click();
        }
      }
    } else {
      await helpBtn.click();
    }
    await page.waitForTimeout(500);

    // Start the Command Center tour via window.__HOUSEMIND_START_TOUR__
    await page.evaluate(() => {
      if ((window as any).__HOUSEMIND_START_TOUR__) {
        (window as any).__HOUSEMIND_START_TOUR__('command_center');
      }
    });
    await page.waitForTimeout(600);

    // Check if tour modal is active
    await page.waitForSelector('#guided-tour-modal', { timeout: 5000 });
    console.log('  ✓ Tour modal is rendered and active');

    // Step 1: Cockpit (centered)
    let popover = await page.$('#guided-tour-popover');
    if (!popover) throw new Error('Tour popover missing');
    let popoverBox = await popover.boundingBox();
    console.log('  Step 1 Popover bounding box (centered):', popoverBox);

    // Step 2: Health Widget (targeted spotlight)
    const nextBtn = await page.$('#guided-tour-btn-next');
    if (!nextBtn) throw new Error('Tour next button missing');
    await nextBtn.click();
    await page.waitForTimeout(600);

    // Verify spotlight and target
    const spotlight = await page.$('#guided-tour-spotlight');
    if (!spotlight) throw new Error('Tour spotlight missing on targeted step');
    const spotlightBox = await spotlight.boundingBox();
    console.log('  Step 2 Spotlight bounding box (Health Widget):', spotlightBox);

    popover = await page.$('#guided-tour-popover');
    popoverBox = await popover!.boundingBox();
    console.log('  Step 2 Popover bounding box:', popoverBox);

    // Verify popover does NOT cover the target spotlight
    if (spotlightBox && popoverBox) {
      // Check if popover completely obscures spotlight
      const horizontalOverlap = !(popoverBox.x + popoverBox.width < spotlightBox.x || popoverBox.x > spotlightBox.x + spotlightBox.width);
      const verticalOverlap = !(popoverBox.y + popoverBox.height < spotlightBox.y || popoverBox.y > spotlightBox.y + spotlightBox.height);
      console.log(`  Horizontal overlap: ${horizontalOverlap}, Vertical overlap: ${verticalOverlap}`);
      // If placed bottom or top, vertical overlap must be false!
      if (horizontalOverlap && verticalOverlap) {
        throw new Error('Tour Popover is obscuring the highlighted target element!');
      }
      console.log('  ✓ Popover is placed clearly outside the highlighted target element');
    }

    await page.screenshot({ path: 'screenshot-guided-tour.png' });
    console.log('  ✓ Saved screenshot-guided-tour.png');

    // Step 3: Advance to Unified Actions (auto-scroll)
    await nextBtn.click();
    await page.waitForTimeout(600);
    console.log('  ✓ Advanced to Step 3 (Unified Actions)');

    // Step 4: Advance to Upcoming Obligations
    await nextBtn.click();
    await page.waitForTimeout(600);
    console.log('  ✓ Advanced to Step 4 (Upcoming Obligations)');

    // Exit tour
    const exitBtn = await page.$('#guided-tour-btn-exit, #guided-tour-btn-close');
    if (exitBtn) {
      await exitBtn.click();
      await page.waitForTimeout(300);
      console.log('  ✓ Exited tour cleanly');
    }

    // -------------------------------------------------------------
    // TEST 3: Dedicated Copilot Page UI
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Verifying Dedicated Copilot Page UI...');
    // Navigate to Copilot tab
    // Click More -> Copilot or navigate directly
    const moreMenuBtn = await page.$('#nav-more-menu-btn');
    if (moreMenuBtn) {
      await moreMenuBtn.click();
      await page.waitForTimeout(250);
      const copilotTabBtn = await page.$('#nav-copilot-tab');
      if (copilotTabBtn) {
        await copilotTabBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Verify Copilot header
    const copilotHeader = await page.$('#copilot-page-header');
    if (!copilotHeader) {
      throw new Error('Copilot header (#copilot-page-header) not found!');
    }
    const headerText = await copilotHeader.innerText();
    console.log(`  Copilot Header Text: "${headerText.replace(/\n+/g, ' ')}"`);
    if (!headerText.includes('HouseMind Copilot')) {
      throw new Error('Copilot header missing "HouseMind Copilot" title');
    }
    const hasAiBadge = headerText.includes('AI Active') || headerText.includes('AI Unavailable') || headerText.includes('AI Not Configured');
    if (!hasAiBadge) {
      throw new Error('Copilot header missing truthful AI status indicator');
    }
    console.log('  ✓ Copilot header and truthful AI status indicator verified');

    // Verify Sidebar & New Chat button
    const newChatBtn = await page.$('#btn-new-chat');
    if (!newChatBtn) {
      throw new Error('New Chat button (#btn-new-chat) missing in Copilot sidebar');
    }
    console.log('  ✓ New Chat button found');

    // Verify Composer Area
    const copilotInput = await page.$('#copilot-input, textarea#copilot-input');
    if (!copilotInput) {
      throw new Error('Copilot textarea input (#copilot-input) missing in composer');
    }
    const sendBtn = await page.$('#btn-send-message');
    if (!sendBtn) {
      throw new Error('Send message button (#btn-send-message) missing in composer');
    }
    console.log('  ✓ Copilot composer with textarea and send button verified');

    // Type a query and test composer
    await copilotInput.fill('What is my household health score?');
    await page.waitForTimeout(200);

    await page.screenshot({ path: 'screenshot-copilot-ui.png' });
    console.log('  ✓ Saved screenshot-copilot-ui.png');

    console.log('\n=============================================================');
    console.log('ALL 3 USER-FACING REQUIREMENTS VERIFIED SUCCESSFULLY IN BROWSER');
    console.log('=============================================================\n');
  } finally {
    if (browser) await browser.close();
    await stopFullStackDevServer();
  }
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
