"use client"
import React, { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Heart, Flag } from "lucide-react"
import { buildHabboAvatarUrl } from "@/lib/habbo-imaging"

type CommentBubbleProps = {
  id?: number
  author: string
  date?: string | null
  html: string
  likes?: number
  avatarNick?: string
  canInteract?: boolean
  showActions?: boolean
  likeEndpoint?: string
  reportEndpoint?: string | null
  roleBadge?: string | null
}

function habboHeadUrl(nick?: string) {
  const safe = String(nick || "").trim()
  return buildHabboAvatarUrl(safe, {
    direction: 2,
    head_direction: 3,
    img_format: "png",
    gesture: "sml",
    headonly: 1,
    size: "l",
  })
}

export default function CommentBubble({
  id,
  author,
  date,
  html,
  likes = 0,
  avatarNick,
  canInteract = false,
  showActions = true,
  likeEndpoint,
  reportEndpoint,
  roleBadge,
}: CommentBubbleProps) {
  const imgSrc = habboHeadUrl(avatarNick || author)
  const [likeCount, setLikeCount] = useState(likes)
  const [liking, setLiking] = useState(false)
  const [liked, setLiked] = useState(false)
  const resolvedLikeEndpoint = likeEndpoint ?? (id ? `/api/forum/comments/${id}/like` : null)
  const resolvedReportEndpoint = reportEndpoint === undefined ? (id ? `/api/forum/comments/${id}/report` : null) : reportEndpoint

  const onLike = async () => {
    if (!canInteract || !id || liking || !resolvedLikeEndpoint) return
    setLiking(true)
    try {
      const res = await fetch(resolvedLikeEndpoint, { method: "POST" })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(json?.error || "LIKE_FAILED")
      const isLiked = !!json?.liked
      setLiked(isLiked)
      setLikeCount((count) => (isLiked ? count + 1 : Math.max(0, count - 1)))
    } catch (error: any) {
      toast.error(error?.message || "Action impossible")
    } finally {
      setLiking(false)
    }
  }

  const onReport = async () => {
    if (!canInteract || !id || !resolvedReportEndpoint) return
    try {
      const res = await fetch(resolvedReportEndpoint, { method: "POST" })
      if (!res.ok) throw new Error("REPORT_FAILED")
      toast.success("Merci pour le signalement")
    } catch (error: any) {
      toast.error(error?.message || "Signalement impossible")
    }
  }

  return (
    <div className="flex items-start gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={author ? `Avatar de ${author}` : "Avatar Habbo"}
        className="h-[58px] w-[58px] flex-shrink-0 object-contain image-pixelated"
        loading="lazy"
      />

      <div className="relative min-w-0 flex-1">
        <span
          aria-hidden
          className="absolute left-0 top-[26px] h-[15px] w-[15px] -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-[#141433] bg-[#272746]"
        />

        <div className="rounded-[4px] border border-[#141433] bg-[#272746] px-4 py-4">
          <div className="max-w-none text-[14px] leading-relaxed text-white" dangerouslySetInnerHTML={{ __html: html || "" }} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(255,255,255,0.1)] pt-2 text-[13px]">
            <div className="flex items-center gap-2 truncate">
              {roleBadge && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={roleBadge} alt="" className="h-[22px] w-[22px] image-pixelated shrink-0" />
              )}
              <Link href={`/profile?user=${encodeURIComponent(author || "Anonyme")}`} className="text-[#BEBECE] hover:text-[#2596FF] hover:underline transition">{author || "Anonyme"}</Link>
              {date ? (
                <span className="text-[11px] text-[#BEBECE]/50">{date}</span>
              ) : null}
            </div>

            {showActions ? (
              <span className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={onLike}
                  disabled={liking}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all duration-200 ${
                    liked
                      ? "bg-[#E11D48]/15 text-[#FB7185] hover:bg-[#E11D48]/25"
                      : "bg-[rgba(255,255,255,0.06)] text-[#BEBECE] hover:bg-[rgba(255,255,255,0.12)] hover:text-white"
                  } ${liking ? "opacity-60" : ""}`}
                  aria-label="Liker ce commentaire"
                >
                  <Heart className={`h-3.5 w-3.5 transition-all duration-200 ${liked ? "fill-[#FB7185] text-[#FB7185] scale-110" : ""}`} />
                  {likeCount > 0 ? likeCount : "Liker"}
                </button>
                {resolvedReportEndpoint ? (
                  <button
                    type="button"
                    onClick={onReport}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium text-[#BEBECE]/60 transition-all duration-200 hover:bg-[rgba(255,255,255,0.06)] hover:text-[#BEBECE]"
                    aria-label="Signaler ce commentaire"
                  >
                    <Flag className="h-3 w-3" />
                    Signaler
                  </button>
                ) : null}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
