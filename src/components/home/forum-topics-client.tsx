'use client'

import Link from 'next/link'
import { mediaUrl } from '@/lib/media-url'
import { stripHtml } from '@/lib/text-utils'

type Topic = {
  id: number
  titulo: string
  autor: string
  views: number
  data: string | null
  imagem: string | null
}

export default function ForumTopicsClient({ topics }: { topics: Topic[] }) {
  const visibleTopics = topics.slice(0, 7)

  return (
    <section className="relative w-screen left-1/2 -translate-x-1/2 bg-[#25254D] py-16 lg:py-[72px]">
      <div className="relative mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        <div className="mb-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/box.png" alt="" className="h-[32px] w-auto image-pixelated" />
            <h2 className="text-[18px] font-bold uppercase text-[#DDD] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
              Forum Habbone
            </h2>
          </div>

          <Link
            href="/forum"
            className="inline-flex h-[50px] items-center rounded-[4px] bg-[rgba(255,255,255,0.1)] px-[20px] text-[12px] font-bold uppercase tracking-[0.04em] text-[#DDD] transition hover:bg-[rgba(255,255,255,0.16)]"
          >
            Voir plus
          </Link>
        </div>

        {visibleTopics.length === 0 ? (
          <div className="rounded-[4px] border border-dashed border-[#1F1F3E] bg-[#272746] px-6 py-12 text-center text-sm font-semibold uppercase tracking-[0.06em] text-[#BEBECE]/70">
            Aucun sujet disponible.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleTopics.map((topic) => {
              const image = topic.imagem ? mediaUrl(topic.imagem) : '/img/thumbnail.png'
              const title = stripHtml(topic.titulo || '') || `Sujet #${topic.id}`
              const author = topic.autor?.trim() || 'Anonyme'

              return (
                <Link
                  key={topic.id}
                  href={`/forum/topic/${topic.id}`}
                  className="group block h-[122px] rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-[8px] transition hover:border-white/10 hover:bg-[#303060]"
                >
                  <article className="flex h-full items-stretch gap-3">
                    <div className="relative h-[106px] w-[106px] shrink-0 overflow-hidden rounded-[3px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/25" />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col py-1">
                      <h3 className="line-clamp-2 text-[14px] font-bold leading-[1.3] text-[#DDD] group-hover:text-white">
                        {title}
                      </h3>

                      <div className="mt-auto flex items-center gap-[6px]">
                        <span className="inline-flex h-[32px] items-center rounded-[3px] bg-[rgba(255,255,255,0.1)] px-[10px] text-[12px] font-bold text-[#BEBECE]">
                          {author}
                        </span>
                        <span className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[3px] bg-[rgba(255,255,255,0.1)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/img/comment-mini.png" alt="" className="h-[13px] w-[13px] image-pixelated opacity-85" />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
