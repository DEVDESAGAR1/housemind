const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('[CONSOLE_ERROR]', msg.text());
    } else if (msg.type() === 'warn') {
      console.log('[CONSOLE_WARN]', msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log('[PAGEERROR]', err.message, err.stack);
    errors.push(err);
  });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  console.log('Title:', await page.title());
  
  const checkEB = async (label) => {
    const errorBoundary = await page.locator('#error-boundary-container').first();
    const count = await errorBoundary.count();
    if (count > 0 && await errorBoundary.isVisible()) {
      const text = await errorBoundary.innerText();
      console.log(`[ERROR_BOUNDARY in ${label}]:`, text);
      return true;
    }
    return false;
  };

  await checkEB('initial load');

  // Let's test navigation tabs
  const navButtons = await page.locator('button[id^="nav-tab-"]').all();
  console.log('Found nav buttons:', navButtons.length);
  for (const btn of navButtons) {
    const id = await btn.getAttribute('id');
    try {
      await btn.click();
      await page.waitForTimeout(600);
      const hasEB = await checkEB(id);
      if (!hasEB) {
        console.log(`Tab ${id} OK`);
      }
    } catch (e) {
      console.log(`Failed clicking ${id}:`, e.message);
    }
  }

  // Also test dashboard action buttons like view maintenance
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const dashBtns = ['#dash-view-maintenance-btn', '#dash-view-assets-btn', '#dash-view-expenses-btn'];
  for (const selector of dashBtns) {
    const loc = page.locator(selector).first();
    if (await loc.count() > 0 && await loc.isVisible()) {
      console.log('Clicking', selector);
      await loc.click();
      await page.waitForTimeout(600);
      await checkEB(selector);
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    }
  }

  // Also test subtabs inside Maintenance: maintenance, warranties, issues
  const maintTab = page.locator('#nav-tab-maintenance').first();
  if (await maintTab.count() > 0) {
    await maintTab.click();
    await page.waitForTimeout(600);
    // Find subtab buttons
    const subtabs = ['#subtab-tasks', '#subtab-warranties', '#subtab-issues'];
    for (const sub of subtabs) {
      const subLoc = page.locator(sub).first();
      if (await subLoc.count() > 0 && await subLoc.isVisible()) {
        console.log('Clicking subtab', sub);
        await subLoc.click();
        await page.waitForTimeout(600);
        await checkEB(sub);
      }
    }
  }

  await browser.close();
  console.log('Finished browser test. Total errors caught:', errors.length);
})();
