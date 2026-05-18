export type DirectusAtomicFilter = Record<string, Record<string, string | number | boolean>>;

export function buildDirectusConditionalPatchBody(
  filter: DirectusAtomicFilter,
  patch: Record<string, unknown>,
) {
  return {
    data: patch,
    query: { filter },
  };
}

export function hasDirectusUpdatedRows(payload: unknown): boolean {
  const data = (payload as { data?: unknown })?.data;
  if (Array.isArray(data)) return data.length > 0;
  return !!data;
}
