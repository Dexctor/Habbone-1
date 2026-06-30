'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { FileText, Award, Newspaper, PartyPopper, Search, X } from 'lucide-react'

const RichEditor = dynamic(() => import('@/components/editor/RichEditor'), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse rounded-[4px] bg-[#25254D]" />,
})

type TemplateId = 'blank' | 'badge' | 'update' | 'event'
type BadgeResult = { code: string; name: string; image: string }

const TEMPLATES: { id: TemplateId; label: string; icon: React.ReactNode }[] = [
  { id: 'blank', label: 'Vide', icon: <FileText className="h-4 w-4" /> },
  { id: 'badge', label: 'Nouveau Badge', icon: <Award className="h-4 w-4" /> },
  { id: 'update', label: 'Mise a jour', icon: <Newspaper className="h-4 w-4" /> },
  { id: 'event', label: 'Evenement', icon: <PartyPopper className="h-4 w-4" /> },
]

function buildBadgeContent(badge: BadgeResult): string {
  // Use c_images URL so that BadgesSlider detects it in the header
  const badgeImgUrl = `https://images.habbo.com/c_images/album1584/${badge.code}.gif`
  return `<p style="text-align: center"><img src="${badgeImgUrl}" alt="${badge.name}" /></p>
<p>&nbsp;</p>
<p><strong style="font-size: 18px">Nouveau badge : ${badge.name}</strong></p>
<p>&nbsp;</p>
<p>Un nouveau badge est disponible sur Habbo ! Decouvrez le badge <strong>${badge.name}</strong> (${badge.code}).</p>
<p>&nbsp;</p>
<p><strong style="font-size: 16px">Comment l'obtenir ?</strong></p>
<p>Decrivez ici comment obtenir ce badge...</p>`
}

function buildUpdateContent(): string {
  return `<p><strong style="font-size: 18px">Mise a jour Habbo</strong></p>
<p>&nbsp;</p>
<p>Habbo vient de deployer une nouvelle mise a jour ! Voici les changements :</p>
<p>&nbsp;</p>
<ul>
<li>Changement 1</li>
<li>Changement 2</li>
<li>Changement 3</li>
</ul>
<p>&nbsp;</p>
<p>Qu'en pensez-vous ? Partagez votre avis dans les commentaires !</p>`
}

function buildEventContent(): string {
  return `<p><strong style="font-size: 18px">Evenement HabbOne</strong></p>
<p>&nbsp;</p>
<p>Un nouvel evenement est organise sur HabbOne !</p>
<p>&nbsp;</p>
<p><strong>Date :</strong> A definir</p>
<p><strong>Lieu :</strong> A definir</p>
<p><strong>Recompenses :</strong> A definir</p>
<p>&nbsp;</p>
<p>Participez et tentez de gagner des HabbOneCoins !</p>`
}

