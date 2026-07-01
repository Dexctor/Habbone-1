import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminEmptyState({
  icon,
  title,
  description,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed border-white/10 bg-admin-bg-900/30 px-6 py-10 text-center",
        className,
      )}
    >
      {icon && <div className="grid h-12 w-12 place-items-center rounded-full bg-white/[0.04] text-admin-text-tertiary/70">{icon}</div>}
      <div>
        <p className="text-[13px] font-semibold text-white">{title}</p>
        {description && <p className="mt-1 max-w-[340px] text-[12px] text-admin-text-tertiary">{description}</p>}
      </div>
    </div>
  );
}
