"use client";

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

export function ProfileInfoList(props: {
  stats: ProfileStats;
  favoritesBadges?: string[];
}) {
  const { stats, favoritesBadges = [] } = props;

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

      <div className="rounded-[4px] border border-[#1F1F3E] bg-[#25254D] p-3">
        <h3 className="mb-2 text-[14px] font-bold text-white">Badges du fan-site</h3>
        <div className="flex flex-wrap gap-2">
          {favoritesBadges.length ? (
            favoritesBadges.map((src, i) => (
              <div key={i} className="grid h-[32px] w-[32px] place-items-center rounded-[4px] border border-black/20 bg-[#1F1F3E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`badge-${i}`} className="max-h-[24px] max-w-[24px] image-pixelated" />
              </div>
            ))
          ) : (
            <div className="text-xs text-[#BEBECE]">Aucun badge favori</div>
          )}
        </div>
      </div>
    </section>
  );
}
