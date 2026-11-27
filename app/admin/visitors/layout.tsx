import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Visitors" }

export default function VisitorsLayout({ children }: { children: ReactNode }) {
  return children
}
