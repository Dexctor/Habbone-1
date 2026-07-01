import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

type SiteButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost"
  size?: "sm" | "md" | "icon-sm" | "icon-md"
}

const variants = {
  primary: "border border-[#2596FF]/70 bg-[#2596FF] text-white shadow-[0_12px_24px_-18px_rgba(37,150,255,0.9)] hover:bg-[#2976E8]",
  secondary: "border border-white/10 bg-[#303060]/70 text-[#DDD] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#2596FF]/45 hover:bg-[#25254D] hover:text-white",
  danger: "border border-[#F92330]/35 bg-[#F92330]/10 text-[#FF4B6C] hover:bg-[#F92330]/20",
  success: "border border-[#0FD52F]/50 bg-[#0FD52F] text-white hover:bg-green-600",
  ghost: "border border-white/10 bg-white/[0.08] text-[#DDD] hover:border-white/20 hover:bg-white/[0.12]",
}

const sizes = {
  sm: "h-[38px] px-4 text-[11px]",
  md: "h-[45px] px-6 text-[12px]",
  "icon-sm": "h-[30px] w-[30px] p-0",
  "icon-md": "h-[40px] w-[40px] p-0",
}

export const SiteButton = React.forwardRef<HTMLButtonElement, SiteButtonProps>(
  ({ asChild = false, className, variant = "primary", size = "md", ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-[4px] font-bold uppercase tracking-[0.04em] transition disabled:cursor-not-allowed disabled:opacity-50",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    )
  },
)
SiteButton.displayName = "SiteButton"

