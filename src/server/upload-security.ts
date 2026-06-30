// Pure helpers — no Next.js runtime dependencies. Safe to import from both
// server routes and unit tests running under plain Node.
import sanitizeHtml from 'sanitize-html';
import { formatFileSize } from './upload-policies';

/**
 * Magic bytes signature checks for common image formats.
 * We refuse to trust `file.type` alone because the browser forwards
 * whatever Content-Type the client sets.
 */
const MAGIC_BYTES: Array<{ mime: string; matches: (bytes: Uint8Array) => boolean }> = [
  {
    mime: 'image/png',
    matches: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    mime: 'image/jpeg',
    matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/gif',
    matches: (b) =>
      b.length >= 6 &&
      b[0] === 0x47 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x38 &&
      (b[4] === 0x37 || b[4] === 0x39) &&
      b[5] === 0x61,
  },
  {
    mime: 'image/webp',
    matches: (b) =>
      b.length >= 12 &&
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
];

function looksLikeSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.slice(0, 1024))
    .trim()
    .toLowerCase();
  return head.startsWith('<?xml') || head.startsWith('<svg');
}

export type UploadValidationResult =
  | { ok: true; detectedMime: string; buffer: Buffer; width?: number; height?: number; frames?: number }
  | { ok: false; code: string; error: string };

export type UploadValidationOptions = {
  allowedMimes: Set<string>;
  maxSize: number;
  allowSvg?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  maxPixels?: number;
  maxFrames?: number;
};

/**
 * Validates an uploaded file by:
 *  1. checking the size bounds,
 *  2. detecting the real MIME via magic bytes,
 *  3. rejecting mismatches between the declared and detected type,
 *  4. sanitising SVG payloads (or rejecting them if opted out).
 */
export async function validateUploadedFile(
  file: File,
  opts: UploadValidationOptions,
): Promise<UploadValidationResult> {
  if (file.size <= 0 || file.size > opts.maxSize) {
    return {
      ok: false,
      code: 'INVALID_FILE_SIZE',
      error: file.size <= 0 ? 'Fichier vide' : `Fichier trop volumineux (max ${formatFileSize(opts.maxSize)})`,
    };
  }

  const declaredMime = (file.type || '').toLowerCase();
  if (!opts.allowedMimes.has(declaredMime)) {
    return { ok: false, code: 'UNSUPPORTED_FILE_TYPE', error: `Type non autorisé: ${declaredMime || 'inconnu'}` };
  }

  const arrayBuf = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf);
  let detectedMime: string | null = null;
  for (const sig of MAGIC_BYTES) {
    if (sig.matches(bytes)) {
      detectedMime = sig.mime;
      break;
    }
  }
  if (!detectedMime && looksLikeSvg(bytes)) {
    detectedMime = 'image/svg+xml';
  }

  if (!detectedMime) {
    return { ok: false, code: 'UNRECOGNISED_FILE', error: 'Format de fichier non reconnu' };
  }

  // Declared MIME must match what the bytes actually are.
  if (declaredMime !== detectedMime) {
    return { ok: false, code: 'MIME_MISMATCH', error: 'Le type déclaré ne correspond pas au contenu' };
  }

  if (detectedMime === 'image/svg+xml') {
    if (opts.allowSvg === false) {
      return { ok: false, code: 'SVG_FORBIDDEN', error: 'Les fichiers SVG ne sont pas autorisés ici' };
    }
    const sanitizedBuffer = await sanitiseSvgBuffer(bytes);
    if (!sanitizedBuffer) {
      return { ok: false, code: 'SVG_UNSAFE', error: 'SVG contenant du code exécutable' };
    }
    return { ok: true, detectedMime, buffer: sanitizedBuffer };
  }

  const buffer = Buffer.from(bytes);
  const dimensions = await validateRasterDimensions(buffer, detectedMime, opts);
  if (!dimensions.ok) return dimensions;

  return {
    ok: true,
    detectedMime,
    buffer,
    width: dimensions.width,
    height: dimensions.height,
    frames: dimensions.frames,
  };
}

