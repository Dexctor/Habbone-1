"use client"
import React, { useState } from "react"
import { toast } from "sonner"
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
}

function habboHeadUrl(nick?: string) {
  const safe = String(nick || "").trim()
  return buildHabboAvatarUrl(safe, {
    direction: 2,
    head_direction: 3,
    img_format: "png",
    gesture: "sml",
    headonly: 0,
    size: "m",
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
}: CommentBubbleProps) {
  const imgSrc = habboHeadUrl(avatarNick || author)
  const [likeCount, setLikeCount] = useState(likes)
  const [liking, setLiking] = useState(false)
  const likeLabel = liking ? "..." : likeCount > 0 ? `Liker (${likeCount})` : "Liker"
  const resolvedLikeEndpoint = likeEndpoint ?? (id ? `/api/forum/comments/${id}/like` : null)
  const resolvedReportEndpoint = reportEndpoint === undefined ? (id ? `/api/forum/comments/${id}/report` : null) : reportEndpoint

  const onLike = async () => {
    if (!canInteract || !id || liking || !resolvedLikeEndpoint) return
    setLiking(true)
    try {
      const res = await fetch(resolvedLikeEndpoint, { method: "POST" })
      const json = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(json?.error || "LIKE_FAILED")
      setLikeCount((count) => (json?.liked ? count + 1 : Math.max(0, count - 1)))
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
        className="h-[62px] w-[54px] flex-shrink-0 object-contain image-pixelated"
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
              <span className="text-[#BEBECE]">{author || "Anonyme"}</span>
              {date ? (
                <span className="text-[11px] text-[#BEBECE]/50">{date}</span>
              ) : null}
            </div>

            {showActions ? (
              <span className="inline-flex items-center gap-3">
                <button
                  type="button"
                  onClick={onLike}
                  className="text-[#2596FF] hover:underline"
                  aria-label="Liker ce commentaire"
                >
                  {likeLabel}
                </button>
                {resolvedReportEndpoint ? (
                  <button
                    type="button"
                    onClick={onReport}
                    className="text-[#BEBECE] hover:underline"
                    aria-label="Signaler ce commentaire"
                  >
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
