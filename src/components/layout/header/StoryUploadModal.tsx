'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { toastError, toastSuccess } from '@/lib/sonner'

type StoryUploadModalProps = {
  open: boolean
  onClose: () => void
}

export default function StoryUploadModal({ open, onClose }: StoryUploadModalProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-black/60 grid place-items-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative max-w-md w-full bg-[var(--bg-700)] border border-[var(--bg-800)] rounded-lg shadow-xl overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Publier une storie"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bg-800)]">
              <div className="font-semibold">Publier une storie</div>
              <button className="rounded px-2 py-1 hover:bg-[var(--bg-600)]" onClick={onClose} aria-label="Fermer">Fermer</button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif"
                className="block w-full text-sm text-[var(--text-500)] file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[var(--bg-800)] file:text-[var(--text-100)] hover:file:bg-[var(--bg-600)]"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={busy}
              />
              <p className="text-xs text-[var(--text-500)]">Formats autorisés: JPG, PNG, GIF. Limite: 10 stories / mois.</p>
            </div>
            <div className="px-4 py-3 border-t border-[var(--bg-800)] flex justify-end gap-2">
              <button
                className="rounded px-3 py-2 text-sm bg-[var(--bg-600)] hover:bg-[var(--bg-500)]"
                onClick={onClose}
                disabled={busy}
              >Annuler</button>
              <button
                className="rounded px-3 py-2 text-sm bg-[#0FD52F] text-white hover:brightness-90 disabled:opacity-50"
                onClick={async () => {
                  if (!file) { try { await toastError('Choisissez un fichier.') } catch {}; return }
                  setBusy(true)
                  try {
                    const fd = new FormData()
                    fd.append('file', file)
                    const res = await fetch('/api/stories', { method: 'POST', body: fd, cache: 'no-store' })
                    const j = await res.json().catch(() => ({}))
                    if (!res.ok) throw new Error((j as any)?.error || 'Erreur envoi storie')
                    try { await toastSuccess('Storie publiée !') } catch {}
                    setFile(null)
                    router.refresh()
                    onClose()
                  } catch (e: any) {
                    try { await toastError(e?.message || 'Erreur lors de la publication') } catch {}
                  } finally {
                    setBusy(false)
                  }
                }}
                disabled={!file || busy}
              >{busy ? 'Envoi...' : 'Publier'}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
