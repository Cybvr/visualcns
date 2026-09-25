import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"
import { getCurrentTenantId } from "./tenancy"
import { syncPortalProject, deleteAgencyRecord } from "./portal-data"
import {
  createTask,
  deleteTask,
  getPublicTasksByProjectId,
  getTasksByProjectId,
  tsToMillis,
  updateTask,
} from "./tasks"

export type ProjectStatus = "in-progress" | "review" | "done" | "on-hold"

export interface Project {
  id: string
  tenantId?: string
  /** Matches the companyId on a user's Firestore doc - which client owns this project */
  companyId: string
  client: string
  title: string
  service: string
  status: ProjectStatus
  progress: number
  dueDate: string
  /** Organization user ids assigned to this project. */
  teamMemberIds?: string[]
  /** URL segment for the detail page. Derived from the title when unset. */
  slug?: string
  /** Cover image for the project card. Cards fall back to a lettered tile when unset. */
  thumbnailUrl?: string
  /**
   * A public project is a template: it is listed on /templates, its task names
   * are shown as the steps of the workflow, and anyone can copy it into their
   * own workspace. The task bodies are never rendered publicly, only the names.
   */
  isPublic?: boolean
  /** One-line pitch for the template card. */
  summary?: string
  /** Tools the workflow touches, rendered as chips on the template card. */
  tools?: string[]
  /** Icon key shared with the pricing cards, e.g. "orbit" or "pulse". */
  icon?: string
  /** Template price in NGN. A template with no price reads as free. */
  price?: number
  /** Prefix on the displayed price, e.g. "From ". */
  pricePrefix?: string
  /** Billing cadence shown beside the price, e.g. "Setup + monthly". */
  timeline?: string
  /** Paystack link the template's buy button opens. */
  paymentHref?: string
  /** Marks a client project as eligible for the public case-study experience. */
  isCaseStudy?: boolean
  /** Original portfolio document id. Used to make the temporary migration idempotent. */
  legacyPortfolioId?: string
  /** Publication state for a case study. Kept separate from the operational project status. */
  caseStudyStatus?: "draft" | "published"
  excerpt?: string
  description?: string
  category?: string[]
  location?: string
  imageUrl?: string
  logoUrl?: string
  gallery?: string[]
  clientValuation?: string
  earnings?: string
  founders?: string
  industry?: string
  projectUrl?: string
  featured?: boolean
  order?: number
  tags?: string[]
  technologies?: string[]
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export const projectStatusMeta: Record<ProjectStatus, { label: string; className: string }> = {
  "in-progress": { label: "In progress", className: "bg-blue-100 text-blue-700" },
  review: { label: "In review", className: "bg-amber-100 text-amber-700" },
  done: { label: "Done", className: "bg-emerald-100 text-emerald-700" },
  "on-hold": { label: "On hold", className: "bg-muted text-muted-foreground" },
}

const COLLECTION_NAME = "projects"

export async function getProjects(): Promise<Project[]> {
  const tenantId = await getCurrentTenantId()
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("tenantId", "==", tenantId)))
  return snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as Project[]
}

export async function getProjectsByCompanyId(companyId: string): Promise<Project[]> {
  if (!companyId) return []
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("tenantId", "==", await getCurrentTenantId()), where("companyId", "==", companyId)))
  return snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as Project[]
}

/** Projects explicitly marked public for an anonymous company profile. */
export async function getPublicProjectsByCompanyId(companyId: string): Promise<Project[]> {
  if (!companyId) return []
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("companyId", "==", companyId), where("isPublic", "==", true)))
  return snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as Project[]
}

