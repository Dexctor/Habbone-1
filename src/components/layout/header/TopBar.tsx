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
            {/* Habbo pixel-art style radio widget */}
            <div
              className="radio-habbo relative flex items-center gap-[8px] px-[8px] py-[6px] bg-[#1F1F3E] border-2 border-[#141433]"
              style={{
                boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.08), inset 0 -2px 0 rgba(0,0,0,0.3), 0 2px 0 rgba(0,0,0,0.4)',
                imageRendering: 'pixelated',
              }}
            >
              {/* DJ Avatar box — Habbo style card */}
              <div
                className="relative flex items-center justify-center w-[62px] h-[62px] shrink-0 bg-[#303060] border-2 border-[#141433]"
                style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.06), inset 0 -2px 0 rgba(0,0,0,0.3)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  id="avatar-stream"
                  src={djAvatarUrl}
                  alt="Habbo DJ"
                  className="image-pixelated h-[50px] w-auto"
                />
                {/* ON AIR pixel badge on avatar */}
                {radio.isPlaying && (
                  <span
                    className="absolute -top-[6px] left-1/2 -translate-x-1/2 flex items-center gap-[3px] px-[4px] py-[1px] bg-[#F92330] border border-[#141433] text-white text-[8px] font-bold uppercase tracking-[0.1em]"
                    style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.4)' }}
                  >
                    <span className="h-[5px] w-[5px] bg-white animate-pulse" />
                    ON AIR
                  </span>
                )}
              </div>

              {/* Info + controls column */}
              <div className="info-stream flex flex-col gap-[4px] min-w-0">
                {/* Title row */}
                <div className="flex items-center gap-[6px] min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/img/star-blue-mini.png"
                    alt=""
                    aria-hidden="true"
                    className="image-pixelated h-[12px] w-[12px] shrink-0"
                  />
                  <span
                    id="programming-stream"
                    className="font-bold text-white text-[11px] uppercase tracking-[0.08em] truncate"
                    style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.6)' }}
                  >
                    HabbOne Radio
                  </span>
                  <span className="text-[#BEBECE] text-[10px] uppercase">par</span>
                  <span
                    className="font-bold text-[#FFC800] text-[11px] uppercase tracking-[0.04em] truncate"
                    style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.6)' }}
                  >
                    Decrypt
                  </span>
                </div>

                {/* Pixel equalizer bars */}
                <div className="flex items-end gap-[2px] h-[12px]" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <span
                      key={i}
                      className={`w-[3px] ${
                        radio.isPlaying
                          ? 'bg-[#0FD52F] radio-eq-bar'
                          : 'bg-[#3a3a6a] h-[3px]'
                      }`}
                      style={
                        radio.isPlaying
                          ? {
                              height: `${40 + (Math.sin(i * 1.2) + 1) * 30}%`,
                              animationDelay: `${i * 120}ms`,
                              imageRendering: 'pixelated',
                            }
                          : { imageRendering: 'pixelated' }
                      }
                    />
                  ))}
                </div>

                {/* Controls row — Habbo pixel buttons */}
                <div className="flex items-center gap-[6px]">
                  {/* Play / Pause — Habbo style button */}
                  <button
                    type="button"
                    className={`relative flex items-center justify-center w-[28px] h-[28px] shrink-0 border-2 border-[#141433] text-white transition-transform active:translate-y-[1px] ${
                      radio.isPlaying
                        ? 'bg-[#F92330] hover:bg-[#E11036]'
                        : 'bg-[#0FD52F] hover:bg-[#16B254]'
                    } ${radio.isLoading ? 'cursor-wait opacity-70' : ''}`}
                    style={{
                      boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.3), 0 2px 0 rgba(0,0,0,0.4)',
                    }}
                    onClick={radio.toggle}
                    aria-label={radio.isPlaying ? 'Arrêter la radio' : 'Lancer la radio'}
                    disabled={radio.isLoading}
                  >
                    <i className="material-icons text-[18px]" id="pause-stream">
                      {radio.isLoading ? 'hourglass_empty' : radio.isPlaying ? 'stop' : 'play_arrow'}
                    </i>
                  </button>

                  {/* Status pixel label */}
                  <span
                    className={`hidden sm:inline-flex items-center gap-[4px] px-[6px] h-[22px] border-2 border-[#141433] text-[9px] font-bold uppercase tracking-[0.1em] ${
                      radio.isPlaying
                        ? 'bg-[#0FD52F] text-white'
                        : radio.isLoading
                          ? 'bg-[#FFC800] text-[#141433]'
                          : 'bg-[#25254D] text-[#BEBECE]'
                    }`}
                    style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.25)' }}
                  >
                    <span
                      className={`h-[6px] w-[6px] ${
                        radio.isPlaying ? 'bg-white animate-pulse' : radio.isLoading ? 'bg-[#141433] animate-pulse' : 'bg-[#BEBECE]'
                      }`}
                    />
                    {radio.isPlaying ? 'LIVE' : radio.isLoading ? 'LOAD' : 'OFF'}
                  </span>

                  {/* Volume — Habbo pixel slider */}
                  <div
                    className="hidden md:flex items-center gap-[6px] h-[22px] px-[6px] bg-[#141433] border-2 border-[#141433]"
                    style={{ boxShadow: 'inset 0 2px 0 rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.03)' }}
                  >
                    <i className="material-icons text-[12px] text-[#BEBECE]" aria-hidden>
                      {radio.volume === 0 ? 'volume_off' : radio.volume < 50 ? 'volume_down' : 'volume_up'}
                    </i>
                    <input
                      type="range"
                      className="volume-habbo appearance-none w-[100px] h-[6px] cursor-pointer bg-[#303060]"
                      id="volume"
                      min={0}
                      max={100}
                      value={radio.volume}
                      onChange={handleVolumeChange}
                      step={1}
                      aria-label="Volume radio"
                      style={{
                        backgroundImage: `linear-gradient(to right, #0FD52F 0%, #0FD52F ${radio.volume}%, #303060 ${radio.volume}%, #303060 100%)`,
                      }}
                    />
                    <span
                      className="text-[9px] font-bold text-[#FFC800] w-[22px] text-right tabular-nums uppercase"
                      style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.6)' }}
                    >
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
