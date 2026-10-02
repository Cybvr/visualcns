import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Notes" }

export default function NotesLayout({ children }: { children: ReactNode }) {
  return children
}
