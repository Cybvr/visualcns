import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "VisualCNS Pulse — Business Check-up",
  description:
    "One scan of your website, search, competitors and market. A health score, what to fix first, and opportunities you're missing.",
}

export default function PulseLayout({ children }: { children: ReactNode }) {
  return children
}
