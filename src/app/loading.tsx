export default function HomeLoading() {
  const pulse = "animate-pulse rounded-[4px] bg-white/5";
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-[70px] px-4 py-10 sm:px-6">
      {/* Stories */}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`h-[80px] w-[80px] shrink-0 rounded-full ${pulse}`} />
        ))}
      </div>

      {/* Latest Articles */}
      <section>
        <div className="mb-[30px] flex items-center justify-between">
          <div className={`h-6 w-[220px] ${pulse}`} />
          <div className="flex gap-2">
            <div className={`h-[50px] w-[255px] ${pulse}`} />
            <div className={`h-[50px] w-[50px] ${pulse}`} />
            <div className={`h-[50px] w-[50px] ${pulse}`} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-[30px] md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`h-[237px] ${pulse}`} />
          ))}
        </div>
      </section>

      {/* Forum Topics */}
      <section className="relative py-16">
        <div className="mb-12 flex items-center justify-between">
          <div className={`h-6 w-[180px] ${pulse}`} />
          <div className={`h-[50px] w-[100px] ${pulse}`} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-[122px] ${pulse}`} />
          ))}
        </div>
      </section>

      {/* Badges + Pub */}
      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className={`h-[500px] ${pulse}`} />
        <div className={`h-[350px] ${pulse}`} />
      </section>

      {/* Ranking */}
      <section>
        <div className="mb-8 flex items-center justify-between">
          <div className={`h-6 w-[170px] ${pulse}`} />
          <div className="flex gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`h-[36px] w-[110px] ${pulse}`} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
          <div className={`h-[320px] ${pulse}`} />
          <div className={`h-[320px] ${pulse}`} />
        </div>
      </section>
    </main>
  );
}
