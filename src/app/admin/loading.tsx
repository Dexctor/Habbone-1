export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[4px] bg-white/5" />
        ))}
      </div>
      <div className="h-60 animate-pulse rounded-[4px] bg-white/5" />
    </div>
  );
}
