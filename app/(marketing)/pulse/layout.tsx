import { publicPageMetadata } from "@/lib/public-page-metadata"
import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = publicPageMetadata({
  title: "VisualCNS Pulse — Business Check-up",
  description:
    "One scan of your website, search, competitors and market. A health score, what to fix first, and opportunities you're missing.",
  path: "/pulse",
})

export default function PulseLayout({ children }: { children: ReactNode }) {
  return children
}
