import { publicPageMetadata } from "@/lib/public-page-metadata"
import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = publicPageMetadata({
  title: "VisualCNS Sites",
  description:
    "Describe your business and AI builds your website in minutes, then you publish it, connect your own domain and collect enquiries in one inbox. Included in every Growth plan.",
  path: "/sites",
})

export default function SitesLayout({ children }: { children: ReactNode }) {
  return children
}
