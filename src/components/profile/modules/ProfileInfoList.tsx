"use client";

import { useEffect, useState } from "react";
import { ProfileInfoRow } from "./ProfileInfoRow";

export type ProfileStats = {
  topics: number;
  comments: number;
  articles: number;
  coins: number;
  friends: number;
  groups: number;
  badges: number;
  achievements?: number;
  achievementsTotal?: number;
};

type SiteBadge = { id: number; nome: string; imagem: string };

export function ProfileInfoList(props: {
  stats: ProfileStats;
  favoritesBadges?: string[];
  nick?: string;
}) {
  const { stats, favoritesBadges = [], nick } = props;
  const [siteBadges, setSiteBadges] = useState<SiteBadge[]>([]);

  useEffect(() => {
    if (!nick) return;
    fetch(`/api/user/badges?nick=${encodeURIComponent(nick)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setSiteBadges(d?.badges ?? []))
      .catch(() => {});
  }, [nick]);

  return (
    <section className="space-y-3">
      <div className="space-y-2 rounded-[6px] border border-[#141433] bg-[#1F1F3E]/55 p-2 shadow-[0_18px_45px_-36px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <ProfileInfoRow icon="/img/topics-mini.png" label="Sujets postés :" value={stats.topics} />
      <ProfileInfoRow icon="/img/icon-comment.png" label="Commentaires :" value={stats.comments} />
      <ProfileInfoRow icon="/img/pincel-mini.png" label="Articles postés :" value={stats.articles} />
      <ProfileInfoRow icon="/img/badges.gif" label="Badges Habbo :" value={stats.badges} />
      <ProfileInfoRow icon="/img/coin-mini.png" label="Money :" value={stats.coins} />
      <ProfileInfoRow icon="/img/friends.png" label="Amis:" value={stats.friends} />
      <ProfileInfoRow icon="/img/groups.png" label="Groupes:" value={stats.groups} />
      {typeof stats.achievements === "number" ? (
        <ProfileInfoRow
          icon="/img/badges.gif"
          label="Succès:"
          value={
            typeof stats.achievementsTotal === "number"
              ? `${stats.achievements} / ${stats.achievementsTotal}`
              : stats.achievements
          }
        />
      ) : null}
      </div>

      {/* Badges HabbOne */}
      <div className="rounded-[6px] border border-[#141433] bg-[#25254D] p-3 shadow-[0_18px_45px_-36px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <h3 className="mb-3 text-[14px] font-extrabold text-white">Badges HabbOne</h3>
        <div className="flex flex-wrap gap-2">
          {siteBadges.length ? (
            siteBadges.map((badge) => (
              <div key={badge.id} title={badge.nome} className="grid h-[86px] w-[86px] place-items-center rounded-[6px] border border-[#303060]/70 bg-[#141433] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-[#2596FF]/35 hover:bg-[#1F1F3E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badge.imagem} alt={badge.nome} className="h-[68px] w-[68px] object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] [image-rendering:auto]" />
              </div>
            ))
          ) : (
            <div className="rounded-[5px] border border-dashed border-white/10 bg-[#1F1F3E]/70 px-3 py-3 text-xs text-[#BEBECE]">Aucun badge</div>
          )}
        </div>
      </div>

      {/* Badges Habbo favoris */}
      {favoritesBadges.length > 0 && (
        <div className="rounded-[6px] border border-[#141433] bg-[#25254D] p-3 shadow-[0_18px_45px_-36px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <h3 className="mb-3 text-[14px] font-extrabold text-white">Badges Habbo favoris</h3>
          <div className="flex flex-wrap gap-2">
            {favoritesBadges.map((src, i) => (
              <div key={i} className="grid h-[68px] w-[68px] place-items-center rounded-[6px] border border-[#303060]/70 bg-[#1F1F3E] transition hover:border-[#2596FF]/35">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`badge-${i}`} className="h-[52px] w-[52px] image-pixelated object-contain" />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
