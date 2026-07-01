import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function SiteSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[6px] bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        className,
      )}
    />
  )
}

export function SiteSkeletonHeader({ actions = false }: { actions?: boolean }) {
  return (
    <div className="flex min-h-[76px] items-center justify-between gap-4 rounded-[6px] border border-[#141433] bg-[#1F1F3E] px-5 shadow-[0_18px_45px_-32px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-3">
        <SiteSkeleton className="h-[42px] w-[42px]" />
        <SiteSkeleton className="h-5 w-[170px]" />
      </div>
      {actions ? <SiteSkeleton className="hidden h-[45px] w-[255px] sm:block" /> : null}
    </div>
  )
}

export function SiteSkeletonPanel({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[6px] border border-[#141433] bg-[#272746] p-5 shadow-[0_18px_45px_-34px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  )
}
