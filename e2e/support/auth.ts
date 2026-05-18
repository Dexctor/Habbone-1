import { expect, type Page } from '@playwright/test';

type Credentials = {
  nick: string;
  password: string;
};

export function readCredentials(prefix: 'E2E_USER' | 'E2E_ADMIN'): Credentials | null {
  const nick = process.env[`${prefix}_NICK`]?.trim();
  const password = process.env[`${prefix}_PASSWORD`];
  if (!nick || !password) return null;
  return { nick, password };
}

export async function signInWithCredentials(page: Page, credentials: Credentials) {
  const csrfResponse = await page.request.get('/api/auth/csrf');
  expect(csrfResponse.ok()).toBeTruthy();
  const csrf = (await csrfResponse.json()) as { csrfToken?: string };
  expect(csrf.csrfToken).toBeTruthy();

  const loginResponse = await page.request.post('/api/auth/callback/credentials', {
    form: {
      csrfToken: csrf.csrfToken || '',
      nick: credentials.nick,
      password: credentials.password,
      redirect: 'false',
      json: 'true',
    },
  });

  expect(loginResponse.status(), await loginResponse.text().catch(() => '')).toBeLessThan(400);
}
