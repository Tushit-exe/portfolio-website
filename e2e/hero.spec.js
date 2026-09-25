import { test, expect } from '@playwright/test';

test.describe('Portfolio Website E2E & Responsive Tests', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });
  });

  test('should render hero title, top nav bar, and capabilities list with zero console errors', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(4000);

    // Verify Brand Group
    const logo = page.locator('.nav-logo');
    await expect(logo).toHaveText('TA');
    
    const statusText = page.locator('.nav-status-text');
    await expect(statusText).toContainText('AVAILABLE FOR 2026 PROJECTS');

    // Verify Name Title
    const nameTitle = page.locator('.hero-name-title');
    await expect(nameTitle).toContainText('TUSHIT');
    await expect(nameTitle).toContainText('AUDI');

    // Verify Capabilities Title
    const capTitle = page.locator('.capabilities-title');
    await expect(capTitle).toHaveText('CAPABILITIES');

    // Verify Capabilities Items
    const items = page.locator('.capability-item .cap-label');
    await expect(items).toHaveCount(6);

    // Verify zero JavaScript page errors
    expect(consoleErrors).toEqual([]);
  });

  test('should render About Me section with 6-card Bento grid and interactive widgets', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(4000); // Wait for preloader

    const authorName = page.locator('.bento-author-name');
    await expect(authorName).toHaveText('Tushit Audi');

    // Verify 6 Bento Cards rendered
    const bentoCards = page.locator('.bento-card');
    await expect(bentoCards).toHaveCount(6);

    // Verify interactive Globe canvas and Clock container are present
    const globeCanvas = page.locator('#bento-globe-canvas');
    await expect(globeCanvas).toBeVisible();

    const clockContainer = page.locator('#bento-clock-container');
    await expect(clockContainer).toBeVisible();

    // Verify zero JavaScript page errors
    expect(consoleErrors).toEqual([]);
  });

  test('should render How We Work process timeline, Work, and Contact sections', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(4000);

    // How We Work (Process Timeline)
    const processTitle = page.locator('#services .section-display-title');
    await expect(processTitle).toContainText('IDEA TO LAUNCH');

    const processSteps = page.locator('.process-step-item');
    await expect(processSteps).toHaveCount(5);

    // Work
    const workTitle = page.locator('#work .section-display-title');
    await expect(workTitle).toHaveText('FEATURED PROJECTS & AUTOMATIONS.');

    // Contact
    const contactTitle = page.locator('#contact .contact-display-headline');
    await expect(contactTitle).toContainText("LET'S BUILD SOMETHING REAL.");

    // Verify zero JavaScript page errors
    expect(consoleErrors).toEqual([]);
  });

  test('should verify responsive fixes for hero, tablet breakpoint, mobile timeline, and laptop widths', async ({ page }) => {
    // 1. Tablet breakpoint (~768px)
    await page.setViewportSize({ width: 768, height: 800 });
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(4000);

    const getInTouchBtn = page.locator('#btn-get-touch');
    await expect(getInTouchBtn).toBeVisible();

    const capItemsTablet = page.locator('.capability-item');
    const firstCapItem = capItemsTablet.first();
    await expect(firstCapItem).toBeVisible();

    // 2. Mobile breakpoint (375px)
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(4000);

    const viewWorkBtn = page.locator('#btn-view-work');
    const capCardHeader = page.locator('.capabilities-card-header');
    
    const btnBox = await viewWorkBtn.boundingBox();
    const headerBox = await capCardHeader.boundingBox();
    expect(headerBox.y).toBeGreaterThan(btnBox.y);

    // 3. Laptop breakpoint (1440px)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(4000);

    const container = page.locator('.hero-overlay-container');
    const containerBox = await container.boundingBox();
    expect(containerBox.width).toBeGreaterThan(1200);

    expect(consoleErrors).toEqual([]);
  });
});
