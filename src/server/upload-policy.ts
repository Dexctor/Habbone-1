import {
  validateUploadedFile,
  type UploadValidationResult,
} from '@/server/upload-security';

export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const STORY_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

const STANDARD_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const STORY_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/gif']);
const THEME_IMAGE_MIMES = new Set([...STANDARD_IMAGE_MIMES, 'image/svg+xml']);

export function validatePublicImageUpload(file: File): Promise<UploadValidationResult> {
  return validateUploadedFile(file, {
    allowedMimes: STANDARD_IMAGE_MIMES,
    maxSize: IMAGE_UPLOAD_MAX_BYTES,
    allowSvg: false,
  });
}

export function validateAdminImageUpload(file: File): Promise<UploadValidationResult> {
  return validatePublicImageUpload(file);
}

export function validateStoryImageUpload(file: File): Promise<UploadValidationResult> {
  return validateUploadedFile(file, {
    allowedMimes: STORY_IMAGE_MIMES,
    maxSize: STORY_UPLOAD_MAX_BYTES,
    allowSvg: false,
  });
}

export function validateThemeImageUpload(file: File): Promise<UploadValidationResult> {
  return validateUploadedFile(file, {
    allowedMimes: THEME_IMAGE_MIMES,
    maxSize: IMAGE_UPLOAD_MAX_BYTES,
    allowSvg: true,
  });
}

export function fileFromValidatedUpload(
  file: File,
  validation: Extract<UploadValidationResult, { ok: true }>,
  fallback: string,
) {
  const filename = file.name?.trim() || fallback;
  return {
    filename,
    file: new File([new Uint8Array(validation.buffer)], filename, {
      type: validation.detectedMime,
    }),
  };
}

export function extensionForMime(mime: string): string {
  const normalized = mime.toLowerCase();
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/jpeg') return 'jpg';
  if (normalized === 'image/webp') return 'webp';
  if (normalized === 'image/gif') return 'gif';
  if (normalized === 'image/svg+xml') return 'svg';
  return 'png';
}
