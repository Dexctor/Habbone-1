export default function NewsLoading() {
  const pulse = "animate-pulse rounded-[4px] bg-white/5";
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-10 sm:px-6">
      {/* Header */}
      <div className={`flex h-[50px] items-center justify-between rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-4`}>
        <div className="flex items-center gap-3">
          <div className={`h-[27px] w-[27px] ${pulse}`} />
          <div className={`h-5 w-[160px] ${pulse}`} />
        </div>
        <div className="flex gap-2">
          <div className={`h-[40px] w-[140px] ${pulse}`} />
          <div className={`h-[40px] w-[200px] ${pulse}`} />
        </div>
      </div>

      {/* Articles grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className={`h-[280px] ${pulse}`} />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`h-[36px] w-[36px] ${pulse}`} />
        ))}
      </div>
    </main>
  );
}
