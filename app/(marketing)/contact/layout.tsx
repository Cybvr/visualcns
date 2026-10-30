import type { ReactNode } from "react"
import { publicPageMetadata } from "@/lib/public-page-metadata"

export const metadata = publicPageMetadata({
  title: "Contact VisualCNS",
  description: "Get in touch with VisualCNS about software, products, design, and business systems.",
  path: "/contact",
})

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
