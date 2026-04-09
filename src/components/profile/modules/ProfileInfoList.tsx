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
      <ProfileInfoRow icon="/img/topics-mini.png" label="Sujets postes:" value={stats.topics} />
      <ProfileInfoRow icon="/img/icon-comment.png" label="Commentaires:" value={stats.comments} />
      <ProfileInfoRow icon="/img/pincel-mini.png" label="Articles postes:" value={stats.articles} />
      <ProfileInfoRow icon="/img/badges.gif" label="Badges du site:" value={stats.badges} />
      <ProfileInfoRow icon="/img/coin-mini.png" label="Achats:" value={stats.coins} />
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

      {/* Badges HabbOne */}
      <div className="rounded-[4px] border border-[#1F1F3E] bg-[#25254D] p-3">
        <h3 className="mb-2 text-[14px] font-bold text-white">Badges HabbOne</h3>
        <div className="flex flex-wrap gap-2">
          {siteBadges.length ? (
            siteBadges.map((badge) => (
              <div key={badge.id} title={badge.nome} className="grid h-[52px] w-[52px] place-items-center rounded-[4px] border border-black/20 bg-[#1F1F3E] transition hover:bg-[#303060]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badge.imagem} alt={badge.nome} className="h-[40px] w-[40px] image-pixelated object-contain" />
              </div>
            ))
          ) : (
            <div className="text-xs text-[#BEBECE]">Aucun badge</div>
          )}
        </div>
      </div>

      {/* Badges Habbo favoris */}
      {favoritesBadges.length > 0 && (
        <div className="rounded-[4px] border border-[#1F1F3E] bg-[#25254D] p-3">
          <h3 className="mb-2 text-[14px] font-bold text-white">Badges Habbo favoris</h3>
          <div className="flex flex-wrap gap-2">
            {favoritesBadges.map((src, i) => (
              <div key={i} className="grid h-[52px] w-[52px] place-items-center rounded-[4px] border border-black/20 bg-[#1F1F3E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`badge-${i}`} className="h-[40px] w-[40px] image-pixelated object-contain" />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
