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
    <Comp className={cn("rounded-[4px] border border-[#1F1F3E] bg-[#272746]", padded && "p-5", className)}>
      {children}
    </Comp>
  )
}

