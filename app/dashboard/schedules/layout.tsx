import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Schedules" }

export default function SchedulesLayout({ children }: { children: ReactNode }) {
  return children
}
