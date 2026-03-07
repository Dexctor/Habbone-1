import Link from "next/link";
import type { ReactNode } from "react";
import TagPill from "./tag-pill";

export type ContentCardProps = {
  title: string;
  href: string;
  image: ReactNode;
  preview?: string;
  meta?: ReactNode;
  ctaLabel?: string;
  tags?: Array<{ label: string; tone: "novidade" | "habbone" | "raros" | "default" }>;
};

export default function ContentCard({
  title,
  href,
  image,
  preview,
  meta,
  ctaLabel = "Lire plus",
  tags,
}: ContentCardProps) {
  return (
    <article className="rounded border border-black/60 bg-[#1F1F3E] px-4 py-4 shadow-[0_18px_55px_-58px_rgba(0,0,0,0.82)] sm:flex sm:items-center sm:gap-5">
      {/* Image — larger to match Figma (~120px) */}
      <div className="relative h-[100px] w-[120px] flex-shrink-0 overflow-hidden rounded bg-[color:var(--bg-800)]/55">
        {image}
      </div>

      {/* Content */}
      <div className="mt-3 flex flex-1 flex-col gap-2 sm:mt-0">
        <Link
          href={href}
          className="block text-sm font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground)] hover:text-[color:var(--foreground)]/80"
        >
          {title}
        </Link>
        {preview ? (
          <p className="text-sm leading-relaxed text-[color:var(--foreground)]/65 line-clamp-2">{preview}</p>
        ) : null}
        {meta ? (
          <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.07em] text-[color:var(--foreground)]/55">
            {meta}
          </div>
        ) : null}
      </div>

      {/* Right side: CTA + Tags */}
      <div className="mt-3 flex flex-shrink-0 flex-col items-end gap-2 sm:mt-0 sm:self-center">
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded bg-red-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-red-600"
        >
          {ctaLabel}
          <span className="text-sm">→</span>
        </Link>
        {tags && tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <TagPill key={tag.label} tone={tag.tone} variant="header">
                {tag.label}
              </TagPill>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
