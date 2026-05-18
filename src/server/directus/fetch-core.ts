export type DirectusQueryParams = Record<string, string | string[]>;

export function appendDirectusParams(url: URL, params?: DirectusQueryParams): URL {
  if (!params) return url;

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, value);
    }
  }

  return url;
}
