import { NextResponse } from 'next/server'
import { pbFirst } from '@/server/directus/pb-helpers'
import { TABLES } from '@/server/directus/tables'
import { getUserBadges } from '@/server/directus/badges'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const nick = searchParams.get('nick')?.trim()
  if (!nick) return NextResponse.json({ badges: [] })

  try {
    // Find user ID by nick
    const user = await pbFirst<{ id: string }>(
      TABLES.users,
      { nick: { _eq: nick } },
      { fields: 'id' },
    )
    const userId = user?.id
    if (!userId) return NextResponse.json({ badges: [] })

    const badges = await getUserBadges(String(userId))
    return NextResponse.json({ badges })
  } catch {
    return NextResponse.json({ badges: [] })
  }
}
