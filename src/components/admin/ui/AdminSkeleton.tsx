import { cn } from "@/lib/utils";

export function AdminSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[6px] bg-white/[0.06]", className)} />;
}

export function AdminPanelSkeleton() {
  return (
    <div className="space-y-4">
      <AdminSkeleton className="h-8 w-56" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <AdminSkeleton key={index} className="h-24" />
        ))}
      </div>
      <AdminSkeleton className="h-64" />
    </div>
  );
}
