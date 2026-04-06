export default function NewsArticleLoading() {
  const pulse = "animate-pulse rounded-[4px] bg-white/5";
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-10 sm:px-6">
      {/* Article card */}
      <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746]">
        {/* Banner image */}
        <div className={`h-[300px] w-full ${pulse}`} />

        {/* Content */}
        <div className="space-y-4 p-6">
          <div className={`h-7 w-[60%] ${pulse}`} />
          <div className={`h-4 w-[40%] ${pulse}`} />
          <div className="space-y-2 pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`h-4 w-full ${pulse}`} style={{ width: `${85 + Math.random() * 15}%` }} />
            ))}
          </div>
        </div>

        {/* Author footer */}
        <div className="border-t border-[#141433] px-6 py-4">
          <div className="flex items-center gap-4">
            <div className={`h-[50px] w-[50px] ${pulse}`} />
            <div className={`h-5 w-[120px] ${pulse}`} />
            <div className={`h-4 w-[100px] ${pulse}`} />
          </div>
        </div>
      </div>

      {/* Comments section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className={`h-5 w-[150px] ${pulse}`} />
          <div className={`h-[36px] w-[120px] ${pulse}`} />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={`h-[58px] w-[58px] shrink-0 rounded-full ${pulse}`} />
            <div className={`h-[100px] flex-1 ${pulse}`} />
          </div>
        ))}
      </div>
    </main>
  );
}
