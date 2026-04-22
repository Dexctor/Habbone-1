'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, type Transition } from 'framer-motion'
import Link from 'next/link'
import { navigation, type NavEntry } from './navigation'
import { buildHabboAvatarUrl } from '@/lib/habbo-imaging'
import { useRadioPlayer } from '@/lib/use-radio-player'

type TopBarProps = {
  reduce: boolean | null
  fast?: Transition
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
}

const itemBaseClasses =
  'inline-flex items-center justify-center px-[15px] font-bold text-[1rem] text-white uppercase min-h-[80px] md:min-h-[100px] lg:min-h-[120px] transition-colors'

const djAvatarUrl = buildHabboAvatarUrl('Decrypt', {
  direction: 2,
  head_direction: 3,
  img_format: 'png',
  gesture: 'sml',
  headonly: 1,
  size: 'l',
})

function renderLink(entry: NavEntry) {
  if (entry.external && entry.href) {
    return (
      <a
        href={entry.href}
        target="_blank"
        rel="noopener noreferrer"
        className={itemBaseClasses}
      >
        {entry.label}
      </a>
    )
  }

  if (entry.href) {
    return (
      <Link href={entry.href} className={itemBaseClasses} prefetch={entry.prefetch ?? true}>
        {entry.label}
      </Link>
    )
  }

  return (
    <span className={`${itemBaseClasses} cursor-default`}>
      {entry.label}
    </span>
  )
}

