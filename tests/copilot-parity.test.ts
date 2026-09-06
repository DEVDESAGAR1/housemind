import http from 'http';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import { buildExpressApp } from '../server.ts';
import { getContextualGreeting } from '../src/utils/greeting.ts';

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
      hmr: { port: 24700 },
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
  console.log('=== RUNNING COPILOT PARITY & UI VERIFICATION TESTS ===');
  let browser: Browser | null = null;

  try {
    // -------------------------------------------------------------
    // TEST 0: Unit test timezone-aware greeting logic
    // -------------------------------------------------------------
    console.log('\n[TEST 0] Testing getContextualGreeting utility...');
    const morningDate = new Date('2026-09-06T09:00:00Z');
    const afternoonDate = new Date('2026-09-06T14:00:00Z');
    const eveningDate = new Date('2026-09-06T19:00:00Z');
    const nightDate = new Date('2026-09-06T23:00:00Z');

    const morningGreeting = getContextualGreeting('UTC', morningDate);
    if (morningGreeting.period !== 'morning' || morningGreeting.briefTitle !== 'Morning Brief') {
      throw new Error(`Morning greeting failed: ${JSON.stringify(morningGreeting)}`);
    }

    const afternoonGreeting = getContextualGreeting('UTC', afternoonDate);
    if (afternoonGreeting.period !== 'afternoon' || afternoonGreeting.briefTitle !== 'Afternoon Brief') {
      throw new Error(`Afternoon greeting failed: ${JSON.stringify(afternoonGreeting)}`);
    }

    const eveningGreeting = getContextualGreeting('UTC', eveningDate);
    if (eveningGreeting.period !== 'evening' || eveningGreeting.briefTitle !== 'Evening Brief') {
      throw new Error(`Evening greeting failed: ${JSON.stringify(eveningGreeting)}`);
    }

    const nightGreeting = getContextualGreeting('UTC', nightDate);
    if (nightGreeting.period !== 'night' || nightGreeting.briefTitle !== 'Night Brief') {
      throw new Error(`Night greeting failed: ${JSON.stringify(nightGreeting)}`);
    }
    console.log('✓ getContextualGreeting utility correctly maps timezone and hours to periods.');

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
        uid: 'copilot-parity-user-01',
        email: 'alex.copilot@maplewood.local',
        displayName: 'Alex Mercer',
        photoURL: '',
        testToken: 'test-token-copilot-01'
      };
      window.__PLAYWRIGHT_TEST_USER__.getIdToken = function() { return Promise.resolve('test-token-copilot-01'); };
    `);

    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForSelector('main', { timeout: 15000 });

    // Ensure demo data is loaded
    const seedBtn = await page.$('#btn-seed-starter-data');
    if (seedBtn && await seedBtn.isVisible().catch(() => false)) {
      console.log('Seeding demo data...');
      await seedBtn.click();
      await page.waitForTimeout(2000);
    }

    // Dismiss initial modals
    for (let i = 0; i < 5; i++) {
      const dismissBtn = await page.$('#morning-brief-dismiss-btn, #btn-dismiss-morning-brief, button:has-text("Dismiss"), button:has-text("Got it"), button:has-text("Close")');
      if (dismissBtn && await dismissBtn.isVisible().catch(() => false)) {
        await dismissBtn.click().catch(() => {});
        await page.waitForTimeout(300);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }
    }

    // -------------------------------------------------------------
    // TEST 1: Floating Overlay Assistant
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Testing Floating Overlay Assistant...');
    const triggerBtn = await page.$('#floating-help-widget-btn');
    if (!triggerBtn) {
      throw new Error('Floating help trigger button (#floating-help-widget-btn) not found!');
    }
    await triggerBtn.click();
    await page.waitForSelector('#floating-help-panel', { state: 'visible', timeout: 5000 });
    console.log('✓ Floating help overlay opened successfully.');

    // Verify model name is NOT exposed in the overlay
    const overlayText = await page.$eval('#floating-help-panel', (el) => (el as HTMLElement).innerText);
    if (overlayText.includes('gemini-3.7-flash') || overlayText.includes('gemini-')) {
      throw new Error('Found internal model name in floating overlay UI!');
    }
    console.log('✓ Verified: Internal model names are hidden in overlay assistant.');

    // Verify AI status badge in overlay
    const aiStatusOverlay = await page.$eval('#floating-help-panel', (el) => {
      const text = (el as HTMLElement).innerText;
      const hasActive = text.includes('AI Active') || text.includes('AI Unavailable') || text.includes('AI Not Configured');
      return hasActive;
    });
    if (!aiStatusOverlay) {
      throw new Error('Expected truthful AI status banner in overlay assistant!');
    }
    console.log('✓ Verified: Truthful AI status is displayed in overlay assistant.');

    // Send a message in overlay assistant
    const overlayInput = await page.$('#floating-copilot-input');
    if (!overlayInput) {
      throw new Error('Could not find #floating-copilot-input inside floating help assistant.');
    }
    await overlayInput.fill('What are my upcoming bills?');
    const overlaySendBtn = await page.$('#floating-copilot-send-btn');
    if (overlaySendBtn) {
      await overlaySendBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }

    console.log('Waiting for overlay copilot reply...');
    await page.waitForSelector('#floating-help-panel [class*="prose"], #floating-help-panel .text-slate-800', {
      timeout: 10000,
    });
    const overlayMsgs = await page.$$eval('#floating-help-panel [class*="prose"]', (els) => els.map((e) => (e as HTMLElement).innerText));
    console.log(`✓ Overlay received ${overlayMsgs.length} message(s).`);

    // Test "New Chat" in Overlay Assistant
    const newChatOverlayBtn = await page.$('#floating-help-new-chat-btn');
    if (newChatOverlayBtn) {
      await newChatOverlayBtn.click();
      await page.waitForTimeout(300);
      const resetMsgs = await page.$$('#floating-help-panel [class*="prose"]');
      if (resetMsgs.length !== 0) {
        throw new Error('New Chat in overlay assistant failed to clear messages!');
      }
      console.log('✓ Verified: New Chat button in overlay assistant resets the conversation.');
    }

    // Close overlay
    const closeOverlayBtn = await page.$('#floating-help-close-btn');
    if (closeOverlayBtn) {
      await closeOverlayBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // TEST 2: Dedicated Copilot Page
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Dedicated Copilot Page...');
    // Navigate to copilot tab
    const copilotNavBtn = await page.$('button[title*="Copilot"], button:has-text("Copilot"), #nav-tab-copilot');
    if (copilotNavBtn) {
      await copilotNavBtn.click();
    } else {
      await page.goto(`${baseUrl}#copilot`, { waitUntil: 'networkidle' });
    }
    await page.waitForSelector('#copilot-page-header', { state: 'visible', timeout: 8000 });
    console.log('✓ Dedicated Copilot page loaded successfully.');

    // Verify model name is NOT exposed in the dedicated page
    const copilotPageText = await page.$eval('#copilot-page-header', (el) => (el as HTMLElement).innerText);
    if (copilotPageText.includes('gemini-3.7-flash') || copilotPageText.includes('gemini-')) {
      throw new Error('Found internal model name in dedicated copilot page header!');
    }
    console.log('✓ Verified: Internal model names are hidden in dedicated copilot page.');

    // Verify truthful AI status badge in dedicated copilot header
    const hasTruthfulStatus = copilotPageText.includes('AI Active') || copilotPageText.includes('AI Unavailable') || copilotPageText.includes('AI Not Configured');
    if (!hasTruthfulStatus) {
      throw new Error('Dedicated page header missing truthful AI status indicator!');
    }
    console.log('✓ Verified: Truthful AI status is displayed in dedicated copilot page.');

    // Send query in dedicated copilot
    const dedicatedInput = await page.$('#copilot-input');
    if (!dedicatedInput) {
      throw new Error('Input #copilot-input not found on dedicated copilot page!');
    }
    await dedicatedInput.fill('What appliances need maintenance soon?');
    const sendBtn = await page.$('#btn-send-message');
    if (sendBtn) {
      await sendBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }

    console.log('Waiting for dedicated copilot response...');
    await page.waitForSelector('main [class*="prose"], main .text-slate-800', { timeout: 10000 });
    const dedicatedMsgs = await page.$$eval('main [class*="prose"]', (els) => els.map((e) => (e as HTMLElement).innerText));
    console.log(`✓ Dedicated copilot received ${dedicatedMsgs.length} message(s).`);

    // Verify conversation is saved and listed in conversation sidebar
    const convSidebarItems = await page.$$('.lg\\:col-span-1 .group');
    console.log(`Found ${convSidebarItems.length} conversation(s) in sidebar history.`);

    // -------------------------------------------------------------
    // TEST 3: Mobile Viewport Layout Verification (390x844 & 375x812)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Mobile Layout & Responsiveness...');
    for (const vp of [{ width: 390, height: 844 }, { width: 375, height: 812 }]) {
      console.log(`Testing viewport ${vp.width}x${vp.height}...`);
      await page.setViewportSize(vp);
      await page.waitForTimeout(400);

      // Check horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 2;
      });
      if (hasHorizontalScroll) {
        throw new Error(`Horizontal scroll detected at ${vp.width}x${vp.height}!`);
      }
      console.log(`✓ No horizontal overflow at ${vp.width}x${vp.height}.`);

      // Verify mobile conversation history bar is visible
      const mobileConvBtn = await page.$('#btn-mobile-conversations');
      if (mobileConvBtn && await mobileConvBtn.isVisible()) {
        console.log(`✓ Mobile conversation history button visible at ${vp.width}x${vp.height}.`);
        await mobileConvBtn.click();
        await page.waitForTimeout(300);
        // Verify mobile history drawer opens
        const drawerTitle = await page.$('text=Household Conversations');
        if (drawerTitle) {
          console.log(`✓ Mobile conversations drawer opened at ${vp.width}x${vp.height}.`);
          // Close drawer
          const closeDrawerBtn = await page.$('#btn-close-mobile-history');
          if (closeDrawerBtn && await closeDrawerBtn.isVisible()) {
            await closeDrawerBtn.click();
          } else {
            await page.keyboard.press('Escape');
          }
          await page.waitForTimeout(300);
        }
      }

      // Verify composer input is visible
      const mobileInput = await page.$('textarea, input[placeholder*="Ask"]');
      const isInputVisible = mobileInput ? await mobileInput.isVisible() : false;
      if (!isInputVisible) {
        throw new Error(`Composer input not visible at ${vp.width}x${vp.height}!`);
      }
      console.log(`✓ Composer input is visible and accessible at ${vp.width}x${vp.height}.`);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL PARITY, GREETING, AND UI TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await stopFullStackDevServer();
  }
}

run();
