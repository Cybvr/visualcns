import { slugify } from "./slugs"
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
import { getCurrentAgencyId } from "./agency-scope"
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
  agencyId?: string
  /** Matches the companyId on a user's Firestore doc - which client owns this project */
  companyId: string
  client: string
  title: string
  service: string
  status: ProjectStatus
  /** Archived campaigns stay available in the agency's Archive view. */
  isArchived?: boolean
  progress: number
  dueDate: string
  /** Client team member ids assigned to this project. */
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
  /** Cadence shown on the template, e.g. "Setup + monthly". */
  timeline?: string
  /** Marks a client project as eligible for the public case-study experience. */
  isCaseStudy?: boolean
  /** Original portfolio document id. Used to make the temporary migration idempotent. */
  legacyPortfolioId?: string
  /** Publication state for a case study. Kept separate from the operational project status. */
  caseStudyStatus?: "draft" | "published"
  excerpt?: string
  description?: string
  /** The one claim a campaign is built on, shown at the top of its Brief. */
  angle?: string
  /** What the event or product is, at the top of the Brief. */
  about?: string
  /** How many creators the campaign aims for, e.g. "80–100". */
  rosterTarget?: string
  /** Kinds of creators to look for, suggested by Ngai. */
  creatorSuggestions?: string[]
  category?: string[]
  location?: string
  imageUrl?: string
  /** Newest image found in this campaign's media, used as the default cover. */
  campaignImageUrl?: string
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

export function projectLastActivity(project: Pick<Project, "updatedAt" | "createdAt">): number {
  return Math.max(tsToMillis(project.updatedAt), tsToMillis(project.createdAt))
}

/** Projects are active for 30 days after creation or their latest update. */
export function isProjectArchived(project: Project, now = Date.now()): boolean {
  return Boolean(project.isArchived) || projectLastActivity(project) < now - 30 * 24 * 60 * 60 * 1000
}

export const projectStatusMeta: Record<ProjectStatus, { label: string; className: string }> = {
  "in-progress": { label: "In progress", className: "bg-blue-100 text-blue-700" },
  review: { label: "In review", className: "bg-amber-100 text-amber-700" },
  done: { label: "Done", className: "bg-emerald-100 text-emerald-700" },
  "on-hold": { label: "On hold", className: "bg-muted text-muted-foreground" },
}

const COLLECTION_NAME = "projects"

function mediaImageUrl(data: Record<string, unknown>) {
  if (data.type === "image" && typeof data.url === "string" && data.url) return data.url
  if (data.mediaType === "image" && typeof data.mediaUrl === "string" && data.mediaUrl) return data.mediaUrl
  return ""
}

/** Attach the newest usable image from each campaign's media collection. */
async function withCampaignImages(projects: Project[], field: "agencyId" | "companyId", value: string): Promise<Project[]> {
  if (!projects.length || !value) return projects
  const snapshot = await getDocs(query(collection(db, "campaignCreatives"), where(field, "==", value)))
  const images = new Map<string, { url: string; at: number }>()
  for (const item of snapshot.docs) {
    const data = item.data() as Record<string, unknown>
    const projectId = typeof data.projectId === "string" ? data.projectId : ""
    const url = mediaImageUrl(data)
    if (!projectId || !url) continue
    const at = Math.max(tsToMillis(data.updatedAt), tsToMillis(data.createdAt))
    const current = images.get(projectId)
    if (!current || at >= current.at) images.set(projectId, { url, at })
  }
  return projects.map((project) => ({ ...project, campaignImageUrl: images.get(project.id)?.url ?? project.campaignImageUrl }))
}

export async function getProjects(): Promise<Project[]> {
  const agencyId = await getCurrentAgencyId()
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("agencyId", "==", agencyId)))
  const projects = snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as Project[]
  return withCampaignImages(projects, "agencyId", agencyId)
}

export async function getProjectsByCompanyId(companyId: string): Promise<Project[]> {
  if (!companyId) return []
  const agencyId = await getCurrentAgencyId()
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("agencyId", "==", agencyId), where("companyId", "==", companyId)))
  const projects = snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as Project[]
  return withCampaignImages(projects, "companyId", companyId)
}

/** Every project for a company, readable on the public company page. */
export async function getPublicProjectsByCompanyId(companyId: string): Promise<Project[]> {
  if (!companyId) return []
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("companyId", "==", companyId)))
  const projects = snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as Project[]
  return withCampaignImages(projects, "companyId", companyId)
}

export async function getProject(id: string): Promise<Project | null> {
  const snapshot = await getDoc(doc(db, COLLECTION_NAME, id))
  if (!snapshot.exists()) return null
  const project = { ...(snapshot.data() as object), id: snapshot.id } as Project
  const projects = await withCampaignImages([project], "companyId", project.companyId)
  return projects[0] ?? project
}

