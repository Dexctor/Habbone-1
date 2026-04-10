"use client";

import { useMemo, useState } from "react";

const C_IMAGES_BASE = process.env.NEXT_PUBLIC_HABBO_C_IMAGES_BASE || 'https://images.habbo.com/c_images';
const EU_SSL_C_IMAGES_BASE = process.env.NEXT_PUBLIC_HABBO_EUSSL_C_IMAGES_BASE || 'https://images-eussl.habbo.com/c_images';
const ALT_C_IMAGES_BASE = process.env.NEXT_PUBLIC_HABBO_ALT_C_IMAGES_BASE || 'https://habboo-a.akamaihd.net/c_images';

export function BadgeIcon({ code, album, imageUrl }: { code: string; album?: string | null; imageUrl?: string | null }) {
  const norm = (code || '').trim();
  const albumNorm = (album || '').trim();
  const url = (imageUrl || '').trim();
  const [idx, setIdx] = useState(0);

  // Construit une liste courte d'URLs CDN robustes (sans proxy)
  const candidates = useMemo(() => {
    if (!norm) return [] as string[];
    const list: string[] = [];
    if (url) list.push(url);

    const upper = norm.toUpperCase();
    const codes = new Set<string>([norm, upper]);
    // Certains ACH_* existent en camel-case sur le CDN (ex: ACH_Tutorial3)
    if (upper.startsWith('ACH_')) {
      const rest = upper.replace(/^ACH_/, '');
      const camel = 'ACH_' + rest.split('_').filter(Boolean).map(seg => seg.charAt(0) + seg.slice(1).toLowerCase()).join('');
      codes.add(camel);
    }
    const codeList = Array.from(codes);

    const hosts = [C_IMAGES_BASE, EU_SSL_C_IMAGES_BASE, ALT_C_IMAGES_BASE];

    const pushAlbum = (a: string) => {
      for (const h of hosts) {
        for (const c of codeList) {
          list.push(`${h}/${a}/${c}.gif`);
          list.push(`${h}/${a}/${c}.png`);
        }
      }
    };

    if (albumNorm) {
      pushAlbum(albumNorm);
      if (albumNorm.toLowerCase() !== albumNorm) pushAlbum(albumNorm.toLowerCase());
      if (albumNorm.toLowerCase() !== 'album1584') pushAlbum('album1584');
    } else {
      pushAlbum('album1584');
    }

    // Dossiers legacy en dernier recours
    for (const h of hosts) {
      for (const c of codeList) {
        list.push(`${h}/Badges/${c}.gif`);
        list.push(`${h}/Badges/${c}.png`);
        list.push(`${h}/badges/${c}.gif`);
        list.push(`${h}/badges/${c}.png`);
      }
    }

    // Limiter à 18 candidats max pour éviter des cascades d'erreurs réseau trop longues
    const unique = list.filter((v, i, a) => a.indexOf(v) === i);
    return unique.slice(0, 18);
  }, [norm, albumNorm, url]);

  if (!norm || candidates.length === 0) {
    return (
      <div className="w-8 h-8 grid place-items-center border border-[color:var(--border)] rounded text-[10px]">?</div>
    );
  }

  const src = candidates[Math.min(idx, candidates.length - 1)];

  // eslint-disable-next-line @next/next/no-img-element
  return idx < candidates.length ? (
    <img
      src={src}
      alt={norm}
      loading="lazy"
      className="w-8 h-8"
      onError={() => {
        setIdx((i) => i + 1);
      }}
    />
  ) : (
    <div className="w-8 h-8 grid place-items-center border border-[color:var(--border)] rounded text-[10px]" title={norm}>{(() => {
      try {
        const g = (window as any)
        g.__badgeLog ||= new Set<string>()
        const key = `${norm}|${albumNorm}|${url}`
        if (!g.__badgeLog.has(key)) {
          g.__badgeLog.add(key)
          console.warn('[BadgeIcon] Failed to load badge image', { code: norm, album: albumNorm || null, imageUrl: url || null, tried: candidates })
        }
      } catch {}
      return norm
    })()}</div>
  );
}

