"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AdminIconButtonTone = "blue" | "yellow" | "green" | "red" | "neutral";

const toneClasses: Record<AdminIconButtonTone, string> = {
  blue: "text-admin-text-tertiary hover:bg-admin-brand-blue/10 hover:text-admin-brand-blue focus-visible:ring-admin-brand-blue/40",
  yellow: "text-admin-text-tertiary hover:bg-admin-brand-yellow/10 hover:text-admin-brand-yellow focus-visible:ring-admin-brand-yellow/40",
  green: "text-admin-text-tertiary hover:bg-admin-brand-green/10 hover:text-admin-brand-green focus-visible:ring-admin-brand-green/40",
  red: "text-admin-text-tertiary hover:bg-admin-brand-red-strong/10 hover:text-admin-brand-red-strong focus-visible:ring-admin-brand-red-strong/40",
  neutral: "text-admin-text-tertiary hover:bg-white/5 hover:text-white focus-visible:ring-admin-brand-blue/40",
};

export interface AdminIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: AdminIconButtonTone;
}

export const AdminIconButton = forwardRef<HTMLButtonElement, AdminIconButtonProps>(
  ({ label, tone = "neutral", children, className, type = "button", title, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-[6px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

AdminIconButton.displayName = "AdminIconButton";
