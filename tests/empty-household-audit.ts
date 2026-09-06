import http from 'http';
import fs from 'fs';
import path from 'path';
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
    server: { middlewareMode: true, hmr: { port: 24691 } },
    appType: 'spa',
  });
  app.use(testViteServer.middlewares);

  return new Promise((resolve, reject) => {
    testAppServer = app.listen(0, '127.0.0.1', () => {
      const addr = testAppServer!.address() as any;
      serverBaseUrl = `http://127.0.0.1:${addr.port}`;
      resolve(serverBaseUrl);
    });
    testAppServer.on('error', reject);
  });
}

async function stopFullStackDevServer(): Promise<void> {
  if (testViteServer) {
    await testViteServer.close();
  }
  if (testAppServer) {
    await new Promise<void>((resolve) => testAppServer!.close(() => resolve()));
  }
}

async function captureModal(page: Page, triggerSelector: string, screenshotPath: string) {
  const btn = await page.$(triggerSelector);
  if (btn && await btn.isVisible()) {
    await btn.click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({ path: screenshotPath });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } else {
    console.warn(`Could not trigger modal for ${screenshotPath}`);
  }
}

async function navigateAndScreenshot(page: Page, navId: string, screenshotPath: string, isFullPage: boolean = true) {
  console.log(`Navigating to ${navId}...`);
  await page.evaluate((id) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: id }));
  }, navId);
  await page.waitForTimeout(800); // allow render
  await page.screenshot({ path: screenshotPath, fullPage: isFullPage });
}

