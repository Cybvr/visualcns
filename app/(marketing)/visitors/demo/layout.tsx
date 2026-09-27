import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Visitor sign-in demo" }

export default function VisitorsDemoLayout({ children }: { children: ReactNode }) {
  return children
}
