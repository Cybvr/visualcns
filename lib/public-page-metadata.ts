import type { Metadata } from "next"

const SOCIAL_IMAGE = "/icon-512.png"

/** Keep search and social previews in sync for each public page. */
export function publicPageMetadata({
  title,
  description,
  path,
  image = SOCIAL_IMAGE,
}: {
  title: string
  description: string
  path: string
  image?: string
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "VisualCNS",
      type: "website",
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [image],
    },
  }
}
