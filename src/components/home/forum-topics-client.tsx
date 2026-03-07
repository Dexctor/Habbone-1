'use client'

import Link from 'next/link'
import { mediaUrl } from '@/lib/media-url'

type Topic = {
    id: number
    titulo: string
    autor: string
    views: number
    data: string | null
    imagem: string | null
}

export default function ForumTopicsClient({ topics }: { topics: Topic[] }) {
    return (
        <section className="w-full forum-topics">
            {/* Title bar */}
            <div className="bar-default flex flex-col items-start md:flex-row md:items-center justify-between w-full min-h-[50px] mb-[35px]">
                <div className="title flex items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/img/news.png" alt="forum" className="mr-[12px] image-pixelated w-[28px] h-[28px]" />
                    <label className="font-bold text-[var(--text-lg)] leading-[22px] text-[var(--text-100)] uppercase [text-shadow:0_1px_2px_var(--text-shadow)]">
                        Forum Habbone
                    </label>
                </div>
                <div className="extra flex items-center gap-2 mt-3 md:mt-0">
                    <Link
                        href="/forum"
                        className="rounded px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[var(--shadow-200)] text-[var(--text-500)] hover:bg-[var(--blue-500)] hover:text-[var(--text-100)] transition"
                    >
                        Voir plus
                    </Link>
                </div>
            </div>

            {/* Topics grid */}
            {topics.length === 0 ? (
                <div className="rounded border border-[var(--bg-800)] bg-[var(--bg-700)] px-6 py-12 text-center text-sm uppercase tracking-[0.2em] text-[var(--text-500)]/50">
                    Aucun sujet pour le moment
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-9">
                    {topics.map((topic) => (
                        <Link key={topic.id} href={`/forum/topic/${topic.id}`} className="group block">
                            <div className="rounded-[4px] border overflow-hidden bg-[#272746] border-[#1F1F3E] hover:bg-[var(--bg-400)] hover:border-[var(--shadow-100)] transition shadow-[0_15px_15px_-15px_rgba(0,0,0,0.25)] md:h-[280px] md:min-h-[280px] md:max-h-[280px]">
                                {/* Image */}
                                <div className="relative h-[165px] w-full overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={topic.imagem ? mediaUrl(topic.imagem) : '/img/thumbnail.png'}
                                        alt=""
                                        className="w-full h-[165px] object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/20" />
                                    <div className="absolute left-[10px] bottom-[10px]">
                                        <span className="inline-block rounded-[4px] bg-[#141433]/80 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]" style={{ backdropFilter: 'blur(2.5px)' }}>
                                            Forum
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="px-4 py-3">
                                    <div className="text-sm font-bold text-[#BEBECE] group-hover:text-white line-clamp-1">
                                        {topic.titulo || `Sujet #${topic.id}`}
                                    </div>
                                    <div className="mt-1 flex items-center gap-3 text-xs text-[#BEBECE]/50">
                                        {topic.autor ? <span>Par {topic.autor}</span> : null}
                                        {topic.views ? <span>{topic.views} vues</span> : null}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}
