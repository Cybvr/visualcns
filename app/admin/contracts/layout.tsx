import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Contracts" }

export default function ContractsLayout({ children }: { children: ReactNode }) {
  return children
}
