// src/lib/habbo.ts

export const HABBO_API_BASE = process.env.HABBO_API_BASE || 'https://www.habbo.fr';

const HOTEL_BASES: Record<string, string> = {
  fr: 'https://www.habbo.fr',
  com: 'https://www.habbo.com',
  'com.br': 'https://www.habbo.com.br',
  es: 'https://www.habbo.es',
  it: 'https://www.habbo.it',
  de: 'https://www.habbo.de',
  nl: 'https://www.habbo.nl',
  fi: 'https://www.habbo.fi',
  'com.tr': 'https://www.habbo.com.tr',
};

export function resolveHotelBase(hotel?: string) {
  if (!hotel) return HABBO_API_BASE;
  const normalized = hotel.toLowerCase();
  return HOTEL_BASES[normalized] || HABBO_API_BASE;
}

export interface HabboUserCore {
  uniqueId: string; // e.g. hhus-abcde12345
  name: string;
  figureString?: string;
  motto?: string;
  online?: boolean;
  lastAccessTime?: string; // ISO-like string
  memberSince?: string; // ISO-like string
  profileVisible?: boolean;
  currentLevel?: number;
  currentLevelCompletePercent?: number;
  totalExperience?: number;
  starGemCount?: number;
  selectedBadges?: Array<{ badgeCode?: string; name?: string }>;
}

const FETCH_TIMEOUT_MS = 10_000; // 10 seconds

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`[HabboAPI] ${res.status} ${res.statusText} ${text}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

// By name: GET /api/public/users?name={name}
export async function getHabboUserByName(name: string): Promise<HabboUserCore> {
  const url = new URL(`${HABBO_API_BASE}/api/public/users`);
  url.searchParams.set('name', name);
  return fetchJson<HabboUserCore>(url.toString());
}

export async function getHabboUserByNameForHotel(name: string, hotel?: string): Promise<HabboUserCore> {
  const base = resolveHotelBase(hotel);
  const url = new URL(`${base}/api/public/users`);
  url.searchParams.set('name', name);
  return fetchJson<HabboUserCore>(url.toString());
}

// By uniqueId: GET /api/public/users/{id}
export async function getHabboUserById(id: string): Promise<HabboUserCore> {
  const url = `${HABBO_API_BASE}/api/public/users/${encodeURIComponent(id)}`;
  return fetchJson<HabboUserCore>(url);
}

export async function getHabboUserByIdForHotel(id: string, hotel?: string): Promise<HabboUserCore> {
  const base = resolveHotelBase(hotel);
  const url = `${base}/api/public/users/${encodeURIComponent(id)}`;
  return fetchJson<HabboUserCore>(url);
}

// Heavy/related endpoints (fetched on-demand)
export interface HabboUserProfile {
  user: HabboUserCore;
  badges?: HabboBadge[];
  friends?: HabboFriend[];
  groups?: HabboGroup[];
  rooms?: HabboRoom[];
}

export async function getHabboUserProfileById(id: string): Promise<HabboUserProfile> {
  const url = `${HABBO_API_BASE}/api/public/users/${encodeURIComponent(id)}/profile`;
  return fetchJson<HabboUserProfile>(url);
}

export interface HabboFriend { uniqueId: string; name: string; online?: boolean; motto?: string; habbo?: string }
export async function getHabboFriendsById(id: string): Promise<HabboFriend[]> {
  const url = `${HABBO_API_BASE}/api/public/users/${encodeURIComponent(id)}/friends`;
  return fetchJson<HabboFriend[]>(url);
}

export interface HabboGroup { id: number; name?: string; badgeCode?: string; description?: string; groupId?: number | string }
export async function getHabboGroupsById(id: string): Promise<HabboGroup[]> {
  const url = `${HABBO_API_BASE}/api/public/users/${encodeURIComponent(id)}/groups`;
  return fetchJson<HabboGroup[]>(url);
}

export interface HabboRoom { id: number; name?: string; ownerName?: string; usersMax?: number; description?: string; creationTime?: string | number }
export async function getHabboRoomsById(id: string): Promise<HabboRoom[]> {
  const url = `${HABBO_API_BASE}/api/public/users/${encodeURIComponent(id)}/rooms`;
  return fetchJson<HabboRoom[]>(url);
}

export interface HabboBadge {
  // identifiers
  code?: string
  badgeCode?: string
  badge_code?: string
  badge?: { code?: string }
  // display fields
  name?: string
  description?: string
  // image/url hints (varies across endpoints)
  imageUrl?: string
  badgeImageUrl?: string
  image?: string
  url?: string
  iconUrl?: string
  icon_url?: string
  smallImageUrl?: string
  small_image_url?: string
  // categorization
  album?: string
  badgeAlbum?: string
  category?: string
  badgeCategory?: string
}
export async function getHabboBadgesById(id: string): Promise<HabboBadge[]> {
  const url = `${HABBO_API_BASE}/api/public/users/${encodeURIComponent(id)}/badges`;
  return fetchJson<HabboBadge[]>(url);
}

// Achievements by uniqueId
export interface HabboAchievement { id: number; name?: string; level?: number }
export async function getHabboAchievementsById(id: string): Promise<HabboAchievement[]> {
  const url = `${HABBO_API_BASE}/api/public/achievements/${encodeURIComponent(id)}`;
  return fetchJson<HabboAchievement[]>(url);
}

// All achievements (definitions) for the hotel
export interface HabboAchievementDef { id: number; name?: string; category?: string }
export async function getAllAchievements(): Promise<HabboAchievementDef[]> {
  const url = `${HABBO_API_BASE}/api/public/achievements`;
  return fetchJson<HabboAchievementDef[]>(url);
}
