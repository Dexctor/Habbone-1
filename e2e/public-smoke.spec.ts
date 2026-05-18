import { expect, test } from '@playwright/test';

const publicPages = [
  { path: '/', heading: /habbone|articles|forum|badges|ranking/i },
  { path: '/boutique', heading: /boutique/i },
  { path: '/news', heading: /articles|actualites|news/i },
  { path: '/forum', heading: /forum|habbone|extras|habbo/i },
  { path: '/badges', heading: /badges/i },
  { path: '/mobis', heading: /mobis|recherche/i },
  { path: '/imager', heading: /avatar|imager|generateur/i },
  { path: '/pseudohabbo', heading: /pseudo|habbo/i },
  { path: '/partenaires', heading: /partenaires/i },
  { path: '/team', heading: /equipe|team|staff/i },
];

test.describe('public pages', () => {
  for (const { path, heading } of publicPages) {
    test(`${path} renders without a server error`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

      expect(response, `no response for ${path}`).toBeTruthy();
      expect(response?.status(), `${path} returned ${response?.status()}`).toBeLessThan(500);
      await expect(page).toHaveTitle(/Habbone/i);
      await expect(page.locator('body')).toContainText(heading);
    });
  }
});
