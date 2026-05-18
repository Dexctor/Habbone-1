function getDirectusUrl() {
    return process.env.NEXT_PUBLIC_DIRECTUS_URL || '';
}

function getLegacyMediaBase() {
    return process.env.NEXT_PUBLIC_LEGACY_MEDIA_BASE || '';
}

/**
 * Vérifie qu'une URL absolue est syntaxiquement valide.
 * Retourne '' si l'URL est invalide pour permettre le fallback côté composant.
 */
function validateUrl(url: string): string {
    if (!url) return '';
    // Chemins relatifs (commencent par /) — toujours valides
    if (url.startsWith('/')) return url;
    try {
        new URL(url);
        return url;
    } catch {
        return '';
    }
}

export function mediaUrl(idOrPath?: string) {
    if (!idOrPath) return '';
    idOrPath = idOrPath.trim();
    if (!idOrPath) return '';

    const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            idOrPath
        );
    if (isUUID) {
        const directusUrl = getDirectusUrl();
        if (!directusUrl) return '';
        return validateUrl(`${directusUrl}/assets/${idOrPath}`);
    }

    if (/^https?:\/\//i.test(idOrPath)) {
        try {
            const u = new URL(idOrPath);
            const isLocalhost = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
            const isUploads = u.pathname.startsWith('/uploads/');
            if (isLocalhost && isUploads) {
                const legacy = getLegacyMediaBase();
                if (legacy) return validateUrl(`${legacy}${u.pathname}`);
            }
        } catch {
            return '';
        }
        return validateUrl(idOrPath);
    }

    const path = idOrPath.startsWith('/') ? idOrPath : `/${idOrPath}`;
    const base = getLegacyMediaBase() || getDirectusUrl() || '';
    return validateUrl(`${base}${path}`);
}

export function normalizeHtmlMediaUrls(html: string): string {
    if (!html) return '';

    return html.replace(
        /(<img\b[^>]*?\bsrc\s*=\s*)(["'])([^"']+)(\2)/gi,
        (match, prefix: string, quote: string, src: string, suffix: string) => {
            const value = String(src || '').trim();
            const isLegacyUpload =
                value.startsWith('/uploads/') ||
                value.startsWith('uploads/') ||
                /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/uploads\//i.test(value);

            if (!isLegacyUpload) return match;
            const normalized = mediaUrl(value);
            return normalized ? `${prefix}${quote}${normalized}${suffix}` : match;
        },
    );
}
