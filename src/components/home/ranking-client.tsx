'use client'

import { useState, useMemo } from 'react'
import { MessageSquare, FileText, MessagesSquare, Coins, Trophy } from 'lucide-react'
import { buildHabboAvatarUrl } from '@/lib/habbo-imaging'

type RankingEntry = { nick: string; score: number }
type Category = 'comments' | 'articles' | 'topics' | 'coins'

type RankingData = Record<Category, RankingEntry[]>

const TABS: { key: Category; label: string; icon: React.ReactNode }[] = [
  { key: 'comments', label: 'Commentaires', icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { key: 'articles', label: 'Articles', icon: <FileText className="h-3.5 w-3.5" /> },
  { key: 'topics', label: 'Topics', icon: <MessagesSquare className="h-3.5 w-3.5" /> },
  { key: 'coins', label: 'HabbOneCoins', icon: <Coins className="h-3.5 w-3.5" /> },
]

const MEDAL_COLORS = ['text-[#FFD700]', 'text-[#C0C0C0]', 'text-[#CD7F32]']

function avatarUrl(nick: string) {
  return buildHabboAvatarUrl(nick, {
    direction: 2,
    head_direction: 3,
    img_format: 'png',
    gesture: 'sml',
    headonly: 0,
    size: 'l',
  })
}

function AvatarImg({ nick, className, headonly = false }: { nick: string; className: string; headonly?: boolean }) {
  const src = headonly
    ? buildHabboAvatarUrl(nick, { direction: 2, head_direction: 3, headonly: 1, size: 's', img_format: 'png' })
    : avatarUrl(nick)

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={nick}
      className={className}
      loading="lazy"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}

function PodiumAvatar({ nick, rank, score }: { nick: string; rank: number; score: number }) {
  const heights = [160, 120, 100]
  const podiumH = heights[rank] || 100
  const medals = ['bg-[#FFD700]', 'bg-[#C0C0C0]', 'bg-[#CD7F32]']
  const medalLabels = ['1er', '2e', '3e']

  return (
    <div className="flex flex-col items-center" style={{ order: rank === 0 ? 1 : rank === 1 ? 0 : 2 }}>
      <div className="relative mb-1">
        <AvatarImg nick={nick} className="h-[110px] w-auto image-pixelated drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
      </div>
      <span className="mb-1 max-w-[120px] truncate text-[13px] font-bold text-white">{nick}</span>
      <span className="mb-2 text-[12px] text-[#BEBECE]">{score.toLocaleString('fr-FR')}</span>
      <div
        className="relative flex w-[110px] flex-col items-center rounded-t-[6px] border border-b-0 border-white/10 bg-gradient-to-t from-[#1F1F3E] to-[#2C2C5A] pt-2"
        style={{ height: podiumH }}
      >
        <span className={`inline-flex h-[24px] w-[24px] items-center justify-center rounded-full text-[11px] font-black text-black ${medals[rank]}`}>
          {medalLabels[rank]}
        </span>
      </div>
    </div>
  )
}

function RankRow({ entry, rank }: { entry: RankingEntry; rank: number }) {
  const isMedal = rank < 3
  return (
    <div className={`flex items-center gap-3 rounded-[4px] border px-3 py-2.5 transition hover:border-white/10 hover:bg-[#303060] ${
      isMedal ? 'border-white/5 bg-[#2C2C5A]' : 'border-[#1F1F3E] bg-[#1F1F3E]'
    }`}>
      <span className={`flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
        isMedal ? MEDAL_COLORS[rank] : 'bg-[rgba(255,255,255,0.08)] text-[#BEBECE]'
      }`}>
        {isMedal ? <Trophy className="h-4 w-4" /> : rank + 1}
      </span>
      <AvatarImg nick={entry.nick} className="h-[28px] w-auto image-pixelated" headonly />
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#DDD]">
        {entry.nick}
      </span>
      <span className={`shrink-0 text-[13px] font-bold ${isMedal ? 'text-white' : 'text-[#2596FF]'}`}>
        {entry.score.toLocaleString('fr-FR')}
      </span>
    </div>
  )
}

export default function RankingClient({ data }: { data: RankingData }) {
  const [category, setCategory] = useState<Category>('comments')

  const entries = useMemo(() => data[category] || [], [data, category])
  const podium = entries.slice(0, 3)

  return (
    <section className="w-full">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/star.png" alt="" className="h-[32px] w-auto image-pixelated" />
          <h2 className="text-[18px] font-bold uppercase text-[#DDD] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            Classements
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategory(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-[4px] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.04em] transition ${
                category === tab.key
                  ? 'bg-[#2596FF] text-white'
                  : 'bg-[rgba(255,255,255,0.08)] text-[#BEBECE] hover:bg-[rgba(255,255,255,0.14)] hover:text-white'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-[4px] border border-dashed border-[#1F1F3E] bg-[#272746] px-6 py-12 text-center text-sm font-semibold uppercase tracking-[0.06em] text-[#BEBECE]/70">
          Aucune donnee pour ce classement.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* Podium */}
          <div className="flex items-end justify-center gap-3 rounded-[8px] border border-[#1F1F3E] bg-[#272746] px-4 pb-0 pt-6">
            {podium.length >= 3 ? (
              <>
                <PodiumAvatar nick={podium[1].nick} rank={1} score={podium[1].score} />
                <PodiumAvatar nick={podium[0].nick} rank={0} score={podium[0].score} />
                <PodiumAvatar nick={podium[2].nick} rank={2} score={podium[2].score} />
              </>
            ) : podium.map((entry, i) => (
              <PodiumAvatar key={entry.nick} nick={entry.nick} rank={i} score={entry.score} />
            ))}
          </div>

          {/* Full ranking list */}
          <div className="rounded-[8px] border border-[#1F1F3E] bg-[#272746] p-4">
            <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-[#BEBECE]/70">
              Classement complet
            </div>
            <div className="space-y-1.5">
              {entries.map((entry, i) => (
                <RankRow key={entry.nick} entry={entry} rank={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
