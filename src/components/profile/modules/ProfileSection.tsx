"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ProfileSection({
  title,
  onPrev,
  onNext,
  children,
}: {
  title: string;
  onPrev?: () => void;
  onNext?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[6px] border border-[#141433] bg-[#272746] shadow-[0_18px_45px_-34px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-[17px] font-extrabold text-white">{title}</h2>
        {(onPrev || onNext) && (
          <div className="flex items-center gap-2">
            {onPrev && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-[40px] w-[40px] rounded-[6px] border border-white/5 bg-[#303060]/70 text-[#DDD] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-[#2596FF]/45 hover:bg-[#2596FF] hover:text-white"
                title="Precedent"
                aria-label="Precedent"
                onClick={onPrev}
              >
                <ChevronLeft className="size-5" />
              </Button>
            )}
            {onNext && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-[40px] w-[40px] rounded-[6px] border border-white/5 bg-[#303060]/70 text-[#DDD] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-[#2596FF]/45 hover:bg-[#2596FF] hover:text-white"
                title="Suivant"
                aria-label="Suivant"
                onClick={onNext}
              >
                <ChevronRight className="size-5" />
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-[#141433] bg-[#1F1F3E]/20 px-5 py-4">{children}</div>
    </section>
  );
}
