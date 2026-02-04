import 'server-only';

import * as logger from '@/server/logger';

type RequestContext = {
    operation?: string;
    table?: string;
    extra?: Record<string, unknown>;
};

/**
 * Safely execute a Directus request with logging on failure
 * Replaces silent .catch(() => []) patterns throughout the codebase
 */
export async function safeRequest<T>(
    promise: Promise<T>,
    fallback: T,
    context?: string | RequestContext
): Promise<T> {
    try {
        return await promise;
    } catch (error) {
        const ctx = typeof context === 'string' ? { operation: context } : context;
        const label = ctx?.operation ?? 'DirectusRequest';
        const details = ctx?.table ? ` [${ctx.table}]` : '';

        logger.warn(`[${label}]${details} Request failed`, {
            error: error instanceof Error ? error.message : String(error),
            ...(ctx?.extra ?? {}),
        });

        return fallback;
    }
}

/**
 * Safely execute a request, returning null on failure
 */
export async function safeRequestNullable<T>(
    promise: Promise<T>,
    context?: string | RequestContext
): Promise<T | null> {
    return safeRequest(promise, null as T | null, context);
}

/**
 * Safely execute a request, returning empty array on failure
 */
export async function safeRequestArray<T>(
    promise: Promise<T[]>,
    context?: string | RequestContext
): Promise<T[]> {
    return safeRequest(promise, [] as T[], context);
}
