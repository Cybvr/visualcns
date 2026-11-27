import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Chat" }

export default function LegacyAgentLayout({ children }: { children: ReactNode }) {
  return children
}
