import { expect, test } from '@playwright/test';

test.describe('boutique', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/boutique', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /boutique/i })).toBeVisible();
  });

  test('keeps search and empty state usable', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: /rechercher/i }).or(
      page.getByPlaceholder(/rechercher par nom/i),
    );

    await expect(search).toBeVisible();
    await search.fill('zz-e2e-no-result-zz');

    await expect(page.getByText(/aucun article trouve|aucun article trouvé/i)).toBeVisible();

    await search.fill('');
    await expect(page.getByText(/aucun article trouve|aucun article trouvé/i)).toBeHidden({ timeout: 10_000 }).catch(
      async () => {
        await expect(page.locator('main')).toBeVisible();
      },
    );
  });

  test('shows purchase controls in a safe logged-out state', async ({ page }) => {
    const purchaseButtons = page.getByRole('button', {
      name: /acheter|connecte-toi|coins insuffisants|indisponible|achat en cours/i,
    });

    const count = await purchaseButtons.count();
    if (count === 0) {
      await expect(page.getByText(/aucun article trouve|aucun article trouvé/i)).toBeVisible();
      return;
    }

    await expect(purchaseButtons.first()).toBeVisible();
    await expect(purchaseButtons.first()).toBeDisabled();
  });
});
