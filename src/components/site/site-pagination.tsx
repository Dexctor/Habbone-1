"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

type SitePaginationProps = {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  label: string
  className?: string
}

export function SitePagination({ page, pageCount, onPageChange, label, className }: SitePaginationProps) {
  if (pageCount <= 1) return null

  return (
    <nav className={cn("flex items-center justify-center gap-4 py-3", className)} aria-label={label}>
      <button
        type="button"
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="grid h-[36px] w-[36px] place-items-center rounded-[6px] border border-white/10 bg-[#303060]/70 text-[#DDD] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-[#2596FF]/45 hover:bg-[#2596FF] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Page précédente"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        {Array.from({ length: pageCount }, (_, index) => {
          const isActive = index === page
          return (
            <button
              key={index}
              type="button"
              onClick={() => onPageChange(index)}
              className={cn(
                "grid h-[32px] min-w-[32px] place-items-center rounded-[5px] px-2 text-[13px] font-bold leading-none transition",
                isActive ? "bg-[#2596FF] text-white shadow-[0_10px_20px_-15px_rgba(37,150,255,0.9)]" : "text-[#DDD] hover:bg-white/[0.08] hover:text-white",
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={`Page ${index + 1}`}
            >
              {index + 1}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
        disabled={page >= pageCount - 1}
        className="grid h-[36px] w-[36px] place-items-center rounded-[6px] border border-white/10 bg-[#303060]/70 text-[#DDD] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-[#2596FF]/45 hover:bg-[#2596FF] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Page suivante"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </nav>
  )
}

