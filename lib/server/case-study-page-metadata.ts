import "server-only"

import { adminServices } from "@/lib/firebase-admin"
import { publicPageMetadata } from "@/lib/public-page-metadata"

export async function caseStudyPageMetadata(slug: string, section: "case-studies" | "portfolio") {
  const path = `/${section}/${encodeURIComponent(slug)}`
  const fallback = publicPageMetadata({
    title: "Case Study | VisualCNS",
    description: "Explore a VisualCNS client project and the work behind it.",
    path,
  })

  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(slug)) return fallback

  try {
    const { db } = adminServices()
    const matches = await db.collection("projects").where("slug", "==", slug).limit(1).get()
    const snapshot = matches.docs[0] ?? await db.collection("projects").doc(slug).get()
    const project = snapshot.data()
    if (!project || project.isCaseStudy !== true || project.caseStudyStatus !== "published") return fallback

    const title = typeof project.title === "string" && project.title.trim() ? project.title.trim() : "Case Study"
    const description = [project.excerpt, project.description].find(
      (value): value is string => typeof value === "string" && Boolean(value.trim()),
    )?.trim() ?? "Explore a VisualCNS client project and the work behind it."
    const image = [project.imageUrl, project.thumbnailUrl].find(
      (value): value is string => typeof value === "string" && (/^https?:\/\//i.test(value) || value.startsWith("/")),
    )

    return publicPageMetadata({
      title: `${title} | VisualCNS`,
      description,
      path,
      ...(image ? { image } : {}),
    })
  } catch {
    return fallback
  }
}
