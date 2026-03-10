import React from "react"
import { cn } from "@/lib/utils"

export type AppShellProps = {
  topbar?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export default function AppShell({ topbar, footer, children, className }: AppShellProps) {
  return (
    <div className={cn("min-h-dvh bg-background text-foreground", className)}>
      {topbar}
      <main className="mx-auto w-full max-w-[1420px] py-6">{children}</main>
      {footer}
    </div>
  )
}
