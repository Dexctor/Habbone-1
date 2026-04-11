"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

import { ProfileHeaderCard } from "./modules/ProfileHeaderCard";
import { ProfileInfoList } from "./modules/ProfileInfoList";
import { ProfileSection } from "./modules/ProfileSection";
import { ProfileTabs } from "./modules/ProfileTabs";
import { BadgeIcon } from "./modules/BadgeIcon";

import { mediaUrl } from "@/lib/media-url";
import { buildHabboAvatarUrl, badgeImageUrl, groupBadgeUrl, badgeCodeFromEntry } from "@/lib/habbo-imaging";
import { useHabboProfile } from "@/lib/use-habbo-profile";
import { formatDateTime } from "@/lib/date-utils";
import { stripHtml } from "@/lib/text-utils";
import { usePaginatedList } from "./hooks/usePaginatedList";

import type { HabboFriend, HabboGroup, HabboRoom, HabboBadge } from "@/lib/habbo";
import type { HabboProfileResponse } from "@/types/habbo";

const PAGE_SIZE = 100;
const PER_TOPICS = 4;
const PER_ARTICLES = 4;

type TopicCard = {
  id: number | string;
  imagem?: string;
  titulo?: string;
  autor?: string;
  data?: string | number | null;
};

type ArticleCard = {
  id: number | string;
  imagem?: string;
  titulo?: string;
  autor?: string;
  data?: string | number | null;
};

