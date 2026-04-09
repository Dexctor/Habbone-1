'use client'

import React, { useCallback, useRef, useMemo, useState } from 'react'
import Link from 'next/link'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { Session } from 'next-auth'
import { buildHabboAvatarUrl } from '@/lib/habbo-imaging'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type LoginHandler = (payload: { nick: string; password: string }) => Promise<boolean> | boolean

type UserBarLeftProps = {
  mounted: boolean
  status: AuthStatus
  session: Session | null
  level: number | null
  coins: number | null
  onOpenStory: () => void
  onLogin: LoginHandler
  onLogout: () => void
  onRequestRegister: () => void
  onRequestLogin: () => void
}

export default function UserBarLeft({
  mounted,
  status,
  session,
  level,
  coins,
  onOpenStory,
  onLogin,
  onLogout,
  onRequestRegister,
  onRequestLogin,
}: UserBarLeftProps) {
  const [nick, setNick] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loginAvatarNick, setLoginAvatarNick] = useState('Decrypt')
  const loginDebounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleNickInput = useCallback((value: string) => {
    setNick(value)
    if (loginDebounceRef.current) clearTimeout(loginDebounceRef.current)
    loginDebounceRef.current = setTimeout(() => {
      setLoginAvatarNick(value.trim().length >= 2 ? value.trim() : 'Decrypt')
    }, 400)
  }, [])

  const loginAvatarUrl = buildHabboAvatarUrl(loginAvatarNick, {
    direction: 2, head_direction: 3, img_format: 'png', gesture: 'sml', headonly: 1, size: 'l',
  })

  const isLoading = !mounted || status === 'loading'
  const isAuthenticated = mounted && status !== 'loading' && Boolean(session?.user)

  const avatarSrc = useMemo(() => {
    if (!isAuthenticated) return null
    const userNick = (session?.user as any)?.nick as string | undefined
    if (!userNick) return null
    return buildHabboAvatarUrl(userNick, {
      direction: 2,
      head_direction: 3,
      img_format: 'png',
      gesture: 'sml',
      headonly: 1,
      size: 'm',
    })
  }, [isAuthenticated, session?.user])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const ok = await onLogin({ nick, password })
      if (ok) {
        setPassword('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const coinsLabel = useMemo(() => {
    if (typeof coins !== 'number' || Number.isNaN(coins)) return '-'
    return coins.toString()
  }, [coins])

  return (
    <div className="login-bar flex items-center w-full min-h-[92px] border-[#141433] px-4 md:px-5 lg:border-r">
      {isLoading && (
        <div className="flex items-center w-full">
          <Skeleton className="min-w-[60px] h-[60px] rounded-full bg-white/10 mr-[12px]" />
          <div className="ex-1">
            <div className="top flex items-center gap-[10px] mb-3">
              <Skeleton className="h-[51px] w-[170px] rounded-[4px] bg-white/10" />
              <Skeleton className="h-[51px] w-[170px] rounded-[4px] bg-white/10" />
            </div>
            <div className="box-buttons flex gap-[10px] ml-[10px]">
              <Skeleton className="h-[50px] w-[120px] rounded-[4px] bg-white/10" />
              <Skeleton className="h-[50px] w-[140px] rounded-[4px] bg-white/10" />
            </div>
          </div>
        </div>
      )}

      {!isLoading && isAuthenticated && avatarSrc && (
        <div className="avatar relative flex items-center justify-center min-w-[60px] h-[60px] rounded-full bg-[#1F1F3E] mr-[12px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarSrc} alt={(session?.user as any)?.nick ?? ''} className="image-pixelated" />
          {typeof level === 'number' && (
            <div className="absolute -bottom-1 -right-1 min-w-[24px] h-[24px] px-1 rounded-full bg-[#2596FF] text-white text-[11px] font-bold grid place-items-center shadow-[0_1px_0_rgba(255,255,255,.25)]">
              Lv {level}
            </div>
          )}
        </div>
      )}

      {/* Infos utilisateur: cachées sur petit mobile, visibles sur md+ */}
      {!isLoading && isAuthenticated && (
        <div className="hidden sm:flex items-center gap-2 ml-[2px] mr-[8px]">
          <div className="py-1 px-2 rounded bg-[#1F1F3E] text-[#DDDDDD] font-bold text-[0.85rem]">@{(session?.user as any)?.nick}</div>
          <div className="py-1 px-2 rounded bg-[#1F1F3E] text-[#DDDDDD] font-bold text-[0.85rem] flex items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/icon-coin.png" alt="coins" className="w-4 h-4" />
            <span>{coinsLabel}</span>
          </div>
        </div>
      )}

      {/* Mobile: Boutons seulement */}
      {!isLoading && !isAuthenticated && (
        <div className="mobile-login flex lg:hidden items-center gap-3">
          <button
            type="button"
            onClick={onRequestLogin}
            className="uppercase rounded-[4px] h-[50px] px-[14px] py-[14px] font-bold text-[0.875rem] leading-[22px] text-white bg-[#2596FF] hover:brightness-90 transition-all"
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={onRequestRegister}
            className="uppercase rounded-[4px] h-[50px] px-[14px] py-[14px] font-bold text-[0.875rem] leading-[22px] text-white bg-[#0FD52F] hover:brightness-75 transition-all"
          >
            S'inscrire
          </button>
        </div>
      )}

      {/* Desktop: Formulaire inline */}
      {!isLoading && !isAuthenticated && (
        <form className="info-login hidden lg:flex w-full items-center gap-[18px]" onSubmit={handleSubmit}>
          {/* Avatar dynamique */}
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={loginAvatarUrl}
              alt=""
              className="h-[65px] w-auto image-pixelated transition-all duration-300"
              onError={(e) => {
                const img = e.target as HTMLImageElement
                if (!img.dataset.fallback) {
                  img.dataset.fallback = '1'
                  img.src = buildHabboAvatarUrl('Decrypt', { direction: 2, head_direction: 3, img_format: 'png', gesture: 'sml', headonly: 1, size: 'l' })
                }
              }}
            />
          </div>
          <div className="flex flex-1 items-center gap-[10px]">
            <input
              name="nick"
              type="text"
              className="primary px-[17px] w-full max-w-[170px] h-[51px] rounded-[4px] font-bold text-[0.875rem] text-[#BEBECE] bg-[#141433] border-2 border-[#141433] focus:border-[#2596FF] focus:outline-none transition-colors"
              placeholder="Pseudo Habbo"
              value={nick}
              onChange={(event) => handleNickInput(event.target.value)}
              autoComplete="username"
              required
            />
            <input
              name="password"
              type="password"
              className="primary px-[17px] w-full max-w-[170px] h-[51px] rounded-[4px] font-bold text-[0.875rem] text-[#BEBECE] bg-[#141433] border-2 border-[#141433] focus:border-[#2596FF] focus:outline-none transition-colors"
              placeholder="Mot de passe"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="box-buttons flex items-center gap-[10px]">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="submit"
                    className="uppercase rounded-[4px] m-[2px] h-[50px] px-[14px] py-[14px] font-bold text-[0.875rem] leading-[22px] text-[#BEBECE] bg-[rgba(255,255,255,.1)] hover:bg-[#2596FF] hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Connexion"
                    disabled={submitting}
                  >
                    {submitting ? 'Connexion...' : 'Connexion'}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Connexion</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onRequestRegister}
                    className="uppercase rounded-[4px] m-[2px] h-[50px] px-[14px] py-[14px] font-bold text-[0.875rem] leading-[22px] text-white bg-[#0FD52F] hover:brightness-75 transition-all"
                    aria-label="Inscription"
                  >
                    Inscription
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Inscription</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </form>
      )}

      {/* Boutons utilisateur connecté: compacts sur mobile */}
      {!isLoading && isAuthenticated && (
        <div className="box-buttons flex gap-1 sm:gap-[10px] ml-auto lg:ml-[10px]" id="logout">
          {(session?.user as any)?.role === 'admin' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/profile/admin"
                    aria-label="Admin"
                    className="rounded-[4px] m-[1px] sm:m-[2px] h-[40px] w-[40px] sm:h-[50px] sm:w-[50px] grid place-items-center text-[#BEBECE] bg-[rgba(255,255,255,.1)] hover:bg-[#2596FF] hover:text-white transition-colors"
                  >
                    <i className="material-icons text-[20px] sm:text-[24px]" aria-hidden>admin_panel_settings</i>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top">Admin</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {/* Story: caché sur mobile, visible sur sm+ */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onOpenStory}
                  aria-label="Publier une storie"
                  className="hidden sm:grid rounded-[4px] m-[1px] sm:m-[2px] h-[40px] w-[40px] sm:h-[50px] sm:w-[50px] place-items-center text-[#BEBECE] bg-[rgba(255,255,255,.1)] hover:bg-[#2596FF] hover:text-white transition-colors"
                >
                  <i className="material-icons text-[20px] sm:text-[24px]" aria-hidden>add_a_photo</i>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Publier une storie</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/profile"
                  aria-label="Profil"
                  className="rounded-[4px] m-[1px] sm:m-[2px] h-[40px] w-[40px] sm:h-[50px] sm:w-[50px] grid place-items-center text-[#BEBECE] bg-[rgba(255,255,255,.1)] hover:bg-[#2596FF] hover:text-white transition-colors"
                >
                  <i className="material-icons text-[20px] sm:text-[24px]" aria-hidden>account_circle</i>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">Profil</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  aria-label="Parametres"
                  className="rounded-[4px] m-[1px] sm:m-[2px] h-[40px] w-[40px] sm:h-[50px] sm:w-[50px] grid place-items-center text-[#BEBECE] bg-[rgba(255,255,255,.1)] hover:bg-[#2596FF] hover:text-white transition-colors"
                >
                  <i className="material-icons text-[20px] sm:text-[24px]" aria-hidden>settings</i>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">Parametres</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Deconnexion"
                  className="rounded-[4px] m-[1px] sm:m-[2px] h-[40px] w-[40px] sm:h-[50px] sm:w-[50px] grid place-items-center text-[#BEBECE] bg-[rgba(255,255,255,.1)] hover:bg-[#2596FF] hover:text-white transition-colors"
                  onClick={onLogout}
                >
                  <i className="material-icons text-[20px] sm:text-[24px]" aria-hidden>logout</i>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Deconnexion</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}
