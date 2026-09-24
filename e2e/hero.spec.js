import { test, expect } from '@playwright/test';

test.describe('Portfolio Website E2E Tests', () => {
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
    await page.goto('http://127.0.0.1:3000/');

    // Verify Brand Group
    const logo = page.locator('.nav-logo');
    await expect(logo).toHaveText('TA');
    
    const statusText = page.locator('.nav-status-text');
    await expect(statusText).toContainText('AVAILABLE FOR 2026 PROJECTS');

    // Verify Name Title
    const nameTitle = page.locator('.hero-name-title');
    await expect(nameTitle).toContainText('TUSHIT');
    await expect(nameTitle).toContainText('AUDI');

    // Verify Role Tag
    const roleTag = page.locator('.hero-role-tag');
    await expect(roleTag).toContainText('WEB DEVELOPER ↖ AUTOMATION SPECIALIST');

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
    await page.goto('http://127.0.0.1:3000/');
    await page.waitForTimeout(3000); // Wait for preloader

    const authorName = page.locator('.bento-author-name');
    await expect(authorName).toHaveText('Tushit Audi');

    // Verify 6 Bento Cards rendered
    const bentoCards = page.locator('.bento-card');
    await expect(bentoCards).toHaveCount(6);

    // Verify interactive Globe and Clock canvases are present
    const globeCanvas = page.locator('#bento-globe-canvas');
    await expect(globeCanvas).toBeVisible();

    const clockCanvas = page.locator('#bento-clock-canvas');
    await expect(clockCanvas).toBeVisible();

    const aboutSection = page.locator('#about');
    await aboutSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/Users/tushitaudi/.gemini/antigravity-ide/brain/db3a0093-148b-4df5-8e25-f903bf6f4eeb/bento_about_screenshot.png', fullPage: false });

    // Verify zero JavaScript page errors
    expect(consoleErrors).toEqual([]);
  });

  test('should render How We Work process timeline, Work, and Contact sections', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/');

    // How We Work (Process Timeline)
    const processTitle = page.locator('#services .section-display-title');
    await expect(processTitle).toContainText('From idea to launch — without the pressure.');

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
});
