"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { formatDateTimeLoose } from "@/lib/date-utils"
import { easings, transitions, variants } from "@/lib/motion-tokens"

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
  const listMotion = reduce
    ? {}
    : {
        initial: "initial",
        whileInView: "animate",
        viewport: { once: true, amount: 0.6 },
        variants: {
          initial: {},
          animate: {
            transition: {
              staggerChildren: 0.035,
              delayChildren: 0.08,
            },
          },
        },
      }
  const itemMotion = reduce
    ? {}
    : {
        variants: {
          initial: { opacity: 0, y: 10, scale: 0.94 },
          animate: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.38, ease: easings.soft },
          },
        },
      }

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
      ...variants.overlay,
      transition: reduce ? { duration: 0 } : transitions.modal,
    }),
    [reduce]
  )

  const panelAnim = useMemo(
    () => ({
      ...(reduce ? variants.overlay : variants.modalPanel),
      transition: reduce ? { duration: 0 } : transitions.modal,
    }),
    [reduce]
  )

  return (
    <div className="content">
      <motion.div className="flex gap-2.5 overflow-x-auto pb-2" id="boxs-storie" {...listMotion}>
        {items.map((s) => (
          <motion.button
            key={s.id}
            className="box-storie shrink-0 w-[60px] h-[60px] grid place-items-center rounded-full border-2 border-[var(--blue-500)] p-0.5 hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-[var(--blue-500)] bg-[var(--bg-700)]"
            type="button"
            aria-label={`Story ${s.alt}`}
            onClick={() => setActive(s)}
            {...itemMotion}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} alt={s.alt} className="img w-[48px] h-[48px] rounded-full object-cover" />
          </motion.button>
        ))}
      </motion.div>

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
                  <div className="text-xs text-[var(--text-500)]">{active.author || ""}</div>
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
              <div className="px-4 py-3 border-t border-[var(--bg-800)] text-xs text-[var(--text-500)]">
                {formatDateTimeLoose(active.date) || ""}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
