// app/api/habbo/profile/route.ts
import { NextResponse } from 'next/server';
import {
  getHabboUserByName,
  getHabboUserById,
  getHabboUserProfileById,
  getHabboAchievementsById,
  getAllAchievements,
} from '@/server/habbo-cache';
import { enrichHabboBadges, buildHabboProfilePayload } from '@/server/habbo-profile-core';
import { syncHabboName } from '@/server/directus/pseudo-changes';
import { HabboProfileQuerySchema, searchParamsToObject, formatZodError, buildError } from '@/types/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = HabboProfileQuerySchema.safeParse(searchParamsToObject(searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        buildError('Erreur de validation', { code: 'VALIDATION_ERROR', fields: formatZodError(parsed.error).fieldErrors }),
        { status: 400 }
      );
    }

    const isLite = Boolean((parsed.data as any).lite);

    // 1) Core user lookup (cached 24h)
    const core = 'id' in parsed.data
      ? await getHabboUserById(parsed.data.id)
      : await getHabboUserByName(parsed.data.name);

    const uniqueId = core?.uniqueId;
    if (!uniqueId) {
      return NextResponse.json(
        buildError('Utilisateur Habbo introuvable.', { code: 'HABBO_NOT_FOUND' }),
        { status: 404 }
      );
    }

    // Passive pseudo change detection — every profile visit feeds the tracker
    if (core?.name) {
      void syncHabboName(String(uniqueId), String(core.name));
    }

    // Lite mode: just core user data, no details
    if (isLite) {
      return NextResponse.json(
        buildHabboProfilePayload({ core, profile: null, uniqueId, lite: true }),
        { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }
      );
    }

    // 2) The /profile endpoint returns EVERYTHING in one call:
    //    user, friends, groups, rooms, badges
    //    This is much more reliable than 7 separate calls.
    //    We only need achievements separately.
    const [profileRes, achievementsRes, achievementsCatalogRes] = await Promise.allSettled([
      getHabboUserProfileById(uniqueId),
      getHabboAchievementsById(uniqueId),
      getAllAchievements(),
    ]);

    // Extract data from the consolidated /profile response
    const profileData = profileRes.status === 'fulfilled' ? profileRes.value : null;
    const achievements = achievementsRes.status === 'fulfilled'
      ? (Array.isArray(achievementsRes.value) ? achievementsRes.value : [])
      : [];
    const achievementsTotal = achievementsCatalogRes.status === 'fulfilled'
      ? (Array.isArray(achievementsCatalogRes.value) ? achievementsCatalogRes.value : [])
      : [];

    // The /profile endpoint returns { user, friends, groups, rooms, badges }
    // Extract sub-arrays directly — much more reliable than separate endpoints
    const profile = profileData as any;
    const friends = Array.isArray(profile?.friends) ? profile.friends : [];
    const groups = Array.isArray(profile?.groups) ? profile.groups : [];
    const rooms = Array.isArray(profile?.rooms) ? profile.rooms : [];
    const badgesRaw = Array.isArray(profile?.badges) ? profile.badges : [];

    const badges = enrichHabboBadges(badgesRaw, achievementsTotal);

    return NextResponse.json(
      {
        user: core,
        profile: profile ?? null,
        friends,
        groups,
        rooms,
        badges,
        uniqueId,
        achievements,
        achievementsCount: achievements.length,
        achievementsTotalCount: achievementsTotal.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (e: any) {
    const msg = e?.message || '';
    const notFound = /404/.test(msg);
    return NextResponse.json(
      buildError(notFound ? 'Utilisateur Habbo introuvable.' : 'Erreur Habbo API', { code: notFound ? 'HABBO_NOT_FOUND' : 'HABBO_ERROR' }),
      { status: notFound ? 404 : 502 }
    );
  }
}
