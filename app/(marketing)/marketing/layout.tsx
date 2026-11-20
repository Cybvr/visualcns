import { publicPageMetadata } from "@/lib/public-page-metadata"
import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = publicPageMetadata({
  title: "VisualCNS Marketing Suite",
  description:
    "AI that runs your marketing: it writes and schedules your social posts, works your SEO, replies to reviews and builds your ads, from one dashboard.",
  path: "/marketing",
})

export default function MarketingSuiteLayout({ children }: { children: ReactNode }) {
  return children
}
