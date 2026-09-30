import type { Metadata } from "next"
import type { ReactNode } from "react"

const title = "Tasks | VisualCNS"
const description = "View and manage tasks in VisualCNS."
const logo = "/icon-512.png"

export const metadata: Metadata = {
  title: "Tasks",
  description,
  alternates: { canonical: "/dashboard/tasks" },
  openGraph: {
    title,
    description,
    url: "/dashboard/tasks",
    siteName: "VisualCNS",
    type: "website",
    images: [{ url: logo, alt: "VisualCNS logo" }],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: [logo],
  },
}

export default function TasksLayout({ children }: { children: ReactNode }) {
  return children
}
