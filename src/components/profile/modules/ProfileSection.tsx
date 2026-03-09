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
    <section className="rounded-[4px] border border-[#1F1F3E] bg-[#272746]">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-[16px] font-bold text-white">{title}</h2>
        {(onPrev || onNext) && (
          <div className="flex items-center gap-2">
            {onPrev && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-[40px] w-[40px] border border-transparent bg-[rgba(255,255,255,0.1)] text-[#DDD] hover:bg-[#2596FF]"
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
                className="h-[40px] w-[40px] border border-transparent bg-[rgba(255,255,255,0.1)] text-[#DDD] hover:bg-[#2596FF]"
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
      <div className="border-t border-[#1F1F3E] px-5 py-4">{children}</div>
    </section>
  );
}
