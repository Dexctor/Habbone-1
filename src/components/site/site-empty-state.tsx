import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SiteEmptyStateProps = {
  children: ReactNode
  className?: string
}

export function SiteEmptyState({ children, className }: SiteEmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[4px] border border-dashed border-[#141433] bg-[#272746] px-6 py-14 text-center text-sm font-semibold uppercase tracking-[0.08em] text-[#BEBECE]/70",
        className,
      )}
    >
      {children}
    </div>
  )
}