export { slugify }

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

  const stored = await getDocs(query(collection(db, COLLECTION_NAME), where("agencyId", "==", await getCurrentAgencyId()), where("slug", "==", slug)))
  if (!stored.empty) {
    const first = stored.docs[0]
    return { ...(first.data() as object), id: first.id } as Project
  }

  const all = await getProjects()
  return all.find((project) => projectSlug(project) === slug) ?? all.find((project) => project.id === slug) ?? null
}

export async function createProject(data: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const agencyId = await getCurrentAgencyId()
  const ref = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    agencyId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return ref.id
}

export async function updateProject(id: string, data: Partial<Omit<Project, "id" | "createdAt">>): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), { ...data, updatedAt: Timestamp.now() })
}

export async function setProjectArchived(id: string, isArchived: boolean): Promise<Timestamp> {
  const updatedAt = Timestamp.now()
  await updateDoc(doc(db, COLLECTION_NAME, id), { isArchived, updatedAt })
  return updatedAt
}

export async function deleteProject(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id))
}

/**
 * Copies a campaign with everything in it: its brief and settings, tasks,
 * posts, media and folders, and its creators. The copy starts over at zero
 * progress, unpublished, with a slug of its own, and its posts go back to Draft
 * so they are reviewed again.
 */
export async function duplicateProject(project: Project): Promise<string> {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    id: _id, createdAt: _createdAt, updatedAt: _updatedAt, agencyId: _agencyId,
    isCaseStudy: _isCaseStudy, caseStudyStatus: _caseStudyStatus, featured: _featured, order: _order, legacyPortfolioId: _legacyPortfolioId,
    ...fields
  } = project
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const copyTitle = `${project.title} copy`
  const copyId = await createProject({
    ...fields,
    title: copyTitle,
    status: "in-progress",
    isArchived: false,
    progress: 0,
    slug: `${slugify(project.title)}-copy-${Date.now()}`,
    isPublic: false,
  })

  await duplicateCampaignContent(project.id, copyId)

  const tasks = await getTasksByProjectId(project.id)
  // Sequential so createdAt increments and the original task order survives.
  for (const task of tasks) {
    await createTask({
      name: task.name,
      companyId: project.companyId,
      client: project.client,
      projectId: copyId,
      project: copyTitle,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      content: task.content,
      isPublic: false,
    })
  }

  return copyId
}

/** Rows of a campaign collection, oldest first, without their ids and dates. */
async function campaignRows(collectionName: string, projectId: string) {
  const snapshot = await getDocs(query(collection(db, collectionName), where("projectId", "==", projectId)))
  return snapshot.docs
    .map((row) => ({ id: row.id, data: row.data() as Record<string, unknown> }))
    .sort((a, b) => tsToMillis(a.data.createdAt as Timestamp | undefined) - tsToMillis(b.data.createdAt as Timestamp | undefined))
}

function withoutDates(data: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = data
  return rest
}

/**
 * Copies a campaign's posts, media, folders and creators onto another campaign.
 * Written one at a time, oldest first, so each list keeps its order.
 */
async function duplicateCampaignContent(fromProjectId: string, toProjectId: string) {
  const creatives = await campaignRows("campaignCreatives", fromProjectId)
  // Folders first, so the files inside them can point at the copied folder.
  const folderIds = new Map<string, string>()
  for (const { id, data } of creatives.filter((row) => row.data.type === "folder")) {
    const now = Timestamp.now()
    const copy = await addDoc(collection(db, "campaignCreatives"), { ...withoutDates(data), projectId: toProjectId, createdAt: now, updatedAt: now })
    folderIds.set(id, copy.id)
  }
  for (const { data } of creatives.filter((row) => row.data.type !== "folder")) {
    const now = Timestamp.now()
    const folderId = typeof data.folderId === "string" && data.folderId ? folderIds.get(data.folderId) ?? "" : data.folderId
    await addDoc(collection(db, "campaignCreatives"), {
      ...withoutDates(data),
      projectId: toProjectId,
      ...(folderId !== undefined ? { folderId } : {}),
      ...(data.type === "text" ? { status: "Draft" } : {}),
      createdAt: now,
      updatedAt: now,
    })
  }

  for (const { data } of await campaignRows("campaignPeople", fromProjectId)) {
    const now = Timestamp.now()
    await addDoc(collection(db, "campaignPeople"), { ...withoutDates(data), projectId: toProjectId, createdAt: now, updatedAt: now })
  }
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
  timeline: string
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
