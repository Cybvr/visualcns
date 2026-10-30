import type { ReactNode } from "react"
import { publicPageMetadata } from "@/lib/public-page-metadata"

export const metadata = publicPageMetadata({
  title: "Services | VisualCNS",
  description: "Explore VisualCNS services in brand design, product experience, software, and business systems.",
  path: "/services",
})

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
