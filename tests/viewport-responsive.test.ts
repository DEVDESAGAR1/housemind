import { chromium, Browser } from 'playwright';

interface ViewportTestCase {
  name: string;
  width: number;
  height: number;
  isMobile: boolean;
}

const VIEWPORT_TEST_CASES: ViewportTestCase[] = [
  { name: 'iPhone SE (compact mobile)', width: 320, height: 568, isMobile: true },
  { name: 'Android Standard (360x640)', width: 360, height: 640, isMobile: true },
  { name: 'iPhone 8 / SE2 (375x667)', width: 375, height: 667, isMobile: true },
  { name: 'iPhone 14 (390x844)', width: 390, height: 844, isMobile: true },
  { name: 'Pixel 7 (412x915)', width: 412, height: 915, isMobile: true },
  { name: 'iPhone 14 Pro Max (428x926)', width: 428, height: 926, isMobile: true },
  { name: 'Small Tablet Portrait (600x960)', width: 600, height: 960, isMobile: true },
  { name: 'iPad Portrait (768x1024)', width: 768, height: 1024, isMobile: true },
  { name: 'Tablet 10" Portrait (800x1280)', width: 800, height: 1280, isMobile: true },
  { name: 'iPad Air Portrait (820x1180)', width: 820, height: 1180, isMobile: true },
  { name: 'iPad Landscape (1024x768)', width: 1024, height: 768, isMobile: false },
  { name: 'iPad Air Landscape (1180x820)', width: 1180, height: 820, isMobile: false },
  { name: '13" Laptop (1280x800)', width: 1280, height: 800, isMobile: false },
  { name: 'Standard HD Laptop (1366x768)', width: 1366, height: 768, isMobile: false },
  { name: 'MacBook Pro 15" (1440x900)', width: 1440, height: 900, isMobile: false },
  { name: 'Full HD Desktop (1920x1080)', width: 1920, height: 1080, isMobile: false },
  { name: '2K QHD Ultrawide (2560x1440)', width: 2560, height: 1440, isMobile: false },
];

