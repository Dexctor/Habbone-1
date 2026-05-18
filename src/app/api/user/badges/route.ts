import { NextResponse } from 'next/server'
import { getUserBadges } from '@/server/directus/badges'
import { getUserByNick } from '@/server/directus/users'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const nick = searchParams.get('nick')?.trim()
  if (!nick) return NextResponse.json({ badges: [] })

  try {
    const user = await getUserByNick(nick)
    const userId = user?.id
    if (!userId) return NextResponse.json({ badges: [] })

    const badges = await getUserBadges(Number(userId))
    return NextResponse.json({ badges })
  } catch {
    return NextResponse.json({ badges: [] })
  }
}
