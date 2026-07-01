'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

import { buildHabboAvatarUrl } from '@/lib/habbo-imaging'
import { toast } from 'sonner'
import { SiteField, SiteHeader, SiteInput, SitePanel, SiteSelect } from '@/components/site'

type AvatarSize = 's' | 'm' | 'l'
type AvatarFormat = 'png' | 'gif' | 'jpg'

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'std', label: 'Debout' },
  { value: 'wlk', label: 'Marche' },
  { value: 'wav', label: 'Saluer' },
  { value: 'sit', label: "S'asseoir" },
  { value: 'lay', label: 'Allongé' },
  { value: 'wlk,wav', label: 'Marcher + saluer' },
  { value: 'sit,wav', label: "Assis + saluer" },
]

const ITEM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '999', label: 'Aucun' },
  { value: '1', label: '💧 Eau' },
  { value: '6', label: '☕ Café' },
  { value: '3', label: '🍦 Glace' },
  { value: '2', label: '🥕 Carotte' },
  { value: '5', label: '🥤 Soda' },
  { value: '667', label: '🍸 Cocktail' },
  { value: '9', label: '💗 Potion d\'amour' },
  { value: '42', label: '🍵 Thé japonais' },
  { value: '43', label: '🍅 Jus de tomate' },
  { value: '44', label: '☠️ Boisson toxique' },
]

const GESTURE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'std', label: 'Normal' },
  { value: 'sml', label: '😊 Sourire' },
  { value: 'spk', label: '🗣️ Parlant' },
  { value: 'srp', label: '😲 Surpris' },
  { value: 'agr', label: '😠 Énervé' },
  { value: 'sad', label: '😢 Triste' },
  { value: 'lol', label: '🫥 Sans visage' },
]

const FRAME_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Frame 0' },
  { value: 1, label: 'Frame 1' },
  { value: 2, label: 'Frame 2' },
  { value: 3, label: 'Frame 3' },
]

const FORMAT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'png', label: 'PNG' },
  { value: 'gif', label: 'GIF (animé)' },
  { value: 'jpg', label: 'JPG' },
]

