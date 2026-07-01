import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SitePanelProps = {
  children: ReactNode
  className?: string
  padded?: boolean
  as?: "section" | "div" | "article"
}

export function SitePanel({ children, className, padded = true, as: Comp = "section" }: SitePanelProps) {
  return (
    <Comp
      className={cn(
        "rounded-[6px] border border-[#141433] bg-[#272746] shadow-[0_18px_45px_-34px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.04)]",
        padded && "p-5",
        className,
      )}
    >
      {children}
    </Comp>
  )
}

