import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Data" }

export default function DataLayout({ children }: { children: ReactNode }) {
  return children
}
