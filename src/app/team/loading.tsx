export default function TeamLoading() {
  const pulse = "animate-pulse rounded-[4px] bg-white/5";
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-3 px-4 py-10 sm:px-6">
      {/* Header */}
      <div className={`flex h-[76px] items-center rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-5`}>
        <div className="flex items-center gap-3">
          <div className={`h-[49px] w-[49px] ${pulse}`} />
          <div className={`h-6 w-[180px] ${pulse}`} />
        </div>
      </div>

      {/* Role sections */}
      {Array.from({ length: 3 }).map((_, s) => (
        <section key={s} className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] px-5 py-6">
          <div className={`mb-4 h-5 w-[140px] ${pulse}`} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:[grid-template-columns:repeat(2,minmax(0,278px))]">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-[8px] border-2 border-white/10 bg-black/10 px-3 pb-[10px] pt-3">
                <div className="flex items-start gap-2">
                  <div className={`h-[70px] w-[64px] shrink-0 ${pulse}`} />
                  <div className="flex-1 space-y-3">
                    <div className={`h-5 w-[120px] ${pulse}`} />
                    <div className={`h-4 w-[200px] ${pulse}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