export async function getProject(id: string): Promise<Project | null> {
  const snapshot = await getDoc(doc(db, COLLECTION_NAME, id))
  if (!snapshot.exists()) return null
  return { ...(snapshot.data() as object), id: snapshot.id } as Project
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Every template purchase stays on Paystack. Seeded workflows use their
 * canonical vcns links; custom templates follow the same vcns{title} pattern.
 */
export function templatePaymentHref(project: Pick<Project, "title" | "paymentHref">): string {
  const slug = slugify(project.title).replace(/-/g, "")
  const canonical: Record<string, string> = {
    marketing: "vcnsmarketing",
    orbit: "vcnsorbit",
    studio: "vcnsstudio",
    launch: "vcnslaunch",
    pulse: "vcnspulse",
    signal: "vcnssignal",
    atlas: "vcnsatlas",
  }
  const path = canonical[slug] || project.paymentHref?.trim().split("/").pop() || `vcns${slug}`
  return `https://paystack.shop/pay/${path}`
}

/**
 * The URL segment for a project. Existing docs have no stored slug, so this
 * derives one from the title and only falls back to the id for untitled work.
 */
export function projectSlug(project: Project): string {
  return project.slug || slugify(project.title) || project.id
}

/**
 * Look a project up by its URL segment. Stored slugs win; otherwise every
 * project is matched on its derived slug, and a raw id still resolves so older
 * links keep working.
 */
export async function getProjectBySlug(slug: string): Promise<Project | null> {
  if (!slug) return null

  const stored = await getDocs(query(collection(db, COLLECTION_NAME), where("tenantId", "==", await getCurrentTenantId()), where("slug", "==", slug)))
  if (!stored.empty) {
    const first = stored.docs[0]
    return { ...(first.data() as object), id: first.id } as Project
  }

  const all = await getProjects()
  return all.find((project) => projectSlug(project) === slug) ?? all.find((project) => project.id === slug) ?? null
}

export async function createProject(data: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const tenantId = await getCurrentTenantId()
  const ref = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    tenantId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return ref.id
}

export async function updateProject(id: string, data: Partial<Omit<Project, "id" | "createdAt">>): Promise<void> {
  await syncPortalProject(id, data)
}

export async function deleteProject(id: string): Promise<void> {
  await deleteAgencyRecord("projects", id)
}

/**
 * Copies a project and its tasks inside the same workspace. The copy starts
 * over: back to the backlog at zero progress, unpublished, and with a slug of
 * its own so it never collides with the original.
 */
export async function duplicateProject(project: Project): Promise<string> {
  const copyId = await createProject({
    companyId: project.companyId,
    client: project.client,
    title: `${project.title} copy`,
    service: project.service,
    status: "in-progress",
    progress: 0,
    dueDate: project.dueDate,
    slug: `${slugify(project.title)}-copy-${Date.now()}`,
    thumbnailUrl: project.thumbnailUrl ?? "",
    summary: project.summary ?? "",
    tools: project.tools ?? [],
    icon: project.icon ?? "",
    isPublic: false,
  })

  const tasks = await getTasksByProjectId(project.id)
  // Sequential so createdAt increments and the original task order survives.
  for (const task of tasks) {
    await createTask({
      name: task.name,
      companyId: project.companyId,
      client: project.client,
      projectId: copyId,
      project: `${project.title} copy`,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      content: task.content,
      isPublic: false,
    })
  }

  return copyId
}

/** Deletes a project along with every task filed under it. */
export async function deleteProjectWithTasks(projectId: string): Promise<void> {
  const tasks = await getTasksByProjectId(projectId)
  for (const task of tasks) {
    await deleteTask(task.id)
  }
  await deleteProject(projectId)
}

/** Renames a project, and keeps the denormalized project name on its tasks in step. */
export async function renameProject(projectId: string, title: string): Promise<void> {
  await updateProject(projectId, { title, slug: slugify(title) })

  const tasks = await getTasksByProjectId(projectId)
  for (const task of tasks) {
    if (task.project === title) continue
    await updateTask(task.id, { project: title })
  }
}

/** Every project published as a template, oldest first so the order is stable. */
export async function getTemplates(): Promise<Project[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("isPublic", "==", true)))
  const templates = snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as Project[]
  return templates.sort((a, b) => tsToMillis(a.createdAt) - tsToMillis(b.createdAt))
}

/**
 * The steps of a template, which are just its task names. The bodies are
 * fetched but never rendered publicly - the templates page lists names only.
 */
export async function getTemplateSteps(templateId: string): Promise<string[]> {
  const tasks = await getPublicTasksByProjectId(templateId)
  return tasks.map((task) => task.name)
}

/** The template listing fields a publisher fills in. */
export interface TemplateDetails {
  summary: string
  price: number
  timeline: string
  paymentHref: string
}

/**
 * Lists a project on /templates. The project and every one of its tasks are
 * marked public together, since the rules open each doc up individually and
 * the steps are useless without the project.
 */
export async function publishTemplate(projectId: string, details: TemplateDetails): Promise<void> {
  await updateProject(projectId, { isPublic: true, ...details })

  const steps = await getTasksByProjectId(projectId)
  for (const step of steps) {
    if (step.isPublic) continue
    await updateTask(step.id, { isPublic: true })
  }
}

/** Takes a template off /templates and closes its steps back up. */
export async function unpublishTemplate(projectId: string): Promise<void> {
  await updateProject(projectId, { isPublic: false })

  const steps = await getTasksByProjectId(projectId)
  for (const step of steps) {
    if (!step.isPublic) continue
    await updateTask(step.id, { isPublic: false })
  }
}

/**
 * Copies a template and its tasks into a client's workspace as a fresh
 * project. Tasks come across with their bodies intact but reset to the
 * backlog with no due date, since the client is starting the work now.
 */
export async function createProjectFromTemplate(
  template: Project,
  companyId: string,
  clientName: string,
): Promise<string> {
  const projectId = await createProject({
    companyId,
    client: clientName,
    title: template.title,
    service: template.service,
    status: "in-progress",
    progress: 0,
    dueDate: "",
    // Titles repeat once several clients run the same template, and
    // getProjectBySlug looks across every project, so the copy stores a slug
    // scoped to its owner instead of deriving a colliding one from the title.
    slug: `${slugify(template.title)}-${slugify(companyId)}`,
    thumbnailUrl: template.thumbnailUrl ?? "",
    summary: template.summary ?? "",
    tools: template.tools ?? [],
    icon: template.icon ?? "",
    isPublic: false,
  })

  // The public query, because the template belongs to another workspace and
  // that is the only way its steps are readable from here.
  const steps = await getPublicTasksByProjectId(template.id)
  // Sequential so createdAt increments and the template's step order survives.
  for (const step of steps) {
    await createTask({
      name: step.name,
      companyId,
      client: clientName,
      projectId,
      project: template.title,
      status: "todo",
      priority: step.priority,
      dueDate: "",
      content: step.content,
      isPublic: false,
    })
  }

  return projectId
}
