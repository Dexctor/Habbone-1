import ImagerClient from '@/components/imager/ImagerClient'

export const revalidate = 3600

export default function ImagerPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-md border border-[color:var(--bg-700)]/65 bg-[color:var(--bg-900)]/45 px-6 py-5 shadow-[0_24px_60px_-45px_rgba(0,0,0,0.85)]">
        <div className="flex items-center gap-3 text-[color:var(--foreground)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/photo.png" alt="" className="h-10 w-10 image-pixelated" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
              Extras
            </p>
            <h1 className="text-lg font-bold uppercase tracking-[0.08em] text-[color:var(--foreground)]">
              Generateur d avatar Habbo
            </h1>
          </div>
        </div>
      </header>

      <ImagerClient />
    </main>
  )
}

