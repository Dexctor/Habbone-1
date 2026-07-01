'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { SiteButton, SiteField, SiteHeader, SiteInput, SitePage, SitePanel } from '@/components/site'

const RichEditor = dynamic(() => import('@/components/editor/RichEditor'), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse rounded-[4px] bg-[#25254D]" />,
})

export default function NouveauTopicPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
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
      setError("Erreur réseau lors de l'upload.")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    if (title.trim().length < 3) {
      setError('Le titre doit faire au moins 3 caractères.')
      return
    }
    if (content.trim().length < 10) {
      setError('Le contenu doit faire au moins 10 caractères.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/forum/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: title.trim(),
          conteudo: content,
          imagem: imageUrl.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || 'Erreur lors de la publication.')
        return
      }

      const topicId = data?.id
      router.push(topicId ? `/forum/topic/${topicId}` : '/forum')
    } catch {
      setError('Erreur réseau, réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SitePage width="md">
      <SiteHeader title="Nouveau sujet" imageSrc="/img/forum.png" />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <SitePanel className="p-5">
          <SiteField label="Titre du sujet">
            <SiteInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entrez le titre de votre sujet..."
              maxLength={200}
            />
          </SiteField>
        </SitePanel>

        {/* Image */}
        <SitePanel className="p-5">
          <SiteField label="Image (optionnel)">
          <div className="flex items-center gap-2">
            <SiteInput
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="URL ou UUID de l'image..."
              className="flex-1"
            />
            <label className="inline-flex h-[45px] shrink-0 cursor-pointer items-center gap-2 rounded-[4px] border border-[#34345A] bg-[#1F1F3E] px-4 text-[12px] font-bold uppercase tracking-[0.04em] text-[#BEBECE] transition hover:bg-[#25254D] hover:text-[#DDD]">
              <span className="material-icons text-[16px]">upload</span>
              {uploading ? 'Upload...' : 'Uploader'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  e.target.value = ''
                  void handleUpload(file)
                }}
              />
            </label>
          </div>
          </SiteField>
          {imageUrl && (
            <div className="mt-3 overflow-hidden rounded-[4px] border border-[#141433] bg-[#1F1F3E]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Aperçu"
                className="max-h-[150px] w-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          )}
        </SitePanel>

        {/* Content */}
        <SitePanel className="p-5">
          <SiteField label="Contenu">
          <div>
            <RichEditor
              name="conteudo"
              initialHTML=""
              onChange={setContent}
              variant="full"
            />
          </div>
          </SiteField>
        </SitePanel>

        {/* Error */}
        {error && (
          <div className="rounded-[4px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/forum"
            className="inline-flex h-[45px] items-center rounded-[4px] border border-white/10 bg-[#303060]/70 px-6 text-[12px] font-bold uppercase tracking-[0.04em] text-[#DDD] transition hover:border-[#2596FF]/45 hover:bg-[#25254D] hover:text-white"
          >
            Annuler
          </Link>
          <SiteButton
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Publication...' : 'Publier le sujet'}
          </SiteButton>
        </div>
      </form>
    </SitePage>
  )
}
