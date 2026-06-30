import { NextResponse } from 'next/server'
import { pbFirst } from '@/server/pocketbase/helpers'
import { TABLES } from '@/server/pocketbase/tables'
import { getRoleBadgeImage, getUserBadges } from '@/server/pocketbase/badges'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const nick = searchParams.get('nick')?.trim()
  if (!nick) return NextResponse.json({ badges: [] })

  try {
    // Find user ID and role by nick. Role badges are virtual HabbOne badges
    // so staff/admin profiles are not empty while explicit badge awards remain optional.
    const user = await pbFirst<{
      id: string
      expand?: { role?: { name?: string } }
    }>(
      TABLES.users,
      { nick: { _eq: nick } },
      { fields: 'id,role,expand.role.name', expand: 'role' },
    )
    const userId = user?.id
    if (!userId) return NextResponse.json({ badges: [] })

    const badges = await getUserBadges(String(userId))
    const roleName = user?.expand?.role?.name?.trim() || ''
    const roleBadgeImage = roleName ? getRoleBadgeImage(roleName) : null

    if (roleName && roleBadgeImage && !badges.some((b) => b.imagem === roleBadgeImage)) {
      badges.unshift({
        id: `role:${roleName.toLowerCase()}`,
        nome: roleName,
        imagem: roleBadgeImage,
      })
    }

    return NextResponse.json({ badges })
  } catch {
    return NextResponse.json({ badges: [] })
  }
}
