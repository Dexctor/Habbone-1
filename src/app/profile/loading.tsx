export default function ProfileLoading() {
  const pulse = "animate-pulse rounded-[4px] bg-white/5";
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-10 sm:px-6">
      {/* Header */}
      <div className={`flex h-[76px] items-center justify-between rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-5`}>
        <div className="flex items-center gap-3">
          <div className={`h-[41px] w-[41px] ${pulse}`} />
          <div className={`h-6 w-[140px] ${pulse}`} />
        </div>
        <div className={`hidden h-[50px] w-[255px] sm:block ${pulse}`} />
      </div>

      {/* Profile content */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[350px_minmax(0,818px)]">
        <aside className="space-y-4">
          <div className={`h-[220px] ${pulse}`} />
          <div className={`h-[280px] ${pulse}`} />
        </aside>
        <div className="space-y-6">
          <div className={`h-[200px] ${pulse}`} />
          <div className={`h-[200px] ${pulse}`} />
          <div className={`h-[250px] ${pulse}`} />
        </div>
      </div>
    </main>
  );
}