export default function ProfileClient({ nick }: { nick: string }) {
  const { data, error, loading, refresh } = useHabboProfile(nick, {
    fallbackMessage: "Erreur de recuperation du profil",
  });

  const [topics, setTopics] = useState<TopicCard[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsPage, setTopicsPage] = useState(0);
  const [topicsDir, setTopicsDir] = useState<1 | -1>(1);
  const [articles, setArticles] = useState<ArticleCard[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesPage, setArticlesPage] = useState(0);
  const [articlesDir, setArticlesDir] = useState<1 | -1>(1);
  const reduce = useReducedMotion();

  const friendsPagination = usePaginatedList(data?.friends ?? [], PAGE_SIZE);
  const groupsPagination = usePaginatedList(data?.groups ?? [], PAGE_SIZE);
  const badgesPagination = usePaginatedList(data?.badges ?? [], PAGE_SIZE);
  const roomsPagination = usePaginatedList(data?.rooms ?? [], PAGE_SIZE);
  const achievementsPagination = usePaginatedList(data?.achievements ?? [], PAGE_SIZE);

  useEffect(() => {
    if (typeof window === "undefined" || !data) return;
    try {
      window.__habboProfile = data;
      const lvl = typeof data.user?.currentLevel === "number" ? data.user.currentLevel : null;
      window.__habboLevel = lvl;
      window.dispatchEvent(new CustomEvent<HabboProfileResponse>("habbo:profile", { detail: data }));
    } catch {
      // noop
    }
  }, [data]);

  useEffect(() => {
    const author = data?.user?.name || nick;
    if (!author) return;

    let cancelled = false;
    const controller = new AbortController();
    setTopicsLoading(true);

    const load = async () => {
      try {
        const response = await fetch(`/api/profile/topics?author=${encodeURIComponent(author)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as unknown;
        if (cancelled) return;
        if (!response.ok) {
          const maybeErr = (payload as { error?: unknown } | null)?.error;
          const msg = typeof maybeErr === "string" ? maybeErr : "Erreur de recuperation des sujets";
          throw new Error(msg);
        }

        const rows = (payload as { data?: unknown } | null)?.data;
        setTopics(Array.isArray(rows) ? (rows as TopicCard[]) : []);
      } catch {
        if (!cancelled) setTopics([]);
      } finally {
        if (!cancelled) setTopicsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [nick, data?.user?.name]);

  useEffect(() => {
    const author = data?.user?.name || nick;
    if (!author) return;

    let cancelled = false;
    const controller = new AbortController();
    setArticlesLoading(true);

    const load = async () => {
      try {
        const response = await fetch(`/api/profile/articles?author=${encodeURIComponent(author)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as unknown;
        if (cancelled) return;
        if (!response.ok) {
          const maybeErr = (payload as { error?: unknown } | null)?.error;
          const msg = typeof maybeErr === "string" ? maybeErr : "Erreur de recuperation des articles";
          throw new Error(msg);
        }

        const rows = (payload as { data?: unknown } | null)?.data;
        setArticles(Array.isArray(rows) ? (rows as ArticleCard[]) : []);
      } catch {
        if (!cancelled) setArticles([]);
      } finally {
        if (!cancelled) setArticlesLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [nick, data?.user?.name]);

  useEffect(() => {
    setTopicsPage(0);
  }, [topics.length]);

  useEffect(() => {
    setArticlesPage(0);
  }, [articles.length]);

  const topicsPageCount = Math.max(1, Math.ceil(topics.length / PER_TOPICS));
  const visibleTopics = useMemo(
    () => topics.slice(topicsPage * PER_TOPICS, topicsPage * PER_TOPICS + PER_TOPICS),
    [topics, topicsPage],
  );

  const articlesPageCount = Math.max(1, Math.ceil(articles.length / PER_ARTICLES));
  const visibleArticles = useMemo(
    () => articles.slice(articlesPage * PER_ARTICLES, articlesPage * PER_ARTICLES + PER_ARTICLES),
    [articles, articlesPage],
  );

  const counts = useMemo(() => {
    const achievementsCount =
      typeof data?.achievementsCount === "number"
        ? data.achievementsCount
        : Array.isArray(data?.achievements)
          ? data.achievements.length
          : 0;

    return {
      friends: data?.friends?.length ?? 0,
      groups: data?.groups?.length ?? 0,
      badges: data?.badges?.length ?? 0,
      rooms: data?.rooms?.length ?? 0,
      achievements: achievementsCount,
    } as const;
  }, [data]);

  function fmtMemberSince(v?: string) {
    if (!v) return "";
    const norm = v.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
    const d = new Date(norm);
    return Number.isNaN(+d) ? v : d.toLocaleDateString();
  }

  function resolveProfileCurrentLevel(profile: HabboProfileResponse["profile"]): number | undefined {
    if (!profile || typeof profile !== "object") return undefined;
    const record = profile as Record<string, unknown>;
    const direct = record.currentLevel;
    if (typeof direct === "number") return direct;
    const user = record.user;
    if (!user || typeof user !== "object") return undefined;
    const userRecord = user as Record<string, unknown>;
    const nested = userRecord.currentLevel;
    return typeof nested === "number" ? nested : undefined;
  }

  const headerUser = data?.user;
  const headerAvatarUrl = buildHabboAvatarUrl(headerUser?.name || nick || "", {
    direction: 2,
    head_direction: 3,
    img_format: "png",
    size: "l",
  });

  const summaryStats = useMemo(
    () => ({
      topics: topics.length,
      comments: 0,
      articles: articles.length,
      coins: typeof headerUser?.starGemCount === "number" ? headerUser.starGemCount : 0,
      friends: counts.friends,
      groups: counts.groups,
      badges: counts.badges,
      achievements: counts.achievements,
      achievementsTotal: typeof data?.achievementsTotalCount === "number" ? data.achievementsTotalCount : undefined,
    }),
    [topics.length, articles.length, counts.badges, counts.friends, counts.groups, counts.achievements, data?.achievementsTotalCount, headerUser?.starGemCount],
  );

  const favoriteBadges = useMemo(() => {
    // Only show the official selectedBadges (manually chosen by the player in-game)
    // Do NOT fallback to random badges — that gives incorrect information
    const selected = headerUser?.selectedBadges ?? [];
    return selected
      .map((b) => {
        const code = (b?.badgeCode || "").trim();
        return code ? badgeImageUrl(code) : "";
      })
      .filter(Boolean);
  }, [headerUser?.selectedBadges]);

  return (
    <div className="w-full space-y-6" aria-busy={loading} aria-live="polite">
      {loading && !data ? (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[350px_minmax(0,818px)]">
          {/* Left sidebar skeleton */}
          <aside className="space-y-4">
            {/* Profile header card */}
            <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="h-[80px] w-[80px] shrink-0 rounded-[4px]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-[140px]" />
                  <Skeleton className="h-3 w-[100px]" />
                  <Skeleton className="h-3 w-[180px]" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-[8px] w-full rounded-full" />
              </div>
            </div>
            {/* Info list */}
            <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[60px]" />
                </div>
              ))}
              <div className="pt-2 flex gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-[30px] w-[30px] rounded-[3px]" />
                ))}
              </div>
            </div>
          </aside>

          {/* Right content skeleton */}
          <div className="space-y-6">
            {/* Topics section */}
            <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-5 w-[130px]" />
                <div className="flex gap-2">
                  <Skeleton className="h-[32px] w-[32px] rounded-[3px]" />
                  <Skeleton className="h-[32px] w-[32px] rounded-[3px]" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex gap-3 rounded-[4px] border border-[#1F1F3E] bg-[#25254D] p-3">
                    <Skeleton className="h-[84px] w-[84px] shrink-0 rounded-[3px]" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-[70%]" />
                      <Skeleton className="mt-3 h-[32px] w-[90px] rounded-[4px]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Articles section */}
            <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-5 w-[130px]" />
                <div className="flex gap-2">
                  <Skeleton className="h-[32px] w-[32px] rounded-[3px]" />
                  <Skeleton className="h-[32px] w-[32px] rounded-[3px]" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex gap-3 rounded-[4px] border border-[#1F1F3E] bg-[#25254D] p-3">
                    <Skeleton className="h-[84px] w-[84px] shrink-0 rounded-[3px]" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-[60%]" />
                      <Skeleton className="mt-3 h-[32px] w-[90px] rounded-[4px]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Tabs skeleton */}
            <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
              <div className="flex gap-2 mb-4">
                <Skeleton className="h-[36px] w-[90px] rounded-[4px]" />
                <Skeleton className="h-[36px] w-[90px] rounded-[4px]" />
                <Skeleton className="h-[36px] w-[90px] rounded-[4px]" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-[80px] rounded-[4px]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[4px] border border-red-500/30 bg-red-500/10 px-4 py-4 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="mt-3 inline-flex items-center gap-2 rounded-[4px] bg-[#2596FF] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#2976E8]"
          >
            Reessayer
          </button>
        </div>
      ) : null}

      {!loading && !error && !data ? (
        <div className="rounded-[4px] border border-yellow-500/30 bg-yellow-500/10 px-4 py-4 text-center">
          <p className="text-sm text-yellow-300">Aucune donnee disponible pour ce profil.</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="mt-3 inline-flex items-center gap-2 rounded-[4px] bg-[#2596FF] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#2976E8]"
          >
            Recharger
          </button>
        </div>
      ) : null}

      {data ? (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[350px_minmax(0,818px)]">
          <aside className="space-y-4">
            <ProfileHeaderCard
              nick={headerUser?.name || nick}
              memberSince={fmtMemberSince(headerUser?.memberSince)}
              level={headerUser?.currentLevel ?? resolveProfileCurrentLevel(data.profile)}
              levelPercent={headerUser?.currentLevelCompletePercent}
              starGems={headerUser?.starGemCount}
              avatarUrl={headerAvatarUrl}
              motto={headerUser?.motto}
              online={headerUser?.online}
              lastAccessTime={headerUser?.lastAccessTime}
              ariaBusy={loading}
            />

            <ProfileInfoList
              stats={summaryStats}
              favoritesBadges={favoriteBadges}
              nick={headerUser?.name || nick}
            />
          </aside>

          <div className="space-y-6">
            <ProfileSection
              title="Sujets postes"
              onPrev={() => {
                setTopicsDir(-1);
                setTopicsPage((p) => Math.max(0, p - 1));
              }}
              onNext={() => {
                setTopicsDir(1);
                setTopicsPage((p) => Math.min(topicsPageCount - 1, p + 1));
              }}
            >
              {topicsLoading ? (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <Skeleton className="h-[155px]" />
                  <Skeleton className="h-[155px]" />
                </div>
              ) : topics.length ? (
                <div className="space-y-3" aria-live="polite">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.ul
                      key={topicsPage}
                      initial={reduce ? {} : { opacity: 0, x: topicsDir * 20 }}
                      animate={reduce ? {} : { opacity: 1, x: 0 }}
                      exit={reduce ? {} : { opacity: 0, x: -topicsDir * 20 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 gap-3 lg:grid-cols-2"
                    >
                      {visibleTopics.map((topic) => {
                        const title = stripHtml(topic.titulo ?? "") || `Sujet #${topic.id}`;
                        const author = stripHtml(topic.autor ?? "") || "Anonyme";
                        return (
                          <li key={`topic-${topic.id}`} className="rounded-[4px] border border-[#1F1F3E] bg-[#25254D] p-3">
                            <Link href={`/forum/topic/${topic.id}`} className="group flex h-full gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={topic.imagem ? mediaUrl(topic.imagem) : "/img/thumbnail.png"}
                                alt={title ? `Miniature de ${title}` : "Miniature du sujet"}
                                className="h-[84px] w-[84px] shrink-0 rounded-[3px] object-cover"
                                loading="lazy"
                              />
                              <div className="flex min-w-0 flex-1 flex-col">
                                <h3 className="line-clamp-2 text-[16px] font-bold leading-[1.2] text-[#DDD] group-hover:text-white">
                                  {title}
                                </h3>
                                <span className="mt-3 inline-flex h-[32px] w-fit items-center rounded-[4px] border border-[rgba(255,255,255,0.18)] px-3 text-[14px] font-bold text-[#F0F0F0]">
                                  {author}
                                </span>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </motion.ul>
                  </AnimatePresence>
                </div>
              ) : (
                <div className="rounded-[4px] bg-[rgba(255,255,255,0.05)] px-4 py-3 text-center text-sm font-bold text-[#FF4B6C]">
                  Pas d&apos;articles
                </div>
              )}
            </ProfileSection>

            <ProfileSection
              title="Articles postes"
              onPrev={() => {
                setArticlesDir(-1);
                setArticlesPage((p) => Math.max(0, p - 1));
              }}
              onNext={() => {
                setArticlesDir(1);
                setArticlesPage((p) => Math.min(articlesPageCount - 1, p + 1));
              }}
            >
              {articlesLoading ? (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <Skeleton className="h-[155px]" />
                  <Skeleton className="h-[155px]" />
                </div>
              ) : articles.length ? (
                <div className="space-y-3" aria-live="polite">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.ul
                      key={articlesPage}
                      initial={reduce ? {} : { opacity: 0, x: articlesDir * 20 }}
                      animate={reduce ? {} : { opacity: 1, x: 0 }}
                      exit={reduce ? {} : { opacity: 0, x: -articlesDir * 20 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 gap-3 lg:grid-cols-2"
                    >
                      {visibleArticles.map((a) => {
                        const title = stripHtml(a.titulo ?? "") || `Article #${a.id}`;
                        const author = stripHtml(a.autor ?? "") || "Anonyme";
                        return (
                          <li key={`article-${a.id}`} className="rounded-[4px] border border-[#1F1F3E] bg-[#25254D] p-3">
                            <Link href={`/news/${a.id}`} className="group flex h-full gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={a.imagem ? mediaUrl(a.imagem) : "/img/thumbnail.png"}
                                alt={title ? `Miniature de ${title}` : "Miniature d'article"}
                                className="h-[84px] w-[84px] shrink-0 rounded-[3px] object-cover"
                                loading="lazy"
                              />
                              <div className="flex min-w-0 flex-1 flex-col">
                                <h3 className="line-clamp-2 text-[16px] font-bold leading-[1.2] text-[#DDD] group-hover:text-white">
                                  {title}
                                </h3>
                                <span className="mt-3 inline-flex h-[32px] w-fit items-center rounded-[4px] border border-[rgba(255,255,255,0.18)] px-3 text-[14px] font-bold text-[#F0F0F0]">
                                  {author}
                                </span>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </motion.ul>
                  </AnimatePresence>
                </div>
              ) : (
                <div className="rounded-[4px] bg-[rgba(255,255,255,0.05)] px-4 py-3 text-center text-sm font-bold text-[#FF4B6C]">
                  Aucun article publie
                </div>
              )}
            </ProfileSection>

            <ProfileTabs
              counts={{ friends: counts.friends, groups: counts.groups, badges: counts.badges }}
              friendsSlot={(
                <>
                  <ScrollArea className="max-h-72 scroll-area">
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {friendsPagination.visible.map((f: HabboFriend, idx: number) => (
                        <li
                          key={f?.uniqueId || f?.name || idx}
                          className="flex min-w-0 flex-col items-center gap-2 rounded-[4px] border border-[#1F1F3E] bg-[#25254D] p-2 text-center"
                        >
                          <div className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-[#1F1F3E]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={buildHabboAvatarUrl(f?.name || f?.habbo || "", {
                                direction: 2,
                                head_direction: 3,
                                img_format: "png",
                                headonly: 1,
                                size: "s",
                              })}
                              alt={`Avatar de ${f?.name || "inconnu"}`}
                              loading="lazy"
                              className="h-12 w-12 rounded image-pixelated"
                            />
                            {f?.online ? (
                              <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-green-500" aria-label="En ligne" title="En ligne" />
                            ) : null}
                          </div>
                          <div className="w-full min-w-0">
                            <div className="truncate text-[13px] font-bold text-white">{f?.name || "-"}</div>
                            {f?.motto ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="truncate text-[11px] text-[#BEBECE]" aria-label={`Devise: ${f.motto}`}>
                                    {f.motto}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={6}>{f.motto}</TooltipContent>
                              </Tooltip>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                  {friendsPagination.hasMore ? (
                    <Button variant="secondary" className="mt-3 bg-[rgba(255,255,255,0.1)] text-[#DDD] hover:bg-[#2596FF]" onClick={friendsPagination.loadMore}>
                      Charger +{friendsPagination.remaining}
                    </Button>
                  ) : null}
                </>
              )}
              groupsSlot={(
                <>
                  <ScrollArea className="max-h-72 scroll-area">
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {groupsPagination.visible.map((g: HabboGroup, idx: number) => (
                        <li
                          key={g?.id || g?.groupId || idx}
                          className="flex min-w-0 flex-col items-center gap-2 rounded-[4px] border border-[#1F1F3E] bg-[#25254D] p-2 text-center"
                        >
                          <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-[#1F1F3E]">
                            {g?.badgeCode ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={groupBadgeUrl(g.badgeCode)}
                                alt={`Insigne ${g.name || ""}`}
                                className="h-12 w-12 image-pixelated"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-[10px] text-[#BEBECE]">?</span>
                            )}
                          </div>
                          <div className="w-full min-w-0">
                            <div className="truncate text-[13px] font-bold text-white">{g?.name || "-"}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                  {groupsPagination.hasMore ? (
                    <Button variant="secondary" className="mt-3 bg-[rgba(255,255,255,0.1)] text-[#DDD] hover:bg-[#2596FF]" onClick={groupsPagination.loadMore}>
                      Charger +{groupsPagination.remaining}
                    </Button>
                  ) : null}
                </>
              )}
              badgesSlot={(
                <>
                  <ScrollArea className="max-h-72 scroll-area">
                    <ul className="grid grid-cols-6 gap-2 sm:grid-cols-10">
                      {badgesPagination.visible.map((b: HabboBadge, idx: number) => {
                        const code = badgeCodeFromEntry(b);
                        const imageUrl =
                          (b as any)?.imageUrl ||
                          (b as any)?.badgeImageUrl ||
                          (b as any)?.image ||
                          (b as any)?.url ||
                          (b as any)?.iconUrl ||
                          (b as any)?.icon_url ||
                          "";

                        let album: string | undefined =
                          (b as any)?.album || (b as any)?.badgeAlbum || (b as any)?.category || (b as any)?.badgeCategory;
                        if (!album && code.startsWith("ACH_")) album = "album1584";

                        return (
                          <li key={code || idx} className="flex flex-col items-center text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <BadgeIcon code={code} album={album} imageUrl={imageUrl} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent sideOffset={6}>
                                {(b as any)?.name || (b as any)?.description || code || "Badge"}
                              </TooltipContent>
                            </Tooltip>
                          </li>
                        );
                      })}
                    </ul>
                  </ScrollArea>
                  {badgesPagination.hasMore ? (
                    <Button variant="secondary" className="mt-3 bg-[rgba(255,255,255,0.1)] text-[#DDD] hover:bg-[#2596FF]" onClick={badgesPagination.loadMore}>
                      Charger +{badgesPagination.remaining}
                    </Button>
                  ) : null}
                </>
              )}
            />

            <ProfileSection title="Salles">
              <ScrollArea className="max-h-72 scroll-area">
                <ul className="space-y-2">
                  {roomsPagination.visible.map((r: HabboRoom, idx: number) => (
                    <li key={r?.id || idx} className="rounded-[4px] border border-[#1F1F3E] bg-[#25254D] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-white">{r?.name || "-"}</div>
                        {typeof r?.usersMax === "number" ? (
                          <span className="shrink-0 text-[11px] text-[#BEBECE]">max {r.usersMax}</span>
                        ) : null}
                      </div>
                      {r?.description ? <div className="text-xs text-[#BEBECE]">{r.description}</div> : null}
                      {r?.creationTime ? <div className="mt-1 text-xs text-[#BEBECE]/70">{formatDateTime(r.creationTime)}</div> : null}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              {roomsPagination.hasMore ? (
                <Button variant="secondary" className="mt-3 bg-[rgba(255,255,255,0.1)] text-[#DDD] hover:bg-[#2596FF]" onClick={roomsPagination.loadMore}>
                  Charger +{roomsPagination.remaining}
                </Button>
              ) : null}
            </ProfileSection>

          </div>
        </div>
      ) : null}
    </div>
  );
}
