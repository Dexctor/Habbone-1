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
        className="grid h-[30px] w-[30px] place-items-center rounded-[4px] bg-white/5 text-[#DDD] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
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
              className={cn("px-1 text-[14px] font-normal leading-none transition", isActive ? "text-white underline" : "text-[#DDD] hover:text-white")}
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
        className="grid h-[30px] w-[30px] place-items-center rounded-[4px] bg-white/5 text-[#DDD] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Page suivante"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </nav>
  )
}

