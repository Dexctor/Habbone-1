"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminButtonTone = "primary" | "secondary" | "success" | "warning" | "danger" | "ghost";
type AdminButtonSize = "sm" | "md";

const toneClasses: Record<AdminButtonTone, string> = {
  primary: "border-transparent bg-admin-brand-blue text-white shadow-[0_10px_24px_-14px_rgba(66,165,255,0.9)] hover:bg-admin-brand-blue-hover",
  secondary: "border-white/10 bg-admin-bg-600 text-white hover:bg-admin-bg-500",
  success: "border-transparent bg-admin-brand-green text-white hover:bg-[#16B354]",
  warning: "border-transparent bg-admin-brand-yellow text-black hover:bg-[#E6B400]",
  danger: "border-transparent bg-admin-brand-red-strong text-white hover:bg-[#E11036]",
  ghost: "border-white/10 bg-admin-bg-700/70 text-admin-text-tertiary hover:bg-admin-bg-600 hover:text-white",
};

const sizeClasses: Record<AdminButtonSize, string> = {
  sm: "h-8 px-3 text-[12px]",
  md: "h-9 px-4 text-[13px]",
};

export interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: AdminButtonTone;
  size?: AdminButtonSize;
  icon?: ReactNode;
}

export const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(
  ({ tone = "secondary", size = "md", icon, children, className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[6px] border font-bold transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-admin-brand-blue/45",
        "disabled:cursor-not-allowed disabled:opacity-50",
        toneClasses[tone],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  ),
);

AdminButton.displayName = "AdminButton";
