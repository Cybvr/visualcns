import type { Metadata } from "next"
import type { ReactNode } from "react"
import { headers } from "next/headers"

import { publicCompanyMetadata } from "@/lib/server/page-metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientSlug: string; section: string }>
}): Promise<Metadata> {
  const { clientSlug, section } = await params
  const path = `/${encodeURIComponent(clientSlug)}/${encodeURIComponent(section)}`
  const requestHeaders = await headers()
  return publicCompanyMetadata(clientSlug, section, path, requestHeaders.get("x-agency-subdomain") || "")
}

export default function CompanySectionLayout({ children }: { children: ReactNode }) {
  return children
}
