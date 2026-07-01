import type { InputHTMLAttributes } from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"

type SiteSearchProps = InputHTMLAttributes<HTMLInputElement> & {
  wrapperClassName?: string
  height?: "sm" | "md"
}

export function SiteSearch({ className, wrapperClassName, height = "md", ...props }: SiteSearchProps) {
  return (
    <div className={cn("relative w-full sm:w-[255px]", wrapperClassName)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#BEBECE]/70" />
      <input
        type="search"
        className={cn(
          "w-full rounded-[6px] border border-[#141433] bg-[#303060]/70 pl-9 pr-3 font-normal text-[#DDD] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-[#BEBECE]/55 transition focus-visible:border-[#2596FF] focus-visible:bg-[#25254D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2596FF]/25",
          height === "md" ? "h-[50px] text-[13px]" : "h-[40px] text-[12px]",
          className,
        )}
        {...props}
      />
    </div>
  )
}

