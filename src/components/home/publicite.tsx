'use client'

import Link from 'next/link'
import Image from 'next/image'

const PARTNER = {
    name: 'Cours Wired France',
    banner: '/img/partenaire.png',
    discordUrl: 'https://discord.gg/zCFvdHsAry',
}

export default function Publicite() {
    return (
        <section className="w-full publicite">
            {/* Title bar */}
            <div className="bar-default flex flex-col items-start md:flex-row md:items-center justify-between w-full min-h-[50px] mb-[35px]">
                <div className="title flex items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/img/news.png" alt="pub" className="mr-[12px] image-pixelated w-[28px] h-[28px]" />
                    <label className="font-bold text-[var(--text-lg)] leading-[22px] text-[var(--text-100)] uppercase [text-shadow:0_1px_2px_var(--text-shadow)]">
                        Publicité
                    </label>
                </div>
                <div className="extra flex items-center gap-2 mt-3 md:mt-0">
                    <Link
                        href="/partenaires"
                        className="rounded px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[var(--shadow-200)] text-[var(--text-500)] hover:bg-[var(--blue-500)] hover:text-[var(--text-100)] transition"
                    >
                        Devenir partenaire
                    </Link>
                </div>
            </div>

            {/* Partner banner */}
            <div className="rounded border border-black/40 bg-[#1F1F3E] p-6 flex flex-col md:flex-row items-center gap-6 shadow-[0_15px_15px_-15px_rgba(0,0,0,0.25)]">
                <Link href={PARTNER.discordUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                    <div className="rounded border border-[var(--bg-800)] bg-[var(--bg-800)]/65 p-3 hover:opacity-90 transition">
                        <Image
                            src={PARTNER.banner}
                            alt={PARTNER.name}
                            width={220}
                            height={100}
                            className="h-auto w-[220px] object-contain"
                        />
                    </div>
                </Link>
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-sm font-bold text-[var(--text-100)] uppercase mb-2">{PARTNER.name}</h3>
                    <p className="text-xs text-[var(--text-500)]/70 leading-relaxed">
                        Serveur Discord partenaire officiel de HabbOne.
                    </p>
                    <Link
                        href={PARTNER.discordUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-3 rounded px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#5865F2] text-white hover:bg-[#4752C4] transition"
                    >
                        Rejoindre sur Discord
                    </Link>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-4 rounded border border-black/30 bg-[#1F1F3E]/70 px-5 py-4 text-center">
                <p className="text-xs text-[var(--text-500)]/60 leading-relaxed">
                    Nous sommes un fan-site officiel de Habbo Hotel. Nous ne sommes ni affiliés ni approuvés par Sulake Corporation Oy.
                    Habbo est une marque déposée de Sulake Corporation.
                </p>
            </div>
        </section>
    )
}
