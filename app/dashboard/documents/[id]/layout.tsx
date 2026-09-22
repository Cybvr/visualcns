import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Document" }

export default function DocumentDetailLayout({ children }: { children: ReactNode }) {
  return children
}
