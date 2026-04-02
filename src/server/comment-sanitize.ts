import sanitizeHtml from 'sanitize-html';
import { stripHtml } from '@/lib/text-utils';

type SanitizedComment = {
  sanitizedHtml: string;
  plain: string;
};

/* ── Emoji encoding for latin1 DB compatibility ────────────────── */
// latin1 cannot store emojis (4-byte UTF-8). We encode them as HTML
// numeric entities (&#x1F600;) before storage and decode on read.

export function encodeEmojis(text: string): string {
  return text.replace(
    /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu,
    (char) => `&#x${char.codePointAt(0)!.toString(16).toUpperCase()};`,
  );
}

export function decodeEmojis(text: string): string {
  return text.replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16)),
  );
}

/* ── Comment sanitization (restrictive) ─────────────────────────── */

export function sanitizeCommentHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'span'],
    allowedAttributes: {
      a: ['href', 'title', 'rel'],
      span: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener noreferrer' }),
    },
  });
}

export function extractPlainCommentText(html: string): string {
  return stripHtml(html, { replaceNbsp: true });
}

export function sanitizeCommentBody(html: string): SanitizedComment {
  const sanitizedHtml = encodeEmojis(sanitizeCommentHtml(html));
  const plain = extractPlainCommentText(sanitizedHtml);
  return { sanitizedHtml, plain };
}

/* ── Rich-content sanitization (news articles, forum topics) ────── */

export function sanitizeRichContentHtml(html: string): string {
  return encodeEmojis(sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
      'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code',
      'a', 'img', 'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 'sub', 'sup', 'mark',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'rel', 'target'],
      img: ['src', 'alt', 'width', 'height'],
      span: ['class', 'style'],
      div: ['class'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      code: ['class'],
      pre: ['class'],
    },
    allowedStyles: {
      span: { 'color': [/.*/], 'background-color': [/.*/], 'text-align': [/.*/] },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener noreferrer' }),
    },
  }));
}

export function sanitizePlainText(text: string): string {
  return encodeEmojis(sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim());
}
