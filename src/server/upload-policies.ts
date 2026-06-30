const MB = 1024 * 1024;

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
const IMAGE_WITH_SVG_MIMES = [...IMAGE_MIMES, 'image/svg+xml'] as const;

export type UploadPolicy = {
  allowedMimes: Set<string>;
  maxSize: number;
  allowSvg: boolean;
  maxWidth?: number;
  maxHeight?: number;
  maxPixels?: number;
  maxFrames?: number;
};

export const UPLOAD_POLICIES = {
  contentImage: {
    allowedMimes: new Set(IMAGE_MIMES),
    maxSize: 5 * MB,
    allowSvg: false,
    maxWidth: 2500,
    maxHeight: 2500,
    maxPixels: 8_000_000,
    maxFrames: 100,
  },
  adminImage: {
    allowedMimes: new Set(IMAGE_MIMES),
    maxSize: 5 * MB,
    allowSvg: false,
    maxWidth: 2500,
    maxHeight: 2500,
    maxPixels: 8_000_000,
    maxFrames: 100,
  },
  storyImage: {
    allowedMimes: new Set(['image/png', 'image/jpeg', 'image/gif']),
    maxSize: 10 * MB,
    allowSvg: false,
    maxWidth: 1600,
    maxHeight: 1600,
    maxPixels: 4_000_000,
    maxFrames: 120,
  },
  themeLogo: {
    allowedMimes: new Set(IMAGE_WITH_SVG_MIMES),
    maxSize: 5 * MB,
    allowSvg: true,
    maxWidth: 1200,
    maxHeight: 700,
    maxPixels: 2_000_000,
    maxFrames: 80,
  },
  themeBackground: {
    allowedMimes: new Set(IMAGE_WITH_SVG_MIMES),
    maxSize: 5 * MB,
    allowSvg: true,
    maxWidth: 3000,
    maxHeight: 2000,
    maxPixels: 8_000_000,
    maxFrames: 80,
  },
} satisfies Record<string, UploadPolicy>;

export type UploadPolicyName = keyof typeof UPLOAD_POLICIES;

export function formatFileSize(bytes: number): string {
  if (bytes >= MB) return `${Math.round((bytes / MB) * 10) / 10} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}
