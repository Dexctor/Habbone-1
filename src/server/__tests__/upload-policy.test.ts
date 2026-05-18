import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  extensionForMime,
  fileFromValidatedUpload,
  validatePublicImageUpload,
  validateStoryImageUpload,
  validateThemeImageUpload,
} from '../upload-policy';
import type { UploadValidationResult } from '../upload-security';

const PNG_MAGIC = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_MAGIC = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x18, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

function fileFrom(bytes: Uint8Array, mime: string, name = 'asset'): File {
  const buf = bytes.slice().buffer as ArrayBuffer;
  return new File([buf], name, { type: mime });
}

describe('upload policy', () => {
  it('allows standard public image uploads and returns a safe File wrapper', async () => {
    const original = fileFrom(PNG_MAGIC, 'image/png', 'avatar.png');
    const result = await validatePublicImageUpload(original);

    assert.equal(result.ok, true);
    if (result.ok) {
      const wrapped = fileFromValidatedUpload(original, result, 'fallback.png');
      assert.equal(wrapped.filename, 'avatar.png');
      assert.equal(wrapped.file.type, 'image/png');
    }
  });

  it('rejects webp for stories while allowing it for public image uploads', async () => {
    const webp = fileFrom(WEBP_MAGIC, 'image/webp', 'story.webp');

    const publicResult = await validatePublicImageUpload(webp);
    const storyResult = await validateStoryImageUpload(webp);

    assert.equal(publicResult.ok, true);
    assert.equal(storyResult.ok, false);
    if (!storyResult.ok) assert.equal(storyResult.code, 'UNSUPPORTED_FILE_TYPE');
  });

  it('allows clean SVG only for theme uploads', async () => {
    const svg = fileFrom(
      new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'),
      'image/svg+xml',
      'logo.svg',
    );

    const publicResult = await validatePublicImageUpload(svg);
    const themeResult = await validateThemeImageUpload(svg);

    assert.equal(publicResult.ok, false);
    assert.equal(themeResult.ok, true);
    if (themeResult.ok) assert.equal(themeResult.detectedMime, 'image/svg+xml');
  });

  it('uses fallback names and extensions from detected MIME only', () => {
    const validation: Extract<UploadValidationResult, { ok: true }> = {
      ok: true,
      detectedMime: 'image/jpeg',
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
    };
    const unnamed = new File([new Uint8Array(validation.buffer)], '', { type: 'image/jpeg' });

    const wrapped = fileFromValidatedUpload(unnamed, validation, `theme.${extensionForMime(validation.detectedMime)}`);

    assert.equal(wrapped.filename, 'theme.jpg');
    assert.equal(wrapped.file.type, 'image/jpeg');
  });
});