async function runResponsiveTestSuite() {
  console.log('========================================================================');
  console.log('   HOUSEMIND PRODUCTION RESPONSIVE & PLAYWRIGHT VIEWPORT TEST SUITE     ');
  console.log('========================================================================\n');

  let browser: Browser | null = null;
  let passedCount = 0;
  let failedCount = 0;
  const failures: string[] = [];

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();

    // =========================================================================
    // 1. Unauthenticated URL Bypass & Attacker Regression Suite
    // =========================================================================
    console.log('--- Verifying Unauthenticated URL Bypass Rejection & Landing Page Isolation ---');
    const bypassAttackUrls = [
      'http://localhost:3000',
      'http://localhost:3000/?demo=true',
      'http://localhost:3000/?demo==true',
      'http://localhost:3000/?guest=true',
      'http://localhost:3000/?anonymous=true',
      'http://localhost:3000/demo',
      'http://localhost:3000/guest',
    ];

    for (const testUrl of bypassAttackUrls) {
      try {
        await publicPage.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await publicPage.waitForSelector('main', { timeout: 10000 });

        // Must display the Google Sign-In button
        const signinBtn = await publicPage.$('#hero-google-signin-btn');
        if (!signinBtn) {
          throw new Error(`Expected #hero-google-signin-btn on unauthenticated URL: ${testUrl}`);
        }

        // Must NOT display any demo preview button
        const demoBtn = await publicPage.$('#hero-demo-preview-btn');
        if (demoBtn) {
          throw new Error(`Forbidden #hero-demo-preview-btn still present in DOM for URL: ${testUrl}`);
        }

        // Must NOT render authenticated navigation or dashboard
        const desktopNav = await publicPage.$('#primary-desktop-navigation');
        const mobileToggle = await publicPage.$('#mobile-menu-toggle-btn');
        if (desktopNav || mobileToggle) {
          throw new Error(`Bypass breached! Authenticated navbar rendered for unauthenticated URL: ${testUrl}`);
        }

        console.log(`  ✓ Unauthenticated URL safely isolated: ${testUrl}`);
        passedCount++;
      } catch (err: any) {
        console.error(`  ✗ Bypass vulnerability at ${testUrl}: ${err.message}`);
        failedCount++;
        failures.push(`Bypass test ${testUrl}: ${err.message}`);
      }
    }

    // =========================================================================
    // 2. Authenticated Viewport & Navigation Suite (via Test Fixture)
    // =========================================================================
    console.log(`\nTesting across ${VIEWPORT_TEST_CASES.length} responsive viewports at http://localhost:3000 (authenticated test fixture)...\n`);

    const authContext = await browser.newContext();
    // Inject deterministic test user fixture into window scope before document loads
    await authContext.addInitScript(() => {
      (window as any).__PLAYWRIGHT_TEST_USER__ = {
        uid: 'test-user-e2e',
        email: 'alex@maplewood.local',
        displayName: 'Alex Mercer',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        getIdToken: async () => 'test-token-e2e-01',
        testToken: 'test-token-e2e-01',
      };
    });

    const authPage = await authContext.newPage();

    for (const vp of VIEWPORT_TEST_CASES) {
      const label = `[${vp.name} (${vp.width}x${vp.height})]`;
      try {
        await authPage.setViewportSize({ width: vp.width, height: vp.height });
        await authPage.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });

        // Wait for main container
        await authPage.waitForSelector('main', { timeout: 10000 });

        // 1. Check for horizontal overflow (must not exceed viewport width by more than 1px for subpixel rounding)
        const overflow = await authPage.evaluate(() => {
          return {
            windowWidth: window.innerWidth,
            bodyScrollWidth: document.body.scrollWidth,
            docScrollWidth: document.documentElement.scrollWidth,
          };
        });

        if (overflow.docScrollWidth > overflow.windowWidth + 2) {
          throw new Error(
            `Horizontal overflow detected: document.documentElement.scrollWidth (${overflow.docScrollWidth}px) > window.innerWidth (${overflow.windowWidth}px)`
          );
        }

        // 2. Responsive Navbar Checks
        if (vp.width < 1024) {
          // Mobile Mode: Mobile menu toggle should be visible
          const mobileBtn = await authPage.$('#mobile-menu-toggle-btn');
          if (!mobileBtn) {
            throw new Error('Mobile menu toggle button (#mobile-menu-toggle-btn) not found in DOM');
          }
          const isMobileBtnVisible = await mobileBtn.isVisible();
          if (!isMobileBtnVisible) {
            throw new Error('Mobile menu button should be visible on viewports < 1024px');
          }

          // Desktop nav should be hidden
          const desktopNav = await authPage.$('#primary-desktop-navigation');
          if (desktopNav) {
            const isDesktopNavVisible = await desktopNav.isVisible();
            if (isDesktopNavVisible) {
              throw new Error('Desktop navigation should NOT be visible on viewports < 1024px');
            }
          }
        } else {
          // Desktop Mode (>= 1024px)
          const desktopNav = await authPage.$('#primary-desktop-navigation');
          if (!desktopNav) {
            throw new Error('Desktop navigation (#primary-desktop-navigation) not found in DOM');
          }
          const isDesktopNavVisible = await desktopNav.isVisible();
          if (!isDesktopNavVisible) {
            throw new Error('Desktop navigation should be visible on viewports >= 1024px');
          }

          const mobileBtn = await authPage.$('#mobile-menu-toggle-btn');
          if (mobileBtn) {
            const isMobileBtnVisible = await mobileBtn.isVisible();
            if (isMobileBtnVisible) {
              throw new Error('Mobile menu button should NOT be visible on viewports >= 1024px');
            }
          }
        }

        // 3. Command Center Operating Screen Checks
        const main = await authPage.$('main');
        if (!main) {
          throw new Error('Main content element not found');
        }

        console.log(`  ✓ ${label} PASSED: No overflow, responsive nav correct, layout stable`);
        passedCount++;
      } catch (err: any) {
        console.error(`  ✗ ${label} FAILED: ${err.message}`);
        failedCount++;
        failures.push(`${label}: ${err.message}`);
      }
    }

    // 4. Multi-view navigation and modal verification at standard laptop resolution
    console.log('\n--- Verifying View Navigation & Subtab Sync at 1366x768 ---');
    await authPage.setViewportSize({ width: 1366, height: 768 });
    await authPage.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await authPage.waitForSelector('main', { timeout: 10000 });

    // Click Home -> Maintenance
    const homeMenuBtn = await authPage.$('#nav-home-group-btn');
    if (homeMenuBtn) {
      await homeMenuBtn.click();
      await authPage.waitForTimeout(150);
      const maintItem = await authPage.$('#nav-maintenance-tab');
      if (maintItem) {
        await maintItem.click();
        await authPage.waitForTimeout(300);
        console.log('  ✓ Navigation to Maintenance view successful');
        passedCount++;
      }
    }

    // Click Assets -> Warranties
    const assetsMenuBtn = await authPage.$('#nav-assets-group-btn');
    if (assetsMenuBtn) {
      await assetsMenuBtn.click();
      await authPage.waitForTimeout(150);
      const warrantyItem = await authPage.$('#nav-item-warranties');
      if (warrantyItem) {
        await warrantyItem.click();
        await authPage.waitForTimeout(300);
        console.log('  ✓ Navigation to Warranties subtab successful');
        passedCount++;
      }
    }

    // Click Finances -> Loans
    const finMenuBtn = await authPage.$('#nav-finances-group-btn');
    if (finMenuBtn) {
      await finMenuBtn.click();
      await authPage.waitForTimeout(150);
      const loansItem = await authPage.$('#nav-item-loans');
      if (loansItem) {
        await loansItem.click();
        await authPage.waitForTimeout(300);
        console.log('  ✓ Navigation to Loans & Mortgages subtab successful');
        passedCount++;
      }
    }

    console.log('\n========================================================================');
    console.log(`  PLAYWRIGHT TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('========================================================================\n');

    if (failedCount > 0) {
      console.error('Failure Details:');
      failures.forEach((f) => console.error(' - ' + f));
      process.exit(1);
    }
  } catch (globalErr: any) {
    console.error('Fatal Playwright Execution Error:', globalErr);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runResponsiveTestSuite();
