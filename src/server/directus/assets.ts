import 'server-only';

import { directusUrl, serviceToken } from './client';

export function getDirectusAssetUrl(id: string | number): string {
  return `${directusUrl}/assets/${encodeURIComponent(String(id))}`;
}

export async function uploadDirectusAsset(
  file: File,
  filename: string,
  mimeType: string,
  options?: { folderId?: string | null },
): Promise<{ id: string }> {
  const safeName = filename?.trim() || `asset-${Date.now()}`;
  const formData = new FormData();
  formData.set('file', file, safeName);
  formData.set('title', safeName);
  if (options?.folderId) formData.set('folder', options.folderId);

  const response = await fetch(`${directusUrl}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceToken}` },
    body: formData,
  }).catch((error: unknown) => {
    throw new Error(`UPLOAD_NETWORK_ERROR: ${error instanceof Error ? error.message : String(error)}`);
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`UPLOAD_FAILED: ${response.status} ${body}`);
  }

  const json = (await response.json().catch(() => ({}))) as Record<string, any>;
  const data = (json?.data ?? json) as Record<string, any>;
  const id = data?.id ?? null;
  if (!id) throw new Error('UPLOAD_FAILED_NO_ID');
  return { id: String(id) };
}
