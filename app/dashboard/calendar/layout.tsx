import type { Metadata } from "next"
import type { ReactNode } from "react"

const title = "Calendar | VisualCNS"
const description = "Manage company bookings in VisualCNS."
const logo = "/icon-512.png"

export const metadata: Metadata = {
  title: "Calendar",
  description,
  alternates: { canonical: "/dashboard/calendar" },
  openGraph: { title, description, url: "/dashboard/calendar", siteName: "VisualCNS", type: "website", images: [{ url: logo, alt: "VisualCNS logo" }] },
  twitter: { card: "summary", title, description, images: [logo] },
}

export default function CalendarLayout({ children }: { children: ReactNode }) {
  return children
}
