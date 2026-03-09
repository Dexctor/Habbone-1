"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

export function ProfileHeaderCard(props: {
  nick: string;
  memberSince?: string;
  level?: number;
  starGems?: number;
  avatarUrl: string;
  motto?: string;
  ariaBusy?: boolean;
}) {
  const { nick, memberSince, level, starGems, avatarUrl, motto, ariaBusy } = props;
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={reduce ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card aria-busy={ariaBusy} aria-live="polite" className="border-[#1F1F3E] bg-[#25254D]">
        <CardContent className="flex gap-3 p-4">
          <div className="relative h-[137px] w-[76px] shrink-0 overflow-hidden rounded-[3px] bg-[#303060] bg-[url('/img/Plataforma.png')] bg-bottom bg-no-repeat">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={`Avatar de ${nick}`}
              className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 image-pixelated"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-1">
              <p className="truncate text-[16px] font-bold text-white">{nick || "-"}</p>
              {memberSince ? <p className="text-[14px] text-[#BEBECE]">Inscrit le {memberSince}</p> : null}
            </div>

            <div className="space-y-2">
              {typeof level === "number" ? <p className="text-[16px] font-bold text-white">Niveau {level}</p> : null}

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
