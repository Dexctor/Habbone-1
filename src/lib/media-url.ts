const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || '';

export function mediaUrl(idOrPath?: string) {
    if (!idOrPath) return '';

    const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            idOrPath
        );
    if (isUUID) return `${directusUrl}/assets/${idOrPath}`;

    if (/^https?:\/\//i.test(idOrPath)) {
        try {
            const u = new URL(idOrPath);
            const isLocalhost = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
            const isUploads = u.pathname.startsWith('/uploads/');
            if (isLocalhost && isUploads) {
                const legacy = process.env.NEXT_PUBLIC_LEGACY_MEDIA_BASE || '';
                if (legacy) return `${legacy}${u.pathname}`;
            }
        } catch {
            // ignore parsing errors and return as-is
        }
        return idOrPath;
    }

    const path = idOrPath.startsWith('/') ? idOrPath : `/${idOrPath}`;
    const base = process.env.NEXT_PUBLIC_LEGACY_MEDIA_BASE || directusUrl || '';
    return `${base}${path}`;
}
