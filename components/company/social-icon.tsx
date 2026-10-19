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

const ICON_COLORS: Record<string, string> = {
  instagram: "text-[#E4405F]",
  facebook: "text-[#1877F2]",
  linkedin: "text-[#0A66C2]",
  youtube: "text-[#FF0000]",
  twitter: "text-black dark:text-white",
  tiktok: "text-[#00B5B5]",
  threads: "text-black dark:text-white",
  google: "text-[#4285F4]",
}

/** A social platform's mark. */
export function SocialIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = ICONS[platform]
  return Icon
    ? <Icon className={cn("size-4 shrink-0", ICON_COLORS[platform], className)} aria-hidden="true" />
    : <Share2 className={cn("size-4 shrink-0", className)} aria-hidden="true" />
}
