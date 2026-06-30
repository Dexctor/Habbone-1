'use client'

import { AnimatePresence, motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { toastError, toastSuccess } from '@/lib/sonner'

type StoryUploadModalProps = {
  open: boolean
  onClose: () => void
}

export default function StoryUploadModal({ open, onClose }: StoryUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1100] grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-[8px] border border-[#141433] bg-[#1F1F3E] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Publier une storie"
          >
            <div className="flex items-center justify-between border-b border-[#141433] px-4 py-3">
              <div className="font-semibold text-white">Publier une storie</div>
              <button
                className="grid h-9 w-9 place-items-center rounded-[6px] text-[22px] leading-none text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#2596FF]"
                onClick={onClose}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif"
                className="block w-full text-sm text-[var(--text-500)] file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[var(--bg-800)] file:text-[var(--text-100)] hover:file:bg-[var(--bg-600)]"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={busy}
              />
              <p className="text-xs text-[var(--text-500)]">
                Formats autorisés: JPG, PNG, GIF. Max 10 MB, 1600x1600 px, 10 stories / mois.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#141433] px-4 py-3">
              <button
                className="rounded-[6px] bg-white/10 px-3 py-2 text-sm font-semibold text-[#BEBECE] transition-colors hover:bg-white/15 hover:text-white"
                onClick={onClose}
                disabled={busy}
              >Annuler</button>
              <button
                className="rounded-[6px] bg-[#0FD52F] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
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
    </AnimatePresence>,
    document.body
  )
}

