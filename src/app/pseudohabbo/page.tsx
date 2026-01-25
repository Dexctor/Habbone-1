export const revalidate = 3600

export default function PseudoHabboPage() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-md border border-[color:var(--bg-700)]/65 bg-[color:var(--bg-900)]/45 px-6 py-5 shadow-[0_24px_60px_-45px_rgba(0,0,0,0.85)]">
        <div className="flex items-center gap-3 text-[color:var(--foreground)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/info.png" alt="" className="h-10 w-10 image-pixelated" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
              Habbo
            </p>
            <h1 className="text-lg font-bold uppercase tracking-[0.08em] text-[color:var(--foreground)]">
              Changements de pseudo Habbo
            </h1>
          </div>
        </div>
      </header>

      <section className="rounded-md border border-[color:var(--bg-700)]/55 bg-[color:var(--bg-900)]/35 px-6 py-8 shadow-[0_24px_60px_-50px_rgba(0,0,0,0.9)]">
        <article className="space-y-5 text-sm leading-relaxed text-[color:var(--foreground)]/85">
          <h2 className="text-base font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground)]">
            Changements de pseudo Habbo
          </h2>

          <p>
            Depuis le jeudi 15 décembre 2022, avec la version 0.30.1 du Client Modern, il
            est devenu possible de changer votre pseudo Habbo. Pour cela, il vous suffit
            d&apos;ouvrir votre profil sur le Client Modern, puis de cliquer sur le bouton de
            modification à côté de votre pseudo.
          </p>

          <p>
            Cette page enregistre les 100 derniers changements de pseudos de tous les hôtels.
            Il peut y avoir un léger retard, mais dans la plupart des cas, le changement de
            nom sera détecté par nos soins dans un délai de 3 à 5 jours.
          </p>

          <p>
            Votre compte a-t-il été banni ? Dans ce cas, il ne sera plus mis à jour ou inclus
            dans ce système. Seuls les profils ouverts sont mis à jour.
          </p>
        </article>
      </section>
    </main>
  )
}

