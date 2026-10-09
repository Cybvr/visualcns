import "server-only"

import type { Metadata } from "next"

import { adminServices } from "@/lib/firebase-admin"
import { companySectionTitle, dashboardClientRef, dashboardPageTitle, readableUrlPart } from "@/lib/page-titles"

const APP_NAME = "VisualCNS"
const DEFAULT_IMAGE = "/icon-512.png"

type PublicCompanyPreview = {
  name: string
  description?: string
  logoUrl?: string
}

function fullTitle(title: string) {
  return title.endsWith(`| ${APP_NAME}`) ? title : `${title} | ${APP_NAME}`
}

function safeImage(value: unknown) {
  return typeof value === "string" && (/^https?:\/\//i.test(value) || value.startsWith("/")) ? value : DEFAULT_IMAGE
}

async function publicCompanyPreview(ref: string, agencySubdomain = ""): Promise<PublicCompanyPreview | null> {
  if (!ref || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(ref)) return null
  try {
    const { db } = adminServices()
    let agencyId = ""
    if (agencySubdomain) {
      const agency = await db.collection("agencies").where("subdomain", "==", agencySubdomain).limit(1).get()
      if (agency.empty) return null
      agencyId = agency.docs[0].id
    }
    const organizations = db.collection("organizations")
    const matches = await organizations.where("slug", "==", ref.toLowerCase()).limit(10).get()
    const visible = (data: FirebaseFirestore.DocumentData | undefined) => Boolean(
      data
      && (!agencyId || data.agencyId === agencyId)
      && (data.publicVisible === true || (data.isOwner === true && data.publicVisible !== false)),
    )
    let snapshot: FirebaseFirestore.DocumentSnapshot | undefined = matches.docs.find((item) => visible(item.data()))
    if (!snapshot) {
      const legacy = await organizations.doc(ref).get()
      if (legacy.exists && visible(legacy.data())) snapshot = legacy
    }
    const data = snapshot?.data()
    if (!data) return null
    return {
      name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : readableUrlPart(ref, "Company"),
      description: typeof data.description === "string" ? data.description.trim().slice(0, 240) : undefined,
      logoUrl: safeImage(data.logoUrl),
    }
  } catch {
    return null
  }
}

function socialMetadata(title: string, description: string, url: string, image = DEFAULT_IMAGE): Pick<Metadata, "description" | "openGraph" | "twitter"> {
  const resolvedTitle = fullTitle(title)
  const resolvedImage = safeImage(image)
  return {
    description,
    openGraph: {
      title: resolvedTitle,
      description,
      url,
      siteName: APP_NAME,
      type: "website",
      images: [{ url: resolvedImage, alt: `${title} preview` }],
    },
    twitter: { card: "summary", title: resolvedTitle, description, images: [resolvedImage] },
  }
}

export async function dashboardRequestMetadata(pathname: string, search: string, agencySubdomain = ""): Promise<Metadata> {
  const searchParams = new URLSearchParams(search)
  const sectionTitle = dashboardPageTitle(pathname, searchParams)
  const companyRef = dashboardClientRef(pathname, searchParams)
  const company = companyRef ? await publicCompanyPreview(companyRef, agencySubdomain) : null
  const companyName = company?.name || (companyRef ? readableUrlPart(companyRef, "Client") : "")
  const pageTitle = companyName ? `${companyName} · ${sectionTitle}` : sectionTitle
  const description = companyName
    ? `Open ${companyName}'s ${sectionTitle.toLowerCase()} workspace in VisualCNS.`
    : `Open ${sectionTitle} in the VisualCNS dashboard.`
  const url = `${pathname}${search ? `?${searchParams.toString()}` : ""}`

  return {
    title: { default: fullTitle(pageTitle), template: `%s | ${APP_NAME}` },
    ...socialMetadata(pageTitle, description, url, company?.logoUrl),
    robots: { index: false, follow: false },
  }
}

export async function publicCompanyMetadata(ref: string, section: string | null, path: string, agencySubdomain = ""): Promise<Metadata> {
  const company = await publicCompanyPreview(ref, agencySubdomain)
  const companyName = company?.name || readableUrlPart(ref, "Company")
  const sectionTitle = section ? companySectionTitle(section) : ""
  const pageTitle = sectionTitle ? `${companyName} · ${sectionTitle}` : companyName
  const description = sectionTitle
    ? `View ${companyName}'s ${sectionTitle.toLowerCase()} page on VisualCNS.`
    : company?.description || `View ${companyName}'s company profile on VisualCNS.`
  return {
    title: fullTitle(pageTitle),
    alternates: { canonical: path },
    ...socialMetadata(pageTitle, description, path, company?.logoUrl),
  }
}
