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
        "rounded-[6px] border border-dashed border-white/[0.12] bg-[#1F1F3E]/30 px-6 py-14 text-center text-sm font-semibold uppercase tracking-[0.08em] text-[#BEBECE]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        className,
      )}
    >
      {children}
    </div>
  )
}

