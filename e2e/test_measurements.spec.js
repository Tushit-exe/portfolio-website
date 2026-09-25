import { test, expect } from '@playwright/test';

test.describe('Exact Bounding Box and Computed Style Measurements', () => {

  test('Check 375px, 768px, and 1440px layout measurements', async ({ page }) => {
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('http://localhost:3000/');
      
      // Wait until preloader is completely removed from DOM
      await page.waitForSelector('#preloader', { state: 'detached', timeout: 10000 });

      const results = await page.evaluate(() => {
        const viewWork = document.getElementById('btn-view-work');
        const getTouch = document.getElementById('btn-get-touch');
        const capTitle = document.querySelector('.capabilities-title');
        const capCardHeader = document.querySelector('.capabilities-card-header');
        const capChips = Array.from(document.querySelectorAll('.capability-item'));

        const vwRect = viewWork ? viewWork.getBoundingClientRect() : null;
        const gtRect = getTouch ? getTouch.getBoundingClientRect() : null;
        const titleRect = capTitle ? capTitle.getBoundingClientRect() : null;
        const headerRect = capCardHeader ? capCardHeader.getBoundingClientRect() : null;

        // Element from point at center of GET IN TOUCH button
        let topElementAtGetTouch = null;
        if (gtRect) {
          const centerX = gtRect.x + gtRect.width / 2;
          const centerY = gtRect.y + gtRect.height / 2;
          const el = document.elementFromPoint(centerX, centerY);
          topElementAtGetTouch = el ? { tag: el.tagName, id: el.id, className: String(el.className) } : null;
        }

        const chipStyles = capChips.map(c => {
          const style = window.getComputedStyle(c);
          const rect = c.getBoundingClientRect();
          return {
            text: c.textContent.trim(),
            opacity: style.opacity,
            visibility: style.visibility,
            display: style.display,
            rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
          };
        });

        return {
          vwRect: vwRect ? { x: Math.round(vwRect.x), y: Math.round(vwRect.y), width: Math.round(vwRect.width), height: Math.round(vwRect.height) } : null,
          gtRect: gtRect ? { x: Math.round(gtRect.x), y: Math.round(gtRect.y), width: Math.round(gtRect.width), height: Math.round(gtRect.height) } : null,
          titleRect: titleRect ? { x: Math.round(titleRect.x), y: Math.round(titleRect.y), width: Math.round(titleRect.width), height: Math.round(titleRect.height) } : null,
          headerRect: headerRect ? { x: Math.round(headerRect.x), y: Math.round(headerRect.y), width: Math.round(headerRect.width), height: Math.round(headerRect.height) } : null,
          topElementAtGetTouch,
          chipStyles
        };
      });

      console.log(`\n=================== VIEWPORT ${width}px ===================`);
      console.log('VIEW WORK Rect:', JSON.stringify(results.vwRect));
      console.log('GET IN TOUCH Rect:', JSON.stringify(results.gtRect));
      console.log('CAPABILITIES Title Rect:', JSON.stringify(results.titleRect));
      console.log('CAPABILITIES Header Rect:', JSON.stringify(results.headerRect));
      console.log('Top Element at GET IN TOUCH center:', JSON.stringify(results.topElementAtGetTouch));
      console.log('Chip Styles:', JSON.stringify(results.chipStyles, null, 2));

      // 1. Overlap Check between VIEW WORK & CAPABILITIES Header/Title
      if (results.vwRect && results.headerRect) {
        const xOverlap = Math.max(0, Math.min(results.vwRect.x + results.vwRect.width, results.headerRect.x + results.headerRect.width) - Math.max(results.vwRect.x, results.headerRect.x));
        const yOverlap = Math.max(0, Math.min(results.vwRect.y + results.vwRect.height, results.headerRect.y + results.headerRect.height) - Math.max(results.vwRect.y, results.headerRect.y));
        const isOverlapping = xOverlap > 0 && yOverlap > 0;
        console.log(`[VIEWPORT ${width}px] Overlap between VIEW WORK & CAPABILITIES Header: ${isOverlapping} (xOverlap=${xOverlap}px, yOverlap=${yOverlap}px)`);
        expect(isOverlapping).toBe(false);
      }

      if (results.gtRect && results.headerRect) {
        const xOverlap = Math.max(0, Math.min(results.gtRect.x + results.gtRect.width, results.headerRect.x + results.headerRect.width) - Math.max(results.gtRect.x, results.headerRect.x));
        const yOverlap = Math.max(0, Math.min(results.gtRect.y + results.gtRect.height, results.headerRect.y + results.headerRect.height) - Math.max(results.gtRect.y, results.headerRect.y));
        const isOverlapping = xOverlap > 0 && yOverlap > 0;
        console.log(`[VIEWPORT ${width}px] Overlap between GET IN TOUCH & CAPABILITIES Header: ${isOverlapping} (xOverlap=${xOverlap}px, yOverlap=${yOverlap}px)`);
        expect(isOverlapping).toBe(false);
      }

      // 2. Opacity Check for capability chips (always visible on mobile/tablet; scroll revealed on desktop)
      if (width < 1024) {
        for (const chip of results.chipStyles) {
          expect(chip.opacity).toBe("1");
          expect(chip.visibility).toBe("visible");
        }
      }

      // 3. GET IN TOUCH clickable check
      expect(results.topElementAtGetTouch).not.toBeNull();
      expect(['btn-get-touch', 'btn-solid', 'btn-link', 'SPAN', 'SVG', 'PATH', 'A', 'BUTTON']).toContain(results.topElementAtGetTouch.id || results.topElementAtGetTouch.tag);
    }
  });

});
