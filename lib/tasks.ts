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
import { ensureTaskShared, deleteAgencyRecord } from "./portal-data"

export type TaskStatus = "todo" | "in-progress" | "review" | "done"
export type TaskPriority = "low" | "medium" | "high"

export interface Task {
  id: string
  tenantId?: string
  name: string
  /** Matches the companyId on a user's Firestore doc */
  companyId: string
  /** Client display name, denormalized for the table */
  client: string
  /** Firestore id of the project this task belongs to */
  projectId: string
  /** Project title, denormalized for the table */
  project: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string
  /** The body of the task - notes, links, the actual work */
  content: string
  /**
   * Set on the tasks of a published template, which makes them readable by
   * anyone so the public templates page can list the steps of the workflow.
   */
  isPublic?: boolean
  /** Allows this individual task to be opened from a public share link. */
  shareEnabled?: boolean
  /** Set when the task was auto-created to track a billing document. */
  sourceKind?: "invoice" | "estimate" | "contract"
  /** Firestore id of the billing document this task tracks. */
  sourceId?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export const taskStatusMeta: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: "Backlog", className: "bg-[#e3d5c8] text-[#4a3e35]" },
  "in-progress": { label: "In progress", className: "bg-[#d3e5ef] text-[#183347]" },
  review: { label: "In Review", className: "bg-[#fdecc8] text-[#402c09]" },
  done: { label: "Done", className: "bg-[#dbeddb] text-[#1c3829]" },
}

export const taskPriorityMeta: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-700" },
  high: { label: "High", className: "bg-red-100 text-red-700" },
}

/**
 * Firestore normally hands back `createdAt` as a Timestamp instance, but data
 * written by other means (imports, the Console, an older schema) can come back
 * as a plain `{seconds, nanoseconds}` object, a Date, a number, or a string.
 * This coerces any of those to epoch millis so `.toMillis()` never throws.
 */
export function tsToMillis(value: unknown): number {
  if (!value) return 0
  if (value instanceof Timestamp) return value.toMillis()
  if (value instanceof Date) return value.getTime()
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  if (typeof value === "object") {
    const obj = value as { seconds?: number; _seconds?: number; nanoseconds?: number }
    const seconds = obj.seconds ?? obj._seconds
    if (typeof seconds === "number") return seconds * 1000 + Math.floor((obj.nanoseconds ?? 0) / 1e6)
  }
  return 0
}

/** Format a Firestore-ish timestamp value as a short date, or "—" if absent. */
export function formatTimestamp(value: unknown): string {
  const millis = tsToMillis(value)
  if (!millis) return "—"
  return new Date(millis).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const COLLECTION_NAME = "tasks"

export async function getTasks(): Promise<Task[]> {
  const tenantId = await getCurrentTenantId()
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("tenantId", "==", tenantId)))
  return snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as Task[]
}

export async function getTasksByCompanyId(companyId: string): Promise<Task[]> {
  if (!companyId) return []
  const tenantId = await getCurrentTenantId()
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("tenantId", "==", tenantId), where("companyId", "==", companyId)))
  return snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as Task[]
}

/**
 * Every task on one project, oldest first, which is the order they were
 * authored in. Templates rely on that order - the task list is the workflow.
 */
export async function getTasksByProjectId(projectId: string): Promise<Task[]> {
  if (!projectId) return []
  const tenantId = await getCurrentTenantId()
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where("tenantId", "==", tenantId), where("projectId", "==", projectId)))
  const tasks = snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as Task[]
  return tasks.sort((a, b) => tsToMillis(a.createdAt) - tsToMillis(b.createdAt))
}

/**
 * Client-safe project task query. Including companyId lets Firestore prove that
 * every returned task belongs to the signed-in workspace.
 */
export async function getTasksByProjectAndCompanyId(projectId: string, companyId: string): Promise<Task[]> {
  if (!projectId || !companyId) return []
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION_NAME),
      where("tenantId", "==", await getCurrentTenantId()),
      where("projectId", "==", projectId),
      where("companyId", "==", companyId),
    ),
  )
  const tasks = snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as Task[]
  return tasks.sort((a, b) => tsToMillis(a.createdAt) - tsToMillis(b.createdAt))
}

/**
 * The steps of a published template. Both filters are deliberate: the rules
 * only open a task up when it carries isPublic, so the query has to say so for
 * a visitor who is signed out, or signed in as a different client, to read it.
 */
export async function getPublicTasksByProjectId(projectId: string): Promise<Task[]> {
  if (!projectId) return []
  const snapshot = await getDocs(
    query(collection(db, COLLECTION_NAME), where("projectId", "==", projectId), where("isPublic", "==", true)),
  )
  const tasks = snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id })) as Task[]
  return tasks.sort((a, b) => tsToMillis(a.createdAt) - tsToMillis(b.createdAt))
}

