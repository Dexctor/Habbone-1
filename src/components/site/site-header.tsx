import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SiteHeaderProps = {
  title: string
  description?: ReactNode
  eyebrow?: string
  icon?: ReactNode
  imageSrc?: string
  actions?: ReactNode
  meta?: ReactNode
  className?: string
  compact?: boolean
}

export function SiteHeader({
  title,
  description,
  eyebrow,
  icon,
  imageSrc,
  actions,
  meta,
  className,
  compact = false,
}: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 rounded-[4px] border bg-[#1F1F3E] shadow-[0_0_0_1px_rgba(255,255,255,0.05)] sm:flex-row sm:items-center sm:justify-between",
        compact ? "border-[#141433] px-4 py-3" : "border-black/60 px-5 py-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt="" className="h-[38px] w-auto shrink-0 image-pixelated object-contain" />
        ) : icon ? (
          <span className="grid h-[38px] w-[38px] shrink-0 place-items-center text-[#DDD]" aria-hidden>
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#BEBECE]">{eyebrow}</p>
          ) : null}
          <h1
            className={cn(
              "font-bold uppercase tracking-[0.04em] text-[#DDD] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]",
              compact ? "text-[14px]" : "text-[18px]",
            )}
          >
            {title}
          </h1>
          {description ? <div className="mt-1 text-[13px] leading-relaxed text-[#BEBECE]/75">{description}</div> : null}
          {meta ? <div className="mt-1">{meta}</div> : null}
        </div>
      </div>
      {actions ? <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">{actions}</div> : null}
    </header>
  )
}

