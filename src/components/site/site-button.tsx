import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

type SiteButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost"
  size?: "sm" | "md" | "icon-sm" | "icon-md"
}

const variants = {
  primary: "bg-[#2596FF] text-white hover:bg-[#2976E8]",
  secondary: "border border-[#34345A] bg-[#1F1F3E] text-[#BEBECE] hover:bg-[#25254D] hover:text-[#DDD]",
  danger: "border border-[#F92330]/30 bg-[#F92330]/10 text-[#FF4B6C] hover:bg-[#F92330]/20",
  success: "bg-[#0FD52F] text-white hover:bg-green-600",
  ghost: "bg-white/10 text-[#DDD] hover:bg-white/15",
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

