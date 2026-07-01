import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

type SiteFieldProps = {
  label: string
  children: React.ReactNode
  hint?: React.ReactNode
  required?: boolean
  className?: string
}

export function SiteField({ label, children, hint, required, className }: SiteFieldProps) {
  return (
    <label className={cn("block space-y-2 text-sm font-semibold text-[#DDD]", className)}>
      <span>
        {label}
        {required ? <span className="ml-1 text-[#BEBECE]/70">*</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-[11px] font-normal text-[#BEBECE]/55">{hint}</span> : null}
    </label>
  )
}

export const siteInputClassName =
  "h-[45px] w-full rounded-[6px] border border-[#141433] bg-[#303060]/70 px-4 text-[14px] text-[#DDD] placeholder:text-[#BEBECE]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus:border-[#2596FF] focus:bg-[#25254D] focus:outline-none focus:ring-2 focus:ring-[#2596FF]/25 disabled:cursor-not-allowed disabled:opacity-50"

export const SiteInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(siteInputClassName, className)} {...props} />
  ),
)
SiteInput.displayName = "SiteInput"

export const SiteTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        siteInputClassName,
        "min-h-[150px] resize-y py-3 leading-relaxed",
        className,
      )}
      {...props}
    />
  ),
)
SiteTextarea.displayName = "SiteTextarea"

export const SiteSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <span className="relative block">
      <select
        ref={ref}
        className={cn(siteInputClassName, "cursor-pointer appearance-none pr-10 font-bold", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#BEBECE]/75" />
    </span>
  ),
)
SiteSelect.displayName = "SiteSelect"
