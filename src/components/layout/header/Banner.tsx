'use client'

import { motion } from 'framer-motion'
import React, { useEffect, useMemo, useState } from 'react'
import { DEFAULT_THEME_SETTINGS, normalizeThemeSettings, type SiteThemeSettings } from '@/lib/theme-settings'

type BannerProps = {
  slow: any
  initialTheme?: SiteThemeSettings
}

export default function Banner({ slow, initialTheme }: BannerProps) {
  const [theme, setTheme] = useState<SiteThemeSettings>(initialTheme ?? DEFAULT_THEME_SETTINGS)

  useEffect(() => {
    let cancelled = false

    ; (async () => {
      try {
        const response = await fetch('/api/theme', { cache: 'no-store' })
        if (!response.ok) return
        const json = await response.json().catch(() => ({}))
        if (!cancelled) setTheme(normalizeThemeSettings(json?.data))
      } catch { }
    })()

    const onThemeUpdated = (event: Event) => {
      try {
        const payload = (event as CustomEvent<unknown>)?.detail
        if (!payload || cancelled) return
        setTheme(normalizeThemeSettings(payload))
      } catch { }
    }

    window.addEventListener('theme:updated', onThemeUpdated)

    return () => {
      cancelled = true
      try { window.removeEventListener('theme:updated', onThemeUpdated) } catch { }
    }
  }, [])

  const style = useMemo<React.CSSProperties>(() => {
    const backgroundImage = theme.headerBackgroundImageUrl
      ? `linear-gradient(rgba(0,0,0,0.10), rgba(0,0,0,0.10)), url("${theme.headerBackgroundImageUrl}")`
      : undefined

    return {
      backgroundColor: theme.headerBackgroundColor,
      backgroundImage,
      backgroundPosition: 'center center',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
    }
  }, [theme.headerBackgroundColor, theme.headerBackgroundImageUrl])

  return (
    <motion.section
      layout
      className="bg flex items-center justify-center w-full min-h-[250px] md:min-h-[350px] lg:min-h-[400px]"
      style={style}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={slow as any}
    >
      {theme.showLogo !== false && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={theme.headerLogoUrl}
          alt="HabbOne"
          className="h-auto max-w-full"
          loading="lazy"
        />
      )}
    </motion.section>
  )
}
