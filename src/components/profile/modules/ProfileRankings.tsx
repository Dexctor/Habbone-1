"use client";

import { useEffect, useState } from "react";
import type { HabboProfileResponse } from "@/types/habbo";

type Props = {
  data: HabboProfileResponse | null;
  favoriteBadges?: string[];
  nick?: string;
  hotel?: string;
};

type RankingEntry = { rank: number; score: number } | null;

type Rankings = {
  achievements: RankingEntry;
  badges: RankingEntry;
  uniqueBadges: RankingEntry;
  starGems: RankingEntry;
};

function formatNumber(n: number): string {
  return n.toLocaleString("fr-FR");
}

function detectHotelFromUniqueId(uniqueId?: string): string {
  if (!uniqueId) return "fr";
  // Habbo uniqueId format: hh<hotel>-<hash>, e.g. "hhfr-...", "hhcom-..."
  const match = uniqueId.match(/^hh([a-z.]+)-/i);
  if (match) {
    const code = match[1].toLowerCase();
    // Normalize: "com.br" stays as-is, "com" → "com", "fr" → "fr"
    return code;
  }
  return "fr";
}

export function ProfileRankings({ data, favoriteBadges = [], nick, hotel }: Props) {
  const [rankings, setRankings] = useState<Rankings | null>(null);
  const [loading, setLoading] = useState(false);

  const resolvedNick = nick || data?.user?.name || "";
  const resolvedHotel = hotel || detectHotelFromUniqueId(data?.uniqueId);

  useEffect(() => {
    if (!resolvedNick) return;

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);

    fetch(
      `/api/habbo/rankings?nick=${encodeURIComponent(resolvedNick)}&hotel=${encodeURIComponent(resolvedHotel)}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j?.rankings) setRankings(j.rankings);
      })
      .catch(() => { /* silent */ })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [resolvedNick, resolvedHotel]);

  if (!data) return null;

  const rows: { icon: string; label: string; entry: RankingEntry; tone: string }[] = [
    {
      icon: "/img/medal.png",
      label: "Achievements top 250",
      entry: rankings?.achievements ?? null,
      tone: "bg-[#16B254] text-white",
    },
    {
      icon: "/img/badges.gif",
      label: "Badge top 250",
      entry: rankings?.badges ?? null,
      tone: "bg-[#16B254] text-white",
    },
    {
      icon: "/img/badges.gif",
      label: "Unique badge top 50",
      entry: rankings?.uniqueBadges ?? null,
      tone: "bg-[#16B254] text-white",
    },
    {
      icon: "/img/star.png",
      label: "Star Gems top 250",
      entry: rankings?.starGems ?? null,
      tone: "bg-[#16B254] text-white",
    },
  ];

  const hasAnyRank = rows.some((r) => r.entry !== null);

  return (
    <section className="rounded-[4px] border border-[#1F1F3E] bg-[#25254D] p-4">
      <header className="mb-3 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/medal.png" alt="" className="h-[20px] w-auto image-pixelated" />
        <h3 className="text-[14px] font-bold text-white">Classements Mondiaux</h3>
      </header>

      <div className="space-y-2">
        {loading && !rankings ? (
          <div className="py-4 text-center text-[12px] text-[#BEBECE]/70">
            Chargement des classements...
          </div>
        ) : !hasAnyRank ? (
          <div className="py-3 text-center text-[12px] text-[#BEBECE]/70">
            Pas classé dans le top 250 mondial
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-[6px] bg-[#1F1F3E] px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.icon} alt="" className="h-[18px] w-[18px] image-pixelated" />
                <span className="text-[12px] text-[#DDD]">{row.label} :</span>
              </div>
              {row.entry ? (
                <span className={`rounded-[4px] px-2.5 py-1 text-[11px] font-bold ${row.tone}`}>
                  #{row.entry.rank} ({formatNumber(row.entry.score)})
                </span>
              ) : (
                <span className="rounded-[4px] bg-white/5 px-2.5 py-1 text-[11px] text-[#BEBECE]/50">
                  —
                </span>
              )}
            </div>
          ))
        )}

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
