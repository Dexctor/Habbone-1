'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { buildHabboAvatarUrl } from '@/lib/habbo-imaging'

const DEFAULT_AVATAR_NICK = 'Decrypt'

type StatusState = { type: 'info' | 'error' | 'success'; message: string } | null

type LoginModalProps = {
    open: boolean
    onClose: () => void
    onLogin: (payload: { nick: string; password: string }) => Promise<boolean> | boolean
    onSwitchToRegister: () => void
}

function StatusBanner({ status }: { status: StatusState }) {
    if (!status) return null

    const palette =
        status.type === 'success'
            ? {
                className: 'border-[#0FD52F]/40 bg-[#12361F] text-[#9DF4AD]',
                icon: <CheckCircle2 className="h-4 w-4 text-[#54F296]" />,
            }
            : status.type === 'error'
                ? {
                    className: 'border-[#FF8A8A]/40 bg-[#3A1F2D] text-[#FFC0C0]',
                    icon: <AlertTriangle className="h-4 w-4 text-[#FF8A8A]" />,
                }
                : {
                    className: 'border-white/15 bg-white/5 text-white/80',
                    icon: <Info className="h-4 w-4 text-white/70" />,
                }

    return (
        <div className={cn('rounded-[8px] border px-4 py-3 text-sm leading-relaxed', palette.className)}>
            <span className="inline-flex items-center gap-2">
                {palette.icon}
                {status.message}
            </span>
        </div>
    )
}

export default function LoginModal({ open, onClose, onLogin, onSwitchToRegister }: LoginModalProps) {
    const [nick, setNick] = useState('')
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [status, setStatus] = useState<StatusState>(null)
    const [avatarNick, setAvatarNick] = useState(DEFAULT_AVATAR_NICK)
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

    // Update avatar with debounce when nick changes
    const handleNickChange = useCallback((value: string) => {
        setNick(value)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            const trimmed = value.trim()
            setAvatarNick(trimmed.length >= 2 ? trimmed : DEFAULT_AVATAR_NICK)
        }, 400)
    }, [])

    const avatarUrl = buildHabboAvatarUrl(avatarNick, {
        direction: 2,
        head_direction: 3,
        img_format: 'png',
        gesture: 'sml',
        headonly: 1,
        size: 'l',
    })

    const handleSubmit = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            if (submitting) return

            setSubmitting(true)
            setStatus(null)

            try {
                const ok = await onLogin({ nick: nick.trim(), password })
                if (ok) {
                    setStatus({ type: 'success', message: 'Connexion réussie !' })
                    setPassword('')
                    // Modal will be closed by parent after successful login
                }
            } catch (error: any) {
                setStatus({ type: 'error', message: error?.message || 'Erreur lors de la connexion.' })
            } finally {
                setSubmitting(false)
            }
        },
        [nick, password, onLogin, submitting]
    )

    const handleSwitchToRegister = useCallback(() => {
        onClose()
        onSwitchToRegister()
    }, [onClose, onSwitchToRegister])

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setNick('')
            setPassword('')
            setStatus(null)
            setSubmitting(false)
            setAvatarNick(DEFAULT_AVATAR_NICK)
        }
    }, [open])

    return (
        <Dialog open={open} onOpenChange={(value) => { if (!value) onClose() }}>
            <DialogContent className="bg-[#0E0E22] text-white border border-white/10 rounded-[12px] sm:max-w-md p-0 shadow-[0_20px_60px_rgba(6,7,18,0.45)]">
                <div className="p-6 sm:p-8 space-y-6">
                    {/* Avatar preview */}
                    <div className="flex justify-center">
                        <div className="grid h-[80px] w-[80px] place-items-center rounded-full border-2 border-[#2596FF]/30 bg-[#141433]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={avatarUrl}
                                alt=""
                                className="h-[60px] w-auto image-pixelated transition-all duration-300"
                                onError={(e) => {
                                    const img = e.target as HTMLImageElement
                                    if (!img.dataset.fallback) {
                                        img.dataset.fallback = '1'
                                        img.src = buildHabboAvatarUrl(DEFAULT_AVATAR_NICK, { direction: 2, head_direction: 3, img_format: 'png', gesture: 'sml', headonly: 1, size: 'l' })
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <DialogHeader className="space-y-2 text-center">
                        <DialogTitle className="text-2xl font-semibold text-white">Connexion</DialogTitle>
                        <DialogDescription className="text-sm leading-relaxed text-white/70">
                            Entre ton pseudo Habbo et ton mot de passe HabbOne pour te connecter.
                        </DialogDescription>
                    </DialogHeader>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="w-full">
                            <StatusBanner status={status} />
                        </div>

                        <div className="space-y-3">
                            <label htmlFor="login-nick" className="block pb-1 text-sm font-medium text-white">
                                Pseudo Habbo
                            </label>
                            <Input
                                id="login-nick"
                                name="nick"
                                placeholder="Ex : MonPseudo"
                                value={nick}
                                onChange={(e) => handleNickChange(e.target.value)}
                                required
                                minLength={3}
                                maxLength={20}
                                autoComplete="username"
                                disabled={submitting}
                                className="h-11 rounded-[6px] border-[#232356] bg-[#141433] text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-[#2596FF]"
                            />
                        </div>

                        <div className="space-y-3">
                            <label htmlFor="login-password" className="block pb-1 text-sm font-medium text-white">
                                Mot de passe
                            </label>
                            <Input
                                id="login-password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete="current-password"
                                disabled={submitting}
                                className="h-11 rounded-[6px] border-[#232356] bg-[#141433] text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-[#2596FF]"
                            />
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#2596FF] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-transform hover:-translate-y-0.5 hover:brightness-95"
                            >
                                {submitting ? (
                                    <span className="inline-flex items-center gap-2">
                                        <span className="relative flex h-3 w-3 items-center justify-center">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/40" />
                                            <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                                        </span>
                                        Connexion…
                                    </span>
                                ) : (
                                    'Connexion'
                                )}
                            </Button>

                            <div className="relative flex items-center justify-center">
                                <span className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
                                <span className="relative bg-[#0E0E22] px-3 text-xs text-white/50">ou</span>
                            </div>

                            <Button
                                type="button"
                                onClick={handleSwitchToRegister}
                                disabled={submitting}
                                className="flex w-full items-center justify-center rounded-[6px] bg-[#0FD52F] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-transform hover:-translate-y-0.5 hover:brightness-95"
                            >
                                S'inscrire
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                disabled={submitting}
                                className="flex w-full items-center justify-center rounded-[6px] text-sm text-white/70 hover:bg-white/5 hover:text-white"
                            >
                                Annuler
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
