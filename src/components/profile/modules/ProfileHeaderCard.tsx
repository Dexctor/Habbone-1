"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

function fmtLastAccess(v?: string): string | null {
  if (!v) return null;
  const norm = v.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const d = new Date(norm);
  if (Number.isNaN(+d)) return null;
  const minutes = Math.floor((Date.now() - +d) / 60000);
  if (minutes < 2) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export function ProfileHeaderCard(props: {
  nick: string;
  memberSince?: string;
  level?: number;
  levelPercent?: number;
  starGems?: number;
  avatarUrl: string;
  avatarWaveUrl?: string;
  motto?: string;
  online?: boolean;
  lastAccessTime?: string;
  ariaBusy?: boolean;
}) {
  const { nick, memberSince, level, levelPercent, starGems, avatarUrl, motto, online, lastAccessTime, ariaBusy } = props;
  const reduce = useReducedMotion();
  const lastSeen = fmtLastAccess(lastAccessTime);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={reduce ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        aria-busy={ariaBusy}
        aria-live="polite"
        className="overflow-hidden rounded-[6px] border-[#141433] bg-[#25254D] shadow-[0_18px_45px_-34px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.04)]"
      >
        <CardContent className="flex gap-4 p-4">
          <div className="relative h-[170px] w-[108px] shrink-0 overflow-hidden rounded-[6px] border border-[#141433] bg-[#303060] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="absolute inset-x-3 top-3 h-[42px] rounded-full bg-[#2596FF]/10 blur-xl" aria-hidden="true" />
            {/* Dalle (socle) : positionnée à 20px du bas */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/Plataforma.png"
              alt=""
              aria-hidden="true"
              className="absolute bottom-[20px] left-1/2 -translate-x-1/2 image-pixelated pointer-events-none"
            />
            {/* Avatar : pieds pile au centre du disque de la dalle (bottom = 20 + 26 = 46) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={`Avatar de ${nick}`}
              className="absolute left-1/2 bottom-[46px] -translate-x-1/2 image-pixelated"
            />
            {online ? (
              <span
                className="absolute bottom-2 right-2 h-3 w-3 rounded-full border-2 border-[#25254D] bg-[#0FD52F] shadow-[0_0_14px_rgba(15,213,47,0.55)]"
                aria-label="En ligne"
                title="En ligne"
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-4 py-1">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-[18px] font-extrabold text-white">{nick || "-"}</p>
                {online ? (
                  <span className="shrink-0 rounded-full border border-[#0FD52F]/25 bg-[#0FD52F]/15 px-2 py-0.5 text-[11px] font-bold text-[#49E400]">
                    En ligne
                  </span>
                ) : lastSeen ? (
                  <span className="shrink-0 rounded-full border border-white/5 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-[#BEBECE]">{lastSeen}</span>
                ) : null}
              </div>
              {memberSince ? <p className="text-[13px] font-medium text-[#BEBECE]">Inscrit le {memberSince}</p> : null}
            </div>

            <div className="space-y-3">
              {typeof level === "number" ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[16px] font-extrabold text-white">Niveau {level}</p>
                    {typeof levelPercent === "number" ? (
                      <span className="text-[11px] font-bold text-[#BEBECE]">{levelPercent}%</span>
                    ) : null}
                  </div>
                  {typeof levelPercent === "number" ? (
                    <div className="h-[7px] w-full overflow-hidden rounded-full bg-[#141433]" title={`${levelPercent}% vers le niveau ${level + 1}`}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#25B1FF] to-[#0FD52F] transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, levelPercent))}%` }}
                      />
                    </div>
                  ) : null}
                  {typeof levelPercent === "number" ? (
                    <p className="text-[11px] text-[#BEBECE]">Vers le niveau {level + 1}</p>
                  ) : null}
                </div>
              ) : null}

              {typeof starGems === "number" ? (
                <p className="inline-flex h-[32px] items-center gap-2 rounded-[5px] border border-white/5 bg-[#1F1F3E] px-3 text-[13px] font-bold text-[#DDDDDD]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/star-blue-mini.png" alt="" className="h-[16px] w-[16px] image-pixelated" />
                  {starGems.toLocaleString("fr-FR")}
                </p>
              ) : null}

              {motto ? <p className="line-clamp-2 text-[13px] leading-relaxed text-[#BEBECE]">{motto}</p> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
