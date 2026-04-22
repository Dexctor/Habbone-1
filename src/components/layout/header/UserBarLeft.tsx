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

      {/* User card — Habbo pixel-art style (authenticated) */}
      {!isLoading && isAuthenticated && avatarSrc && (
        <div
          className="user-habbo relative flex items-center gap-[8px] px-[8px] py-[6px] mr-[10px] bg-[#1F1F3E] border-2 border-[#141433]"
          style={{
            boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.08), inset 0 -2px 0 rgba(0,0,0,0.3), 0 2px 0 rgba(0,0,0,0.4)',
            imageRendering: 'pixelated',
          }}
        >
          {/* Avatar box — pixel frame */}
          <div
            className="relative flex items-center justify-center w-[56px] h-[56px] shrink-0 bg-[#303060] border-2 border-[#141433]"
            style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.06), inset 0 -2px 0 rgba(0,0,0,0.3)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc}
              alt={(session?.user as any)?.nick ?? ''}
              className="image-pixelated h-[48px] w-auto"
            />
            {/* Level pixel badge */}
            {typeof level === 'number' && (
              <div
                className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 flex items-center justify-center min-w-[32px] h-[16px] px-[4px] bg-[#2596FF] border-2 border-[#141433] text-white text-[9px] font-bold uppercase tracking-[0.08em]"
                style={{
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.3), 0 1px 0 rgba(0,0,0,0.4)',
                  textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
                }}
              >
                LVL {level}
              </div>
            )}
          </div>

          {/* Info column : nick + coins */}
          <div className="hidden sm:flex flex-col justify-center gap-[4px] min-w-0">
            {/* Nick row */}
            <div
              className="flex items-center gap-[6px] px-[6px] h-[22px] bg-[#141433] border-2 border-[#141433]"
              style={{ boxShadow: 'inset 0 2px 0 rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.04)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/star-mini.png"
                alt=""
                aria-hidden="true"
                className="image-pixelated h-[10px] w-[10px] shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <span
                className="font-bold text-white text-[11px] uppercase tracking-[0.06em] truncate max-w-[120px]"
                style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.6)' }}
              >
                {(session?.user as any)?.nick}
              </span>
            </div>
            {/* Coins row */}
            <div
              className="flex items-center gap-[6px] px-[6px] h-[22px] bg-[#141433] border-2 border-[#141433]"
              style={{ boxShadow: 'inset 0 2px 0 rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.04)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/icon-coin.png"
                alt="coins"
                className="image-pixelated h-[14px] w-[14px] shrink-0"
              />
              <span
                className="font-bold text-[#FFC800] text-[11px] uppercase tracking-[0.04em] tabular-nums"
                style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.6)' }}
              >
                {coinsLabel}
              </span>
            </div>
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
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-[10px]">
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
              <Link href="/forgot-password" className="text-[10px] text-[#BEBECE]/40 hover:text-[#2596FF] transition pl-1">
                Mot de passe oublie ?
              </Link>
            </div>
          </div>
        </form>
      )}

      {/* Boutons utilisateur connecté — pixel Habbo style */}
      {!isLoading && isAuthenticated && (
        <div className="box-buttons flex gap-[4px] sm:gap-[6px] ml-auto lg:ml-[10px]" id="logout">
          {(session?.user as any)?.role === 'admin' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin"
                    aria-label="Admin"
                    className="btn-habbo-icon group relative grid place-items-center h-[40px] w-[40px] sm:h-[44px] sm:w-[44px] bg-[#F92330] border-2 border-[#141433] text-white hover:bg-[#E11036] active:translate-y-[1px] transition-colors"
                    style={{
                      boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.3), 0 2px 0 rgba(0,0,0,0.4)',
                    }}
                  >
                    <i className="material-icons text-[20px] sm:text-[22px]" aria-hidden>admin_panel_settings</i>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top">Admin</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onOpenStory}
                  aria-label="Publier une storie"
                  className="hidden sm:grid place-items-center h-[40px] w-[40px] sm:h-[44px] sm:w-[44px] bg-[#0FD52F] border-2 border-[#141433] text-white hover:bg-[#16B254] active:translate-y-[1px] transition-colors"
                  style={{
                    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.3), 0 2px 0 rgba(0,0,0,0.4)',
                  }}
                >
                  <i className="material-icons text-[20px] sm:text-[22px]" aria-hidden>add_a_photo</i>
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
                  className="grid place-items-center h-[40px] w-[40px] sm:h-[44px] sm:w-[44px] bg-[#2596FF] border-2 border-[#141433] text-white hover:bg-[#2976E8] active:translate-y-[1px] transition-colors"
                  style={{
                    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.3), 0 2px 0 rgba(0,0,0,0.4)',
                  }}
                >
                  <i className="material-icons text-[20px] sm:text-[22px]" aria-hidden>account_circle</i>
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
                  className="grid place-items-center h-[40px] w-[40px] sm:h-[44px] sm:w-[44px] bg-[#303060] border-2 border-[#141433] text-[#DDD] hover:bg-[#3a3a6a] hover:text-white active:translate-y-[1px] transition-colors"
                  style={{
                    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.1), inset 0 -2px 0 rgba(0,0,0,0.3), 0 2px 0 rgba(0,0,0,0.4)',
                  }}
                >
                  <i className="material-icons text-[20px] sm:text-[22px]" aria-hidden>settings</i>
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
                  className="grid place-items-center h-[40px] w-[40px] sm:h-[44px] sm:w-[44px] bg-[#303060] border-2 border-[#141433] text-[#DDD] hover:bg-[#F92330] hover:text-white active:translate-y-[1px] transition-colors"
                  style={{
                    boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.1), inset 0 -2px 0 rgba(0,0,0,0.3), 0 2px 0 rgba(0,0,0,0.4)',
                  }}
                  onClick={onLogout}
                >
                  <i className="material-icons text-[20px] sm:text-[22px]" aria-hidden>logout</i>
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
