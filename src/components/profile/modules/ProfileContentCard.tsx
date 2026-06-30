import Link from "next/link";

import { mediaUrl } from "@/lib/media-url";
import { stripHtml } from "@/lib/text-utils";
import type { ProfileContentCard as ProfileContentCardData } from "../hooks/useProfileContent";

const contentCardClass =
  "rounded-[6px] border border-[#141433] bg-[#25254D] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-[#2596FF]/30 hover:bg-[#303060]/45";

type ProfileContentCardProps = {
  item: ProfileContentCardData;
  type: "topic" | "article";
};

export function ProfileContentCard({ item, type }: ProfileContentCardProps) {
  const titleFallback = type === "topic" ? `Sujet #${item.id}` : `Article #${item.id}`;
  const title = stripHtml(item.titulo ?? "") || titleFallback;
  const author = stripHtml(item.autor ?? "") || "Anonyme";
  const href = type === "topic" ? `/forum/topic/${item.id}` : `/news/${item.id}`;
  const alt = type === "topic"
    ? `Miniature de ${title || "ce sujet"}`
    : `Miniature de ${title || "cet article"}`;

  return (
    <li className={contentCardClass}>
      <Link href={href} className="group flex h-full gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imagem ? mediaUrl(item.imagem) : "/img/thumbnail.png"}
          alt={alt}
          className="h-[88px] w-[88px] shrink-0 rounded-[5px] border border-[#141433] bg-[#1F1F3E] object-cover"
          loading="lazy"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="line-clamp-2 text-[16px] font-extrabold leading-[1.2] text-[#DDD] group-hover:text-white">
            {title}
          </h3>
          <span className="mt-3 inline-flex h-[32px] w-fit items-center rounded-[5px] border border-white/10 bg-[#1F1F3E]/75 px-3 text-[13px] font-bold text-[#F0F0F0]">
            {author}
          </span>
        </div>
      </Link>
    </li>
  );
}
