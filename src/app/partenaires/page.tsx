import Image from 'next/image'
import Link from 'next/link'
import { SiteHeader, SitePage, SitePanel } from '@/components/site'

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
    <SitePage width="lg" className="gap-8 lg:px-8">
      <SiteHeader title="Nos partenaires" eyebrow="Partenaires" imageSrc="/img/star.png" />

      <SitePanel className="px-6 py-10 text-center">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
          <div className="rounded-[6px] border border-white/10 bg-[#1F1F3E] p-4 shadow-[0_18px_55px_-45px_rgba(0,0,0,0.75)]">
            <Image
              src={PARTNER_INFO.banner}
              alt={PARTNER_INFO.name}
              width={280}
              height={120}
              className="mx-auto h-auto w-full max-w-xs object-contain"
              priority
            />
            <p className="mt-2 text-sm font-bold text-white">{PARTNER_INFO.name}</p>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-[#DDD]/90">
            <span className="font-semibold">{PARTNER_INFO.name}</span> {PARTNER_INFO.description}
          </p>
          <div className="text-sm font-semibold uppercase tracking-[0.06em] text-[#DDD]/90">
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
      </SitePanel>

      <SitePanel as="div" className="px-6 py-6 text-center text-sm text-[#BEBECE]/80">
        Souhaites-tu établir un partenariat avec HabbOne ? Pour ce faire, n&apos;hésite pas à nous joindre en utilisant notre formulaire de{' '}
        <Link href="/contact" className="font-semibold text-white hover:text-[#25B1FF]">
          Contact
        </Link>.
        Assure-toi d&apos;inclure le nom et le lien de ton site, accompagnés d&apos;une brève description et d&apos;une bannière le représentant.
      </SitePanel>
    </SitePage>
  )
}