function TopLevelItemWithChildren({ entry }: { entry: NavEntry }) {
  const [open, setOpen] = useState(false)
  const [hoveredTrigger, setHoveredTrigger] = useState<string | null>(null)
  const closeTimer = useRef<number | null>(null)

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const openMenu = (triggerKey: string) => {
    clearCloseTimer()
    setHoveredTrigger(triggerKey)
    setOpen(true)
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimer.current = window.setTimeout(() => {
      setOpen(false)
      setHoveredTrigger(null)
      closeTimer.current = null
    }, 180)
  }

  const isNode = (value: unknown): value is Node =>
    typeof window !== 'undefined' && !!value && typeof (value as Node).nodeType === 'number'

  const handleBlur = (event: React.FocusEvent<HTMLLIElement>) => {
    const current = event.currentTarget
    const related = event.relatedTarget as unknown
    if (!isNode(related) || !current.contains(related as Node)) {
      scheduleClose()
    }
  }

  const handleMouseLeave = (event: React.MouseEvent<HTMLLIElement>) => {
    const current = event.currentTarget
    const rt = event.relatedTarget as unknown

    if (isNode(rt) && current.contains(rt as Node)) return

    const relatedEl = (isNode(rt) && (rt as Element).closest) ? (rt as Element) : null
    const nextItem = relatedEl?.closest<HTMLElement>('[data-nav-item]') || null
    if (nextItem && nextItem !== current) {
      clearCloseTimer()
      setOpen(false)
      setHoveredTrigger(null)
      return
    }
    scheduleClose()
  }

  useEffect(() => {
    return () => clearCloseTimer()
  }, [])

  const easeOutExpo = [0.16, 1, 0.3, 1] as const

  const submenuVariants = {
    closed: {
      opacity: 0,
      y: -8,
      scale: 0.96,
      pointerEvents: 'none' as const,
      transition: { duration: 0.12, ease: easeOutExpo },
    },
    open: {
      opacity: 1,
      y: 0,
      scale: 1,
      pointerEvents: 'auto' as const,
      transition: { duration: 0.18, ease: easeOutExpo },
    },
  }

  const submenuItemVariants = {
    closed: { opacity: 0, y: -6 },
    open: { opacity: 1, y: 0, transition: { duration: 0.16, ease: easeOutExpo } },
  }

  return (
    <motion.li
      data-nav-item
      className="item relative inline-flex items-center justify-center cursor-pointer min-h-[80px] md:min-h-[100px] lg:min-h-[120px] border-l border-[#141433] hover:bg-[#1F1F3E]"
      onMouseEnter={() => openMenu(entry.label)}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={() => openMenu(entry.label)}
      onBlurCapture={handleBlur}
    >
      <span className={`${itemBaseClasses} transition-colors ${open ? 'text-[#DDDDDD]' : ''}`}>{entry.label}</span>
      <motion.ul
        variants={submenuVariants}
        initial="closed"
        animate={open ? 'open' : 'closed'}
        onMouseEnter={() => openMenu(entry.label)}
        onMouseLeave={scheduleClose}
        className="submenu absolute left-1/2 top-full mt-2 w-[220px] -translate-x-1/2 p-[10px] rounded-[5px] bg-[#1b1b3d] z-50 flex flex-col justify-center shadow-lg shadow-black/40"
        style={{ originY: 0 }}
      >
        {entry.children!.map((child) => (
          <motion.li
            key={child.label}
            variants={submenuItemVariants}
            className="list-none p-[5px] mb-[5px] font-bold text-[0.875rem] text-[#BEBECE] hover:bg-[#2596FF] hover:text-white rounded-[4px] last:mb-0"
          >
            {child.external && child.href ? (
              <a
                href={child.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-2 py-1"
              >
                {child.label}
              </a>
            ) : child.href ? (
              <Link href={child.href} className="block px-2 py-1" prefetch={child.prefetch ?? true}>
                {child.label}
              </Link>
            ) : (
              <span className="block px-2 py-1 cursor-default">{child.label}</span>
            )}
          </motion.li>
        ))}
      </motion.ul>
    </motion.li>
  )
}

function TopLevelItem({ entry }: { entry: NavEntry }) {
  if (!entry.children || entry.children.length === 0) {
    return (
      <li className="item relative inline-flex items-center justify-center cursor-pointer min-h-[80px] md:min-h-[100px] lg:min-h-[120px] border-l border-[#141433] hover:bg-[#1F1F3E]">
        {renderLink(entry)}
      </li>
    )
  }
  return <TopLevelItemWithChildren entry={entry} />
}

export default function TopBar({ reduce, fast, menuOpen, setMenuOpen }: TopBarProps) {
  const radio = useRadioPlayer()

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    radio.setVolume(parseInt(event.target.value, 10))
  }

  return (
    <motion.section
      layout
      className="navtop w-full min-h-[80px] md:min-h-[100px] lg:min-h-[120px] bg-[#25254D] border-b border-[#141433] z-[999]"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={fast}
    >
      <div className="container max-w-[1200px] mx-auto px-4">
        <div className="bar-top flex w-full min-h-[80px] md:min-h-[100px] lg:min-h-[120px] items-center justify-between">
          <div className="left flex items-center flex-1 min-w-0">
            <div
              className={`relative flex items-center gap-3 rounded-[10px] pl-2 pr-3 py-2 bg-gradient-to-br from-[#2a2a5a] via-[#1f1f42] to-[#141433] border border-[#3a3a6a]/70 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 ${radio.isPlaying ? 'ring-1 ring-[#2596FF]/40' : ''}`}
            >
              {/* Subtle glow when playing */}
              {radio.isPlaying && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[10px] bg-gradient-to-r from-[#2596FF]/0 via-[#2596FF]/10 to-[#2596FF]/0 animate-pulse"
                />
              )}

              {/* DJ Avatar */}
              <div className="relative flex items-center justify-center w-[64px] h-[64px] rounded-[8px] shrink-0 bg-gradient-to-b from-[#2C2C5A] to-[#1a1a3e] border border-[#3a3a6a] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  id="avatar-stream"
                  src={djAvatarUrl}
                  alt="Habbo DJ"
                  className="image-pixelated h-[50px] w-auto"
                />
                {/* LIVE dot on avatar corner */}
                {radio.isPlaying && (
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0FD52F] opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#0FD52F] ring-1 ring-[#0a6b18]/50" />
                  </span>
                )}
              </div>

              {/* Info + controls */}
              <div className="info-stream flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  {/* Music icon */}
                  <i className="material-icons text-[16px] text-[#2596FF] shrink-0" aria-hidden>graphic_eq</i>
                  <span className="flex items-baseline gap-1.5 text-[0.8rem] leading-tight min-w-0">
                    <span id="programming-stream" className="font-bold text-white truncate">
                      HabbOne Radio
                    </span>
                    <span className="text-[#BEBECE]/70 text-[0.7rem]">par</span>
                    <span className="font-semibold text-[#2596FF] truncate">Decrypt</span>
                  </span>

                  {/* Status badge */}
                  {radio.isPlaying && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#0FD52F]/15 border border-[#0FD52F]/30 text-[0.6rem] font-bold text-[#0FD52F] tracking-wider">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#0FD52F] animate-pulse" />
                      LIVE
                    </span>
                  )}
                  {radio.isLoading && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FFC800]/15 border border-[#FFC800]/30 text-[0.6rem] font-bold text-[#FFC800] tracking-wider">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#FFC800] animate-pulse" />
                      CHARGEMENT
                    </span>
                  )}
                </div>

                {/* Equalizer bars when playing */}
                <div className="flex items-end gap-[3px] h-[10px] px-1" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                    <span
                      key={i}
                      className={`w-[2px] rounded-full transition-all duration-300 ${
                        radio.isPlaying
                          ? 'bg-gradient-to-t from-[#2596FF] to-[#7dc4ff] animate-pulse'
                          : 'bg-[#3a3a6a] h-[3px]'
                      }`}
                      style={
                        radio.isPlaying
                          ? {
                              height: `${20 + (Math.sin(i * 0.9) + 1) * 40}%`,
                              animationDelay: `${i * 100}ms`,
                              animationDuration: `${600 + (i % 3) * 200}ms`,
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    className={`relative flex items-center justify-center w-[32px] h-[32px] rounded-full text-white shrink-0 transition-all duration-200 shadow-[0_2px_6px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 ${
                      radio.isPlaying
                        ? 'bg-gradient-to-br from-[#F92330] to-[#c41020] hover:shadow-[0_0_12px_rgba(249,35,48,0.5)]'
                        : 'bg-gradient-to-br from-[#2596FF] to-[#1668b8] hover:shadow-[0_0_12px_rgba(37,150,255,0.5)]'
                    } ${radio.isLoading ? 'animate-pulse cursor-wait' : ''}`}
                    onClick={radio.toggle}
                    aria-label={radio.isPlaying ? 'Arrêter la radio' : 'Lancer la radio'}
                    disabled={radio.isLoading}
                  >
                    <i className="material-icons text-[18px]" id="pause-stream">
                      {radio.isLoading ? 'hourglass_empty' : radio.isPlaying ? 'stop' : 'play_arrow'}
                    </i>
                  </button>

                  {/* Volume with icon */}
                  <div className="hidden md:flex items-center gap-2 h-[28px] px-2.5 bg-[#141433]/70 rounded-full border border-[#3a3a6a]/50">
                    <i className="material-icons text-[14px] text-[#BEBECE]" aria-hidden>
                      {radio.volume === 0 ? 'volume_off' : radio.volume < 50 ? 'volume_down' : 'volume_up'}
                    </i>
                    <input
                      type="range"
                      className="volume-slider appearance-none w-[120px] h-[4px] rounded-full cursor-pointer bg-[#3a3a6a]"
                      id="volume"
                      min={0}
                      max={100}
                      value={radio.volume}
                      onChange={handleVolumeChange}
                      step={1}
                      aria-label="Volume radio"
                      style={{
                        backgroundImage: `linear-gradient(to right, #2596FF 0%, #7dc4ff ${radio.volume}%, #3a3a6a ${radio.volume}%, #3a3a6a 100%)`,
                      }}
                    />
                    <span className="text-[0.65rem] font-mono text-[#BEBECE]/80 w-[22px] text-right tabular-nums">
                      {radio.volume}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <nav
            id="navbar-main"
            className="navbar hidden lg:flex justify-end min-h-[80px] md:min-h-[100px] lg:min-h-[120px] p-0 ml-auto mr-[2rem]"
            data-nav-container="true"
            aria-label="Navigation principale"
          >
            <ul className="menu flex list-none p-0 m-0 w-full">
              {navigation.map((entry) => (
                <TopLevelItem key={entry.label} entry={entry} />
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center lg:hidden">
            <button
              type="button"
              aria-label="Ouvrir le menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              className="rounded-[4px] h-[40px] w-[44px] grid place-items-center text-[#BEBECE] bg-[rgba(255,255,255,.1)] hover:bg-[#2596FF] hover:text-white"
              onClick={() => setMenuOpen(true)}
            >
              <i className="material-icons" aria-hidden>menu</i>
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
