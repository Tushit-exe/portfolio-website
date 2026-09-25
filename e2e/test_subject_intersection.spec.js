import { test, expect } from '@playwright/test';

test.describe('Hero Subject Intersection Test', () => {

  test('Check capability tags do not intersect subject area at 375, 768, 1280, and 1920px', async ({ page }) => {
    const viewports = [375, 768, 1280, 1920];

    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('http://localhost:3000/');
      await page.waitForSelector('#preloader', { state: 'detached', timeout: 10000 });

      const data = await page.evaluate((w) => {
        const canvasWrapper = document.getElementById('hero-canvas-wrapper');
        const canvas = document.getElementById('hero-canvas');
        const capCard = document.querySelector('.capabilities-card');
        const chips = Array.from(document.querySelectorAll('.capability-item'));

        const canvasRect = canvas ? canvas.getBoundingClientRect() : (canvasWrapper ? canvasWrapper.getBoundingClientRect() : null);
        const cardRect = capCard ? capCard.getBoundingClientRect() : null;

        // Subject area: horizontal center 40% of screen (30% to 70% of viewport width)
        const subjectLeft = Math.round(w * 0.30);
        const subjectRight = Math.round(w * 0.70);
        // Vertical subject bounds (middle portion of canvas where head/torso is)
        const canvasTop = canvasRect ? Math.round(canvasRect.y) : 0;
        const canvasBottom = canvasRect ? Math.round(canvasRect.y + canvasRect.height) : 900;
        const subjectTop = canvasTop + Math.round((canvasBottom - canvasTop) * 0.15);
        const subjectBottom = canvasTop + Math.round((canvasBottom - canvasTop) * 0.85);

        const chipData = chips.map(c => {
          const rect = c.getBoundingClientRect();
          const chipLeft = Math.round(rect.x);
          const chipRight = Math.round(rect.x + rect.width);
          const chipTop = Math.round(rect.y);
          const chipBottom = Math.round(rect.y + rect.height);

          // Horizontal overlap with subject center column
          const horizOverlap = Math.max(0, Math.min(chipRight, subjectRight) - Math.max(chipLeft, subjectLeft));
          // Vertical overlap with subject photo area
          const vertOverlap = Math.max(0, Math.min(chipBottom, subjectBottom) - Math.max(chipTop, subjectTop));
          const intersectsSubject = horizOverlap > 0 && vertOverlap > 0;

          return {
            text: c.textContent.trim(),
            rect: { x: chipLeft, y: chipTop, width: Math.round(rect.width), height: Math.round(rect.height) },
            horizOverlap,
            vertOverlap,
            intersectsSubject
          };
        });

        const intersectingChips = chipData.filter(c => c.intersectsSubject);

        return {
          viewportWidth: w,
          canvasRect: canvasRect ? { x: Math.round(canvasRect.x), y: Math.round(canvasRect.y), width: Math.round(canvasRect.width), height: Math.round(canvasRect.height) } : null,
          cardRect: cardRect ? { x: Math.round(cardRect.x), y: Math.round(cardRect.y), width: Math.round(cardRect.width), height: Math.round(cardRect.height) } : null,
          subjectBounds: { left: subjectLeft, right: subjectRight, top: subjectTop, bottom: subjectBottom },
          chipData,
          intersectingCount: intersectingChips.length,
          intersectingChips: intersectingChips.map(c => c.text)
        };
      }, width);

      console.log(`\n=================== VIEWPORT ${width}px ===================`);
      console.log('Canvas Rect:', JSON.stringify(data.canvasRect));
      console.log('Capabilities Card Rect:', JSON.stringify(data.cardRect));
      console.log('Subject Bounds:', JSON.stringify(data.subjectBounds));
      console.log('Intersecting Chips Count:', data.intersectingCount);
      if (data.intersectingCount > 0) {
        console.log('INTERSECTING CHIPS:', data.intersectingChips);
      }
      console.log('All Chips:', JSON.stringify(data.chipData, null, 2));

      expect(data.intersectingCount, `Viewport ${width}px has ${data.intersectingCount} chips intersecting subject face/torso: ${data.intersectingChips.join(', ')}`).toBe(0);
    }
  });

});
