'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Lock, Eye, EyeOff, Twitter } from 'lucide-react'
import { SiteButton, SiteField, SiteHeader, SiteInput, SitePage, SitePanel } from '@/components/site'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const [twitter, setTwitter] = useState('')
  const [twitterInitial, setTwitterInitial] = useState('')
  const [twitterLoading, setTwitterLoading] = useState(true)
  const [twitterSubmitting, setTwitterSubmitting] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    setTwitterLoading(true)
    fetch('/api/user/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        const value = j?.profile?.twitter ?? ''
        setTwitter(value)
        setTwitterInitial(value)
      })
      .catch(() => { /* silent */ })
      .finally(() => {
        if (!cancelled) setTwitterLoading(false)
      })
    return () => { cancelled = true }
  }, [status])

  if (status === 'loading') {
    return (
      <SitePage width="sm">
        <div className="h-[400px] animate-pulse rounded-[6px] border border-[#141433] bg-white/5" />
      </SitePage>
    )
  }

  if (!session?.user) {
    router.push('/login?from=/settings')
    return null
  }

  const nick = (session.user as any)?.nick || 'Utilisateur'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    if (newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit faire au moins 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erreur')
      toast.success('Mot de passe modifie avec succes')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors du changement de mot de passe')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTwitterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (twitterSubmitting) return
    setTwitterSubmitting(true)
    try {
      const trimmed = twitter.trim()
      const res = await fetch('/api/user/update-twitter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ twitter: trimmed || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erreur')
      const saved = (data?.twitter ?? '') as string
      setTwitter(saved)
      setTwitterInitial(saved)
      toast.success(saved ? 'Pseudo Twitter mis a jour' : 'Pseudo Twitter retire')
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de mettre a jour le Twitter')
    } finally {
      setTwitterSubmitting(false)
    }
  }

  return (
    <SitePage width="sm">
      <SiteHeader title="Parametres du compte" icon={<span className="material-icons text-[30px]">settings</span>} />

      <SitePanel className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <Twitter className="h-5 w-5 text-[#2596FF]" />
          <h2 className="text-[16px] font-bold text-white">Profil public</h2>
        </div>

        <p className="mb-5 text-[13px] text-[#BEBECE]/70">
          Ajoute ton pseudo Twitter (X) pour qu&apos;il apparaisse sur la page <span className="font-bold text-[#2596FF]">Equipe</span> si tu fais partie du staff.
        </p>

        <form onSubmit={handleTwitterSubmit} className="space-y-4">
          <SiteField
            label="Pseudo Twitter"
            hint="1 a 15 caracteres : lettres, chiffres et underscore. Laisser vide pour retirer."
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-[#BEBECE]/60">@</span>
              <SiteInput
                type="text"
                value={twitter.replace(/^@+/, '')}
                onChange={(e) => setTwitter(e.target.value.replace(/^@+/, ''))}
                disabled={twitterLoading || twitterSubmitting}
                placeholder="moncompte"
                maxLength={15}
                autoComplete="off"
                className="pl-8 text-white"
              />
            </div>
          </SiteField>

          <div className="pt-2">
            <SiteButton
              type="submit"
              disabled={twitterLoading || twitterSubmitting || twitter.trim() === twitterInitial.trim()}
            >
              {twitterSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </SiteButton>
          </div>
        </form>
      </SitePanel>

      <SitePanel className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <Lock className="h-5 w-5 text-[#2596FF]" />
          <h2 className="text-[16px] font-bold text-white">Changer le mot de passe</h2>
        </div>

        <p className="mb-5 text-[13px] text-[#BEBECE]/70">
          Connecte en tant que <span className="font-bold text-[#2596FF]">{nick}</span>. Entre ton mot de passe actuel puis choisis un nouveau mot de passe.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SiteField label="Mot de passe actuel">
            <div className="relative">
              <SiteInput
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Ton mot de passe actuel"
                className="pr-12 text-white"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BEBECE]/50 hover:text-white"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </SiteField>

          <SiteField label="Nouveau mot de passe">
            <div className="relative">
              <SiteInput
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Minimum 6 caracteres"
                className="pr-12 text-white"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BEBECE]/50 hover:text-white"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </SiteField>

          <SiteField label="Confirmer le nouveau mot de passe">
            <SiteInput
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Retape le nouveau mot de passe"
              className="text-white"
            />
          </SiteField>

          <div className="pt-2">
            <SiteButton
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Modification...' : 'Modifier le mot de passe'}
            </SiteButton>
          </div>
        </form>
      </SitePanel>
    </SitePage>
  )
}
