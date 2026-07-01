'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { KeyRound, Copy, CheckCircle2 } from 'lucide-react'
import { SiteButton, SiteField, SiteHeader, SiteInput, SitePage, SitePanel } from '@/components/site'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [nick, setNick] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || !nick.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/user/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', nick: nick.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erreur')
      setCode(data.code || '')
      setStep('reset')
      toast.success('Code genere ! Place-le dans ta mission Habbo.')
    } catch (err: any) {
      toast.error(err?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (newPassword.length < 6) {
      toast.error('Mot de passe trop court (min 6 caracteres)')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/user/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', nick: nick.trim(), code, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Erreur')
      toast.success('Mot de passe reinitialise ! Tu peux te connecter.')
      router.push('/')
    } catch (err: any) {
      toast.error(err?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <SitePage width="sm">
      <SiteHeader title="Mot de passe oublie" icon={<KeyRound className="h-[28px] w-[28px]" />} />

      {step === 'request' && (
        <SitePanel className="p-6">
          <p className="mb-5 text-[13px] leading-relaxed text-[#BEBECE]/80">
            Entre ton pseudo Habbo. On va generer un code que tu devras placer dans ta <strong className="text-white">mission Habbo</strong> pour prouver que c&apos;est bien ton compte.
          </p>

          <form onSubmit={handleRequestCode} className="space-y-4">
            <SiteField label="Pseudo Habbo">
              <SiteInput
                type="text"
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                required
                minLength={2}
                placeholder="Ton pseudo Habbo"
                className="text-white"
              />
            </SiteField>
            <SiteButton
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Generation...' : 'Generer le code'}
            </SiteButton>
          </form>

          <div className="mt-4 text-center">
            <Link href="/" className="text-[12px] text-[#BEBECE]/60 hover:text-[#2596FF]">
              Retour a l&apos;accueil
            </Link>
          </div>
        </SitePanel>
      )}

      {step === 'reset' && (
        <section className="space-y-4">
          {/* Code display */}
          <SitePanel className="border-[#2596FF]/30 bg-[#1F1F3E] p-5">
            <p className="mb-3 text-[13px] text-[#BEBECE]/80">
              Place ce code dans ta <strong className="text-white">mission Habbo</strong> puis clique sur &quot;Reinitialiser&quot; :
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-[4px] border border-[#2596FF]/20 bg-[#141433] px-4 py-3 text-center font-mono text-[18px] font-bold tracking-[0.1em] text-[#2596FF]">
                {code}
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="grid h-[45px] w-[45px] shrink-0 place-items-center rounded-[4px] border border-[#141433] bg-[#25254D] transition hover:bg-[#303060]"
                title="Copier le code"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-[#0FD52F]" /> : <Copy className="h-4 w-4 text-[#BEBECE]" />}
              </button>
            </div>
          </SitePanel>

          {/* Reset form */}
          <SitePanel className="p-6">
            <form onSubmit={handleReset} className="space-y-4">
              <SiteField label="Nouveau mot de passe">
                <SiteInput
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Minimum 6 caracteres"
                  className="text-white"
                />
              </SiteField>
              <SiteField label="Confirmer le mot de passe">
                <SiteInput
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Retape le mot de passe"
                  className="text-white"
                />
              </SiteField>
              <SiteButton
                type="submit"
                disabled={loading}
                variant="success"
                className="w-full"
              >
                {loading ? 'Reinitialisation...' : 'Reinitialiser le mot de passe'}
              </SiteButton>
            </form>
          </SitePanel>

          <button
            type="button"
            onClick={() => { setStep('request'); setCode(''); }}
            className="w-full text-center text-[12px] text-[#BEBECE]/60 hover:text-[#2596FF]"
          >
            Regenerer un nouveau code
          </button>
        </section>
      )}
    </SitePage>
  )
}
