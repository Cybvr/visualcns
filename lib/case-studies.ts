import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore"
import { db } from "./firebase"
import type { Project } from "./projects"
import { tsToMillis } from "./tasks"

export interface CaseStudyProject extends Project {
  slug: string
  caseStudyStatus: "published"
  excerpt: string
  description: string
  category: string[]
  location: string
  imageUrl: string
  logoUrl: string
  gallery: string[]
  clientValuation: string
  earnings: string
  founders: string
  industry: string
  projectUrl: string
  featured: boolean
  order: number
  tags: string[]
  technologies: string[]
}

type PublishedCaseStudy = Project & { isCaseStudy: true; caseStudyStatus: "published" }

function isPublishedCaseStudy(project: Project): project is PublishedCaseStudy {
  return project.isCaseStudy === true && project.caseStudyStatus === "published"
}

function toCaseStudy(project: PublishedCaseStudy): CaseStudyProject {
  return {
    ...project,
    slug: project.slug || project.id,
    excerpt: project.excerpt ?? "",
    description: project.description ?? "",
    category: project.category ?? [],
    location: project.location ?? "",
    imageUrl: project.imageUrl || project.thumbnailUrl || "",
    logoUrl: project.logoUrl ?? "",
    gallery: project.gallery ?? [],
    clientValuation: project.clientValuation ?? "",
    earnings: project.earnings ?? "",
    founders: project.founders ?? "",
    industry: project.industry ?? "",
    projectUrl: project.projectUrl ?? "",
    featured: project.featured ?? false,
    order: project.order ?? 0,
    tags: project.tags ?? [],
    technologies: project.technologies ?? [],
  }
}

/** Published client projects selected for the public Case Studies experience. */
export async function getCaseStudyProjects(): Promise<CaseStudyProject[]> {
  const snapshot = await getDocs(query(
    collection(db, "projects"),
    where("isCaseStudy", "==", true),
    where("caseStudyStatus", "==", "published"),
  ))

  return snapshot.docs
    .map((snapshotDoc) => ({
      ...(snapshotDoc.data() as Omit<Project, "id">),
      id: snapshotDoc.id,
    }) as Project)
    .filter(isPublishedCaseStudy)
    .map(toCaseStudy)
    .sort((first, second) => {
      const firstDate = tsToMillis(first.createdAt) || tsToMillis(first.updatedAt)
      const secondDate = tsToMillis(second.createdAt) || tsToMillis(second.updatedAt)
      return secondDate - firstDate || first.order - second.order || first.id.localeCompare(second.id)
    })
}

export async function getCaseStudyProjectBySlug(slug: string): Promise<CaseStudyProject | null> {
  if (!slug) return null
  const projects = await getCaseStudyProjects()
  return projects.find((project) => project.slug === slug || project.id === slug) ?? null
}

/** Published case studies for one client - what a company's public page shows under Projects. */
export async function getCaseStudyProjectsByCompanyId(companyId: string): Promise<CaseStudyProject[]> {
  if (!companyId) return []
  const projects = await getCaseStudyProjects()
  return projects.filter((project) => project.companyId === companyId)
}
