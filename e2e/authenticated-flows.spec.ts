import { expect, test } from '@playwright/test';
import { readCredentials, signInWithCredentials } from './support/auth';

const userCredentials = readCredentials('E2E_USER');
const adminCredentials = readCredentials('E2E_ADMIN');

test.describe('authenticated user flows', () => {
  test.skip(!userCredentials, 'Set E2E_USER_NICK and E2E_USER_PASSWORD to run authenticated user e2e tests.');

  test('user can sign in and access profile and settings', async ({ page }) => {
    await signInWithCredentials(page, userCredentials!);

    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.locator('body')).toContainText(/profil|articles|sujets|parametres|paramètres/i);

    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator('body')).toContainText(/mot de passe|twitter|parametres|paramètres/i);
  });
});

test.describe('authenticated admin flows', () => {
  test.skip(!adminCredentials, 'Set E2E_ADMIN_NICK and E2E_ADMIN_PASSWORD to run admin e2e tests.');

  test('admin can open dashboard without being redirected away', async ({ page }) => {
    await signInWithCredentials(page, adminCredentials!);

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('body')).toContainText(/admin|articles|utilisateurs|forum|commentaires/i);
  });
});
