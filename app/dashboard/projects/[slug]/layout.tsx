import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Project" }

export default function ProjectDetailLayout({ children }: { children: ReactNode }) {
  return children
}
