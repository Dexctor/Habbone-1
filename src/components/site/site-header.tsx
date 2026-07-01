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
        "flex flex-col gap-4 rounded-[6px] border border-[#141433] bg-[#1F1F3E] shadow-[0_18px_45px_-32px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.04)] sm:flex-row sm:items-center sm:justify-between",
        compact ? "min-h-[58px] px-4 py-3" : "min-h-[76px] px-5 py-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt="" className="h-[42px] w-auto shrink-0 image-pixelated object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)]" />
        ) : icon ? (
          <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[6px] bg-[#303060]/65 text-[#DDD] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" aria-hidden>
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#BEBECE]/75">{eyebrow}</p>
          ) : null}
          <h1
            className={cn(
              "font-extrabold uppercase tracking-[0.04em] text-[#F0F0F0] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]",
              compact ? "text-[15px]" : "text-[18px]",
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