type RasterDimensionResult =
  | { ok: true; width?: number; height?: number; frames?: number }
  | { ok: false; code: string; error: string };

async function validateRasterDimensions(
  buffer: Buffer,
  detectedMime: string,
  opts: UploadValidationOptions,
): Promise<RasterDimensionResult> {
  const shouldInspect =
    opts.maxWidth !== undefined ||
    opts.maxHeight !== undefined ||
    opts.maxPixels !== undefined ||
    opts.maxFrames !== undefined;

  if (!shouldInspect) return { ok: true };

  let metadata: { width?: number; height?: number; pages?: number; pageHeight?: number } | null = null;
  try {
    const { default: sharp } = await import('sharp');
    metadata = await sharp(buffer, {
      animated: detectedMime === 'image/gif',
      limitInputPixels: false,
    }).metadata();
  } catch {
    return { ok: false, code: 'IMAGE_METADATA_ERROR', error: 'Impossible de lire les dimensions de l’image' };
  }

  const width = metadata?.width;
  const height = detectedMime === 'image/gif' && metadata?.pageHeight ? metadata.pageHeight : metadata?.height;
  if (!width || !height) {
    return { ok: false, code: 'IMAGE_METADATA_ERROR', error: 'Dimensions de l’image introuvables' };
  }

  if (opts.maxWidth !== undefined && width > opts.maxWidth) {
    return {
      ok: false,
      code: 'IMAGE_TOO_WIDE',
      error: `Image trop large (${width}px, max ${opts.maxWidth}px)`,
    };
  }

  if (opts.maxHeight !== undefined && height > opts.maxHeight) {
    return {
      ok: false,
      code: 'IMAGE_TOO_TALL',
      error: `Image trop haute (${height}px, max ${opts.maxHeight}px)`,
    };
  }

  if (opts.maxPixels !== undefined && width * height > opts.maxPixels) {
    return {
      ok: false,
      code: 'IMAGE_TOO_LARGE_DIMENSIONS',
      error: `Image trop grande (${width}x${height}px)`,
    };
  }

  const frames = detectedMime === 'image/gif' ? metadata?.pages : undefined;
  if (opts.maxFrames !== undefined && frames !== undefined && frames > opts.maxFrames) {
    return {
      ok: false,
      code: 'GIF_TOO_MANY_FRAMES',
      error: `GIF trop long (${frames} frames, max ${opts.maxFrames})`,
    };
  }

  return { ok: true, width, height, frames };
}

async function sanitiseSvgBuffer(bytes: Uint8Array): Promise<Buffer | null> {
  const raw = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  // Hard-refuse scripts, event handlers or external refs before letting sanitize-html
  // run — defence in depth.
  const hasScript = /<script\b/i.test(raw);
  const hasEvent = /\son[a-z]+\s*=\s*["']?/i.test(raw);
  const hasExternal = /xlink:href\s*=\s*["'](?!#)/i.test(raw) || /href\s*=\s*["']javascript:/i.test(raw);
  if (hasScript || hasEvent || hasExternal) return null;

  const sanitised = sanitizeHtml(raw, {
    allowedTags: [
      'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline',
      'polygon', 'text', 'tspan', 'title', 'desc', 'defs', 'linearGradient',
      'radialGradient', 'stop', 'clipPath', 'mask', 'pattern', 'use', 'symbol',
    ],
    allowedAttributes: {
      '*': [
        'id', 'class', 'viewBox', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
        'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'fill', 'stroke', 'stroke-width',
        'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity',
        'transform', 'style', 'offset', 'stop-color', 'stop-opacity', 'gradientUnits',
        'gradientTransform', 'xmlns', 'xmlns:xlink', 'preserveAspectRatio', 'clip-path',
        'mask', 'text-anchor', 'dominant-baseline', 'font-family', 'font-size',
        'font-weight', 'letter-spacing',
      ],
      use: ['href'],
    },
    parser: { lowerCaseTags: false, lowerCaseAttributeNames: false },
  });

  if (!sanitised.trim()) return null;
  return Buffer.from(sanitised, 'utf-8');
}
