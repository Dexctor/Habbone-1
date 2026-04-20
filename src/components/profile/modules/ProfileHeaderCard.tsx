"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  const { nick, memberSince, level, levelPercent, starGems, avatarUrl, avatarWaveUrl, motto, online, lastAccessTime, ariaBusy } = props;
  const reduce = useReducedMotion();
  const lastSeen = fmtLastAccess(lastAccessTime);
  const [hovering, setHovering] = useState(false);
  const displayAvatar = hovering && avatarWaveUrl ? avatarWaveUrl : avatarUrl;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={reduce ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card aria-busy={ariaBusy} aria-live="polite" className="border-[#1F1F3E] bg-[#25254D]">
        <CardContent className="flex gap-3 p-4">
          <div
            className="group relative h-[160px] w-[100px] shrink-0 cursor-pointer overflow-hidden rounded-[3px] bg-[#303060]"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onFocus={() => setHovering(true)}
            onBlur={() => setHovering(false)}
            tabIndex={0}
            aria-label={`Avatar de ${nick}`}
          >
            {/* Preload the wave avatar to avoid flicker on first hover */}
            {avatarWaveUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarWaveUrl} alt="" aria-hidden="true" className="absolute -z-10 h-0 w-0 opacity-0" />
            ) : null}

            {/* Dalle (socle) au fond, centrée horizontalement */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/Plataforma.png"
              alt=""
              aria-hidden="true"
              className="absolute bottom-[15px] left-1/2 -translate-x-1/2 image-pixelated pointer-events-none"
            />
            {/* Avatar par-dessus la dalle, pieds au centre du disque */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayAvatar}
              alt={`Avatar de ${nick}`}
              className="absolute left-1/2 bottom-[32px] image-pixelated transition-transform duration-200 group-hover:scale-[1.15]"
              style={{ transform: 'translateX(-50%) scale(1.1)', transformOrigin: 'bottom center' }}
            />

            {/* Bulle "Salut !" au hover */}
            <AnimatePresence>
              {hovering && !reduce ? (
                <motion.div
                  key="salut"
                  initial={{ opacity: 0, y: -4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#2596FF] shadow-[0_2px_6px_rgba(0,0,0,0.35)] ring-1 ring-black/10"
                  aria-hidden="true"
                >
                  Salut !
                  <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-white" />
                </motion.div>
              ) : null}
            </AnimatePresence>

            {online ? (
              <span
                className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-[#25254D] bg-green-500"
                aria-label="En ligne"
                title="En ligne"
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[16px] font-bold text-white">{nick || "-"}</p>
                {online ? (
                  <span className="shrink-0 rounded-full bg-green-500/20 px-2 py-0.5 text-[11px] font-bold text-green-400">
                    En ligne
                  </span>
                ) : lastSeen ? (
                  <span className="shrink-0 text-[11px] text-[#BEBECE]">{lastSeen}</span>
                ) : null}
              </div>
              {memberSince ? <p className="text-[14px] text-[#BEBECE]">Inscrit le {memberSince}</p> : null}
            </div>

            <div className="space-y-2">
              {typeof level === "number" ? (
                <div className="space-y-1">
                  <p className="text-[16px] font-bold text-white">Niveau {level}</p>
                  {typeof levelPercent === "number" ? (
                    <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#1F1F3E]" title={`${levelPercent}% vers le niveau ${level + 1}`}>
                      <div
                        className="h-full rounded-full bg-[#2596FF] transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, levelPercent))}%` }}
                      />
                    </div>
                  ) : null}
                  {typeof levelPercent === "number" ? (
                    <p className="text-[11px] text-[#BEBECE]">{levelPercent}% vers le niveau {level + 1}</p>
                  ) : null}
                </div>
              ) : null}

              {typeof starGems === "number" ? (
                <p className="inline-flex items-center gap-2 text-[14px] text-[#DDDDDD]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/star-blue-mini.png" alt="" className="h-[16px] w-[16px] image-pixelated" />
                  {starGems}
                </p>
              ) : null}

              {motto ? <p className="truncate text-[13px] text-[#BEBECE]">{motto}</p> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
