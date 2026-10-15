import "server-only"

import type { Metadata } from "next"

import { adminServices } from "@/lib/firebase-admin"
import { companySectionTitle, dashboardClientRef, dashboardPageTitle, readableUrlPart } from "@/lib/page-titles"

const APP_NAME = "VisualCNS"
const DEFAULT_IMAGE = "/icon-512.png"

type PublicCompanyPreview = {
  id: string
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
    if (!snapshot || !data) return null
    return {
      id: snapshot.id,
      name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : readableUrlPart(ref, "Company"),
      description: typeof data.description === "string" ? data.description.trim().slice(0, 240) : undefined,
      logoUrl: safeImage(data.logoUrl),
    }
  } catch {
    return null
  }
}

function socialMetadata(title: string, description: string, url: string, image = DEFAULT_IMAGE, largeImage = false): Pick<Metadata, "description" | "openGraph" | "twitter"> {
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
    twitter: { card: largeImage ? "summary_large_image" : "summary", title: resolvedTitle, description, images: [resolvedImage] },
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

/** Turns a caption into one line short enough for a link preview. */
function previewText(value: unknown, max = 200) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

const isRecordId = (value?: string): value is string => Boolean(value && /^[a-zA-Z0-9_-]{1,128}$/.test(value))

/**
 * A shared campaign or post link (?campaign=…&post=…) previews that post's
 * title, caption and picture, or the campaign's name and cover. Anything that
 * can't be found, or belongs to another company, gets the company card.
 */
export async function publicProjectsMetadata(
  ref: string,
  section: string,
  path: string,
  query: { campaign?: string; post?: string },
  agencySubdomain = "",
): Promise<Metadata> {
  const fallback = () => publicCompanyMetadata(ref, section, path, agencySubdomain)
  if (!isRecordId(query.campaign) && !isRecordId(query.post)) return fallback()
  const company = await publicCompanyPreview(ref, agencySubdomain)
  if (!company) return fallback()

  const params = new URLSearchParams()
  if (isRecordId(query.campaign)) params.set("campaign", query.campaign)
  if (isRecordId(query.post)) params.set("post", query.post)
  const url = `${path}?${params.toString()}`

  try {
    const { db } = adminServices()
    const campaignSnap = isRecordId(query.campaign) ? await db.collection("projects").doc(query.campaign).get() : null
    const campaign = campaignSnap?.data()?.companyId === company.id ? campaignSnap.data() : undefined
    const campaignTitle = typeof campaign?.title === "string" ? campaign.title.trim() : ""
    const campaignImage = typeof campaign?.thumbnailUrl === "string" && campaign.thumbnailUrl ? campaign.thumbnailUrl : undefined

    if (isRecordId(query.post)) {
      const post = (await db.collection("campaignCreatives").doc(query.post).get()).data()
      if (post && post.companyId === company.id && (!campaign || post.projectId === campaignSnap?.id)) {
        const postTitle = typeof post.title === "string" && post.title.trim() ? post.title.trim() : "Post"
        const title = `${postTitle} · ${company.name}`
        const description = previewText(post.body) || `A post from ${campaignTitle || `${company.name}'s campaign`} on ${APP_NAME}.`
        const picture = post.mediaType !== "video" && typeof post.mediaUrl === "string" && post.mediaUrl ? post.mediaUrl : campaignImage
        return {
          title: fullTitle(title),
          alternates: { canonical: url },
          ...socialMetadata(title, description, url, picture || company.logoUrl, Boolean(picture)),
        }
      }
    }

    if (campaign && campaignTitle) {
      const title = `${campaignTitle} · ${company.name}`
      const description = previewText(campaign.summary) || `See ${company.name}'s ${campaignTitle} campaign on ${APP_NAME}.`
      return {
        title: fullTitle(title),
        alternates: { canonical: url },
        ...socialMetadata(title, description, url, campaignImage || company.logoUrl, Boolean(campaignImage)),
      }
    }
  } catch {
    // Falls back to the company card below.
  }
  return fallback()
}
