"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { formatDateTimeLoose } from "@/lib/date-utils"

export type StoryItem = {
  id: string
  src: string
  alt: string
  author?: string | null
  date?: string | number | null
  timestamp?: number | null
}

export default function StoriesClient({ items }: { items: StoryItem[] }) {
  const [active, setActive] = useState<StoryItem | null>(null)
  const reduce = useReducedMotion()
  const activeDate = active ? formatDateTimeLoose(active.date) : ""

  // Close on Escape
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [active])

  const overlayAnim = useMemo(
    () => ({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: reduce ? 0.12 : 0.24 },
    }),
    [reduce]
  )

  const panelAnim = useMemo(
    () => ({
      initial: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 },
      animate: reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 },
      exit: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 },
      transition: { duration: reduce ? 0.12 : 0.24 },
    }),
    [reduce]
  )

  return (
    <div className="content">
      <div className="flex gap-2.5 overflow-x-auto pb-2" id="boxs-storie">
        {items.map((s) => (
          <button
            key={s.id}
            className="box-storie shrink-0 w-[60px] h-[60px] grid place-items-center rounded-full border-2 border-[var(--blue-500)] p-0.5 hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-[var(--blue-500)] bg-[var(--bg-700)]"
            type="button"
            aria-label={`Story ${s.alt}`}
            onClick={() => setActive(s)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} alt={s.alt} className="img w-[48px] h-[48px] rounded-full object-cover" />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 grid place-items-center px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Story"
            onClick={() => setActive(null)}
            {...overlayAnim}
          >
            <motion.div
              className="relative max-w-3xl w-full bg-[var(--bg-700)] border border-[var(--bg-800)] rounded-lg shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              {...panelAnim}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bg-800)]">
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--text-100)] truncate">{active.alt}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-500)]">
                    {active.author && <span>{active.author}</span>}
                    {activeDate && (
                      <>
                        {active.author && <span className="opacity-50">•</span>}
                        <time dateTime={String(active.date)}>Publié le {activeDate}</time>
                      </>
                    )}
                  </div>
                </div>
                <button
                  className="rounded px-2 py-1 text-[var(--text-100)] hover:bg-[var(--bg-600)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-500)]"
                  onClick={() => setActive(null)}
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>

              {/* Image */}
              <div className="w-full bg-black/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={active.src} alt={active.alt} className="w-full h-auto max-h-[70vh] object-contain" />
              </div>

              {/* Footer */}
              {activeDate && (
                <div className="px-4 py-3 border-t border-[var(--bg-800)] text-xs text-[var(--text-500)]">
                  Date de publication : <time dateTime={String(active.date)}>{activeDate}</time>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
