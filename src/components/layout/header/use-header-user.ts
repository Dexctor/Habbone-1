'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { cachedValue, invalidateCache } from '@/lib/client-cache'
import { toastError, toastSuccess } from '@/lib/sonner'
import { useHabboProfile } from '@/lib/use-habbo-profile'
import type { HabboProfileResponse } from '@/types/habbo'

const MOEDAS_TTL_MS = 15_000

export type HeaderLoginPayload = {
  nick: string
  password: string
}

function resolveHabboLevel(payload?: HabboProfileResponse | null) {
  const userLevel = payload?.user?.currentLevel
  if (typeof userLevel === 'number') return userLevel
  const profile = payload?.profile as { currentLevel?: number } | null
  const profileLevel = profile?.currentLevel
  return typeof profileLevel === 'number' ? profileLevel : null
}

export function useHeaderUser() {
  const [mounted, setMounted] = useState(false)
  const [level, setLevel] = useState<number | null>(null)
  const [coins, setCoins] = useState<number | null>(null)
  const { data: session, status } = useSession()
  const pathname = usePathname() || ''
  const router = useRouter()
  const sessionNick = (session?.user as any)?.nick as string | undefined
  const onProfilePage = pathname.startsWith('/profile')

  const { data: habboLite } = useHabboProfile(sessionNick || '', {
    lite: true,
    enabled: status === 'authenticated' && !!sessionNick && !onProfilePage,
    fallbackMessage: 'Erreur de récupération du profil',
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (status !== 'authenticated' || !sessionNick) return
    if (!onProfilePage || typeof window === 'undefined') return
    let cancelled = false

    try {
      const fromWindow = window.__habboProfile
      const lvl = resolveHabboLevel(fromWindow) ?? window.__habboLevel ?? null
      if (typeof lvl === 'number') setLevel(lvl)
    } catch { }

    const handler = (event: WindowEventMap["habbo:profile"]) => {
      if (cancelled) return
      try {
        const detail = event?.detail
        const lvl = resolveHabboLevel(detail ?? null)
        setLevel(typeof lvl === 'number' ? lvl : null)
      } catch { }
    }
    window.addEventListener('habbo:profile', handler)
    return () => {
      cancelled = true
      try { window.removeEventListener('habbo:profile', handler) } catch { }
    }
  }, [status, sessionNick, onProfilePage])

  useEffect(() => {
    if (onProfilePage) return
    if (!habboLite) return
    const lvl = resolveHabboLevel(habboLite ?? null)
    setLevel(typeof lvl === 'number' ? lvl : null)
  }, [habboLite, onProfilePage])

  useEffect(() => {
    if (status !== 'authenticated' || !sessionNick) return
    let cancelled = false
    ; (async () => {
      try {
        const payload = await cachedValue(`moedas:${sessionNick}`, MOEDAS_TTL_MS, async () => {
          const response = await fetch('/api/user/moedas', { cache: 'no-store' })
          const json = await response.json().catch(() => null)
          if (!response.ok) {
            const msg = (json as any)?.error || 'MOEDAS_FETCH_FAILED'
            throw new Error(msg)
          }
          return json
        })
        if (!cancelled) {
          const value = typeof (payload as any)?.moedas === 'number' ? (payload as any).moedas : Number((payload as any)?.moedas || 0)
          setCoins(Number.isFinite(value) ? value : null)
        }
      } catch { }
    })()
    return () => { cancelled = true }
  }, [status, sessionNick])

  useEffect(() => {
    if (typeof window === 'undefined' || !sessionNick) return
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ balance?: number }>).detail
      if (typeof detail?.balance === 'number') {
        setCoins(detail.balance)
        return
      }
      invalidateCache(`moedas:${sessionNick}`)
      void (async () => {
        try {
          const response = await fetch('/api/user/moedas', { cache: 'no-store' })
          const json = await response.json().catch(() => null)
          if (response.ok) {
            const value = typeof (json as any)?.moedas === 'number' ? (json as any).moedas : Number((json as any)?.moedas || 0)
            setCoins(Number.isFinite(value) ? value : null)
          }
        } catch { }
      })()
    }
    window.addEventListener('habbone:coins', handler)
    return () => window.removeEventListener('habbone:coins', handler)
  }, [sessionNick])

  const handleLogin = useCallback(async ({ nick, password }: HeaderLoginPayload) => {
    const trimmedNick = nick.trim()
    if (!trimmedNick || !password) {
      try { await toastError('Veuillez saisir votre pseudo et votre mot de passe.') } catch { }
      return false
    }
    try {
      const check = await fetch(`/api/auth/check-user?nick=${encodeURIComponent(trimmedNick)}`, { cache: 'no-store' })
      const payload = await check.json().catch(() => ({}))
      if (!check.ok || !payload?.exists) {
        try { await toastError('Utilisateur inexistant.') } catch { }
        return false
      }
    } catch {
      try { await toastError('Verification impossible pour le moment.') } catch { }
      return false
    }

    try {
      const result = await signIn('credentials', { nick: trimmedNick, password, redirect: false })
      if (result?.error) {
        try { await toastError('Mot de passe incorrect.') } catch { }
        return false
      }
      try { await toastSuccess('Connexion reussie. Bienvenue !') } catch { }
      router.push('/profile')
      router.refresh()
      return true
    } catch {
      try { await toastError('Erreur lors de la connexion.') } catch { }
      return false
    }
  }, [router])

  const handleLogout = useCallback(async () => {
    try { await toastSuccess('Deconnexion effectuee.') } catch { }
    try { await signOut({ callbackUrl: '/' }) } catch { }
  }, [])

  return useMemo(() => ({
    mounted,
    session,
    status,
    level,
    coins,
    handleLogin,
    handleLogout,
  }), [mounted, session, status, level, coins, handleLogin, handleLogout])
}