export async function getTask(id: string): Promise<Task | null> {
  const snapshot = await getDoc(doc(db, COLLECTION_NAME, id))
  if (!snapshot.exists()) return null
  return { ...(snapshot.data() as object), id: snapshot.id } as Task
}

export async function createTask(data: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const tenantId = await getCurrentTenantId()
  const ref = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    tenantId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  // Client tasks show in the portal automatically - no separate publish step.
  await ensureTaskShared({ ...(data as Task), id: ref.id })
  return ref.id
}

export async function updateTask(id: string, data: Partial<Omit<Task, "id" | "createdAt">>): Promise<void> {
  await updateDoc(doc(db, COLLECTION_NAME, id), { ...data, updatedAt: Timestamp.now() })
  const snapshot = await getDoc(doc(db, COLLECTION_NAME, id))
  if (snapshot.exists()) await ensureTaskShared({ ...(snapshot.data() as Task), id })
}

export async function deleteTask(id: string): Promise<void> {
  await deleteAgencyRecord("tasks", id)
}

/**
 * Auto-creates a client-visible task that tracks a billing document (invoice,
 * estimate or contract) so it lands on the project board and in the client
 * portal. No-ops while the document is a draft, isn't tied to a project, or
 * already has a task - so editing or re-saving never spawns duplicates.
 */
export async function ensureBillingTask(params: {
  kind: "invoice" | "estimate" | "contract"
  sourceId: string
  companyId: string
  client: string
  projectId: string
  project: string
  title: string
  isDraft: boolean
  dueDate?: string
}): Promise<void> {
  const { kind, sourceId, companyId, client, projectId, project, title, isDraft, dueDate } = params
  if (isDraft || !projectId || !companyId || !sourceId) return
  const existing = await getDocs(query(collection(db, COLLECTION_NAME), where("tenantId", "==", await getCurrentTenantId()), where("sourceId", "==", sourceId)))
  if (existing.docs.some((d) => (d.data() as Task).sourceKind === kind)) return
  await createTask({
    name: title,
    companyId,
    client,
    projectId,
    project,
    status: "todo",
    priority: "medium",
    dueDate: dueDate || "",
    content: `Tracking ${title}.`,
    sourceKind: kind,
    sourceId,
  })
}

// Starter tasks seeded for a brand-new client so their board isn't empty and
// they can see how the workspace works. Statuses are spread across the board
// columns on purpose. `dueInDays` is resolved to a real date at seed time.
interface DefaultTaskTemplate {
  name: string
  status: TaskStatus
  priority: TaskPriority
  content: string
  dueInDays?: number
}

const DEFAULT_TASKS: DefaultTaskTemplate[] = [
  {
    name: "👋 Welcome to your workspace",
    status: "done",
    priority: "low",
    content:
      "This is where you'll follow your projects and tasks. Use the Board and Table views above, and add your own tasks anytime with “New task”.",
  },
  {
    name: "Share your brand assets",
    status: "todo",
    priority: "high",
    content: "Upload your logo, fonts, and brand colours so we can get started on the right foot.",
    dueInDays: 3,
  },
  {
    name: "Book your kickoff call",
    status: "in-progress",
    priority: "medium",
    content: "Pick a time for a 30-minute kickoff so we can align on goals and timelines.",
    dueInDays: 5,
  },
  {
    name: "Review your first draft",
    status: "review",
    priority: "medium",
    content: "We'll drop the first draft here for your feedback and sign-off.",
    dueInDays: 10,
  },
]

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Creates the starter tasks for a client and returns them (with ids) so the
 * caller can render immediately without a refetch. Call once per client - the
 * caller is responsible for guarding against re-seeding (e.g. a flag on the
 * user doc), otherwise deleting every task would re-seed on the next load.
 */
export async function seedDefaultTasks(
  companyId: string,
  clientName: string,
  project?: { id: string; title: string },
): Promise<Task[]> {
  const created: Task[] = []
  // Sequential so createdAt increments and the intended order is preserved.
  for (const t of DEFAULT_TASKS) {
    const payload = {
      name: t.name,
      companyId,
      client: clientName,
      projectId: project?.id ?? "",
      project: project?.title ?? "",
      status: t.status,
      priority: t.priority,
      dueDate: t.dueInDays != null ? daysFromNow(t.dueInDays) : "",
      content: t.content,
    }
    const id = await createTask(payload)
    created.push({ ...payload, id })
  }
  return created
}
