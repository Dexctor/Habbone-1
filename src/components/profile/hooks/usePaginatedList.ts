'use client';

import { useMemo, useState, useCallback } from 'react';

/**
 * Generic pagination hook for lists
 * Reduces duplication of pagination logic in ProfileClient and similar components
 */
export function usePaginatedList<T>(items: T[], pageSize = 100) {
    const [page, setPage] = useState(1);

    const visible = useMemo(
        () => items.slice(0, page * pageSize),
        [items, page, pageSize]
    );

    const hasMore = items.length > visible.length;
    const remaining = Math.min(pageSize, items.length - visible.length);

    const loadMore = useCallback(() => {
        setPage((p) => p + 1);
    }, []);

    const reset = useCallback(() => {
        setPage(1);
    }, []);

    return {
        /** Currently visible items (paginated) */
        visible,
        /** Whether there are more items to load */
        hasMore,
        /** Number of items remaining to load (up to pageSize) */
        remaining,
        /** Load next page of items */
        loadMore,
        /** Reset pagination to first page */
        reset,
        /** Current page number */
        page,
    };
}

export type UsePaginatedListReturn<T> = ReturnType<typeof usePaginatedList<T>>;
