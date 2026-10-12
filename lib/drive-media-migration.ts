import { addCampaignCreative, getCompanyCampaignFileUrls } from "./campaign-creatives"
import { mediaKindForUrl } from "./media"
import { getOrganizations } from "./organizations"
import { getProjects, type Project } from "./projects"
import { tsToMillis } from "./tasks"

function nameFromUrl(url: string) {
  let last = url.split("?")[0].split("/").pop() ?? ""
  try { last = decodeURIComponent(last) } catch { /* keep it as is */ }
  return last.replace(/^\d+_/, "").replace(/\.[^.]+$/, "") || "Media"
}

/**
 * The old Drive tab showed, for each client, the files uploaded to the client
 * plus every campaign's cover, logo and gallery. Media now lives in each
 * campaign's Media tab, so this copies a campaign's own images into that
 * campaign, and the client-wide uploads and logo into the client's newest
 * campaign. Files already in one of the client's campaigns are skipped, so it is
 * safe to run again. Nothing is deleted from where it was.
 */
export async function moveAllDriveMediaToCampaigns() {
  const [organizations, projects] = await Promise.all([getOrganizations(), getProjects()])
  const byCompany = new Map<string, Project[]>()
  for (const project of projects) {
    if (!project.companyId) continue
    byCompany.set(project.companyId, [...(byCompany.get(project.companyId) ?? []), project])
  }

  let moved = 0
  const clientsMoved = new Set<string>()
  const skipped: string[] = []

  for (const organization of organizations) {
    const clientWide = [organization.logoUrl, ...(organization.media ?? [])].filter((url): url is string => Boolean(url))
    if (clientWide.length && !byCompany.has(organization.id)) skipped.push(organization.name || organization.id)
  }

  for (const [companyId, companyProjects] of byCompany) {
    const organization = organizations.find((item) => item.id === companyId)
    const latest = [...companyProjects].sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt))[0]
    const planned: { url: string; project: Project }[] = []
    for (const project of companyProjects) {
      for (const url of [project.imageUrl || project.thumbnailUrl, project.logoUrl, ...(project.gallery ?? [])]) {
        if (url) planned.push({ url, project })
      }
    }
    for (const url of [organization?.logoUrl, ...(organization?.media ?? [])]) {
      if (url) planned.push({ url, project: latest })
    }
    if (planned.length === 0) continue

    const kept = await getCompanyCampaignFileUrls(companyId)
    for (const { url, project } of planned) {
      if (kept.has(url)) continue
      kept.add(url)
      await addCampaignCreative(
        { agencyId: project.agencyId || organization?.agencyId, companyId, projectId: project.id },
        { title: nameFromUrl(url), url, type: mediaKindForUrl(url), kind: "media" },
      )
      moved += 1
      clientsMoved.add(companyId)
    }
  }

  return { moved, clients: clientsMoved.size, skipped }
}
