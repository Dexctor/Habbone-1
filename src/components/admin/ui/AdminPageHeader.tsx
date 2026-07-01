import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  description,
  meta,
  actions,
  className,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div>
        <h2 className="text-[20px] font-bold text-white">{title}</h2>
        {description && <p className="text-[13px] text-admin-text-tertiary">{description}</p>}
      </div>
      {(meta || actions) && (
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-admin-text-tertiary">
          {meta}
          {actions}
        </div>
      )}
    </div>
  );
}
