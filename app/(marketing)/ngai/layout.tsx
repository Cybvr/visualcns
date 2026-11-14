import { publicPageMetadata } from "@/lib/public-page-metadata"
import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = publicPageMetadata({
  title: "Ngai — Build apps and websites by chatting",
  description:
    "Describe what you want and Ngai builds it: web apps, websites, online stores, dashboards and portfolios, live in minutes. No code.",
  path: "/ngai",
})

export default function NgaiLayout({ children }: { children: ReactNode }) {
  return children
}
