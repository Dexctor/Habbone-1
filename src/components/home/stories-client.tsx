"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { formatDateTimeLoose } from "@/lib/date-utils"
import { easings } from "@/lib/motion-tokens"

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
  const [mounted, setMounted] = useState(false)
  const reduce = useReducedMotion()
  const activeDate = active ? formatDateTimeLoose(active.date) : ""
  const listMotion = reduce
    ? {}
    : {
        initial: "hidden",
        whileInView: "show",
        viewport: { once: true, amount: 0.6 },
        variants: {
          hidden: {},
          show: {
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
          hidden: { opacity: 0, y: 10, scale: 0.94 },
          show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.38, ease: easings.soft },
          },
        },
      }

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [active])

  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
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

      {mounted &&
        createPortal(
          <AnimatePresence>
            {active && (
              <motion.div
                className="fixed inset-0 z-[1000] grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-label="Story"
                onClick={() => setActive(null)}
                {...overlayAnim}
              >
                <motion.div
                  className="relative w-full max-w-[560px] overflow-hidden rounded-[8px] border border-[#141433] bg-[#1F1F3E] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)]"
                  onClick={(e) => e.stopPropagation()}
                  {...panelAnim}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-[#141433] px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[var(--text-100)]">{active.alt}</div>
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
                      className="grid h-9 w-9 place-items-center rounded-[6px] text-[22px] leading-none text-[var(--text-100)] transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--blue-500)]"
                      onClick={() => setActive(null)}
                      aria-label="Fermer"
                    >
                      ×
                    </button>
                  </div>

                  {/* Image */}
                  <div className="grid max-h-[78vh] w-full place-items-center bg-black/20 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={active.src} alt={active.alt} className="max-h-[72vh] w-auto max-w-full object-contain" />
                  </div>

                  {/* Footer */}
                  {activeDate && (
                    <div className="border-t border-[#141433] px-4 py-3 text-xs text-[var(--text-500)]">
                      Date de publication : <time dateTime={String(active.date)}>{activeDate}</time>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}
