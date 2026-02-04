import 'server-only'

// Server-side micro cache wrappers for Habbo API with TTLs
// Respect RULES.md: caching only on server, no secrets leaked

import {
  getHabboUserByName as rawGetHabboUserByName,
  getHabboUserByNameForHotel as rawGetHabboUserByNameForHotel,
  getHabboUserById as rawGetHabboUserById,
  getHabboUserByIdForHotel as rawGetHabboUserByIdForHotel,
  getHabboUserProfileById as rawGetHabboUserProfileById,
  getHabboFriendsById as rawGetHabboFriendsById,
  getHabboGroupsById as rawGetHabboGroupsById,
  getHabboRoomsById as rawGetHabboRoomsById,
  getHabboBadgesById as rawGetHabboBadgesById,
  getHabboAchievementsById as rawGetHabboAchievementsById,
  getAllAchievements as rawGetAllAchievements,
  resolveHotelBase,
} from '@/lib/habbo'

type Entry<T> = { v: T; exp: number }
type CacheOptions = { cache?: boolean }

const CORE_TTL = 24 * 60 * 60 * 1000 // 24h
const HEAVY_TTL = 6 * 60 * 60 * 1000 // 6h
const CATALOG_TTL = 24 * 60 * 60 * 1000 // 24h
const MAX_CACHE_SIZE = 1000 // Max entries before eviction
const EVICTION_BATCH_SIZE = 100 // How many entries to evict at once

function now() {
  return Date.now()
}

function getStore() {
  const g = globalThis as any
  if (!g.__habboCache) {
    g.__habboCache = new Map<string, Entry<any>>()
  }
  const store = g.__habboCache as Map<string, Entry<any>>

  // Evict oldest entries if cache is full
  if (store.size >= MAX_CACHE_SIZE) {
    const currentTime = now()
    // First, remove expired entries
    for (const [key, entry] of store.entries()) {
      if (entry.exp < currentTime) {
        store.delete(key)
      }
    }
    // If still over limit, remove oldest batch (FIFO)
    if (store.size >= MAX_CACHE_SIZE) {
      const keysToRemove = Array.from(store.keys()).slice(0, EVICTION_BATCH_SIZE)
      for (const key of keysToRemove) {
        store.delete(key)
      }
    }
  }

  return store
}

function getInflightStore() {
  const g = globalThis as any
  if (!g.__habboCacheInflight) {
    g.__habboCacheInflight = new Map<string, Promise<any>>()
  }
  return g.__habboCacheInflight as Map<string, Promise<any>>
}

async function getOrSet<T>(key: string, ttl: number, fn: () => Promise<T>, options?: CacheOptions): Promise<T> {
  if (options?.cache === false) return fn()
  const store = getStore()
  const hit = store.get(key) as Entry<T> | undefined
  if (hit && hit.exp > now()) return hit.v
  const inflight = getInflightStore()
  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) return existing
  const pending = Promise.resolve()
    .then(fn)
    .then((value) => {
      store.set(key, { v: value, exp: now() + ttl })
      inflight.delete(key)
      return value
    })
    .catch((err) => {
      inflight.delete(key)
      throw err
    })
  inflight.set(key, pending)
  return pending
}

export async function getHabboUserByName(name: string) {
  const key = `core:name:${String(name).toLowerCase()}`
  return getOrSet(key, CORE_TTL, () => rawGetHabboUserByName(name))
}

export async function getHabboUserByNameForHotel(name: string, hotel?: string, options?: CacheOptions) {
  const base = resolveHotelBase(hotel)
  const key = `core:name:${base}:${String(name).toLowerCase()}`
  return getOrSet(key, CORE_TTL, () => rawGetHabboUserByNameForHotel(name, hotel), options)
}

export async function getHabboUserById(id: string) {
  const key = `core:id:${id}`
  return getOrSet(key, CORE_TTL, () => rawGetHabboUserById(id))
}

export async function getHabboUserByIdForHotel(id: string, hotel?: string, options?: CacheOptions) {
  const base = resolveHotelBase(hotel)
  const key = `core:id:${base}:${id}`
  return getOrSet(key, CORE_TTL, () => rawGetHabboUserByIdForHotel(id, hotel), options)
}

export async function getHabboUserProfileById(id: string) {
  const key = `profile:${id}`
  return getOrSet(key, HEAVY_TTL, () => rawGetHabboUserProfileById(id))
}

export async function getHabboFriendsById(id: string) {
  const key = `friends:${id}`
  return getOrSet(key, HEAVY_TTL, () => rawGetHabboFriendsById(id))
}

export async function getHabboGroupsById(id: string) {
  const key = `groups:${id}`
  return getOrSet(key, HEAVY_TTL, () => rawGetHabboGroupsById(id))
}

export async function getHabboRoomsById(id: string) {
  const key = `rooms:${id}`
  return getOrSet(key, HEAVY_TTL, () => rawGetHabboRoomsById(id))
}

export async function getHabboBadgesById(id: string) {
  const key = `badges:${id}`
  return getOrSet(key, HEAVY_TTL, () => rawGetHabboBadgesById(id))
}

export async function getHabboAchievementsById(id: string) {
  const key = `achievements:${id}`
  return getOrSet(key, HEAVY_TTL, () => rawGetHabboAchievementsById(id))
}

export async function getAllAchievements() {
  const key = `achievements:catalog`
  return getOrSet(key, CATALOG_TTL, () => rawGetAllAchievements())
}
