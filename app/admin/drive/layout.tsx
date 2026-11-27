import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Drive" }

export default function DriveLayout({ children }: { children: ReactNode }) {
  return children
}
