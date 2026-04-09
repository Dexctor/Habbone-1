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
  action: '',
  direction: 2,
  head_direction: 3,
  img_format: 'png',
  gesture: 'sml',
  headonly: 0,
  size: 'm',
  dance: 0,
  frame_num: 0,
  effect: '',
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
              className="avatar flex justify-center items-end min-w-[70px] h-[60px] rounded-[4px] mr-[10px] bg-[#303060] overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                id="avatar-stream"
                src={djAvatarUrl}
                alt="Habbo DJ"
                className="image-pixelated object-cover object-top h-[80px] w-auto mt-[5px]"
              />
            </div>
            <div className="info-stream flex flex-col justify-between w-full">
              <div className="text mb-[5px]">
                <span className="text-[0.8rem] leading-[18px] text-white">
                  <span id="programming-stream" className="font-bold">
                    HabbOne Radio
                  </span>{' '}
                  <span className="text-[#BEBECE]">par</span>{' '}
                  <span className="font-bold">Decrypt</span>
                  {radio.isPlaying && <span className="text-[#0FD52F] text-[0.7rem] ml-2">● LIVE</span>}
                  {radio.isLoading && <span className="text-[#FFC800] text-[0.7rem] ml-2">● ...</span>}
                </span>
              </div>
              <div className="range flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  className={`pause flex items-center justify-center w-[30px] h-[30px] rounded-[4px] text-white mr-[10px] transition-colors ${radio.isPlaying ? 'bg-[#F92330]' : 'bg-[#2596FF]'} ${radio.isLoading ? 'animate-pulse' : ''}`}
                  onClick={radio.toggle}
                  aria-label={radio.isPlaying ? 'Arrêter la radio' : 'Lancer la radio'}
                  disabled={radio.isLoading}
                >
                  <i className="material-icons" id="pause-stream">{radio.isPlaying ? 'stop' : 'play_arrow'}</i>
                </button>
                <div className="box-volume hidden md:flex items-center w-full max-w-[183px] h-[30px] bg-[#141433] rounded-[4px] mr-[10px]">
                  <input
                    type="range"
                    className="volume appearance-none w-[150px] h-[5px] ml-[10%] rounded-[10px]"
                    id="volume"
                    min={0}
                    max={100}
                    value={radio.volume}
                    onChange={handleVolumeChange}
                    step={1}
                    aria-label="Volume radio"
                    style={{
                      backgroundImage: `linear-gradient(to right, #2596FF ${radio.volume}%, #fff ${radio.volume}%)`
                    }}
                  />
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
