import type { Metadata } from "next"
import type { ReactNode } from "react"

function readableCompanyName(slug: string) {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Company"
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientSlug: string }>
}): Promise<Metadata> {
  const { clientSlug } = await params
  const name = readableCompanyName(clientSlug)
  const title = `${name} | VisualCNS`
  const description = `View ${name}'s company profile on VisualCNS.`
  const path = `/${encodeURIComponent(clientSlug)}`

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website" },
    twitter: { card: "summary", title, description },
  }
}

export default function ClientSlugLayout({ children }: { children: ReactNode }) {
  return children
}
