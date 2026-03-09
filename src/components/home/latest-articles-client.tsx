"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { mediaUrl } from "@/lib/media-url"
import { stripHtml } from "@/lib/text-utils"

type Item = {
  id: number
  titulo: string
  descricao?: string | null
  imagem?: string | null
}

const PAGE_SIZE = 6

function detectCategoryLabel(item: Item): string {
  const text = `${item.titulo || ""} ${item.descricao || ""}`.toLowerCase()
  if (text.includes("rare")) return "RARES"
  if (text.includes("habbone")) return "HABBONE"
  if (text.includes("habbo")) return "HABBO"
  return "NOUVEAUTE"
}

export default function LatestArticlesClient({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)
  const reduceMotion = useReducedMotion()

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) => {
      const title = stripHtml(item.titulo || "").toLowerCase()
      const desc = stripHtml(item.descricao || "").toLowerCase()
      return title.includes(term) || desc.includes(term)
    })
  }, [items, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  const prevPage = () => setPage((current) => Math.max(0, current - 1))
  const nextPage = () => setPage((current) => Math.min(pageCount - 1, current + 1))

  return (
    <section className="w-full">
      <div className="mb-[30px] flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/news.png" alt="" className="h-[38px] w-auto image-pixelated" />
          <h2 className="text-[18px] font-bold uppercase text-[#DDD] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            Dernieres actualites
          </h2>
        </div>

        <div className="flex w-full items-center gap-2 lg:w-auto">
          <div className="relative h-[50px] w-full lg:w-[255px]">
            <span className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-[#BEBECE]">
              search
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setPage(0)
                setQuery(event.target.value)
              }}
              placeholder="Rechercher une actualite"
              className="h-[50px] w-full rounded-[4px] border border-transparent bg-[rgba(255,255,255,0.1)] pl-10 pr-3 text-[12px] text-[#DDD] placeholder:text-[#BEBECE]/80 focus-visible:border-[#2596FF] focus-visible:outline-none"
            />
          </div>

          <button
            type="button"
            aria-label="Actualites precedentes"
            onClick={prevPage}
            disabled={clampedPage === 0}
            className="grid h-[50px] w-[50px] place-items-center rounded-[4px] bg-[rgba(255,255,255,0.1)] text-[#DDD] transition hover:bg-[#2596FF] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <i className="material-icons text-[22px]" aria-hidden>
              chevron_left
            </i>
          </button>
          <button
            type="button"
            aria-label="Actualites suivantes"
            onClick={nextPage}
            disabled={clampedPage >= pageCount - 1}
            className="grid h-[50px] w-[50px] place-items-center rounded-[4px] bg-[rgba(255,255,255,0.1)] text-[#DDD] transition hover:bg-[#2596FF] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <i className="material-icons text-[22px]" aria-hidden>
              chevron_right
            </i>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${clampedPage}-${query}`}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.25 }}
          className="grid grid-cols-1 gap-x-[30px] gap-y-[35px] md:grid-cols-2 xl:grid-cols-3"
        >
          {visible.length === 0 ? (
            <div className="col-span-full rounded-[4px] border border-dashed border-[#1F1F3E] bg-[#272746] px-6 py-12 text-center text-sm font-semibold uppercase tracking-[0.06em] text-[#BEBECE]/70">
              Aucun article trouve.
            </div>
          ) : (
            visible.map((item, index) => {
              const isHighlighted = index === 1
              const category = detectCategoryLabel(item)
              const image = item.imagem ? mediaUrl(item.imagem) : "/img/thumbnail.png"
              const title = stripHtml(item.titulo || "") || `Actualite #${item.id}`

              return (
                <motion.article key={item.id} layout>
                  <Link
                    href={`/news/${item.id}`}
                    className={`group relative block h-[237px] rounded-[4px] border transition ${
                      isHighlighted
                        ? "border-white/5 bg-[#303060]"
                        : "border-[#1F1F3E] bg-[#272746] hover:border-white/10 hover:bg-[#303060]"
                    }`}
                  >
                    <div className="absolute left-[15px] right-[15px] top-[15px] h-[160px] overflow-hidden rounded-[3px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="" className="h-full w-full object-cover" />
                      {!isHighlighted ? <div className="absolute inset-0 bg-black/20" /> : null}

                      <div className="absolute bottom-[10px] left-[10px] right-[10px] flex items-center justify-between">
                        <span className="rounded-[4px] bg-[rgba(20,20,51,0.8)] px-[10px] py-[7px] text-[11px] font-bold uppercase text-[#BEBECE] backdrop-blur-[2.5px]">
                          {category}
                        </span>
                        <span
                          className={`grid h-[39px] w-[40px] place-items-center rounded-[4px] backdrop-blur-[2.5px] ${
                            isHighlighted ? "bg-[rgba(20,20,51,0.85)]" : "bg-[rgba(20,20,51,0.8)]"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={isHighlighted ? "/img/star-mini.png" : "/img/star-blue-mini.png"}
                            alt=""
                            className="h-[18px] w-[18px] image-pixelated"
                          />
                        </span>
                      </div>
                    </div>

                    <p className="absolute bottom-[15px] left-[15px] right-[15px] line-clamp-2 text-[12px] leading-[1.35] text-[#BEBECE] transition group-hover:text-white">
                      {title}
                    </p>
                  </Link>
                </motion.article>
              )
            })
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
