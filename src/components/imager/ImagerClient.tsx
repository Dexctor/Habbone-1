'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

import { buildHabboAvatarUrl } from '@/lib/habbo-imaging'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { toast } from 'sonner'

type AvatarSize = 's' | 'm' | 'l'
type AvatarFormat = 'png' | 'gif' | 'jpg'

const DIRECTION_OPTIONS = Array.from({ length: 8 }, (_, i) => i)

type Preset = {
  id: string
  label: string
  description: string
  values: {
    size: AvatarSize
    direction: number
    headDirection: number
    headOnly: boolean
    gesture: string
    action: string
    effect: string
    dance: number
    frameNum: number
    format: AvatarFormat
    carryItem: string
    drinking: boolean
  }
}

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'std', label: 'Normal' },
  { value: 'wlk', label: 'Marche' },
  { value: 'wav', label: 'Ondulation' },
  { value: 'sit', label: "S'asseoir" },
  { value: 'wlk,wav', label: 'Marcher / saluer' },
  { value: 'sit,wav', label: "S'asseoir / saluer" },
  { value: 'lay', label: 'Allonge' },
]

const GESTURE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'std', label: 'Normal' },
  { value: 'spk', label: 'Parlant' },
  { value: 'sml', label: 'Sourire' },
  { value: 'srp', label: 'Surpris' },
  { value: 'agr', label: 'Nerveux' },
  { value: 'sad', label: 'Triste' },
  { value: 'lol', label: 'Sans visage' },
]

const ITEM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '999', label: 'Aucun objet' },
  { value: '1', label: 'Eau' },
  { value: '44', label: 'Boisson toxique' },
  { value: '6', label: 'Cafe' },
  { value: '2', label: 'Carotte' },
  { value: '42', label: 'The japonais' },
  { value: '667', label: 'Cocktail' },
  { value: '5', label: 'Refri' },
  { value: '9', label: "Potion d'amour" },
  { value: '3', label: 'Glace' },
  { value: '33', label: 'Glace Callipo' },
  { value: '43', label: 'Jus de tomate' },
]

const PRESETS: Preset[] = [
  {
    id: 'profile',
    label: 'Profil',
    description: 'Avatar complet pour profil',
    values: {
      size: 'l',
      direction: 2,
      headDirection: 3,
      headOnly: false,
      gesture: 'sml',
      action: 'std',
      effect: '',
      dance: 0,
      frameNum: 0,
      format: 'png',
      carryItem: '999',
      drinking: false,
    },
  },
  {
    id: 'head',
    label: 'Tete',
    description: 'Focus tete uniquement',
    values: {
      size: 'm',
      direction: 2,
      headDirection: 2,
      headOnly: true,
      gesture: 'std',
      action: 'std',
      effect: '',
      dance: 0,
      frameNum: 0,
      format: 'png',
      carryItem: '999',
      drinking: false,
    },
  },
  {
    id: 'forum',
    label: 'Forum',
    description: 'Miniature tete pour posts',
    values: {
      size: 's',
      direction: 2,
      headDirection: 2,
      headOnly: true,
      gesture: 'std',
      action: 'std',
      effect: '',
      dance: 0,
      frameNum: 0,
      format: 'png',
      carryItem: '999',
      drinking: false,
    },
  },
  {
    id: 'walk',
    label: 'Marche',
    description: 'Action wlk pour mouvement',
    values: {
      size: 'l',
      direction: 3,
      headDirection: 3,
      headOnly: false,
      gesture: 'std',
      action: 'wlk',
      effect: '',
      dance: 0,
      frameNum: 0,
      format: 'png',
      carryItem: '999',
      drinking: false,
    },
  },
  {
    id: 'dance',
    label: 'Danse',
    description: 'Animation de danse',
    values: {
      size: 'l',
      direction: 2,
      headDirection: 3,
      headOnly: false,
      gesture: 'std',
      action: 'std',
      effect: '',
      dance: 1,
      frameNum: 0,
      format: 'gif',
      carryItem: '999',
      drinking: false,
    },
  },
]

