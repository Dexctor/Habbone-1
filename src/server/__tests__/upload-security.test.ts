/**
 * Unit tests for upload-security.ts.
 *
 * Run with:
 *   npx tsx --test src/server/__tests__/upload-security.test.ts
 *
 * Node's built-in `node:test` runner is used deliberately so we don't have to
 * pull in jest/vitest + their configs. The helper module is otherwise pure and
 * easy to feed synthetic File objects to.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { validateUploadedFile } from '../upload-security';

const PNG_MAGIC = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);
const JPEG_MAGIC = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const GIF_MAGIC = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]);

const ALLOWED_IMAGE = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const ALLOWED_WITH_SVG = new Set([...ALLOWED_IMAGE, 'image/svg+xml']);

function fileFrom(bytes: Uint8Array, mime: string, name = 'test'): File {
  // Slice into a fresh ArrayBuffer so TypeScript sees ArrayBuffer, not ArrayBufferLike.
  const buf = bytes.slice().buffer as ArrayBuffer;
  return new File([buf], name, { type: mime });
}

describe('validateUploadedFile', () => {
  it('accepts a PNG that matches its declared type', async () => {
    const result = await validateUploadedFile(fileFrom(PNG_MAGIC, 'image/png'), {
      allowedMimes: ALLOWED_IMAGE,
      maxSize: 1024,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.detectedMime, 'image/png');
  });

  it('accepts a JPEG', async () => {
    const result = await validateUploadedFile(fileFrom(JPEG_MAGIC, 'image/jpeg'), {
      allowedMimes: ALLOWED_IMAGE,
      maxSize: 1024,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.detectedMime, 'image/jpeg');
  });

  it('rejects empty files', async () => {
    const empty = new File([], 'empty.png', { type: 'image/png' });
    const result = await validateUploadedFile(empty, {
      allowedMimes: ALLOWED_IMAGE,
      maxSize: 1024,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'INVALID_FILE_SIZE');
  });

  it('rejects oversized files', async () => {
    const big = new Uint8Array(2048);
    big.set(PNG_MAGIC);
    const result = await validateUploadedFile(fileFrom(big, 'image/png'), {
      allowedMimes: ALLOWED_IMAGE,
      maxSize: 1024,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'INVALID_FILE_SIZE');
  });

  it('rejects when declared type is not in the allowed set', async () => {
    const result = await validateUploadedFile(fileFrom(PNG_MAGIC, 'image/bmp'), {
      allowedMimes: ALLOWED_IMAGE,
      maxSize: 1024,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'UNSUPPORTED_FILE_TYPE');
  });

  it('rejects MIME mismatch (SVG disguised as PNG)', async () => {
    const svgPayload = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const result = await validateUploadedFile(fileFrom(svgPayload, 'image/png'), {
      allowedMimes: ALLOWED_WITH_SVG,
      maxSize: 4096,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'MIME_MISMATCH');
  });

  it('rejects unrecognised bytes even with a whitelisted MIME', async () => {
    const junk = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
    const result = await validateUploadedFile(fileFrom(junk, 'image/png'), {
      allowedMimes: ALLOWED_IMAGE,
      maxSize: 1024,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'UNRECOGNISED_FILE');
  });

  it('refuses SVG when allowSvg is false', async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>');
    const result = await validateUploadedFile(fileFrom(svg, 'image/svg+xml'), {
      allowedMimes: ALLOWED_WITH_SVG,
      maxSize: 4096,
      allowSvg: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'SVG_FORBIDDEN');
  });

  it('rejects SVG containing <script>', async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    const result = await validateUploadedFile(fileFrom(svg, 'image/svg+xml'), {
      allowedMimes: ALLOWED_WITH_SVG,
      maxSize: 4096,
      allowSvg: true,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'SVG_UNSAFE');
  });

  it('rejects SVG with inline event handlers', async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect/></svg>',
    );
    const result = await validateUploadedFile(fileFrom(svg, 'image/svg+xml'), {
      allowedMimes: ALLOWED_WITH_SVG,
      maxSize: 4096,
      allowSvg: true,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'SVG_UNSAFE');
  });

  it('rejects SVG with javascript: href', async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect/></a></svg>',
    );
    const result = await validateUploadedFile(fileFrom(svg, 'image/svg+xml'), {
      allowedMimes: ALLOWED_WITH_SVG,
      maxSize: 4096,
      allowSvg: true,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'SVG_UNSAFE');
  });

  it('accepts a clean SVG when allowSvg is true', async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
    );
    const result = await validateUploadedFile(fileFrom(svg, 'image/svg+xml'), {
      allowedMimes: ALLOWED_WITH_SVG,
      maxSize: 4096,
      allowSvg: true,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.detectedMime, 'image/svg+xml');
      // Buffer content should still be an SVG
      assert.ok(result.buffer.toString('utf-8').includes('<svg'));
    }
  });

  it('passes GIF through unchanged', async () => {
    const result = await validateUploadedFile(fileFrom(GIF_MAGIC, 'image/gif'), {
      allowedMimes: ALLOWED_IMAGE,
      maxSize: 1024,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.detectedMime, 'image/gif');
  });
});
