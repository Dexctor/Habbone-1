"use client"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

export type ForumCardProps = {
  title: string
  author: string
  thumb?: string
  href: string
}

export default function ForumCard({ title, author, thumb, href }: ForumCardProps) {
  const [imgError, setImgError] = useState(false)
  const showThumb = thumb && !imgError

  return (
    <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="transition-colors hover:bg-bg-500/50">
        <CardContent className="flex items-center gap-3 p-3">
          {showThumb ? (
            <div className="relative h-16 w-16 overflow-hidden rounded bg-muted">
              <Image src={thumb} alt="topic" fill className="object-cover" onError={() => setImgError(true)} />
            </div>
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/forum.png" alt="" className="h-8 w-8 opacity-50 image-pixelated" />
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-medium">{title}</div>
            <div className="truncate text-xs text-muted-foreground">{author}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

