"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { fetchHabboProfileByName } from "@/lib/habbo-client"
import type { HabboProfileResponse } from "@/types/habbo"

type UseHabboProfileOptions = {
  fallbackMessage?: string
  lite?: boolean
  enabled?: boolean
}

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1500

export function useHabboProfile(nick: string, options?: UseHabboProfileOptions) {
  const [data, setData] = useState<HabboProfileResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Stabilize options to avoid re-triggering the effect
  const fallbackMessage = options?.fallbackMessage
  const lite = options?.lite
  const enabled = options?.enabled !== false

  // Track the current nick to avoid stale updates
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

    // Reset state when nick changes
    setLoading(true)
    setError(null)
    setData(null)

    const doFetch = async (attempt: number): Promise<void> => {
      try {
        const profile = await fetchHabboProfileByName(safeNick, {
          fallbackMessage,
          lite,
        })

        if (cancelled || currentNickRef.current !== nick) return

        setData(profile)
        setError(null)
      } catch (e: unknown) {
        if (cancelled || currentNickRef.current !== nick) return

        // Retry on network errors
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
          if (!cancelled && currentNickRef.current === nick) {
            return doFetch(attempt + 1)
          }
          return
        }

        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as any).message)
            : "Erreur de chargement du profil"
        setError(msg)
      } finally {
        if (!cancelled && currentNickRef.current === nick) {
          setLoading(false)
        }
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

    setLoading(true)
    setError(null)
    try {
      const profile = await fetchHabboProfileByName(safeNick, {
        fallbackMessage,
        lite,
      })
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
