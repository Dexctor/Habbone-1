import { listTeamMembersByRoles } from '@/server/directus/team'
import { CalendarClock, Twitter } from 'lucide-react'

import { parseTimestamp } from '@/lib/date-utils'
import { buildHabboAvatarUrl } from '@/lib/habbo-imaging'

export const revalidate = 0 // always fresh - reflects role changes immediately

function habboAvatarUrl(nick: string) {
  return buildHabboAvatarUrl(nick, {
    direction: 2,
    head_direction: 3,
    img_format: 'png',
    gesture: 'sml',
    headonly: 0,
    size: 'm',
  })
}

function formatTenure(value?: string | null) {
  if (!value) return 'Date inconnue'
  const ts = parseTimestamp(value, { numeric: 'auto', numericString: 'number', mysqlLike: true })
  if (!ts) return 'Date inconnue'

  const now = Date.now()
  const diffMs = Math.max(0, now - ts)
  const monthMs = 1000 * 60 * 60 * 24 * 30
  const months = Math.floor(diffMs / monthMs)

  if (months < 1) return "moins d'un mois"
  if (months === 1) return '1 mois'
  return `${months} mois`
}

function resolveTwitterLink(value?: string | null) {
  if (!value) return null
  let handle = value.trim()
  if (!handle) return null
  if (/^https?:\/\//i.test(handle)) return handle
  if (handle.startsWith('@')) handle = handle.slice(1)
  return `https://twitter.com/${handle}`
}

export default async function TeamPage() {
  const membersByRole = await listTeamMembersByRoles()

  // Get roles that have members (order comes from Directus roles sort)
  const activeRoles = Object.keys(membersByRole).filter(
    (role) => membersByRole[role].length > 0
  )

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-3 px-4 py-10 sm:px-6">
      <header className="flex h-[76px] items-center rounded-[4px] border border-black/60 bg-[#1F1F3E] px-5 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/member-team.png"
            alt=""
            className="h-[49px] w-auto image-pixelated"
          />
          <h1 className="text-[18px] font-bold uppercase text-[#DDD] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            Equipe Habbone
          </h1>
        </div>
      </header>

      {activeRoles.length === 0 ? (
        <section className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] px-5 py-6">
          <p className="rounded-[6px] border border-dashed border-white/15 px-4 py-6 text-center text-sm text-[#BEBECE]">
            Aucun membre reference pour le moment.
          </p>
        </section>
      ) : (
        activeRoles.map((role) => {
          const members = membersByRole[role] ?? []
          return (
            <section key={role} className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] px-5 py-6">
              <h2 className="text-[16px] font-bold text-white">{role}</h2>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 md:justify-start md:[grid-template-columns:repeat(2,minmax(0,278px))]">
                {members.map((member) => {
                  const twitter = resolveTwitterLink(member.twitter)
                  return (
                    <article
                      key={`${member.role}-${member.id}`}
                      className="w-full rounded-[8px] border-2 border-white/10 bg-black/10 px-3 pb-[10px] pt-3"
                    >
                      <div className="flex items-start gap-2">
                        <div className="h-[70px] w-[64px] shrink-0 overflow-hidden rounded-[2px]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={habboAvatarUrl(member.nick)}
                            alt={member.nick}
                            className="h-full w-full object-cover image-pixelated"
                          />
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col gap-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[16px] font-bold text-[#2596FF]">{member.nick}</p>
                            {twitter ? (
                              <a
                                href={twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-[4px] bg-[#2596FF] text-white transition hover:bg-[#2976E8]"
                                aria-label={`Profil Twitter de ${member.nick}`}
                              >
                                <Twitter className="h-[15px] w-[15px]" />
                              </a>
                            ) : (
                              <span className="h-[31px] w-[31px] shrink-0 rounded-[4px] bg-white/10" aria-hidden />
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[14px] text-[#BEBECE]">
                            <CalendarClock className="h-[14px] w-[14px] shrink-0" />
                            <span className="truncate">Dans l&apos;equipe depuis {formatTenure(member.joinedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })
      )}
    </main>
  )
}
