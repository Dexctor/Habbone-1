export function requestOriginAllowed(input: {
  method: string;
  requestUrl: string;
  origin?: string | null;
  referer?: string | null;
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  appOrigin?: string | null;
}): boolean {
  const method = input.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

  const source = input.origin || input.referer || '';
  if (!source) return true;

  let sourceOrigin: string;
  try {
    sourceOrigin = new URL(source).origin;
  } catch {
    return false;
  }

  const allowed = new Set<string>();
  if (input.appOrigin) {
    try { allowed.add(new URL(input.appOrigin).origin); } catch {}
  }

  const host = input.forwardedHost || input.host;
  if (host) {
    const proto = input.forwardedProto || new URL(input.requestUrl).protocol.replace(':', '') || 'https';
    allowed.add(`${proto}://${host}`);
  }

  try { allowed.add(new URL(input.requestUrl).origin); } catch {}

  return allowed.has(sourceOrigin);
}
