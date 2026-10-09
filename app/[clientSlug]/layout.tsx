import type { Metadata } from "next"
import type { ReactNode } from "react"
import { headers } from "next/headers"

import { publicCompanyMetadata } from "@/lib/server/page-metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientSlug: string }>
}): Promise<Metadata> {
  const { clientSlug } = await params
  const path = `/${encodeURIComponent(clientSlug)}`
  const requestHeaders = await headers()
  return publicCompanyMetadata(clientSlug, null, path, requestHeaders.get("x-agency-subdomain") || "")
}

export default function ClientSlugLayout({ children }: { children: ReactNode }) {
  return children
}
