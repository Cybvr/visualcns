import type { ReactNode } from "react"
import { publicPageMetadata } from "@/lib/public-page-metadata"

export const metadata = publicPageMetadata({
  title: "Cart | VisualCNS",
  description: "Review your VisualCNS selections before checkout.",
  path: "/cart",
})

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
