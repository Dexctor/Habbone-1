import type { SyntheticEvent } from "react";
import { mediaUrl } from "@/lib/media-url";

const SHOP_IMAGE_FALLBACK = "/img/box.png";

export function shopImageSrc(value?: string | null) {
  const raw = value?.trim() || "";
  return mediaUrl(raw) || raw || SHOP_IMAGE_FALLBACK;
}

export function setShopImageFallback(event: SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.src.endsWith(SHOP_IMAGE_FALLBACK)) return;
  event.currentTarget.src = SHOP_IMAGE_FALLBACK;
}
