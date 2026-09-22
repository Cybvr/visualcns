import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Tasks" }

export default function TasksLayout({ children }: { children: ReactNode }) {
  return children
}
