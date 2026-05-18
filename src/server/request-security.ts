import 'server-only';

import { requestOriginAllowed } from './request-security-core';

export function isSameOriginMutation(req: Request): boolean {
  return requestOriginAllowed({
    method: req.method,
    requestUrl: req.url,
    origin: req.headers.get('origin'),
    referer: req.headers.get('referer'),
    host: req.headers.get('host'),
    forwardedHost: req.headers.get('x-forwarded-host'),
    forwardedProto: req.headers.get('x-forwarded-proto'),
    appOrigin: process.env.APP_ORIGIN || null,
  });
}
