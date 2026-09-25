import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Desktop Hero Full Verification', () => {
  const resolutions = [
    { width: 1280, height: 800 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1512, height: 982 },
    { width: 1536, height: 864 },
    { width: 1728, height: 1117 },
    { width: 1920, height: 1080 }
  ];

  for (const res of resolutions) {
    test(`Verify desktop hero layout & scroll reveal at ${res.width}x${res.height}`, async ({ page }) => {
      await page.setViewportSize(res);
      await page.goto('http://localhost:3000/');
      await page.waitForSelector('#preloader', { state: 'detached', timeout: 10000 });

      // 1. Initial State Measurement (Scroll = 0)
      const initialData = await page.evaluate((w) => {
        const nameTitle = document.querySelector('.hero-name-title');
        const capCard = document.querySelector('.capabilities-card');
        const chips = Array.from(document.querySelectorAll('.capability-item'));

        const nameRect = nameTitle ? nameTitle.getBoundingClientRect() : null;
        const cardRect = capCard ? capCard.getBoundingClientRect() : null;

        // Photo subject bounds on canvas: center 36% horizontal span [0.32*W, 0.68*W]
        const subjectLeft = Math.round(w * 0.32);
        const subjectRight = Math.round(w * 0.68);

        const nameLeft = nameRect ? Math.round(nameRect.x) : 0;
        const nameRight = nameRect ? Math.round(nameRect.x + nameRect.width) : 0;
        const nameHorizOverlap = Math.max(0, Math.min(nameRight, subjectRight) - Math.max(nameLeft, subjectLeft));

        const cardLeft = cardRect ? Math.round(cardRect.x) : 0;
        const cardRight = cardRect ? Math.round(cardRect.x + cardRect.width) : 0;
        const cardHorizOverlap = Math.max(0, Math.min(cardRight, subjectRight) - Math.max(cardLeft, subjectLeft));

        const chipData = chips.map(c => {
          const r = c.getBoundingClientRect();
          const cLeft = Math.round(r.x);
          const cRight = Math.round(r.x + r.width);
          const hOverlap = Math.max(0, Math.min(cRight, subjectRight) - Math.max(cLeft, subjectLeft));
          return {
            text: c.textContent.trim(),
            rect: { x: cLeft, y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
            isRevealed: c.classList.contains('is-revealed'),
            hOverlap
          };
        });

        const revealedCount = chipData.filter(c => c.isRevealed).length;
        const chipIntersections = chipData.filter(c => c.hOverlap > 0).length;

        return {
          viewport: { width: w, height: window.innerHeight },
          subjectBounds: { left: subjectLeft, right: subjectRight },
          nameRect: nameRect ? { x: nameLeft, y: Math.round(nameRect.y), width: Math.round(nameRect.width), height: Math.round(nameRect.height) } : null,
          cardRect: cardRect ? { x: cardLeft, y: Math.round(cardRect.y), width: Math.round(cardRect.width), height: Math.round(cardRect.height) } : null,
          nameHorizOverlap,
          cardHorizOverlap,
          revealedCountInitial: revealedCount,
          chipIntersections,
          chipData
        };
      }, res.width);

      console.log(`\n=================== INITIAL VIEWPORT ${res.width}x${res.height} ===================`);
      console.log('Name Rect:', JSON.stringify(initialData.nameRect));
      console.log('Subject Bounds:', JSON.stringify(initialData.subjectBounds));
      console.log('Name Horiz Overlap:', initialData.nameHorizOverlap);
      console.log('Capabilities Card Rect:', JSON.stringify(initialData.cardRect));
      console.log('Capabilities Card Horiz Overlap:', initialData.cardHorizOverlap);
      console.log('Revealed Chips at Scroll 0:', initialData.revealedCountInitial);

      expect(initialData.nameHorizOverlap, `Name title overlaps subject area at ${res.width}px`).toBe(0);
      expect(initialData.cardHorizOverlap, `Capabilities card overlaps subject area at ${res.width}px`).toBe(0);
      expect(initialData.chipIntersections, `Chip overlaps subject area at ${res.width}px`).toBe(0);

      // 2. Programmatically scroll through pinned hero section to verify scroll-driven capabilities reveal
      await page.evaluate(() => window.scrollTo(0, 1200));
      await page.waitForTimeout(300);

      const scrolledData = await page.evaluate(() => {
        const chips = Array.from(document.querySelectorAll('.capability-item'));
        const chipData = chips.map(c => ({
          text: c.textContent.trim(),
          isRevealed: c.classList.contains('is-revealed')
        }));
        const revealedCount = chipData.filter(c => c.isRevealed).length;
        return { revealedCount, chipData };
      });

      console.log(`Revealed Chips after Scroll (1200px):`, scrolledData.revealedCount);
      console.log(`Chip States:`, JSON.stringify(scrolledData.chipData));

      // Confirm reveal state changes dynamically with scroll
      expect(scrolledData.revealedCount, `Chips should reveal as user scrolls down at ${res.width}px`).toBeGreaterThan(initialData.revealedCountInitial);

      // 3. Take screenshot scrolled partway through pinned hero for visual confirmation
      const screenshotPath = path.join(process.cwd(), `hero_desktop_${res.width}x${res.height}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Screenshot saved to: ${screenshotPath}`);
    });
  }
});
