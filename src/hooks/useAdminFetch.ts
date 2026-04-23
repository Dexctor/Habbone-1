'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

export type UseAdminFetchOptions<T> = {
  /** If false, the hook will not auto-fetch on mount — caller must call refetch(). */
  auto?: boolean;
  /** Called with the parsed JSON before it is stored. Return the slice you want to keep. */
  select?: (raw: unknown) => T;
  /** Called once if the first fetch fails. Useful for toasts. */
  onError?: (error: Error) => void;
};

/**
 * Unified wrapper around fetch() for admin panels:
 *  - tracks loading / error / data in one place,
 *  - aborts in-flight requests when the component unmounts,
 *  - exposes a refetch() for manual reloads after mutations.
 *
 * Deliberately minimal — we don't bring in SWR/React Query yet because we only
 * need request-per-mount semantics.
 */
export function useAdminFetch<T = unknown>(
  url: string | null,
  options: UseAdminFetchOptions<T> = {},
) {
  const { auto = true, select, onError } = options;

  const [state, setState] = useState<FetchState<T>>({ data: null, loading: false, error: null });

  // Store the latest `select` / `onError` in refs so we don't re-fetch when they change identity.
  const selectRef = useRef(select);
  const onErrorRef = useRef(onError);
  selectRef.current = select;
  onErrorRef.current = onError;

  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    if (!url) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: unknown = await res.json();
      const data = selectRef.current ? selectRef.current(raw) : (raw as T);
      if (controller.signal.aborted) return;
      setState({ data, loading: false, error: null });
    } catch (err) {
      if (controller.signal.aborted) return;
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ data: null, loading: false, error });
      onErrorRef.current?.(error);
    }
  }, [url]);

  useEffect(() => {
    if (auto) void run();
    return () => abortRef.current?.abort();
  }, [auto, run]);

  return { ...state, refetch: run } as const;
}
