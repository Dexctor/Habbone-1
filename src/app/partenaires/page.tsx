import Image from 'next/image'
import Link from 'next/link'

const PARTNER_INFO = {
  name: 'Cours Wired France',
  description:
    "Cours Wired France est un serveur Discord où vous trouverez des tutoriels d'utilisation des WIRED, que ce soit sous forme écrite ou en vidéos, afin que la communauté puisse en tirer le meilleur parti. Création du CWF par Kompote.",
  discordInvite: 'discord.gg/zCFvdHsAry',
  discordUrl: 'https://discord.gg/zCFvdHsAry',
  banner: '/img/partenaire.png',
}

export default function PartnersPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-md border border-[color:var(--bg-700)]/65 bg-[color:var(--bg-900)]/45 px-6 py-5 shadow-[0_24px_60px_-45px_rgba(0,0,0,0.85)]">
        <div className="flex items-center gap-3 text-[color:var(--foreground)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/star.png"
            alt=""
            className="h-10 w-10 image-pixelated"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
              partenaires
            </p>
            <h1 className="text-lg font-bold uppercase tracking-[0.08em] text-[color:var(--foreground)]">
              Nos partenaires
            </h1>
          </div>
        </div>
      </header>

      <section className="rounded-md border border-[color:var(--bg-700)]/55 bg-[color:var(--bg-900)]/35 px-6 py-10 text-center shadow-[0_24px_60px_-50px_rgba(0,0,0,0.9)]">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
          <div className="rounded-md border border-[color:var(--bg-700)]/55 bg-[color:var(--bg-800)]/65 p-4 shadow-[0_18px_55px_-45px_rgba(0,0,0,0.75)]">
            <Image
              src={PARTNER_INFO.banner}
              alt={PARTNER_INFO.name}
              width={280}
              height={120}
              className="mx-auto h-auto w-full max-w-xs object-contain"
              priority
            />
            <p className="mt-2 text-sm font-bold text-[color:var(--foreground)]">{PARTNER_INFO.name}</p>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-[color:var(--foreground)]/85">
            <span className="font-semibold">{PARTNER_INFO.name}</span> {PARTNER_INFO.description}
          </p>
          <div className="text-sm font-semibold uppercase tracking-[0.06em] text-[color:var(--foreground)]/90">
            Serveur Discord :{' '}
            <Link
              href={PARTNER_INFO.discordUrl}
              className="text-sky-400 hover:text-sky-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              {PARTNER_INFO.discordInvite}
            </Link>
          </div>
        </div>
      </section>

      <footer className="rounded-md border border-[color:var(--bg-700)]/45 bg-[color:var(--bg-900)]/25 px-6 py-6 text-center text-sm text-[color:var(--foreground)]/70 shadow-[0_24px_60px_-60px_rgba(0,0,0,0.85)]">
        Souhaites-tu établir un partenariat avec HabbOne ? Pour ce faire, n&apos;hésite pas à nous joindre en utilisant notre formulaire de{' '}
        <Link href="/page/23/contact" className="font-semibold text-[color:var(--foreground)] hover:text-sky-300">
          Contact
        </Link>.
        Assure-toi d&apos;inclure le nom et le lien de ton site, accompagnés d&apos;une brève description et d&apos;une bannière le représentant.
      </footer>
    </main>
  )
}
