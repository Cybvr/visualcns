import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "SEO" }

export default function SeoLayout({ children }: { children: ReactNode }) {
  return children
}
