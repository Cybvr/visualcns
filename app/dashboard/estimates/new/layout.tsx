import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "New Estimate" }

export default function NewEstimateLayout({ children }: { children: ReactNode }) {
  return children
}
