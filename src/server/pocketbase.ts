import 'server-only';

type PocketBaseAuthResponse = {
  token?: string;
};

type PocketBaseRequestInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown>;
  auth?: boolean;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

export function getPocketBaseUrl(): string {
  const url = (process.env.POCKETBASE_URL || '').trim().replace(/\/$/, '');
  if (!url) throw new Error('POCKETBASE_URL manquant');
  return url;
}

export function isPocketBaseConfigured(): boolean {
  return Boolean((process.env.POCKETBASE_URL || '').trim());
}

function getPocketBaseAdminCredentials(): { email: string; password: string } {
  const email = (process.env.POCKETBASE_ADMIN_EMAIL || '').trim();
  const password = (process.env.POCKETBASE_ADMIN_PASSWORD || '').trim();
  if (!email || !password) throw new Error('POCKETBASE_ADMIN_EMAIL ou POCKETBASE_ADMIN_PASSWORD manquant');
  return { email, password };
}

async function authWithPassword(path: string, body: Record<string, unknown>): Promise<string | null> {
  const response = await fetch(`${getPocketBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  }).catch(() => null);

  if (!response?.ok) return null;
  const data = (await response.json().catch(() => null)) as PocketBaseAuthResponse | null;
  return data?.token || null;
}

export async function getPocketBaseAdminToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token;

  const { email, password } = getPocketBaseAdminCredentials();
  const token =
    (await authWithPassword('/api/collections/_superusers/auth-with-password', {
      identity: email,
      password,
    })) ||
    (await authWithPassword('/api/admins/auth-with-password', {
      identity: email,
      email,
      password,
    }));

  if (!token) throw new Error('POCKETBASE_ADMIN_AUTH_FAILED');

  cachedToken = {
    token,
    expiresAt: Date.now() + 20 * 60_000,
  };
  return token;
}

export async function pocketBaseRequest<T>(path: string, init: PocketBaseRequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const useAuth = init.auth !== false;
  let body = init.body;

  if (useAuth) {
    headers.set('Authorization', `Bearer ${await getPocketBaseAdminToken()}`);
  }

  if (body && !(body instanceof FormData) && !(body instanceof Blob) && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  const response = await fetch(`${getPocketBaseUrl()}${path}`, {
    ...init,
    headers,
    body: body as BodyInit | undefined,
    cache: 'no-store',
  }).catch((error: unknown) => {
    throw new Error(`POCKETBASE_NETWORK_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`POCKETBASE_REQUEST_FAILED: ${response.status} ${text}`);
  }

  return (await response.json().catch(() => ({}))) as T;
}

export function pocketBaseFileUrl(collection: string, recordId: string, filename: string): string {
  return `${getPocketBaseUrl()}/api/files/${encodeURIComponent(collection)}/${encodeURIComponent(recordId)}/${encodeURIComponent(filename)}`;
}
