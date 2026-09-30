import type { Metadata } from "next"
import type { ReactNode } from "react"

const title = "All Chats | VisualCNS"
const description = "Find and reopen your previous chats in VisualCNS."
const logo = "/icon-512.png"

export const metadata: Metadata = {
  title: "All Chats",
  description,
  alternates: { canonical: "/dashboard/chats" },
  openGraph: {
    title,
    description,
    url: "/dashboard/chats",
    siteName: "VisualCNS",
    type: "website",
    images: [{ url: logo, alt: "VisualCNS logo" }],
  },
  twitter: { card: "summary", title, description, images: [logo] },
}

export default function ChatsLayout({ children }: { children: ReactNode }) {
  return children
}
