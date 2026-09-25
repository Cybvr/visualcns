import { collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch } from "firebase/firestore"
import { db } from "./firebase"
import type { PortalProject, PortalTask } from "./portal-model"
import { getProject, type Project } from "./projects"
import type { Task } from "./tasks"
import { getCurrentAgencyId } from "./agency-scope"

export async function getPortalProjects(companyId: string): Promise<PortalProject[]> {
  const snapshot = await getDocs(query(collection(db, "portalProjects"), where("agencyId", "==", await getCurrentAgencyId()), where("companyId", "==", companyId)))
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as PortalProject)
}

export async function getPortalTasks(companyId: string, projectId: string): Promise<PortalTask[]> {
  const snapshot = await getDocs(query(collection(db, "portalTasks"), where("agencyId", "==", await getCurrentAgencyId()), where("companyId", "==", companyId), where("projectId", "==", projectId)))
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as PortalTask)
}

/** Activity data for an anonymous company page: client-facing task mirrors. */
export async function getPublicPortalTasks(companyId: string, projectId: string): Promise<PortalTask[]> {
  if (!companyId || !projectId) return []
  const snapshot = await getDocs(query(
    collection(db, "portalTasks"),
    where("companyId", "==", companyId),
    where("projectId", "==", projectId),
  ))
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as PortalTask)
}

/** Explicit allowlist: internal descriptions, earnings and task bodies never travel. */
export function projectForPortal(project: Project, summary: string): Omit<PortalProject, "id"> {
  return { agencyId: project.agencyId || "", companyId: project.companyId, title: project.title, status: project.status, progress: project.progress, dueDate: project.dueDate || "", thumbnailUrl: project.thumbnailUrl || "", summary, isPublic: project.isPublic === true, legacySlug: project.slug || project.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") }
}

export async function publishPortalProject(project: Project, summary: string) {
  await writeBatch(db).set(doc(db, "portalProjects", project.id), projectForPortal(project, summary)).commit()
}

export async function unpublishPortalProject(projectId: string) {
  // Child access is also gated by the parent, including during large cleanups.
  await writeBatch(db).delete(doc(db, "portalProjects", projectId)).commit()
}

export async function publishPortalTask(task: Task, instructions: string, assigneeUid: string) {
  const data: Omit<PortalTask, "id"> = { agencyId: task.agencyId || "", companyId: task.companyId, projectId: task.projectId, name: task.name, status: task.status, dueDate: task.dueDate || "", instructions, assigneeUid, isPublic: task.isPublic === true, createdAt: task.createdAt, updatedAt: task.updatedAt }
  await writeBatch(db).set(doc(db, "portalTasks", task.id), data).commit()
}

export async function unpublishPortalTask(id: string) {
  await writeBatch(db).delete(doc(db, "portalTasks", id)).commit()
}

/**
 * Mirror a task into the client-facing projection so it shows in the portal
 * automatically, without the agency publishing it by hand. Only safe fields
 * travel (never the internal `content`), and the task's project is published
 * too so the portal can surface the task under a visible project. Any
 * client-facing instructions or assignee the agency set through the portal
 * dialog are preserved.
 */
export async function ensureTaskShared(task: Task) {
  if (!task.companyId || !task.projectId) return

  const projectRef = doc(db, "portalProjects", task.projectId)
  const taskRef = doc(db, "portalTasks", task.id)
  const [projSnap, taskSnap] = await Promise.all([getDoc(projectRef), getDoc(taskRef)])

  const agencyId = task.agencyId || await getCurrentAgencyId()
  if (!projSnap.exists()) {
    const project = await getProject(task.projectId)
    // Older projects have no agencyId; the rules need the writer's agency on the copy.
    if (project) await writeBatch(db).set(projectRef, { ...projectForPortal(project, ""), agencyId: project.agencyId || agencyId }).commit()
  }

  const safe = { agencyId, companyId: task.companyId, projectId: task.projectId, name: task.name, status: task.status, dueDate: task.dueDate || "", isPublic: task.isPublic === true, createdAt: task.createdAt || serverTimestamp(), updatedAt: task.updatedAt || serverTimestamp() }
  if (taskSnap.exists()) {
    await writeBatch(db).update(taskRef, safe).commit()
  } else {
    await writeBatch(db).set(taskRef, { ...safe, instructions: "", assigneeUid: "" }).commit()
  }
}

export async function completePortalTask(id: string, done: boolean) {
  const batch = writeBatch(db)
  const data = { status: done ? "done" : "todo", updatedAt: serverTimestamp() }
  batch.update(doc(db, "portalTasks", id), data)
  batch.update(doc(db, "tasks", id), data)
  await batch.commit()
}

/** Agency edits update an already-published projection, without publishing new fields. */
export async function syncPortalProject(id: string, patch: Partial<Project>) {
  const ref = doc(db, "portalProjects", id)
  const existing = await getDoc(ref)
  const batch = writeBatch(db).update(doc(db, "projects", id), { ...patch, updatedAt: serverTimestamp() })
  if (!existing.exists()) { await batch.commit(); return }
  if (patch.companyId && patch.companyId !== existing.data().companyId) { await batch.delete(ref).commit(); return }
  const safe: Record<string, string | number | boolean> = {}
  for (const key of ["title", "status", "progress", "dueDate", "thumbnailUrl", "isPublic"] as const) { const value = patch[key]; if (value !== undefined) safe[key] = value }
  if (Object.keys(safe).length) batch.update(ref, safe)
  await batch.commit()
}

export async function syncPortalTask(id: string, patch: Partial<Task>) {
  const ref = doc(db, "portalTasks", id)
  const existing = await getDoc(ref)
  const batch = writeBatch(db).update(doc(db, "tasks", id), { ...patch, updatedAt: serverTimestamp() })
  if (!existing.exists()) { await batch.commit(); return }
  if ((patch.companyId && patch.companyId !== existing.data().companyId) || (patch.projectId && patch.projectId !== existing.data().projectId)) {
    await batch.delete(ref).commit()
    return
  }
  const safe: Record<string, string | boolean> = {}
  for (const key of ["name", "status", "dueDate", "isPublic"] as const) { const value = patch[key]; if (value !== undefined) safe[key] = value }
  if (Object.keys(safe).length) batch.update(ref, safe)
  await batch.commit()
}

export async function deleteAgencyRecord(kind: "projects" | "tasks", id: string) {
  await writeBatch(db).delete(doc(db, kind, id)).delete(doc(db, kind === "projects" ? "portalProjects" : "portalTasks", id)).commit()
}
