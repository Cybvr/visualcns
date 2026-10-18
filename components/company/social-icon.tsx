import { AtSign, Facebook, Instagram, Linkedin, MapPin, Music2, Share2, Twitter, Youtube, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const ICONS: Record<string, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
  twitter: Twitter,
  tiktok: Music2,
  threads: AtSign,
  google: MapPin,
}

/** A social platform's mark. */
export function SocialIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = ICONS[platform] ?? Share2
  return <Icon className={cn("size-4 shrink-0", className)} aria-hidden="true" />
}