async function main() {
  const screenshotsDir = path.resolve('test-results/ui-screenshots/empty-household');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const baseUrl = await startFullStackDevServer();

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const authContext = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });

  await authContext.addInitScript(`
    window.__PLAYWRIGHT_TEST_USER__ = {
      uid: 'empty-household-user',
      email: 'empty@housemind.local',
      displayName: 'Empty User',
      photoURL: 'https://placekitten.com/150/150',
      testToken: 'test-token-empty-01'
    };
    window.__PLAYWRIGHT_TEST_USER__.getIdToken = function() { return Promise.resolve('test-token-empty-01'); };
  `);

  const page = await authContext.newPage();
  
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForSelector('main', { timeout: 15000 });
  
  // Close any initial popups
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 1. Command Center Desktop
  await page.screenshot({ path: path.join(screenshotsDir, '01-command-center-empty.png'), fullPage: true });

  // 2. Command Center Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, '02-command-center-mobile.png'), fullPage: true });

  // 3. Navigation Drawer (Mobile)
  await captureModal(page, 'header button:has(svg.lucide-menu)', path.join(screenshotsDir, '03-navigation-drawer-open.png'));

  // Reset viewport
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(500);

  // 4, 5, 6. Header menus
  await captureModal(page, 'header button:has(img), header button:has(svg.lucide-user)', path.join(screenshotsDir, '04-profile-menu-open.png'));
  await captureModal(page, 'header button:has(svg.lucide-plus)', path.join(screenshotsDir, '05-add-menu-open.png'));
  await captureModal(page, 'header button:has(svg.lucide-bell)', path.join(screenshotsDir, '06-notification-center-empty.png'));

  // Domains & Add Modals
  await navigateAndScreenshot(page, 'calendar', path.join(screenshotsDir, '07-calendar-empty.png'));
  
  await navigateAndScreenshot(page, 'properties', path.join(screenshotsDir, '08-properties-empty.png'));
  await captureModal(page, 'main button:has(svg.lucide-plus)', path.join(screenshotsDir, '09-property-add-modal.png'));

  await navigateAndScreenshot(page, 'assets', path.join(screenshotsDir, '10-assets-empty.png'));
  await captureModal(page, 'main button:has(svg.lucide-plus)', path.join(screenshotsDir, '11-asset-add-modal.png'));

  await navigateAndScreenshot(page, 'maintenance', path.join(screenshotsDir, '12-maintenance-empty.png'));
  await captureModal(page, 'main button:has(svg.lucide-plus)', path.join(screenshotsDir, '13-issue-add-modal.png'));

  await navigateAndScreenshot(page, 'utilities', path.join(screenshotsDir, '14-utilities-debt-empty.png'));

  await navigateAndScreenshot(page, 'finances', path.join(screenshotsDir, '15-finances-empty.png'));
  await captureModal(page, 'main button:has(svg.lucide-plus)', path.join(screenshotsDir, '16-finance-add-modal.png'));

  await navigateAndScreenshot(page, 'documents', path.join(screenshotsDir, '17-documents-empty.png'));
  
  // Upload modal (click from documents or global)
  await captureModal(page, 'main button:has(svg.lucide-upload), header button:has(svg.lucide-upload)', path.join(screenshotsDir, '18-upload-scan-empty.png'));

  // Household Health (from Profile or click health score)
  await navigateAndScreenshot(page, 'dashboard', path.join(screenshotsDir, '01-command-center-empty-temp.png')); // go back to dash
  await captureModal(page, '#dash-health-widget-btn, button:has-text("Household Health")', path.join(screenshotsDir, '19-household-health-empty.png'));

  // Copilot
  await navigateAndScreenshot(page, 'copilot', path.join(screenshotsDir, '20-copilot-empty.png'));
  // Simulate conversation
  const input = await page.$('input[type="text"], textarea');
  if (input) {
    await input.fill('What is the health of my home?');
    await input.press('Enter');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '21-copilot-conversation.png'), fullPage: true });
  }

  // Notifications explicit page
  await navigateAndScreenshot(page, 'notifications', path.join(screenshotsDir, '22-notifications-empty.png'));

  // Profile Settings
  // To get to profile tabs, we use the profile menu
  console.log('Taking profile screenshots...');
  const profileBtn = await page.$('header button:has(img), header button:has(svg.lucide-user)');
  if (profileBtn && await profileBtn.isVisible()) {
    await profileBtn.click({ force: true });
    await page.waitForTimeout(500);
    // Click on "Profile" in menu
    const profileLink = await page.$('div[role="menu"] button:has-text("Profile")');
    if (profileLink) await profileLink.click({ force: true });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, '23-profile.png') });
    
    // Tab switching if present (Settings, Privacy, etc.)
    const tabSelectors = [
      { name: 'Settings', file: '24-settings.png' },
      { name: 'Privacy', file: '25-privacy-data-controls.png' },
      { name: 'Notification', file: '26-notification-preferences.png' },
      { name: 'AI', file: '27-ai-integrations.png' }
    ];
    for (const tab of tabSelectors) {
      const tabBtn = await page.$(`button[role="tab"]:has-text("${tab.name}")`);
      if (tabBtn) {
        await tabBtn.click({ force: true });
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(screenshotsDir, tab.file) });
      }
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // Help
  await navigateAndScreenshot(page, 'help', path.join(screenshotsDir, '28-help-center.png'));

  // Tools/Simulator
  await navigateAndScreenshot(page, 'simulator', path.join(screenshotsDir, '32-tools-simulator.png'));

  // Guided Tours
  console.log('Taking guided tour screenshots...');
  await page.evaluate(() => { window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' })); });
  await page.waitForTimeout(800);
  // Start the command center tour
  await page.evaluate(() => { window.dispatchEvent(new CustomEvent('open-tours')); });
  await page.waitForTimeout(600);
  const startTourBtn = await page.$('button:has-text("Command Center")');
  if (startTourBtn) await startTourBtn.click({ force: true });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '29-guided-tour-command-center.png'), fullPage: true });
  await page.keyboard.press('Escape');
  
  await page.evaluate(() => { window.dispatchEvent(new CustomEvent('open-tours')); });
  await page.waitForTimeout(600);
  const startHealthBtn = await page.$('button:has-text("Household Health")');
  if (startHealthBtn) await startHealthBtn.click({ force: true });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '30-guided-tour-health.png'), fullPage: true });
  await page.keyboard.press('Escape');
  
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { window.dispatchEvent(new CustomEvent('open-tours')); });
  await page.waitForTimeout(600);
  const startMobileBtn = await page.$('button:has-text("Command Center")');
  if (startMobileBtn) await startMobileBtn.click({ force: true });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '31-guided-tour-mobile.png'), fullPage: true });
  await page.keyboard.press('Escape');

  // Verify screenshot count
  const files = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
  console.log('--- AUDIT RESULTS ---');
  console.log(`Expected minimum screenshots: 32`);
  console.log(`Actual screenshots generated: ${files.length}`);
  console.log(`Console Errors: ${consoleErrors.length}`);
  consoleErrors.forEach(e => console.log('ERR:', e));

  await authContext.close();
  await browser.close();
  await stopFullStackDevServer();
}

main().catch(console.error);