export default function NouveauArticlePage() {
  const router = useRouter()
  const [template, setTemplate] = useState<TemplateId>('blank')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editorKey, setEditorKey] = useState(0)

  // Badge search modal
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [badgeQuery, setBadgeQuery] = useState('')
  const [badgeResults, setBadgeResults] = useState<BadgeResult[]>([])
  const [badgeSearching, setBadgeSearching] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null)

  const searchBadges = useCallback(async (q: string) => {
    setBadgeSearching(true)
    try {
      const res = await fetch(`/api/badges/search?q=${encodeURIComponent(q)}&limit=30`)
      const json = await res.json()
      setBadgeResults(json?.badges ?? [])
    } catch {
      setBadgeResults([])
    } finally {
      setBadgeSearching(false)
    }
  }, [])

  useEffect(() => {
    if (!showBadgeModal) return
    // Load initial badges
    searchBadges('')
  }, [showBadgeModal, searchBadges])

  const handleBadgeSearch = (q: string) => {
    setBadgeQuery(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => searchBadges(q), 300)
  }

  const selectBadge = (badge: BadgeResult) => {
    setTitle(`${badge.name} - Nouveau badge disponible !`)
    setDescription(`Decouvrez le nouveau badge ${badge.name} sur Habbo.`)
    setContent(buildBadgeContent(badge))
    // Use the badge image as cover
    setImageUrl(badge.image)
    setEditorKey((k) => k + 1)
    setShowBadgeModal(false)
    setTemplate('badge')
  }

  const handleTemplateChange = (id: TemplateId) => {
    if (id === 'badge') {
      setShowBadgeModal(true)
      return
    }
    setTemplate(id)
    if (id === 'blank') {
      setTitle('')
      setDescription('')
      setContent('')
      setImageUrl('')
    } else if (id === 'update') {
      setTitle('Mise a jour Habbo - ')
      setDescription('Habbo vient de deployer une nouvelle mise a jour.')
      setContent(buildUpdateContent())
      setImageUrl('')
    } else if (id === 'event') {
      setTitle('Evenement HabbOne - ')
      setDescription('Un nouvel evenement est organise sur HabbOne !')
      setContent(buildEventContent())
      setImageUrl('')
    }
    setEditorKey((k) => k + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    if (title.trim().length < 3) {
      setError('Le titre doit faire au moins 3 caracteres.')
      return
    }
    if (content.trim().length < 10) {
      setError('Le contenu doit faire au moins 10 caracteres.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: title.trim(),
          descricao: description.trim() || undefined,
          noticia: content,
          imagem: imageUrl.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || 'Erreur lors de la publication.')
        return
      }

      const articleId = data?.id
      router.push(articleId ? `/news/${articleId}` : '/news')
    } catch {
      setError('Erreur reseau, reessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-[800px] space-y-6 px-4 py-10 sm:px-6">
      {/* Header */}
      <header className="flex h-[76px] items-center rounded-[4px] border border-black/60 bg-[#1F1F3E] px-5 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/public.png" alt="" className="h-[38px] w-auto image-pixelated" />
          <h1 className="text-[18px] font-bold uppercase text-[#DDD] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            Publier un article
          </h1>
        </div>
      </header>

      {/* Templates */}
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTemplateChange(t.id)}
            className={`inline-flex items-center gap-2 rounded-[4px] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.04em] transition ${
              template === t.id
                ? 'bg-[#2596FF] text-white'
                : 'bg-[rgba(255,255,255,0.06)] text-[#BEBECE] hover:bg-[rgba(255,255,255,0.12)] hover:text-white'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[#BEBECE]">
            Titre de l&apos;article
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Entrez le titre..."
            maxLength={200}
            className="mt-2 h-[45px] w-full rounded-[4px] border border-[#141433] bg-[#25254D] px-4 text-[14px] text-[#DDD] placeholder:text-[#BEBECE]/50 focus-visible:border-[#2596FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2596FF]/25"
          />
        </div>

        {/* Description */}
        <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[#BEBECE]">
            Resume (optionnel)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Bref resume de l'article..."
            maxLength={500}
            className="mt-2 h-[45px] w-full rounded-[4px] border border-[#141433] bg-[#25254D] px-4 text-[14px] text-[#DDD] placeholder:text-[#BEBECE]/50 focus-visible:border-[#2596FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2596FF]/25"
          />
        </div>

        {/* Image */}
        <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[#BEBECE]">
            Image de couverture (optionnel)
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="URL de l'image..."
              className="h-[45px] flex-1 rounded-[4px] border border-[#141433] bg-[#25254D] px-4 text-[14px] text-[#DDD] placeholder:text-[#BEBECE]/50 focus-visible:border-[#2596FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2596FF]/25"
            />
            <label className="inline-flex h-[45px] shrink-0 cursor-pointer items-center gap-2 rounded-[4px] border border-[#34345A] bg-[#1F1F3E] px-4 text-[12px] font-bold uppercase tracking-[0.04em] text-[#BEBECE] transition hover:bg-[#25254D] hover:text-[#DDD]">
              <span className="material-icons text-[16px]">upload</span>
              {uploading ? 'Upload...' : 'Uploader'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  e.target.value = ''
                  setUploading(true)
                  try {
                    const formData = new FormData()
                    formData.set('file', file)
                    const res = await fetch('/api/upload/image', { method: 'POST', body: formData })
                    const data = await res.json()
                    if (data?.url) {
                      setImageUrl(data.url)
                    } else {
                      setError(data?.error || "Erreur lors de l'upload.")
                    }
                  } catch {
                    setError("Erreur reseau lors de l'upload.")
                  } finally {
                    setUploading(false)
                  }
                }}
              />
            </label>
          </div>
          {imageUrl && (
            <div className="mt-3 overflow-hidden rounded-[4px] border border-[#141433] bg-[#1F1F3E]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Apercu" className="max-h-[150px] w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
          <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[#BEBECE]">
            Contenu de l&apos;article
          </label>
          <div className="mt-2">
            <RichEditor
              key={editorKey}
              name="noticia"
              initialHTML={content}
              onChange={setContent}
              variant="full"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-[4px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/news"
            className="inline-flex h-[45px] items-center rounded-[4px] border border-[#34345A] bg-[#1F1F3E] px-6 text-[12px] font-bold uppercase tracking-[0.04em] text-[#BEBECE] transition hover:bg-[#25254D] hover:text-[#DDD]"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-[45px] items-center rounded-[4px] bg-[#2596FF] px-6 text-[12px] font-bold uppercase tracking-[0.04em] text-white transition hover:bg-[#2976E8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Publication...' : "Publier l'article"}
          </button>
        </div>
      </form>

      {/* Badge Search Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowBadgeModal(false)}>
          <div className="w-full max-w-[550px] rounded-[8px] border border-[#1F1F3E] bg-[#272746] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-[#1F1F3E] px-5 py-4">
              <div>
                <h3 className="text-[16px] font-bold text-white">Choisir un badge</h3>
                <p className="text-[12px] text-[#BEBECE]/70">Recherchez un badge Habbo pour creer l&apos;article automatiquement</p>
              </div>
              <button type="button" onClick={() => setShowBadgeModal(false)} className="rounded-full p-1.5 text-[#BEBECE] hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pt-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#BEBECE]/50" />
                <input
                  type="text"
                  value={badgeQuery}
                  onChange={(e) => handleBadgeSearch(e.target.value)}
                  placeholder="Rechercher un badge par nom ou code..."
                  autoFocus
                  className="h-[42px] w-full rounded-[4px] border border-[#141433] bg-[#1F1F3E] pl-10 pr-3 text-[13px] text-white placeholder:text-[#BEBECE]/40 focus:border-[#2596FF] focus:outline-none"
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto px-5 py-4">
              {badgeSearching ? (
                <div className="py-8 text-center text-[13px] text-[#BEBECE]/50">Recherche...</div>
              ) : badgeResults.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-[#BEBECE]/50">Aucun badge trouve.</div>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {badgeResults.map((badge) => (
                    <button
                      key={badge.code}
                      type="button"
                      onClick={() => selectBadge(badge)}
                      title={`${badge.name} (${badge.code})`}
                      className="flex flex-col items-center gap-1.5 rounded-[4px] border border-[#141433] bg-[#1F1F3E] p-2.5 transition hover:border-[#2596FF] hover:bg-[#303060]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={badge.image}
                        alt={badge.name}
                        className="h-[34px] w-[34px] image-pixelated object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <span className="w-full truncate text-center text-[10px] font-medium text-[#BEBECE]">
                        {badge.code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