export default function ImagerClient() {
  const { data: session } = useSession()
  const [user, setUser] = useState('')
  const [userDirty, setUserDirty] = useState(false)
  const [size, setSize] = useState<AvatarSize>('m')
  const [direction, setDirection] = useState(2)
  const [headDirection, setHeadDirection] = useState(3)
  const [headOnly, setHeadOnly] = useState(false)
  const [gesture, setGesture] = useState('sml')
  const [action, setAction] = useState('std')
  const [frameNum, setFrameNum] = useState(0)
  const [carryItem, setCarryItem] = useState('999')
  const [format, setFormat] = useState<AvatarFormat>('png')

  const sessionNick =
    typeof (session?.user as { nick?: unknown } | undefined)?.nick === 'string'
      ? (session?.user as { nick: string }).nick.trim()
      : ''

  useEffect(() => {
    if (userDirty) return
    if (sessionNick) setUser(sessionNick)
  }, [sessionNick, userDirty])

  const safeUser = user.trim()

  const params = useMemo(() => {
    const actionBase = action.trim() || 'std'
    const gestureValue = gesture.trim() || 'std'
    const hasCarry = carryItem !== '999'
    const actionWithCarry = hasCarry ? `${actionBase},crr=${carryItem}` : actionBase

    const base: Record<string, string | number> = {
      direction,
      head_direction: headDirection,
      size,
      img_format: format,
      headonly: headOnly ? 1 : 0,
      gesture: gestureValue,
      action: actionWithCarry,
    }
    if (frameNum > 0) base.frame_num = frameNum
    return base
  }, [action, carryItem, direction, format, frameNum, gesture, headDirection, headOnly, size])

  const previewUrl = useMemo(() => {
    if (!safeUser) return '/img/avatar_empty.png'
    return buildHabboAvatarUrl(safeUser, params)
  }, [params, safeUser])

  const canAct = safeUser.length > 0

  const nudge = (current: number, delta: number) => {
    const next = current + delta
    return next < 0 ? 7 : next > 7 ? 0 : next
  }

  const handleCopyUrl = async () => {
    if (!canAct) {
      toast.error('Renseigne un pseudo avant de copier l\'URL.')
      return
    }
    try {
      await navigator.clipboard.writeText(previewUrl)
      toast.success('URL copiée dans le presse-papiers !')
    } catch {
      toast.error('Impossible de copier automatiquement.')
    }
  }

  return (
    <div className="w-full">
      <SiteHeader title="Habbo Imager" imageSrc="/img/photo.png" className="rounded-b-none" />

      <SitePanel className="rounded-t-none px-4 py-5 sm:px-7 sm:py-6">
        {/* Desktop: side-by-side | Mobile: stacked */}
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">

          {/* ── Left column: Preview + Direction controls ── */}
          <div className="flex flex-col items-center gap-3 lg:w-[208px] lg:flex-shrink-0 lg:items-stretch">
            {/* Preview panel */}
            <div className="flex h-[180px] w-full max-w-[240px] items-center justify-center rounded-[8px] border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)] p-4 lg:h-[173px] lg:max-w-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={safeUser || 'Avatar preview'}
                className="max-h-[140px] max-w-[140px] object-contain image-pixelated"
              />
            </div>

            {/* Direction controls - side by side on mobile, stacked on desktop */}
            <div className="flex w-full max-w-[240px] gap-2 lg:flex-col lg:max-w-none lg:gap-3">
              {/* Head direction */}
              <div className="flex flex-1 items-center gap-1">
                <ArrowBtn onClick={() => setHeadDirection(nudge(headDirection, -1))} label="Tête gauche" dir="left" />
                <div className="flex h-[44px] flex-1 items-center justify-center rounded-[4px] border-2 border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.1)] text-xs font-bold text-[#DDD] sm:h-[50px] sm:text-sm">
                  Tête
                </div>
                <ArrowBtn onClick={() => setHeadDirection(nudge(headDirection, 1))} label="Tête droite" dir="right" />
              </div>

              {/* Body direction */}
              <div className="flex flex-1 items-center gap-1">
                <ArrowBtn onClick={() => setDirection(nudge(direction, -1))} label="Corps gauche" dir="left" />
                <div className="flex h-[44px] flex-1 items-center justify-center rounded-[4px] border-2 border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.1)] text-xs font-bold text-[#DDD] sm:h-[50px] sm:text-sm">
                  Corps
                </div>
                <ArrowBtn onClick={() => setDirection(nudge(direction, 1))} label="Corps droite" dir="right" />
              </div>
            </div>

            {/* Checkbox: Head only */}
            <button
              type="button"
              onClick={() => setHeadOnly(!headOnly)}
              className="mx-auto flex w-full max-w-[240px] cursor-pointer items-center gap-3 lg:mx-0 lg:mt-1 lg:max-w-none"
            >
              <div className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-[4px] border border-[rgba(255,255,255,0.2)] bg-[rgba(0,0,0,0.1)]">
                {headOnly && <div className="h-[10px] w-[10px] bg-[#2596FF]" />}
              </div>
              <span className="text-sm font-normal text-white">Seulement la tête</span>
            </button>
          </div>

          {/* ── Right columns: Form fields ── */}
          <div className="flex-1 space-y-5">
            {/* Row 1: Nickname + Taille */}
            <div className="flex flex-col gap-5 sm:flex-row sm:gap-8">
              <SiteField label="Pseudo" className="flex-1">
                <SiteInput
                  value={user}
                  onChange={(e) => {
                    if (!userDirty) setUserDirty(true)
                    setUser(e.target.value)
                  }}
                  placeholder={sessionNick || 'Utilisateur'}
                  className="font-bold"
                />
              </SiteField>
              <div className="flex-1 space-y-2">
                <label className="block text-sm font-bold text-[#DDD] sm:text-base">Taille</label>
                <div className="flex items-center gap-4 py-3.5 sm:justify-between sm:gap-2">
                  {([
                    { v: 'l' as const, label: 'Grand' },
                    { v: 'm' as const, label: 'Normal' },
                    { v: 's' as const, label: 'Petit' },
                  ]).map(({ v, label }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSize(v)}
                      className="flex items-center gap-2 sm:gap-3"
                    >
                      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[rgba(255,255,255,0.2)] bg-[rgba(0,0,0,0.1)] p-[5px]">
                        {size === v && <div className="h-[10px] w-[10px] rounded-full bg-[#2596FF]" />}
                      </div>
                      <span className={`text-sm font-normal ${size === v ? 'text-white' : 'text-[#BEBECE]'}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Action + Objet + Expression */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              <FigmaSelect label="Action" value={action} onChange={setAction} options={ACTION_OPTIONS} />
              <FigmaSelect label="Objet" value={carryItem} onChange={setCarryItem} options={ITEM_OPTIONS} />
              <FigmaSelect label="Expression" value={gesture} onChange={setGesture} options={GESTURE_OPTIONS} />
            </div>

            {/* Row 3: Frame + Format */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              <FigmaSelect label="Frame" value={String(frameNum)} onChange={(v) => setFrameNum(Number(v))} options={FRAME_OPTIONS.map(o => ({ value: String(o.value), label: o.label }))} />
              <FigmaSelect label="Format" value={format} onChange={(v) => setFormat(v as AvatarFormat)} options={FORMAT_OPTIONS} />
            </div>

            {/* Copy URL button */}
            <button
              type="button"
              onClick={handleCopyUrl}
              disabled={!canAct}
              className="flex w-full items-center justify-center gap-2 rounded-[4px] border-2 border-[#2596FF] px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-[#2596FF]/15 active:bg-[#2596FF]/25 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.08 9.92a3.54 3.54 0 005 0l2.83-2.83a3.54 3.54 0 00-5-5L8.49 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.92 7.08a3.54 3.54 0 00-5 0L2.09 9.92a3.54 3.54 0 005 5l1.41-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copier URL
            </button>
          </div>
        </div>
      </SitePanel>
    </div>
  )
}

/* ─── Custom Select with Figma styling ─── */
function FigmaSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <SiteField label={label}>
      <SiteSelect value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#1A1A3A] text-[#DDD] py-2">
            {o.label}
          </option>
        ))}
      </SiteSelect>
    </SiteField>
  )
}

/* ─── Arrow Button ─── */
function ArrowBtn({ onClick, label, dir }: { onClick: () => void; label: string; dir: 'left' | 'right' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-[4px] border-2 border-[rgba(255,255,255,0.1)] text-[#BEBECE] transition hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white active:bg-[rgba(255,255,255,0.1)] sm:h-[50px] sm:w-[50px]"
      aria-label={label}
    >
      <svg width="14" height="22" viewBox="0 0 14 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        {dir === 'left' ? (
          <path d="M12 2L3 11L12 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M2 2L11 11L2 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  )
}
