import Link from "next/link";
import type { ReactNode } from "react";

export type ContentCardProps = {
  title: string;
  href: string;
  image: ReactNode;
  preview?: string;
  meta?: ReactNode;
  ctaLabel?: string;
};

export default function ContentCard({
  title,
  href,
  image,
  preview,
  meta,
  ctaLabel = "Voir plus",
}: ContentCardProps) {
  return (
    <article className="rounded-[2px] border border-[color:var(--bg-700)]/45 bg-[color:var(--bg-900)]/50 px-4 py-5 shadow-[0_18px_55px_-58px_rgba(0,0,0,0.82)] sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5 sm:max-w-[70%]">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden border border-[color:var(--bg-700)]/45 bg-[color:var(--bg-800)]/55 p-2">
          {image}
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href={href}
            className="block text-sm font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground)] hover:text-[color:var(--foreground)]/80"
          >
            {title}
          </Link>
          {preview ? (
            <p className="text-sm leading-relaxed text-[color:var(--foreground)]/65">{preview}</p>
          ) : null}
          {meta ? (
            <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.07em] text-[color:var(--foreground)]/55">
              {meta}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex w-full justify-end gap-3 text-[0.7rem] font-semibold uppercase text-[color:var(--foreground)]/70 sm:mt-0 sm:w-auto sm:self-center">
        <Link
          href={href}
          className="mr-10 rounded-[2px] bg-[#4c7dff] px-[1.35rem] py-[0.45rem] text-white transition hover:bg-[#6a95ff]"
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}
