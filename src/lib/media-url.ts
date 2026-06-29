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

    if (/^https?:\/\//i.test(idOrPath)) return validateUrl(idOrPath);

    const path = idOrPath.startsWith('/') ? idOrPath : `/${idOrPath}`;
    return validateUrl(path);
}
