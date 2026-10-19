import { Share2 } from "lucide-react"
import { FaLinkedin } from "react-icons/fa"
import { SiFacebook, SiGoogle, SiInstagram, SiThreads, SiTiktok, SiX, SiYoutube } from "react-icons/si"
import type { IconType } from "react-icons"

import { cn } from "@/lib/utils"

const ICONS: Record<string, IconType> = {
  instagram: SiInstagram,
  facebook: SiFacebook,
  linkedin: FaLinkedin,
  youtube: SiYoutube,
  twitter: SiX,
  tiktok: SiTiktok,
  threads: SiThreads,
  google: SiGoogle,
}

/** A social platform's mark. */
export function SocialIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = ICONS[platform]
  return Icon
    ? <Icon className={cn("size-4 shrink-0", className)} aria-hidden="true" />
    : <Share2 className={cn("size-4 shrink-0", className)} aria-hidden="true" />
}
