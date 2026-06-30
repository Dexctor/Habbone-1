import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SitePageProps = {
  children: ReactNode
  className?: string
  width?: "sm" | "md" | "lg" | "xl"
}

const widths = {
  sm: "max-w-[600px]",
  md: "max-w-[800px]",
  lg: "max-w-[1100px]",
  xl: "max-w-[1200px]",
}

export function SitePage({ children, className, width = "xl" }: SitePageProps) {
  return (
    <main className={cn("mx-auto flex w-full flex-col gap-6 px-4 py-10 sm:px-6", widths[width], className)}>
      {children}
    </main>
  )
}

