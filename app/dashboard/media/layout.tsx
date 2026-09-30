import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Media",
  description: "Manage and share files in VisualCNS.",
  alternates: { canonical: "/dashboard/media" },
}

export default function MediaLayout({ children }: { children: ReactNode }) {
  return children
}
