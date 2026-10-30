import type { ReactNode } from "react"
import { caseStudyPageMetadata } from "@/lib/server/case-study-page-metadata"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return caseStudyPageMetadata(slug, "portfolio")
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
