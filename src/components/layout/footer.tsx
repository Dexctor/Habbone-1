import Link from "next/link"

export default function Footer() {

  return (
    <footer className="footer w-full min-h-[49vh] bg-[var(--bg-900)] text-[var(--text-100)] mt-16">
      <div className="container max-w-[1200px] mx-auto px-6 py-12 sm:px-8">
        {/* Desktop / Tablet info bar */}
        <div className="info hidden md:flex items-center justify-between w-full min-h-[41vh] gap-10">
          {/* Réseaux sociaux */}
          <div className="group min-h-[150px]">
            <div className="title mb-[23px]">
              <label className="font-bold text-[var(--text-lg)] leading-[22px] flex items-center text-[var(--text-100)]">Réseaux sociaux</label>
            </div>
            <div className="menu social flex flex-col space-y-2">
              <a href="https://twitter.com/Habb_One" target="_blank" rel="noreferrer" className="font-bold text-[var(--text-sm)] leading-[17px] text-blue-300 text-left hover:text-[var(--text-100)] transition-all duration-200 ease-out hover:pl-2">Twitter</a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="font-bold text-[var(--text-sm)] leading-[17px] text-blue-700 text-left hover:text-[var(--text-100)] transition-all duration-200 ease-out hover:pl-2">Instagram</a>
              <a href="https://discord.gg/s4NpDcgcWe" target="_blank" rel="noreferrer" className="font-bold text-[var(--text-sm)] leading-[17px] text-red-300 text-left hover:text-[var(--text-100)] transition-all duration-200 ease-out hover:pl-2">Discord</a>
            </div>
          </div>
          {/* HabbOne */}
          <div className="group min-h-[150px]">
            <div className="title mb-[23px]">
              <label className="font-bold text-[var(--text-lg)] leading-[22px] flex items-center text-[var(--text-100)]">HabbOne</label>
            </div>
            <div className="menu flex flex-col space-y-2">
              <Link href="/team" className="font-bold text-[var(--text-sm)] leading-[17px] text-[var(--text-100)] text-left hover:text-blue-300 transition-all duration-200 ease-out hover:pl-2">Équipe</Link>
              <Link href="/boutique" className="font-bold text-[var(--text-sm)] leading-[17px] text-[var(--text-100)] text-left hover:text-blue-300 transition-all duration-200 ease-out hover:pl-2">Boutique</Link>
              <Link href="/news" className="font-bold text-[var(--text-sm)] leading-[17px] text-[var(--text-100)] text-left hover:text-blue-300 transition-all duration-200 ease-out hover:pl-2">Tous les articles</Link>
              <a href="/page/20/partenaires" target="_blank" rel="noreferrer" className="font-bold text-[var(--text-sm)] leading-[17px] text-[var(--text-100)] text-left hover:text-blue-300 transition-all duration-200 ease-out hover:pl-2">Partenaires</a>
              <a href="/page/23/contact" target="_blank" rel="noreferrer" className="font-bold text-[var(--text-sm)] leading-[17px] text-[var(--text-100)] text-left hover:text-blue-300 transition-all duration-200 ease-out hover:pl-2">Contact</a>
            </div>
          </div>
          {/* Habbo */}
          <div className="group min-h-[150px]">
            <div className="title mb-[23px]">
              <label className="font-bold text-[var(--text-lg)] leading-[22px] flex items-center text-[var(--text-100)]">Habbo</label>
            </div>
            <div className="menu flex flex-col space-y-2">
              <a href="https://www.habbo.fr/playing-habbo/habbo-way" target="_blank" rel="noreferrer" className="font-bold text-[var(--text-sm)] leading-[17px] text-[var(--text-100)] text-left hover:text-blue-300 transition-all duration-200 ease-out hover:pl-2">Habbo Attitude</a>
              <a href="https://help.habbo.fr/hc/fr" target="_blank" rel="noreferrer" className="font-bold text-[var(--text-sm)] leading-[17px] text-[var(--text-100)] text-left hover:text-blue-300 transition-all duration-200 ease-out hover:pl-2">Service Client</a>
              <a href="https://www.habbo.fr/shop" target="_blank" rel="noreferrer" className="font-bold text-[var(--text-sm)] leading-[17px] text-[var(--text-100)] text-left hover:text-blue-300 transition-all duration-200 ease-out hover:pl-2">Boutique</a>
            </div>
          </div>
          {/* EXTRAS */}
          <div className="group min-h-[150px]">
            <div className="title mb-[23px]">
              <label className="font-bold text-[var(--text-lg)] leading-[22px] flex items-center text-[var(--text-100)]">EXTRAS</label>
            </div>
            <div className="menu flex flex-col space-y-2">
              <Link href="/forum" className="font-bold text-[var(--text-sm)] leading-[17px] text-[var(--text-100)] text-left hover:text-blue-300 transition-all duration-200 ease-out hover:pl-2">Poster un sujet</Link>
              <Link href="/imager" prefetch={false} className="font-bold text-[var(--text-sm)] leading-[17px] text-[var(--text-100)] text-left hover:text-blue-300 transition-all duration-200 ease-out hover:pl-2">Habbo Imager</Link>
            </div>
          </div>
          {/* Développeurs */}
          <div className="group min-h-[150px]">
            <div className="title mb-[23px]">
              <label className="font-bold text-[var(--text-lg)] leading-[22px] flex items-center text-[var(--text-100)]">Développeurs</label>
            </div>
            <div className="menu flex flex-col space-y-2">
              <span className="font-bold text-[var(--text-sm)] leading-[17px] text-[var(--text-100)] text-left text-cyan-600"><a href="https://www.antoinedewas.com">Antoine Dewas</a></span>
            
            </div>
          </div>
          {/* Logo tile */}
          <div className="logo w-[151px] h-[100px] bg-[var(--shadow-100)] rounded grid place-items-center">
            <a href="https://habbo.fr" target="_blank" rel="noreferrer" className="opacity-90 hover:opacity-100 transition-transform duration-200 ease-out hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/logofs.png" alt="Habbo" className="h-8 w-auto" />
            </a>
          </div>
        </div>
        {/* Mobile: contenu centré sans menus déroulants */}
        <div className="footer-responsivo md:hidden flex flex-col items-center justify-center text-center space-y-10 min-h-[49vh] w-full my-[10px] px-6 py-6">
          {/* Contact */}
          <section className="w-full">
            <div className="font-bold uppercase tracking-wide text-[var(--text-500)] mb-4">Réseaux sociaux</div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="https://twitter.com/Habb_One" target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 font-bold text-[var(--text-sm)] text-blue-300 hover:bg-[var(--blue-500)] hover:text-white transition-all">Twitter</a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 font-bold text-[var(--text-sm)] text-blue-700 hover:bg-[var(--blue-500)] hover:text-white transition-all">Instagram</a>
              <a href="https://discord.gg/s4NpDcgcWe" target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 font-bold text-[var(--text-sm)] text-red-300 hover:bg-[var(--blue-500)] hover:text-white transition-all">Discord</a>
            </div>
          </section>

          {/* HabbOne */}
          <section className="w-full">
            <div className="font-bold uppercase tracking-wide text-[var(--text-500)] mb-4">HabbOne</div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/team" className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 hover:bg-[var(--blue-500)] hover:text-white transition-all">Équipe</Link>
              <Link href="/boutique" className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 hover:bg-[var(--blue-500)] hover:text-white transition-all">Boutique</Link>
              <Link href="/news" className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 hover:bg-[var(--blue-500)] hover:text-white transition-all">Tous les articles</Link>
              <a href="/page/20/partenaires" target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 hover:bg-[var(--blue-500)] hover:text-white transition-all">Partenaires</a>
              <a href="/page/23/contact" target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 hover:bg-[var(--blue-500)] hover:text-white transition-all">Contact</a>
            </div>
          </section>

          {/* Habbo */}
          <section className="w-full">
            <div className="font-bold uppercase tracking-wide text-[var(--text-500)] mb-4">Habbo</div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="https://www.habbo.fr/playing-habbo/habbo-way" target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 hover:bg-[var(--blue-500)] hover:text-white transition-all">Habbo Attitude</a>
              <a href="https://help.habbo.fr/hc/fr" target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 hover:bg-[var(--blue-500)] hover:text-white transition-all">Service Client</a>
              <a href="https://www.habbo.fr/shop" target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 hover:bg-[var(--blue-500)] hover:text-white transition-all">Boutique</a>
            </div>
          </section>

          {/* Extras */}
          <section className="w-full">
            <div className="font-bold uppercase tracking-wide text-[var(--text-500)] mb-4">EXTRAS</div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/forum" className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 hover:bg-[var(--blue-500)] hover:text-white transition-all">Poster un sujet</Link>
              <Link href="/imager" prefetch={false} className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 hover:bg-[var(--blue-500)] hover:text-white transition-all">Habbo Imager</Link>
              <Link href="/pseudohabbo" prefetch={false} className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 hover:bg-[var(--blue-500)] hover:text-white transition-all">Rechercher utilisateurs</Link>
              <Link href="/mobis" prefetch={false} className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 hover:bg-[var(--blue-500)] hover:text-white transition-all">Rechercher Meubles</Link>
            </div>
          </section>

          {/* Développeurs */}
          <section className="w-full">
            <div className="font-bold uppercase tracking-wide text-[var(--text-500)] mb-4">Développeurs</div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <span className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5"><a href="https://www.antoinedewas.com" target="_blank" rel="noreferrer" className="text-cyan-600 hover:text-cyan-400">Antoine Dewas</a></span>
            </div>
          </section>

        

          {/* Logo mobile */}
          <div className="mt-2 flex justify-center">
            <a href="https://habbo.fr" target="_blank" rel="noreferrer" className="opacity-90 hover:opacity-100 transition-transform duration-200 ease-out hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/logofs.png" alt="Habbo" className="h-10 w-auto" />
            </a>
          </div>
        </div>
      </div>
      {/* Back to top */}
      <div className="back-top w-full min-h-[8vh] bg-[var(--bg-800)] grid place-items-center">
        <a href="#top" className="font-bold text-[var(--text-sm)] leading-[17px] uppercase text-[var(--text-100)] hover:text-[var(--blue-500)] transition-transform duration-200 ease-out hover:-translate-y-0.5">REMONTER</a>
      </div>
    </footer>
  )
}


