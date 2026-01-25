export type StripHtmlOptions = {
  replaceNbsp?: boolean;
};

export function stripHtml(input: string, options?: StripHtmlOptions): string {
  if (!input) return '';
  let output = input.replace(/<[^>]+>/g, ' ');
  if (options?.replaceNbsp) {
    output = output.replace(/&nbsp;/gi, ' ');
  }
  return output.replace(/\s+/g, ' ').trim();
}

export type BuildExcerptOptions = {
  maxLength?: number;
  ellipsis?: string;
  replaceNbsp?: boolean;
};

export function buildExcerptFromHtml(
  input: string | null | undefined,
  options?: BuildExcerptOptions
): string {
  const plain = stripHtml(input ?? '', options?.replaceNbsp ? { replaceNbsp: true } : undefined);
  if (!plain) return '';
  const maxLength = options?.maxLength ?? 160;
  if (plain.length <= maxLength) return plain;
  const ellipsis = options?.ellipsis ?? '...';
  return `${plain.slice(0, maxLength).trimEnd()}${ellipsis}`;
}

export type PreviewTextOptions = {
  maxLength?: number;
  suffix?: string;
};

export function buildPreviewText(input: string, options?: PreviewTextOptions): string {
  const source = typeof input === 'string' ? input.trim() : '';
  if (!source) return '';
  const maxLength = options?.maxLength ?? 140;
  const trimmed = source.slice(0, maxLength).trimEnd();
  if (!trimmed) return '';
  return trimmed + (source.length > trimmed.length ? (options?.suffix ?? '.') : '');
}
