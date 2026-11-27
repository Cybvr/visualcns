import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Contract" }

export default function ContractDetailLayout({ children }: { children: ReactNode }) {
  return children
}
