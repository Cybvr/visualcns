import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Agent" }

export default function AgentLayout({ children }: { children: ReactNode }) {
  return children
}
