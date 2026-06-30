'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { transitions } from '@/lib/motion-tokens'
import type { SiteThemeSettings } from '@/lib/theme-settings'
import type { NewsBadgeItem } from '@/types/news-badges'
import TopBar from './header/TopBar'
import Banner from './header/Banner'
import UserBarLeft from './header/UserBarLeft'
import BadgesSlider from './header/BadgesSlider'
import RegisterModal from './header/RegisterModal'
import LoginModal from './header/LoginModal'
import MobileMenu from './header/MobileMenu'
import StoryUploadModal from './header/StoryUploadModal'
import { useHeaderUser } from './header/use-header-user'

type HeaderTWProps = {
  initialTheme?: SiteThemeSettings
  initialBadges?: NewsBadgeItem[]
}

export default function HeaderTW({ initialTheme, initialBadges = [] }: HeaderTWProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [storyOpen, setStoryOpen] = useState(false)
  const pathname = usePathname() || ''
  const reduce = useReducedMotion()
  const menuRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const {
    mounted,
    session,
    status,
    level,
    coins,
    handleLogin,
    handleLogout,
  } = useHeaderUser()

  const motionTransition = useMemo(
    () => reduce ? transitions.instant : transitions.quick,
    [reduce],
  )

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', menuOpen)
    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [menuOpen])

  useEffect(() => {
    if (!storyOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStoryOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [storyOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
      if (event.key !== 'Tab' || !menuRef.current) return

      const focusables = menuRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      )
      const list = Array.from(focusables).filter((el) => el.offsetParent !== null)
      if (list.length === 0) return

      const first = list[0]
      const last = list[list.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const timer = window.setTimeout(() => {
      closeBtnRef.current?.focus()
    }, 0)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const openRegister = useCallback(() => setRegisterOpen(true), [])
  const closeRegister = useCallback(() => setRegisterOpen(false), [])
  const openLogin = useCallback(() => setLoginOpen(true), [])
  const closeLogin = useCallback(() => setLoginOpen(false), [])
  const closeStory = useCallback(() => setStoryOpen(false), [])
  const openStory = useCallback(() => setStoryOpen(true), [])

  const handleSwitchToRegister = useCallback(() => {
    setLoginOpen(false)
    setRegisterOpen(true)
  }, [])

  return (
    <header className="header w-full min-h-[60vh]" suppressHydrationWarning>
      <TopBar reduce={reduce} transition={motionTransition} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <Banner transition={reduce ? transitions.instant : transitions.standard} initialTheme={initialTheme} />

      <motion.section
        className="userbar w-full min-h-[92px] bg-[#25254D] shadow-[0_-1px_0_rgba(255,255,255,.1),_0_1px_0_#141433]"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={motionTransition}
      >
        <div className="container max-w-[1200px] mx-auto px-4">
          <div className="row flex flex-wrap">
            <div className="col-md-8 col-12 w-full lg:w-2/3">
              <UserBarLeft
                mounted={mounted}
                status={status}
                session={session}
                level={level}
                coins={coins}
                onOpenStory={openStory}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onRequestRegister={openRegister}
                onRequestLogin={openLogin}
              />
            </div>
            <BadgesSlider initialItems={initialBadges} />
          </div>
        </div>
      </motion.section>

      <RegisterModal open={registerOpen} onClose={closeRegister} />
      <LoginModal
        open={loginOpen}
        onClose={closeLogin}
        onLogin={handleLogin}
        onSwitchToRegister={handleSwitchToRegister}
      />
      <MobileMenu
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        pathname={pathname}
        menuRef={menuRef}
        closeBtnRef={closeBtnRef}
      />
      <StoryUploadModal open={storyOpen} onClose={closeStory} />
    </header>
  )
}
