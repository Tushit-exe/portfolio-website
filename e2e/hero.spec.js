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

  test('should render About Me section and interactive CLI terminal', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/');

    const aboutHeading = page.locator('.about-heading');
    await expect(aboutHeading).toHaveText('Tushit Audi');

    // Test terminal chips
    const skillsChip = page.locator('.chip-btn[data-cmd="skills"]');
    await skillsChip.click();

    // Verify terminal output line rendered
    const terminalOutput = page.locator('#terminal-body-output');
    await expect(terminalOutput).toContainText('⚡ Web Apps');

    // Verify zero JavaScript page errors
    expect(consoleErrors).toEqual([]);
  });

  test('should render Services, Work, and Contact sections', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/');

    // Services
    const servicesTitle = page.locator('#services .section-display-title');
    await expect(servicesTitle).toHaveText('WHAT I CAN BUILD FOR YOU.');

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
