export default function TopicLoading() {
  const pulse = "animate-pulse rounded-[4px] bg-white/5";
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className={`h-4 w-[60px] ${pulse}`} />
        <div className={`h-4 w-[120px] ${pulse}`} />
      </div>

      {/* Topic card */}
      <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746]">
        {/* Title */}
        <div className="border-b border-[#141433] px-5 py-4">
          <div className={`h-6 w-[60%] ${pulse}`} />
        </div>

        {/* Content */}
        <div className="space-y-4 p-5">
          <div className={`h-[138px] w-full max-w-[563px] mx-auto ${pulse}`} />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`h-4 ${pulse}`} style={{ width: `${80 + Math.random() * 20}%` }} />
            ))}
          </div>
        </div>

        {/* Author + votes */}
        <div className="border-t border-[#141433] px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-[62px] w-[54px] ${pulse}`} />
              <div className={`h-5 w-[120px] ${pulse}`} />
            </div>
            <div className="flex gap-2">
              <div className={`h-[38px] w-[70px] ${pulse}`} />
              <div className={`h-[38px] w-[70px] ${pulse}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className={`h-5 w-[150px] ${pulse}`} />
          <div className={`h-[36px] w-[120px] ${pulse}`} />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={`h-[58px] w-[58px] shrink-0 rounded-full ${pulse}`} />
            <div className={`h-[90px] flex-1 ${pulse}`} />
          </div>
        ))}
      </div>
    </main>
  );
}
