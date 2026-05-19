import 'server-only';

import { randomUUID } from 'node:crypto';

function getSupabaseUrl(): string {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
  if (!url) throw new Error('SUPABASE_URL manquant');
  return url;
}

function getServiceRoleKey(): string {
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant');
  return key;
}

export function getSupabaseUploadsBucket(): string {
  return (process.env.SUPABASE_UPLOADS_BUCKET || 'directus-uploads').trim() || 'directus-uploads';
}

export function getSupabasePublicObjectUrl(path: string, bucket = getSupabaseUploadsBucket()): string {
  const safePath = String(path || '').split('/').map(encodeURIComponent).join('/');
  return `${getSupabaseUrl()}/storage/v1/object/public/${encodeURIComponent(bucket)}/${safePath}`;
}

function cleanPathSegment(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .join('-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function extensionFromFilename(filename: string): string {
  const match = /\.([a-zA-Z0-9]{1,8})$/.exec(filename);
  return match ? `.${match[1].toLowerCase()}` : '';
}

export async function uploadSupabaseObject(input: {
  file: File;
  filename: string;
  mimeType: string;
  prefix?: string;
  bucket?: string;
}): Promise<{ id: string; path: string; url: string }> {
  const bucket = input.bucket || getSupabaseUploadsBucket();
  const prefix = cleanPathSegment(input.prefix || 'uploads');
  const filename = cleanPathSegment(input.filename || `upload-${Date.now()}`) || `upload-${Date.now()}`;
  const ext = extensionFromFilename(filename);
  const objectName = `${Date.now()}-${randomUUID()}${ext}`;
  const path = prefix ? `${prefix}/${objectName}` : objectName;

  const response = await fetch(
    `${getSupabaseUrl()}/storage/v1/object/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getServiceRoleKey()}`,
        apikey: getServiceRoleKey(),
        'Content-Type': input.mimeType || input.file.type || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: input.file,
      cache: 'no-store',
    },
  ).catch((error: unknown) => {
    throw new Error(`SUPABASE_UPLOAD_NETWORK_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`SUPABASE_UPLOAD_FAILED: ${response.status} ${body}`);
  }

  return { id: path, path, url: getSupabasePublicObjectUrl(path, bucket) };
}

export async function uploadSupabaseJson(input: {
  path: string;
  data: unknown;
  bucket?: string;
}): Promise<{ path: string; url: string }> {
  const bucket = input.bucket || getSupabaseUploadsBucket();
  const path = input.path.split('/').map(cleanPathSegment).filter(Boolean).join('/');
  const payload = `${JSON.stringify(input.data, null, 2)}\n`;

  const response = await fetch(
    `${getSupabaseUrl()}/storage/v1/object/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getServiceRoleKey()}`,
        apikey: getServiceRoleKey(),
        'Content-Type': 'application/json',
        'x-upsert': 'true',
      },
      body: payload,
      cache: 'no-store',
    },
  ).catch((error: unknown) => {
    throw new Error(`SUPABASE_JSON_UPLOAD_NETWORK_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`SUPABASE_JSON_UPLOAD_FAILED: ${response.status} ${body}`);
  }

  return { path, url: getSupabasePublicObjectUrl(path, bucket) };
}

export async function readSupabaseJson<T>(path: string, fallback: T, bucket = getSupabaseUploadsBucket()): Promise<T> {
  const safePath = path.split('/').map(cleanPathSegment).filter(Boolean).join('/');
  const response = await fetch(
    `${getSupabaseUrl()}/storage/v1/object/${encodeURIComponent(bucket)}/${safePath.split('/').map(encodeURIComponent).join('/')}`,
    {
      headers: {
        Authorization: `Bearer ${getServiceRoleKey()}`,
        apikey: getServiceRoleKey(),
      },
      cache: 'no-store',
    },
  ).catch(() => null);

  if (!response?.ok) return fallback;
  const json = await response.json().catch(() => fallback);
  return json as T;
}
