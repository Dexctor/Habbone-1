import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminPanelTone = "default" | "muted" | "accent";

const toneClasses: Record<AdminPanelTone, string> = {
  default: "border-white/10 bg-admin-bg-800/75 shadow-[0_18px_50px_-38px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.05)]",
  muted: "border-white/10 bg-admin-bg-700",
  accent: "border-admin-brand-blue/30 bg-admin-brand-blue/[0.08]",
};

export interface AdminPanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AdminPanelTone;
  padded?: boolean;
}

export function AdminPanel({ tone = "default", padded = true, className, children, ...props }: AdminPanelProps) {
  return (
    <section
      className={cn("rounded-[8px] border", toneClasses[tone], padded && "p-5", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function AdminPanelHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h3 className="text-[15px] font-bold text-white">{title}</h3>
        {description && <p className="text-[12px] text-admin-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
