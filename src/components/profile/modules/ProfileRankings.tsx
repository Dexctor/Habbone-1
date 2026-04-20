"use client";

import type { HabboProfileResponse } from "@/types/habbo";

type Props = {
  data: HabboProfileResponse | null;
  favoriteBadges?: string[];
};

type RankRow = {
  icon: string;
  label: string;
  value: string | number;
  tone: "yellow" | "green" | "orange" | "blue";
};

function formatNumber(n: number): string {
  return n.toLocaleString("fr-FR");
}

export function ProfileRankings({ data, favoriteBadges = [] }: Props) {
  if (!data) return null;

  const user = data.user;
  const achievementsCount = data.achievementsCount ?? 0;
  const achievementsTotal = data.achievementsTotalCount ?? 0;
  const badgesCount = data.badges?.length ?? 0;
  const starGems = user?.starGemCount ?? 0;

  const rows: RankRow[] = [
    {
      icon: "/img/medal.png",
      label: "Succès obtenus",
      value: achievementsTotal > 0 ? `${formatNumber(achievementsCount)} / ${formatNumber(achievementsTotal)}` : formatNumber(achievementsCount),
      tone: "yellow",
    },
    {
      icon: "/img/badges.gif",
      label: "Total de badges",
      value: formatNumber(badgesCount),
      tone: "green",
    },
    {
      icon: "/img/badges.gif",
      label: "Badges favoris",
      value: formatNumber(favoriteBadges.length),
      tone: "orange",
    },
    {
      icon: "/img/icon-coin.png",
      label: "Star Gems",
      value: formatNumber(starGems),
      tone: "blue",
    },
  ];

  const toneClasses: Record<RankRow["tone"], string> = {
    yellow: "bg-[#FFC800] text-[#141433]",
    green: "bg-[#16B254] text-white",
    orange: "bg-[#FF8A3D] text-white",
    blue: "bg-[#2596FF] text-white",
  };

  return (
    <section className="rounded-[4px] border border-[#1F1F3E] bg-[#25254D] p-4">
      <header className="mb-3 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/medal.png" alt="" className="h-[20px] w-auto image-pixelated" />
        <h3 className="text-[14px] font-bold text-white">Classements Habbo</h3>
      </header>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-[6px] bg-[#1F1F3E] px-3 py-2"
          >
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={row.icon} alt="" className="h-[18px] w-[18px] image-pixelated" />
              <span className="text-[12px] text-[#DDD]">{row.label}</span>
            </div>
            <span
              className={`rounded-[4px] px-2.5 py-1 text-[11px] font-bold ${toneClasses[row.tone]}`}
            >
              {row.value}
            </span>
          </div>
        ))}

        {favoriteBadges.length > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-[6px] bg-[#1F1F3E] px-3 py-2">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/badges.gif" alt="" className="h-[18px] w-[18px] image-pixelated" />
              <span className="text-[12px] text-[#DDD]">Favoris :</span>
            </div>
            <div className="flex items-center gap-1">
              {favoriteBadges.slice(0, 5).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt={`Favori ${i + 1}`}
                  className="h-[28px] w-[28px] image-pixelated object-contain"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
