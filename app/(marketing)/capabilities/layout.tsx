import { publicPageMetadata } from "@/lib/public-page-metadata"
import type React from "react"

import "./capabilities.css"

export const metadata = publicPageMetadata({
  title: "Services | VisualCNS",
  description: "Explore VisualCNS services in brand design, product experience, software, and business systems.",
  path: "/capabilities",
})

export default function CapabilitiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
