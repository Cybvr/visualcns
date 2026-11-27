import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Artifacts" }

export default function ArtifactsLayout({ children }: { children: ReactNode }) {
  return children
}
