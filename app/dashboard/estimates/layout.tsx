import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Estimates" }

export default function EstimatesLayout({ children }: { children: ReactNode }) {
  return children
}
