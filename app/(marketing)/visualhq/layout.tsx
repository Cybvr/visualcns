import type { ReactNode } from "react"
import { publicPageMetadata } from "@/lib/public-page-metadata"

export const metadata = publicPageMetadata({
  title: "VisualHQ | VisualCNS",
  description: "VisualHQ designs, engineers, and supports digital products and business systems.",
  path: "/visualhq",
})

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
