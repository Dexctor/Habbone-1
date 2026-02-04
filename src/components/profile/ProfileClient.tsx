"use client";

import { useEffect, useMemo, useState } from "react";
import { ProfileHeaderCard } from "./modules/ProfileHeaderCard";
import { ProfileInfoList } from "./modules/ProfileInfoList";
import { ProfileSection } from "./modules/ProfileSection";
import { ProfileTabs } from "./modules/ProfileTabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeIcon } from "./modules/BadgeIcon";
import Link from "next/link";
import { mediaUrl } from "@/lib/directus/media";
import { buildHabboAvatarUrl } from "@/lib/habbo-imaging";
import { useHabboProfile } from "@/lib/use-habbo-profile";
import { formatDateTime } from "@/lib/date-utils";
import { usePaginatedList } from "./hooks/usePaginatedList";
import type { HabboFriend, HabboGroup, HabboRoom, HabboBadge } from "@/lib/habbo";
import type { HabboProfileResponse } from "@/types/habbo";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import "./profile.tailwind.css";

const PAGE_SIZE = 100;

export default function ProfileClient({ nick }: { nick: string }) {
  const { data, error, loading, refresh } = useHabboProfile(nick, {
    fallbackMessage: "Erreur de récupération du profil",
  });

  // Articles state (different pagination pattern - carousel style)
  type ArticleCard = { id: number | string; imagem?: string; titulo?: string; autor?: string; data?: string | number | null };
  const [articles, setArticles] = useState<ArticleCard[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesPage, setArticlesPage] = useState(0);
  const [articlesDir, setArticlesDir] = useState<1 | -1>(1);
  const reduce = useReducedMotion();

  // Use paginated list hook for friends, groups, badges, rooms
  const friendsPagination = usePaginatedList(data?.friends ?? [], PAGE_SIZE);
  const groupsPagination = usePaginatedList(data?.groups ?? [], PAGE_SIZE);
  const badgesPagination = usePaginatedList(data?.badges ?? [], PAGE_SIZE);
  const roomsPagination = usePaginatedList(data?.rooms ?? [], PAGE_SIZE);

  // Broadcast profile data to the header (mutualize on /profile)
  useEffect(() => {
    if (typeof window === "undefined" || !data) return;
    try {
      window.__habboProfile = data;
      const lvl = typeof data.user?.currentLevel === "number" ? data.user.currentLevel : null;
      window.__habboLevel = lvl;
      window.dispatchEvent(new CustomEvent<HabboProfileResponse>("habbo:profile", { detail: data }));
    } catch { }
  }, [data]);

  // Fetch articles by logged user nick
  useEffect(() => {
    const author = data?.user?.name || nick;
    if (!author) return;

    let cancelled = false;
    const controller = new AbortController();
    setArticlesLoading(true);

    const load = async () => {
      try {
        const response = await fetch(
          `/api/profile/articles?author=${encodeURIComponent(author)}`,
          { cache: "no-store", signal: controller.signal }
        );
        const payload = (await response.json().catch(() => null)) as unknown;
        if (cancelled) return;
        if (!response.ok) {
          const maybeErr = (payload as { error?: unknown } | null)?.error;
          const msg = typeof maybeErr === "string" ? maybeErr : "Erreur de récupération des articles";
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

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [nick, data?.user?.name]);

  // Reset page when data changes
  useEffect(() => {
    setArticlesPage(0);
  }, [articles.length]);

  const PER_ARTICLES = 4;
  const articlesPageCount = Math.max(1, Math.ceil(articles.length / PER_ARTICLES));
  const visibleArticles = useMemo(
    () =>
      articles.slice(
        articlesPage * PER_ARTICLES,
        articlesPage * PER_ARTICLES + PER_ARTICLES
      ),
    [articles, articlesPage]
  );

  const counts = useMemo(() => {
    const achCount = typeof data?.achievementsCount === "number"
      ? data.achievementsCount
      : Array.isArray(data?.achievements)
        ? data.achievements.length
        : 0;
    const achTotal = typeof data?.achievementsTotalCount === "number" ? data.achievementsTotalCount : undefined;
    return {
      friends: data?.friends?.length ?? 0,
      groups: data?.groups?.length ?? 0,
      badges: data?.badges?.length ?? 0,
      rooms: data?.rooms?.length ?? 0,
      achievements: achCount,
      achievementsTotal: achTotal,
    } as const;
  }, [data]);

  function fmtMemberSince(v?: string) {
    if (!v) return "";
    // Normalize timezone like +0000 -> +00:00 for Date parsing
    const norm = v.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
    const d = new Date(norm);
    return isNaN(+d) ? v : d.toLocaleDateString();
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

  return (
    <div className="profile-page">
      <div className="profile-container space-y-6" aria-busy={loading} aria-live="polite">
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-36 w-full" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 border border-red-600/30 rounded p-3 bg-red-600/10">
            {error}
          </div>
        )}

        {/* Header */}
        {data && (
          <ProfileHeaderCard
            nick={headerUser?.name || nick}
            memberSince={fmtMemberSince(headerUser?.memberSince)}
            level={headerUser?.currentLevel ?? resolveProfileCurrentLevel(data.profile)}
            starGems={headerUser?.starGemCount}
            avatarUrl={headerAvatarUrl}
            motto={headerUser?.motto}
            ariaBusy={loading}
          />
        )}

        {/* Counters */}
        <Card className="bg-[color:var(--bg-600)] border-[color:var(--bg-800)]">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4">
            {([
              { label: "Amis", value: counts.friends },
              { label: "Groupes", value: counts.groups },
              { label: "Badges", value: counts.badges },
              { label: "Salles", value: counts.rooms },
              {
                label: "Succès",
                value: typeof counts.achievementsTotal === "number" ? counts.achievementsTotal : counts.achievements,
              },
            ] as const).map((it) => (
              <div key={it.label} className="text-center border rounded p-3 border-[color:var(--border)]">
                <div className="text-xs opacity-70">{it.label}</div>
                <div className="text-xl font-semibold">{it.value}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <ProfileSection title="Infos de profil">
              <div className="rounded-md bg-muted/40 p-4 text-center font-semibold text-destructive">Pas d'informations</div>
            </ProfileSection>

            <ProfileSection
              title="Articles postés"
              onPrev={articlesPage > 0 ? () => { setArticlesDir(-1); setArticlesPage((p) => Math.max(0, p - 1)); } : undefined}
              onNext={articlesPage < articlesPageCount - 1 ? () => { setArticlesDir(1); setArticlesPage((p) => Math.min(articlesPageCount - 1, p + 1)); } : undefined}
            >
              {articlesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : articles.length ? (
                <div className="space-y-3" aria-live="polite">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={articlesPage}
                      initial={reduce ? {} : { opacity: 0, x: articlesDir * 30 }}
                      animate={reduce ? {} : { opacity: 1, x: 0 }}
                      exit={reduce ? {} : { opacity: 0, x: -articlesDir * 30 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {visibleArticles.map((a: ArticleCard) => (
                          <li key={a.id} className="border rounded p-3 border-[color:var(--border)]">
                            <div className="flex gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={a.imagem ? mediaUrl(a.imagem) : "/img/thumbnail.png"}
                                alt={a.titulo ? `Miniature de ${a.titulo}` : "Miniature d'article"}
                                className="w-16 h-16 rounded object-cover"
                                loading="lazy"
                              />
                              <div className="min-w-0 flex-1">
                                <Link href={`/news/${a.id}`} className="font-medium hover:underline truncate block">
                                  {a.titulo ?? `Article #${a.id}`}
                                </Link>
                                <div className="text-xs opacity-70 mt-1 truncate">
                                  Par {a.autor ?? '—'} · {formatDateTime(a.data)}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  </AnimatePresence>

                  <div className="flex items-center justify-center gap-2 text-xs opacity-70">
                    <span>
                      Page {articlesPage + 1} / {articlesPageCount}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-md bg-muted/40 p-4 text-center font-semibold text-muted-foreground">
                  Aucun article publié
                </div>
              )}
            </ProfileSection>

            <ProfileTabs
              counts={{ friends: counts.friends, groups: counts.groups, badges: counts.badges }}
              friendsSlot={(
                <>
                  <ScrollArea className="max-h-72 scroll-area">
                    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-x-hidden">
                      {friendsPagination.visible.map((f: HabboFriend, idx: number) => (
                        <li
                          key={f?.uniqueId || f?.name || idx}
                          className="group flex flex-col items-center text-center gap-3 border rounded p-2 border-[color:var(--border)] bg-[color:var(--bg-700)] hover:bg-[color:var(--bg-600)] transition min-w-0"
                        >
                          <div className="relative w-16 h-16 rounded-full bg-[color:var(--bg-800)] flex items-center justify-center overflow-hidden ring-1 ring-[color:var(--border)]">
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
                              className="w-14 h-14 rounded"
                            />
                            {f?.online && (
                              <span
                                className="absolute right-0.5 bottom-0.5 w-3 h-3 rounded-full bg-green-500 ring-2 ring-[color:var(--bg-700)]"
                                aria-label="En ligne"
                                title="En ligne"
                              />
                            )}
                          </div>
                          <div className="min-w-0 w-full">
                            <div className="font-medium truncate">{f?.name || "—"}</div>
                            {f?.motto && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-xs opacity-70 truncate w-full" aria-label={`Devise: ${f.motto}`}>
                                    {f.motto}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={6}>{f.motto}</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                  {friendsPagination.hasMore && (
                    <Button
                      variant="secondary"
                      className="mt-2"
                      onClick={friendsPagination.loadMore}
                      aria-label="Charger plus d'amis"
                    >
                      Charger +{friendsPagination.remaining}
                    </Button>
                  )}
                </>
              )}
              groupsSlot={
                <>
                  <ScrollArea className="max-h-72 scroll-area">
                    <ul className="space-y-3">
                      {groupsPagination.visible.map((g: HabboGroup, idx: number) => (
                        <li key={g?.id || g?.groupId || idx} className="border rounded p-2 border-[color:var(--border)]">
                          <div className="font-medium">{g?.name || "—"}</div>
                          {g?.description && <div className="text-xs opacity-70">{g.description}</div>}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                  {groupsPagination.hasMore && (
                    <Button
                      variant="secondary"
                      className="mt-2"
                      onClick={groupsPagination.loadMore}
                      aria-label="Charger plus de groupes"
                    >
                      Charger +{groupsPagination.remaining}
                    </Button>
                  )}
                </>
              }
              badgesSlot={
                <>
                  <ScrollArea className="max-h-72 scroll-area">
                    <ul className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                      {badgesPagination.visible.map((b: HabboBadge, idx: number) => {
                        const rawCode = (b?.code || b?.badgeCode || b?.badge_code || b?.badge?.code || '').toString();
                        // Preserve original case; CDN filenames for ACH_* are case-sensitive (e.g., ACH_Tutorial3)
                        const code = rawCode.trim();

                        // Collect potential image url hints from API
                        const imageUrl = (
                          b?.imageUrl || b?.badgeImageUrl || b?.image || b?.url || b?.iconUrl || b?.icon_url || b?.smallImageUrl || b?.small_image_url || ''
                        ) as string | undefined;

                        // Album from payload or derived from URL or code/category
                        let album: string | undefined = (b?.album || b?.badgeAlbum || b?.category || b?.badgeCategory) as string | undefined;
                        if (!album && imageUrl) {
                          try {
                            const u = new URL(imageUrl);
                            const m = u.pathname.match(/\/(?:c_images|C_IMAGES)\/([^/]+)\//);
                            if (m && m[1]) album = m[1];
                          } catch {
                            const m = String(imageUrl).match(/\/(?:c_images|C_IMAGES)\/([^/]+)\//);
                            if (m && m[1]) album = m[1];
                          }
                        }
                        if (!album) {
                          if (code.startsWith('ACH_')) album = 'album1584';
                        }
                        return (
                          <li key={code || idx} className="flex flex-col items-center text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <BadgeIcon code={code} album={album} imageUrl={imageUrl} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent sideOffset={6}>{code || "Badge"}</TooltipContent>
                            </Tooltip>
                          </li>
                        );
                      })}
                    </ul>
                  </ScrollArea>
                  {badgesPagination.hasMore && (
                    <Button
                      variant="secondary"
                      className="mt-2"
                      onClick={badgesPagination.loadMore}
                      aria-label="Charger plus de badges"
                    >
                      Charger +{badgesPagination.remaining}
                    </Button>
                  )}
                </>
              }
            />

            <ProfileSection title="Salles">
              <ScrollArea className="max-h-72 scroll-area">
                <ul className="space-y-3">
                  {roomsPagination.visible.map((r: HabboRoom, idx: number) => (
                    <li key={r?.id || idx} className="border rounded p-2 border-[color:var(--border)]">
                      <div className="font-medium">{r?.name || "—"}</div>
                      {r?.description && <div className="text-xs opacity-70">{r.description}</div>}
                      {r?.creationTime && (
                        <div className="text-xs opacity-60 mt-1">
                          {formatDateTime(r.creationTime)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              {roomsPagination.hasMore && (
                <Button
                  variant="secondary"
                  className="mt-2"
                  onClick={roomsPagination.loadMore}
                  aria-label="Charger plus de salles"
                >
                  Charger +{roomsPagination.remaining}
                </Button>
              )}
            </ProfileSection>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <ProfileInfoList
              stats={{
                topics: 0,
                comments: 0,
                articles: 0,
                coins: 0,
                friends: counts.friends,
                groups: counts.groups,
                badges: counts.badges,
              }}
              rankings={[]}
              favoritesBadges={[]}
              onRefresh={() => {
                // Reset pagination and refetch
                friendsPagination.reset();
                groupsPagination.reset();
                badgesPagination.reset();
                roomsPagination.reset();
                setTimeout(() => {
                  // trigger effect by changing nick dependency pattern if needed
                  // here just re-run current fetch
                  void refresh();
                }, 0);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
