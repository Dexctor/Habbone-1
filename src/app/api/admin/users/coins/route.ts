import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdmin } from '@/server/api-helpers'
import { pbOne, pbUpdate } from '@/server/directus/pb-helpers'
import { TABLES } from '@/server/directus/tables'
import { guardTargetUser, isCallerFounder } from '@/server/admin-guards'
import { logAdminAction } from '@/server/directus/admin-logs'

const MAX_BALANCE = 10_000_000
const USERS_TABLE = TABLES.users

const BodySchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().min(1, 'Montant minimum: 1').max(100000, 'Montant maximum: 100 000'),
})

type UserCoinsRow = { id: string; nick: string | null; coins: number | null }

function cleanUserId(id: string) {
  return id.startsWith('legacy:') ? id.split(':')[1] : id
}

async function getUserById(id: string) {
  return pbOne<UserCoinsRow>(USERS_TABLE, cleanUserId(id), { fields: 'id,nick,coins' }).catch(
    () => null,
  )
}

async function updateUserCoins(id: string, newBalance: number) {
  return pbUpdate<UserCoinsRow>(USERS_TABLE, cleanUserId(id), { coins: newBalance }).catch(
    () => null,
  )
}

export const POST = withAdmin(async (req, { user: caller }) => {
  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || 'Donnees invalides'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { userId, amount } = parsed.data

  const guard = await guardTargetUser({
    callerId: caller?.id,
    callerIsFounder: isCallerFounder(caller),
    targetUserId: userId,
    action: 'coins',
  })
  if (!guard.ok) return guard.response

  const user = await getUserById(userId)
  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  const currentBalance = Number(user.coins) || 0
  const newBalance = currentBalance + amount

  if (newBalance > MAX_BALANCE) {
    return NextResponse.json(
      { error: `Solde maximum depasse (${MAX_BALANCE.toLocaleString('fr-FR')})` },
      { status: 400 }
    )
  }

  const updated = await updateUserCoins(userId, newBalance)
  if (!updated) {
    return NextResponse.json({ error: 'Echec de la mise a jour' }, { status: 500 })
  }

  await logAdminAction({
    action: 'user.coins_grant',
    admin_id: String(caller?.id || ''),
    admin_name: caller?.nick ?? undefined,
    target_type: 'user',
    target_id: guard.target.id,
    details: {
      nick: user.nick,
      amount,
      previous: currentBalance,
      new_balance: newBalance,
    },
  })

  return NextResponse.json({
    ok: true,
    nick: user.nick,
    previous: currentBalance,
    added: amount,
    newBalance,
  })
}, { key: 'admin:users:coins', limit: 30, windowMs: 60_000 })
