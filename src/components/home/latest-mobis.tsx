'use client'

import { useEffect, useState } from 'react'

type Badge = {
    code: string
    name: string
    image: string
}

// HabboAssets API — more badges, filterable by hotel
const BADGE_API = 'https://www.habboassets.com/api/v1/badges?limit=200'

export default function LatestMobis() {
    const [badges, setBadges] = useState<Badge[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [gridCols, setGridCols] = useState(6)
    const [showRaresOnly, setShowRaresOnly] = useState(false)

    useEffect(() => {
        fetch(BADGE_API)
            .then((res) => res.json())
            .then((json) => {
                const items: Badge[] = (json?.badges || [])
                    .filter((b: any) => b.url_habbo && b.url_habbo.length > 0)
                    .map((b: any) => ({
                        code: b.code,
                        name: (b.name || b.code).trim(),
                        image: b.url_habbo,
                    }))
                setBadges(items)
            })
            .catch(() => setBadges([]))
            .finally(() => setLoading(false))
    }, [])

    const filtered = showRaresOnly ? badges.filter((b) => b.name.toLowerCase().includes('rare')) : badges
    const pageSize = gridCols * 6
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
    const clampedPage = Math.min(page, pageCount - 1)
    const visible = filtered.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize)

    return (
        <section className="w-full latest-mobis">
            {/* Compact container card */}
            <div className="inline-block rounded-[4px] border border-[#1F1F3E] bg-[#272746] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1F1F3E]">
                    <span className="font-bold text-xs text-[var(--text-100)] uppercase tracking-wide">
                        Derniers Badges/Mobis
                    </span>
                    <div className="flex items-center gap-1 ml-6">
                        <button
                            className={`w-[26px] h-[26px] rounded grid place-items-center transition ${gridCols === 6 ? 'bg-[var(--blue-500)] text-white' : 'bg-[#1F1F3E]/60 text-[#BEBECE] hover:bg-[var(--blue-500)] hover:text-white'}`}
                            title="Grille compacte"
                            onClick={() => { setGridCols(6); setPage(0) }}
                        >
                            <i className="material-icons" style={{ fontSize: '14px' }}>grid_view</i>
                        </button>
                        <button
                            className={`w-[26px] h-[26px] rounded grid place-items-center transition ${gridCols === 8 ? 'bg-[var(--blue-500)] text-white' : 'bg-[#1F1F3E]/60 text-[#BEBECE] hover:bg-[var(--blue-500)] hover:text-white'}`}
                            title="Grille large"
                            onClick={() => { setGridCols(8); setPage(0) }}
                        >
                            <i className="material-icons" style={{ fontSize: '14px' }}>apps</i>
                        </button>
                        <button
                            className={`w-[26px] h-[26px] rounded grid place-items-center transition ${showRaresOnly ? 'bg-[var(--blue-500)] text-white' : 'bg-[#1F1F3E]/60 text-[#BEBECE] hover:bg-[var(--blue-500)] hover:text-white'}`}
                            title={showRaresOnly ? 'Afficher tout' : 'Rares uniquement'}
                            onClick={() => { setShowRaresOnly((v) => !v); setPage(0) }}
                        >
                            <i className="material-icons" style={{ fontSize: '14px' }}>diamond</i>
                        </button>
                        <button
                            className="w-[26px] h-[26px] rounded grid place-items-center bg-[#1F1F3E]/60 text-[#BEBECE] hover:bg-[var(--blue-500)] hover:text-white transition disabled:opacity-40"
                            title="Précédent"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={clampedPage === 0}
                        >
                            <i className="material-icons" style={{ fontSize: '14px' }}>arrow_back</i>
                        </button>
                        <button
                            className="w-[26px] h-[26px] rounded grid place-items-center bg-[#1F1F3E]/60 text-[#BEBECE] hover:bg-[var(--blue-500)] hover:text-white transition disabled:opacity-40"
                            title="Suivant"
                            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                            disabled={clampedPage >= pageCount - 1}
                        >
                            <i className="material-icons" style={{ fontSize: '14px' }}>arrow_forward</i>
                        </button>
                    </div>
                </div>

                {/* Badge grid — snug 6×6 */}
                <div className="p-2.5">
                    {loading ? (
                        <div className="py-8 px-4 text-center text-xs uppercase tracking-[0.15em] text-[#BEBECE]/50">
                            Chargement…
                        </div>
                    ) : visible.length === 0 ? (
                        <div className="py-8 px-4  text-center text-xs uppercase tracking-[0.15em] text-[#BEBECE]/50">
                            Aucun badge
                        </div>
                    ) : (
                        <div className="grid gap-[5px]" style={{ gridTemplateColumns: `repeat(${gridCols}, 52px)` }}>
                            {visible.map((badge) => (
                                <div
                                    key={badge.code}
                                    className="w-[52px] h-[52px] rounded-[3px] border border-[#1F1F3E] bg-[#1F1F3E]/40 flex items-center justify-center hover:bg-[#303060] hover:border-white/10 transition cursor-pointer group"
                                    title={badge.name}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={badge.image}
                                        alt={badge.name}
                                        className="w-[28px] h-[28px] image-pixelated object-contain group-hover:scale-110 transition-transform"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
