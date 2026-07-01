import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/auth'
import ProfileClient from '@/components/profile/ProfileClient'
import ProfileSearchBar from '@/components/profile/ProfileSearchBar'
import { SiteHeader, SitePage } from '@/components/site'
import {
  getHabboUserByName,
  getHabboUserProfileById,
  getHabboAchievementsById,
  getAllAchievements,
} from '@/server/habbo-cache'
import { enrichHabboBadges } from '@/server/habbo-profile-core'
import type { HabboProfileResponse } from '@/types/habbo'

export const revalidate = 0

async function fetchProfileServerSide(nick: string): Promise<HabboProfileResponse | null> {
  try {
    const core = await getHabboUserByName(nick)
    const uniqueId = core?.uniqueId
    if (!uniqueId) return null

    const [profileRes, achievementsRes, achievementsCatalogRes] = await Promise.allSettled([
      getHabboUserProfileById(uniqueId),
      getHabboAchievementsById(uniqueId),
      getAllAchievements(),
    ])

    const profileData = profileRes.status === 'fulfilled' ? profileRes.value : null
    const achievements = achievementsRes.status === 'fulfilled'
      ? (Array.isArray(achievementsRes.value) ? achievementsRes.value : [])
      : []
    const achievementsTotal = achievementsCatalogRes.status === 'fulfilled'
      ? (Array.isArray(achievementsCatalogRes.value) ? achievementsCatalogRes.value : [])
      : []

    const profile = profileData as any
    const friends = Array.isArray(profile?.friends) ? profile.friends : []
    const groups = Array.isArray(profile?.groups) ? profile.groups : []
    const rooms = Array.isArray(profile?.rooms) ? profile.rooms : []
    const badgesRaw = Array.isArray(profile?.badges) ? profile.badges : []
    const badges = enrichHabboBadges(badgesRaw, achievementsTotal)

    return {
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
    }
  } catch {
    return null
  }
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login?from=/profile')
  }

  const params = await searchParams
  const currentUser = (session.user as any)?.nick ?? 'Utilisateur'
  const viewingNick = params?.user || currentUser

  // Pre-fetch profile data server-side — no loading flash on navigation
  const initialProfile = await fetchProfileServerSide(viewingNick)

  return (
    <SitePage>
      <SiteHeader
        title={viewingNick === currentUser ? 'Mon Profil' : `Profil de ${viewingNick}`}
        imageSrc="/img/profile.png"
        actions={<ProfileSearchBar currentNick={viewingNick} />}
      />

      <ProfileClient nick={viewingNick} initialData={initialProfile} />
    </SitePage>
  )
}
