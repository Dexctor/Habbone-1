"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { fetchHabboProfileByName } from "@/lib/habbo-client"
import type { HabboProfileResponse } from "@/types/habbo"

type UseHabboProfileOptions = {
  fallbackMessage?: string
  lite?: boolean
  enabled?: boolean
}

const MAX_RETRIES = 4
const RETRY_DELAYS = [1000, 2000, 3000, 4000]

// Simple in-memory cache to avoid refetching on navigation
const profileCache = new Map<string, { data: HabboProfileResponse; ts: number }>()
const CACHE_TTL = 30_000 // 30 seconds

export function useHabboProfile(nick: string, options?: UseHabboProfileOptions) {
  const [data, setData] = useState<HabboProfileResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fallbackMessage = options?.fallbackMessage
  const lite = options?.lite
  const enabled = options?.enabled !== false

  const currentNickRef = useRef(nick)
  currentNickRef.current = nick

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const safeNick = String(nick || "").trim()
    if (!safeNick) {
      setLoading(false)
      setError(fallbackMessage || "Pseudo requis")
      return
    }

    let cancelled = false

    // Check cache first
    const cached = profileCache.get(safeNick.toLowerCase())
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setData(cached.data)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    // Don't clear data if we already have it (avoids flash)
    // setData(null)  -- removed intentionally

    const doFetch = async (attempt: number): Promise<void> => {
      try {
        const profile = await fetchHabboProfileByName(safeNick, {
          fallbackMessage,
          lite,
        })

        if (cancelled || currentNickRef.current !== nick) return

        // Cache the result
        profileCache.set(safeNick.toLowerCase(), { data: profile, ts: Date.now() })

        setData(profile)
        setError(null)
        setLoading(false)
      } catch (e: unknown) {
        if (cancelled || currentNickRef.current !== nick) return

        // Retry with increasing delays
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt] || 2000
          await new Promise((r) => setTimeout(r, delay))
          if (!cancelled && currentNickRef.current === nick) {
            return doFetch(attempt + 1)
          }
          return
        }

        // All retries exhausted
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as any).message)
            : "Erreur de chargement du profil"
        setError(msg)
        setLoading(false)
      }
    }

    void doFetch(0)

    return () => {
      cancelled = true
    }
  }, [nick, enabled, fallbackMessage, lite])

  const refresh = useCallback(async () => {
    const safeNick = String(nick || "").trim()
    if (!safeNick) return

    // Clear cache for this nick
    profileCache.delete(safeNick.toLowerCase())

    setLoading(true)
    setError(null)
    try {
      const profile = await fetchHabboProfileByName(safeNick, {
        fallbackMessage,
        lite,
      })
      profileCache.set(safeNick.toLowerCase(), { data: profile, ts: Date.now() })
      setData(profile)
      return profile
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as any).message)
          : "Erreur"
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [nick, fallbackMessage, lite])

  return { data, error, loading, refresh }
}