const DEFAULT_PRESET: Preset = PRESETS[0]

function buildDownloadUrl(user: string, params: Record<string, string | number | boolean | null | undefined>) {
  const qs = new URLSearchParams()
  qs.set('user', user)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    qs.set(key, String(value))
  }
  return `/api/habbo/imager?${qs.toString()}`
}

export default function ImagerClient() {
  const { data: session } = useSession()
  const [user, setUser] = useState('')
  const [userDirty, setUserDirty] = useState(false)
  const [activePresetId, setActivePresetId] = useState(DEFAULT_PRESET.id)
  const [size, setSize] = useState<AvatarSize>('l')
  const [format, setFormat] = useState<AvatarFormat>('png')
  const [direction, setDirection] = useState(2)
  const [headDirection, setHeadDirection] = useState(3)
  const [headOnly, setHeadOnly] = useState(false)
  const [gesture, setGesture] = useState('sml')
  const [action, setAction] = useState('std')
  const [effect, setEffect] = useState('')
  const [dance, setDance] = useState(0)
  const [frameNum, setFrameNum] = useState(0)
  const [carryItem, setCarryItem] = useState('999')
  const [drinking, setDrinking] = useState(false)

  const sessionNick =
    typeof (session?.user as { nick?: unknown } | undefined)?.nick === 'string'
      ? (session?.user as { nick: string }).nick.trim()
      : ''

  useEffect(() => {
    if (userDirty) return
    if (sessionNick) {
      setUser(sessionNick)
    }
  }, [sessionNick, userDirty])

  const safeUser = user.trim()

  const params = useMemo(() => {
    const actionBase = action.trim() || 'std'
    const gestureValue = gesture.trim() || 'std'
    const hasCarry = carryItem !== '999'
    const carryType = drinking ? 'drk' : 'crr'
    const actionWithCarry = hasCarry ? `${actionBase},${carryType}=${carryItem}` : actionBase

    const base: Record<string, string | number> = {
      direction,
      head_direction: headDirection,
      size,
      img_format: format,
      headonly: headOnly ? 1 : 0,
      gesture: gestureValue,
      action: actionWithCarry,
    }
    if (effect.trim()) base.effect = effect.trim()
    if (dance > 0) base.dance = dance
    if (frameNum > 0) base.frame_num = frameNum
    return base
  }, [
    action,
    carryItem,
    dance,
    direction,
    drinking,
    effect,
    format,
    frameNum,
    gesture,
    headDirection,
    headOnly,
    size,
  ])

  const previewUrl = useMemo(() => {
    if (!safeUser) return '/img/avatar_empty.png'
    return buildHabboAvatarUrl(safeUser, params)
  }, [params, safeUser])

  const downloadUrl = useMemo(() => {
    if (!safeUser) return ''
    return buildDownloadUrl(safeUser, params)
  }, [params, safeUser])

  const hasCarry = carryItem !== '999'
  const canAct = safeUser.length > 0
  const downloadName = safeUser ? `${safeUser}-avatar.${format}` : 'habbo-avatar.png'

  const handleCarryItemChange = (value: string) => {
    setCarryItem(value)
    if (value === '999') {
      setDrinking(false)
    }
  }

  const nudgeDirection = (current: number, delta: number) => {
    const next = current + delta
    if (next < 0 || next > 7) return current
    return next
  }

  const nudgeBody = (delta: number) => {
    setDirection((prev) => nudgeDirection(prev, delta))
  }

  const nudgeHead = (delta: number) => {
    setHeadDirection((prev) => nudgeDirection(prev, delta))
  }

  const applyPreset = (preset: Preset) => {
    const next = preset.values
    setSize(next.size)
    setDirection(next.direction)
    setHeadDirection(next.headDirection)
    setHeadOnly(next.headOnly)
    setGesture(next.gesture)
    setAction(next.action)
    setEffect(next.effect)
    setDance(next.dance)
    setFrameNum(next.frameNum)
    setFormat(next.format)
    setCarryItem(next.carryItem)
    setDrinking(next.drinking)
    setActivePresetId(preset.id)
  }

  const useSessionAvatar = () => {
    if (!sessionNick) {
      toast.error('Aucun pseudo detecte sur la session.')
      return
    }
    setUser(sessionNick)
    setUserDirty(false)
    toast.info(`Avatar charge pour ${sessionNick}.`)
  }

  const resetControls = () => {
    applyPreset(DEFAULT_PRESET)
    if (sessionNick) {
      setUser(sessionNick)
      setUserDirty(false)
    }
  }

  const handleCopyUrl = async () => {
    if (!canAct) {
      toast.error('Renseigne un pseudo avant de copier l URL.')
      return
    }
    try {
      await navigator.clipboard.writeText(previewUrl)
      toast.success('URL copiee dans le presse-papiers.')
    } catch {
      toast.error('Impossible de copier automatiquement.')
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-[color:var(--bg-700)]/55 bg-[color:var(--bg-900)]/35 px-6 py-6 shadow-[0_24px_60px_-50px_rgba(0,0,0,0.9)]">
        <div className="mb-5 text-[color:var(--foreground)]">
          <h2 className="text-base font-semibold uppercase tracking-[0.08em]">Generateur d avatar Habbo</h2>
          <p className="text-xs text-[color:var(--foreground)]/60">
            Renseigne un pseudo puis ajuste: la preview se met a jour instantanement.
          </p>
        </div>

        <div className="mb-6 rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/45 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/60">
            Essentiel
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-1.5">
              <Field label="Pseudo Habbo">
                <input
                  value={user}
                  onChange={(event) => {
                    if (!userDirty) setUserDirty(true)
                    setUser(event.target.value)
                  }}
                  placeholder={sessionNick || 'Ex: Decrypt'}
                  className="h-11 w-full rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 px-3 text-sm text-[color:var(--foreground)] focus:border-[color:var(--bg-300)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bg-300)]/30"
                />
              </Field>
              <p className="text-xs text-[color:var(--foreground)]/55">
                Astuce: utilise les presets puis ajuste seulement ce dont tu as besoin.
              </p>
            </div>
            {sessionNick ? (
              <Button
                type="button"
                variant="secondary"
                onClick={useSessionAvatar}
                className="h-11 border border-[color:var(--bg-600)]/70 bg-[color:var(--bg-800)]/70 text-[color:var(--foreground)] hover:bg-[color:var(--bg-700)]"
              >
                Mon avatar
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={resetControls}
              className="h-11 border border-[color:var(--bg-600)]/70 bg-[color:var(--bg-900)]/55 text-[color:var(--foreground)] hover:border-[color:var(--bg-500)]/70 hover:text-white"
            >
              Reinitialiser
            </Button>
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/55">
            Presets rapides
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const isActive = preset.id === activePresetId
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                    isActive
                      ? 'border-[color:var(--blue-500)]/80 bg-[color:var(--blue-500)]/15 text-white'
                      : 'border-[color:var(--bg-600)]/70 bg-[color:var(--bg-900)]/55 text-[color:var(--foreground)]/85 hover:border-[color:var(--bg-500)]/70 hover:text-white'
                  }`}
                  title={preset.description}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4 md:grid-cols-2">
            <SectionTitle className="md:col-span-2">Vue</SectionTitle>
            <Field label="Taille">
              <select
                value={size}
                onChange={(event) => setSize(event.target.value as AvatarSize)}
                className="h-11 w-full rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 px-3 text-sm text-[color:var(--foreground)] focus:border-[color:var(--bg-300)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bg-300)]/30"
              >
                <option value="s">Petite (s)</option>
                <option value="m">Moyenne (m)</option>
                <option value="l">Grande (l)</option>
              </select>
            </Field>

            <Field label="Direction">
              <div className="flex items-center gap-2">
                <ArrowButton label="Direction gauche" onClick={() => nudgeBody(-1)} disabled={direction <= 0}>
                  chevron_left
                </ArrowButton>
                <div className="flex h-11 min-w-14 items-center justify-center rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 px-3 text-sm font-semibold text-[color:var(--foreground)]">
                  {direction}
                </div>
                <ArrowButton label="Direction droite" onClick={() => nudgeBody(1)} disabled={direction >= 7}>
                  chevron_right
                </ArrowButton>
                <select
                  value={direction}
                  onChange={(event) => setDirection(Number(event.target.value))}
                  className="ml-auto h-11 w-20 rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 px-3 text-sm text-[color:var(--foreground)] focus:border-[color:var(--bg-300)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bg-300)]/30"
                  aria-label="Direction corps"
                >
                  {DIRECTION_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label="Direction tete">
              <div className="flex items-center gap-2">
                <ArrowButton label="Tete vers la gauche" onClick={() => nudgeHead(-1)} disabled={headDirection <= 0}>
                  chevron_left
                </ArrowButton>
                <div className="flex h-11 min-w-14 items-center justify-center rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 px-3 text-sm font-semibold text-[color:var(--foreground)]">
                  {headDirection}
                </div>
                <ArrowButton label="Tete vers la droite" onClick={() => nudgeHead(1)} disabled={headDirection >= 7}>
                  chevron_right
                </ArrowButton>
                <select
                  value={headDirection}
                  onChange={(event) => setHeadDirection(Number(event.target.value))}
                  className="ml-auto h-11 w-20 rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 px-3 text-sm text-[color:var(--foreground)] focus:border-[color:var(--bg-300)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bg-300)]/30"
                  aria-label="Direction tete"
                >
                  {DIRECTION_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <SectionTitle className="md:col-span-2">Posture & expression</SectionTitle>
            <Field label="Expression">
              <select
                value={gesture}
                onChange={(event) => setGesture(event.target.value)}
                className="h-11 w-full rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 px-3 text-sm text-[color:var(--foreground)] focus:border-[color:var(--bg-300)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bg-300)]/30"
              >
                {GESTURE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Action">
              <select
                value={action}
                onChange={(event) => setAction(event.target.value)}
                className="h-11 w-full rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 px-3 text-sm text-[color:var(--foreground)] focus:border-[color:var(--bg-300)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bg-300)]/30"
              >
                {ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <SectionTitle className="md:col-span-2">Objet</SectionTitle>
            <Field label="Objet">
              <select
                value={carryItem}
                onChange={(event) => handleCarryItemChange(event.target.value)}
                className="h-11 w-full rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 px-3 text-sm text-[color:var(--foreground)] focus:border-[color:var(--bg-300)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bg-300)]/30"
              >
                {ITEM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/45 px-4 py-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground)]/70">
                    En buvant ?
                  </div>
                  <div className="text-xs text-[color:var(--foreground)]/55">
                    Active drk=ID (necessite un objet).
                  </div>
                </div>
                <Switch
                  checked={hasCarry && drinking}
                  onCheckedChange={(checked) => setDrinking(Boolean(checked))}
                  disabled={!hasCarry}
                  aria-label="En buvant"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/45 px-4 py-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground)]/70">
                    Head only
                  </div>
                  <div className="text-xs text-[color:var(--foreground)]/55">Afficher uniquement la tete</div>
                </div>
                <Switch checked={headOnly} onCheckedChange={setHeadOnly} aria-label="Head only" />
              </div>
            </div>

            <div className="md:col-span-2">
              <Accordion
                type="single"
                collapsible
                className="rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/45 px-4"
              >
                <AccordionItem value="advanced" className="border-none">
                  <AccordionTrigger className="py-3 text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--foreground)]/70 hover:no-underline">
                    Options avancees
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Format">
                        <select
                          value={format}
                          onChange={(event) => setFormat(event.target.value as AvatarFormat)}
                          className="h-11 w-full rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 px-3 text-sm text-[color:var(--foreground)] focus:border-[color:var(--bg-300)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bg-300)]/30"
                        >
                          <option value="png">PNG</option>
                          <option value="gif">GIF</option>
                          <option value="jpg">JPG</option>
                        </select>
                      </Field>
                      <Field label="Effet">
                        <input
                          value={effect}
                          onChange={(event) => setEffect(event.target.value)}
                          placeholder="Ex: 33"
                          className="h-11 w-full rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 px-3 text-sm text-[color:var(--foreground)] focus:border-[color:var(--bg-300)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bg-300)]/30"
                        />
                      </Field>
                      <Field label="Danse">
                        <select
                          value={dance}
                          onChange={(event) => setDance(Number(event.target.value))}
                          className="h-11 w-full rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 px-3 text-sm text-[color:var(--foreground)] focus:border-[color:var(--bg-300)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bg-300)]/30"
                        >
                          {[0, 1, 2, 3, 4].map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Frame">
                        <select
                          value={frameNum}
                          onChange={(event) => setFrameNum(Number(event.target.value))}
                          className="h-11 w-full rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 px-3 text-sm text-[color:var(--foreground)] focus:border-[color:var(--bg-300)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bg-300)]/30"
                        >
                          {[0, 1, 2, 3, 4, 5].map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          <aside className="space-y-4 rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-800)]/55 p-4 shadow-[0_18px_55px_-45px_rgba(0,0,0,0.75)]">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/60">
                Preview
              </div>
              <div className="text-[11px] text-[color:var(--foreground)]/45">{size.toUpperCase()}</div>
            </div>

            <div className="grid min-h-[260px] place-items-center rounded-md border border-dashed border-[color:var(--bg-600)]/70 bg-[color:var(--bg-900)]/40 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={safeUser || 'Avatar preview'}
                className="image-pixelated h-56 w-56 object-contain"
              />
            </div>

            {!canAct ? (
              <p className="text-xs text-[color:var(--foreground)]/55">
                Indique un pseudo pour activer la preview et le telechargement.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <a
                href={canAct ? previewUrl : undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!canAct}
                className={`inline-flex h-10 items-center justify-center rounded-md border px-4 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                  canAct
                    ? 'border-[color:var(--bg-600)]/70 bg-[color:var(--bg-900)]/55 text-[color:var(--foreground)] hover:border-[color:var(--bg-500)]/70 hover:text-white'
                    : 'pointer-events-none border-[color:var(--bg-700)]/60 bg-[color:var(--bg-900)]/40 text-[color:var(--foreground)]/40'
                }`}
              >
                Ouvrir image
              </a>
              <a
                href={canAct ? downloadUrl : undefined}
                download={downloadName}
                aria-disabled={!canAct}
                className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-xs font-bold uppercase tracking-[0.08em] transition ${
                  canAct
                    ? 'bg-[color:var(--blue-500)] text-white hover:bg-[color:var(--blue-700)]'
                    : 'pointer-events-none bg-[color:var(--bg-600)]/60 text-[color:var(--foreground)]/45'
                }`}
              >
                Telecharger
              </a>
              <button
                type="button"
                onClick={handleCopyUrl}
                disabled={!canAct}
                className={`inline-flex h-10 items-center justify-center rounded-md border px-4 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                  canAct
                    ? 'border-[color:var(--bg-600)]/70 bg-[color:var(--bg-900)]/55 text-[color:var(--foreground)] hover:border-[color:var(--bg-500)]/70 hover:text-white'
                    : 'pointer-events-none border-[color:var(--bg-700)]/60 bg-[color:var(--bg-900)]/40 text-[color:var(--foreground)]/40'
                }`}
              >
                Copier URL
              </button>
            </div>

            <div className="rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 p-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/55">
                URL
              </div>
              <code className="block break-all text-[11px] text-[color:var(--foreground)]/80">
                {previewUrl}
              </code>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}

function ArrowButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[color:var(--bg-700)]/70 bg-[color:var(--bg-900)]/55 text-[color:var(--foreground)] transition hover:border-[color:var(--bg-500)]/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="material-icons text-[22px] leading-none">{children}</span>
    </button>
  )
}

function SectionTitle({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/55">
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-[color:var(--foreground)]/85">
      <span className="text-xs uppercase tracking-[0.08em] text-[color:var(--foreground)]/60">{label}</span>
      {children}
    </label>
  )
}
