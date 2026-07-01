"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function AdminField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-admin-text-tertiary">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[10px] text-admin-brand-red">{error}</p>
      ) : hint ? (
        <p className="text-[10px] text-admin-text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}

export const adminControlClassName =
  "w-full rounded-[6px] border border-white/10 bg-admin-bg-800 px-3 py-2.5 text-[13px] text-white placeholder:text-admin-text-muted transition-colors focus:border-admin-brand-blue/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-admin-brand-blue/35 disabled:cursor-not-allowed disabled:opacity-50";

export const AdminInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(adminControlClassName, "h-[42px]", className)} {...props} />
  ),
);
AdminInput.displayName = "AdminInput";

export const AdminTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(adminControlClassName, "resize-none", className)} {...props} />
  ),
);
AdminTextarea.displayName = "AdminTextarea";

export const AdminSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(adminControlClassName, "h-[42px]", className)} {...props}>
      {children}
    </select>
  ),
);
AdminSelect.displayName = "AdminSelect";
