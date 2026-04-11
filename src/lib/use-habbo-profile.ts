"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { fetchHabboProfileByName } from "@/lib/habbo-client"
import type { HabboProfileResponse } from "@/types/habbo"

type UseHabboProfileOptions = {
  fallbackMessage?: string
  lite?: boolean
  enabled?: boolean
}

const MAX_RETRIES = 3
const RETRY_DELAYS = [1500, 3000, 5000]

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

  // Keep a ref to the AbortController so we can cancel on unmount or nick change
  const abortRef = useRef<AbortController | null>(null)

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

    // Abort any previous in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

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

    const doFetch = async (attempt: number): Promise<void> => {
      if (controller.signal.aborted) return

      try {
        const profile = await fetchHabboProfileByName(safeNick, {
          fallbackMessage,
          lite,
          signal: controller.signal,
        })

        if (controller.signal.aborted || currentNickRef.current !== nick) return

        // Cache the result
        profileCache.set(safeNick.toLowerCase(), { data: profile, ts: Date.now() })

        setData(profile)
        setError(null)
        setLoading(false)
      } catch (e: unknown) {
        if (controller.signal.aborted || currentNickRef.current !== nick) return

        // Don't retry if it's a 404 (user not found)
        const msg = e && typeof e === "object" && "message" in e ? String((e as any).message) : ""
        if (msg.includes("introuvable") || msg.includes("404")) {
          setError(msg || fallbackMessage || "Utilisateur introuvable")
          setLoading(false)
          return
        }

        // Retry with increasing delays
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt] || 3000
          await new Promise((r) => setTimeout(r, delay))
          if (!controller.signal.aborted && currentNickRef.current === nick) {
            return doFetch(attempt + 1)
          }
          return
        }

        // All retries exhausted
        setError(msg || "Erreur de chargement du profil")
        setLoading(false)
      }
    }

    void doFetch(0)

    return () => {
      controller.abort()
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
