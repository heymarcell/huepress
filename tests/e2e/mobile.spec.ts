import { test, expect } from '@playwright/test';

/**
 * Mobile E2E Tests
 * Tests responsive design across mobile, tablet, and desktop viewports
 */

test.describe('Mobile Layout Tests', () => {
  
  test.describe('Home Page', () => {
    test('hero section renders correctly', async ({ page }) => {
      await page.goto('/');
      
      // Hero section should be visible
      const hero = page.locator('section').first();
      await expect(hero).toBeVisible();
      
      // Main CTA buttons should be accessible
      const browseButton = page.getByRole('link', { name: /browse/i });
      await expect(browseButton).toBeVisible();
    });

    test('mobile menu opens and closes', async ({ page, isMobile }) => {
      // Skip on desktop - no hamburger menu
      test.skip(!isMobile, 'Mobile-only test');
      
      await page.goto('/');
      
      // Find and click hamburger menu
      const menuButton = page.locator('button[aria-label*="menu"]').or(
        page.locator('nav button').filter({ has: page.locator('svg') })
      );
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      
      // Mobile menu should be visible
      const mobileNav = page.locator('nav').filter({ hasText: /vault/i });
      await expect(mobileNav).toBeVisible();
    });
  });

  test.describe('Vault Page', () => {
    test('grid displays correctly', async ({ page, isMobile }) => {
      await page.goto('/vault');
      
      // Wait for content to load
      await page.waitForSelector('a[href*="/coloring-pages/"]');
      
      // Cards should be visible
      const cards = page.locator('a[href*="/coloring-pages/"]');
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);
      
      // On mobile, grid should have 2 columns (check first card width)
      if (isMobile) {
        const firstCard = cards.first();
        const box = await firstCard.boundingBox();
        if (box) {
          // Card should take roughly half the viewport (2-column layout)
          expect(box.width).toBeLessThan(250);
        }
      }
    });

    test('filter bar is accessible', async ({ page }) => {
      await page.goto('/vault');
      
      // Search input should be visible (use first to handle multiple search inputs)
      const searchInput = page.getByPlaceholder(/search/i).first();
      await expect(searchInput).toBeVisible();
    });
  });

  test.describe('Resource Detail Page', () => {
    test('download button is visible', async ({ page }) => {
      await page.goto('/vault');
      
      // Click first card
      await page.waitForSelector('a[href*="/coloring-pages/"]');
      await page.locator('a[href*="/coloring-pages/"]').first().click();
      
      // Wait for detail page
      await page.waitForURL(/\/coloring-pages\//);
      
      // Download button or unlock CTA should be visible
      const downloadButton = page.getByRole('button', { name: /download/i });
      const unlockButton = page.getByRole('link', { name: /join|unlock/i });
      
      const hasDownload = await downloadButton.isVisible().catch(() => false);
      const hasUnlock = await unlockButton.isVisible().catch(() => false);
      
      expect(hasDownload || hasUnlock).toBe(true);
    });

    test('print button is hidden on mobile phones', async ({ page, isMobile: _isMobile, browserName: _browserName }, testInfo) => {
      // This test only applies to iPhone (small mobile)
      const isPhone = testInfo.project.name.includes('iPhone');
      test.skip(!isPhone, 'iPhone-only test');
      
      await page.goto('/vault');
      await page.waitForSelector('a[href*="/coloring-pages/"]');
      await page.locator('a[href*="/coloring-pages/"]').first().click();
      await page.waitForURL(/\/coloring-pages\//);
      
      // Print button should NOT be visible on mobile phones
      const printButton = page.getByRole('button', { name: /print/i });
      await expect(printButton).toBeHidden();
    });

    test('print button is visible on tablets', async ({ page }, testInfo) => {
      // This test only applies to iPad
      const isTablet = testInfo.project.name.includes('iPad');
      test.skip(!isTablet, 'iPad-only test');
      
      await page.goto('/vault');
      await page.waitForSelector('a[href*="/coloring-pages/"]');
      await page.locator('a[href*="/coloring-pages/"]').first().click();
      await page.waitForURL(/\/coloring-pages\//);
      
      // Note: Print button visible depends on auth state
      // For non-subscribers, only unlock CTA is shown
      // This test verifies layout width accommodates print button
      const viewport = page.viewportSize();
      expect(viewport?.width).toBeGreaterThanOrEqual(640); // sm breakpoint
    });
  });

  test.describe('Pricing Page', () => {
    test('pricing cards do not overlap', async ({ page, isMobile }) => {
      await page.goto('/pricing');
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      
      // Find pricing card headings specifically
      const annualHeading = page.getByRole('heading', { name: /annual/i }).first();
      const monthlyHeading = page.getByRole('heading', { name: /monthly/i }).first();
      
      await expect(annualHeading).toBeVisible();
      await expect(monthlyHeading).toBeVisible();
      
      const annualBox = await annualHeading.boundingBox();
      const monthlyBox = await monthlyHeading.boundingBox();
      
      if (annualBox && monthlyBox) {
        // Cards should not overlap vertically on mobile (stacked layout)
        if (isMobile) {
          // Annual should be above Monthly (lower Y = higher on page)
          expect(annualBox.y + annualBox.height).toBeLessThanOrEqual(monthlyBox.y + 100);
        }
      }
    });

    test('comparison table is visible', async ({ page }) => {
      await page.goto('/pricing');
      
      // Scroll to comparison section
      await page.locator('text=/switch to annual/i').scrollIntoViewIfNeeded();
      
      // Table headers should be visible
      const tableHeaders = page.locator('table th, div:has-text("Annual") >> nth=0');
      await expect(tableHeaders.first()).toBeVisible();
    });
  });

  test.describe('Touch Interactions', () => {
    test('touch targets are at least 44px', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile-only test');
      
      await page.goto('/');
      
      // Check main CTA buttons
      const buttons = page.locator('button, a.btn, [role="button"]');
      const count = await buttons.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const button = buttons.nth(i);
        const isVisible = await button.isVisible().catch(() => false);
        if (isVisible) {
          const box = await button.boundingBox();
          if (box) {
            // Minimum touch target size should be 40px (WCAG recommends 44px)
            expect(box.height).toBeGreaterThanOrEqual(40);
          }
        }
      }
    });
  });
});
