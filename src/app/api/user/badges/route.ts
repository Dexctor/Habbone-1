import { NextResponse } from 'next/server'
import { directusUrl, serviceToken, USERS_TABLE } from '@/server/directus/client'
import { getUserBadges } from '@/server/directus/badges'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const nick = searchParams.get('nick')?.trim()
  if (!nick) return NextResponse.json({ badges: [] })

  try {
    // Find user ID by nick
    const url = new URL(`${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}`)
    url.searchParams.set('filter[nick][_eq]', nick)
    url.searchParams.set('fields', 'id')
    url.searchParams.set('limit', '1')
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ badges: [] })
    const json = await res.json()
    const userId = json?.data?.[0]?.id
    if (!userId) return NextResponse.json({ badges: [] })

    const badges = await getUserBadges(Number(userId))
    return NextResponse.json({ badges })
  } catch {
    return NextResponse.json({ badges: [] })
  }
}
