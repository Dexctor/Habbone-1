import type { HTMLAttributes, TableHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function AdminTableShell({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("overflow-x-auto rounded-[10px] border border-white/10 bg-admin-bg-800/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]", className)} {...props}>
      {children}
    </div>
  );
}

export function AdminTable({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full text-left", className)} {...props} />;
}

export const adminThClassName = "px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-admin-text-tertiary";
export const adminTdClassName = "px-4 py-3";
export const adminTrClassName = "border-b border-white/[0.06] transition-colors hover:bg-white/[0.045]";
