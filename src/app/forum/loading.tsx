export default function ForumLoading() {
  const pulse = "animate-pulse rounded-[4px] bg-white/5";
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-10 sm:px-6">
      {/* Header */}
      <div className={`flex h-[76px] items-center justify-between rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-5`}>
        <div className="flex items-center gap-3">
          <div className={`h-[38px] w-[38px] ${pulse}`} />
          <div className={`h-6 w-[160px] ${pulse}`} />
        </div>
        <div className={`h-[40px] w-[160px] ${pulse}`} />
      </div>

      {/* Category sections */}
      {Array.from({ length: 3 }).map((_, s) => (
        <section key={s} className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
          <div className={`mb-4 h-5 w-[200px] ${pulse}`} />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[4px] border border-[#1F1F3E] bg-[#1F1F3E] p-3">
                <div className={`h-[60px] w-[60px] shrink-0 ${pulse}`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-4 w-[70%] ${pulse}`} />
                  <div className={`h-3 w-[40%] ${pulse}`} />
                </div>
                <div className={`h-4 w-[50px] ${pulse}`} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
