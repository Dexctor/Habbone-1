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

// Kept for potential future use (reverse of encodeEmojis)
function decodeEmojis(text: string): string {
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
      // Sur les <a>, on autorise data-roomid (chiffres uniquement) et la
      // classe roomid-chip pour les chips RoomID Habbo cliquables.
      a: ['href', 'title', 'rel', 'target', 'class', 'data-roomid'],
      img: ['src', 'alt', 'width', 'height'],
      span: ['class', 'style'],
      div: ['class'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      code: ['class'],
      pre: ['class'],
    },
    allowedClasses: {
      a: ['roomid-chip'],
    },
    allowedStyles: {
      span: {
        'color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/, /^[a-z]{3,20}$/],
        'background-color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/, /^[a-z]{3,20}$/],
        'text-align': [/^(left|center|right|justify)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
    transformTags: {
      a: (tagName, attribs) => {
        const next: Record<string, string> = { ...attribs };
        next.rel = 'nofollow noopener noreferrer';
        // Si data-roomid est présent, on n'accepte que des chiffres. Sinon
        // on retire l'attribut pour ne pas laisser passer du contenu arbitraire.
        if (next['data-roomid']) {
          const cleaned = String(next['data-roomid']).replace(/[^0-9]/g, '').slice(0, 12);
          if (cleaned) next['data-roomid'] = cleaned;
          else delete next['data-roomid'];
        }
        return { tagName, attribs: next };
      },
    },
  }));
}

export function sanitizePlainText(text: string): string {
  return encodeEmojis(sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim());
}
