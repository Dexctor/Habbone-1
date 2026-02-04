/**
 * Date Utilities
 * Consolidated date parsing and formatting functions
 */

export type TimestampParseOptions = {
  numeric?: 'ms' | 'auto';
  numericString?: 'parse' | 'number';
  mysqlLike?: boolean;
};

/**
 * Parse any value into a timestamp (milliseconds)
 * Handles: Date objects, numbers (ms or seconds), ISO strings, MySQL-like strings
 */
export function parseTimestamp(value: unknown, options?: TimestampParseOptions): number {
  const numericMode = options?.numeric ?? 'ms';
  const numericString = options?.numericString ?? 'parse';
  const allowMysqlLike = options?.mysqlLike === true;

  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return numericMode === 'auto' ? (value > 1e12 ? value : value * 1000) : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    if (numericString === 'number') {
      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) {
        return numericMode === 'auto' ? (numeric > 1e12 ? numeric : numeric * 1000) : numeric;
      }
    }
    let parsed = Date.parse(trimmed);
    if (Number.isNaN(parsed) && allowMysqlLike) {
      const mysqlLike = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
      if (mysqlLike) {
        parsed = Date.parse(`${mysqlLike[1]}T${mysqlLike[2]}Z`);
      }
    }
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// ============================================================================
// Unified Date Formatting
// ============================================================================

export type DateFormatStyle = 'short' | 'medium' | 'long' | 'date-only';

export type DateFormatOptions = {
  locale?: string;
  style?: DateFormatStyle;
  fallback?: string;
};

const FORMAT_CONFIGS: Record<DateFormatStyle, Intl.DateTimeFormatOptions> = {
  short: { dateStyle: 'short', timeStyle: 'short' },
  medium: { dateStyle: 'medium', timeStyle: 'short' },
  long: { dateStyle: 'long', timeStyle: 'medium' },
  'date-only': { day: '2-digit', month: '2-digit', year: 'numeric' },
};

/**
 * Unified date formatting function
 * Replaces: formatDateTimeFlexible, formatDateTimeSmart, formatDateTimeLoose, etc.
 */
export function formatDateTime(
  value: unknown,
  options: DateFormatOptions = {}
): string {
  const { locale = 'fr-FR', style = 'medium', fallback = '' } = options;
  const ts = parseTimestamp(value, { numeric: 'auto', numericString: 'number', mysqlLike: true });
  if (!ts) return fallback;

  try {
    return new Intl.DateTimeFormat(locale, FORMAT_CONFIGS[style]).format(ts);
  } catch {
    return fallback;
  }
}

/**
 * Format date only (no time) in French format
 */
export function formatDateFr(value: unknown): string | null {
  const ts = parseTimestamp(value, { numeric: 'ms', numericString: 'parse' });
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

// ============================================================================
// Legacy Aliases (for backward compatibility)
// These delegate to the unified function to avoid breaking existing code
// ============================================================================

/** @deprecated Use formatDateTime(value) instead */
export function formatDateTimeFlexible(value?: unknown): string {
  return formatDateTime(value, { style: 'medium' });
}

/** @deprecated Use formatDateTime(value, { style: 'short' }) instead */
export function formatDateTimeShortFr(value?: unknown): string {
  return formatDateTime(value, { locale: 'fr-FR', style: 'short' });
}

/** @deprecated Use formatDateTime(value) instead */
export function formatDateTimeSmart(value?: string | number | null): string {
  return formatDateTime(value, { style: 'medium' });
}

/** @deprecated Use formatDateTime(value, { fallback: String(value) }) instead */
export function formatDateTimeLoose(value?: string | number | null): string {
  if (value == null || value === '') return '';
  return formatDateTime(value, { fallback: String(value) });
}

/** @deprecated Use formatDateTime(value) instead */
export function formatDateTimeNative(value: unknown): string {
  if (value == null) return '';
  return formatDateTime(value, { fallback: String(value) });
}

/** @deprecated Use formatDateTime(value) instead */
export function formatDateTimeFromString(value?: string | null): string {
  return formatDateTime(value);
}

/** @deprecated Use formatDateTime(value) instead */
export function formatDateTimeFromAny(value?: string | number | null): string {
  return formatDateTime(value);
}

/** @deprecated Use formatDateFr(value) instead */
export function formatDateShortFr(value?: unknown): string | null {
  return formatDateFr(value);
}
