import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "New Contract" }

export default function NewContractLayout({ children }: { children: ReactNode }) {
  return children
}
