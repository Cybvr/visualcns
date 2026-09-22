import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Team" }

export default function TeamLayout({ children }: { children: ReactNode }) {
  return children
}
