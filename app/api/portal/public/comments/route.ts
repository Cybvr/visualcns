import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminServices } from "@/lib/firebase-admin"
import { findPortalLink } from "@/lib/server/portal-links"

export const runtime = "nodejs"

const invalid = () => NextResponse.json({ error: "This link isn’t valid anymore. Ask your agency for a new one." }, { status: 404 })

/** Confirm the caller's link opens the company that owns this task. */
async function resolve(key: string, taskId: string) {
  const { db } = adminServices()
  const link = key ? await findPortalLink(db, key) : null
  if (!link || !taskId) return null
  const task = await db.collection("portalTasks").doc(taskId).get()
  const data = task.data()
  if (!task.exists || data?.tenantId !== link.tenantId || data?.companyId !== link.companyId) return null
  return { db, link }
}

/** Feedback for one shared task, for a share-link visitor. */
export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key")?.trim() || ""
    const taskId = request.nextUrl.searchParams.get("taskId")?.trim() || ""
    const resolved = await resolve(key, taskId)
    if (!resolved) return invalid()
    const snapshot = await resolved.db.collection("portalComments")
      .where("tenantId", "==", resolved.link.tenantId).where("companyId", "==", resolved.link.companyId).where("taskId", "==", taskId).get()
    const comments = snapshot.docs
      .map((item) => ({ id: item.id, body: String(item.data().body || ""), authorName: String(item.data().authorName || "Client"), createdAt: item.data().createdAt?.toMillis?.() ?? 0 }))
      .sort((a, b) => a.createdAt - b.createdAt)
    return NextResponse.json({ comments }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Public comment load failed", error)
    return NextResponse.json({ error: "We couldn’t load feedback." }, { status: 500 })
  }
}

/** Leave feedback through the share link, signed with a typed name. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { key?: unknown; taskId?: unknown; body?: unknown; authorName?: unknown }
    const key = typeof body.key === "string" ? body.key.trim() : ""
    const taskId = typeof body.taskId === "string" ? body.taskId.trim() : ""
    const text = typeof body.body === "string" ? body.body.trim() : ""
    const authorName = (typeof body.authorName === "string" ? body.authorName.trim() : "").slice(0, 200) || "Client"
    if (!text) return NextResponse.json({ error: "Write a message first." }, { status: 400 })
    if (text.length > 4000) return NextResponse.json({ error: "Feedback is too long." }, { status: 400 })
    const resolved = await resolve(key, taskId)
    if (!resolved) return invalid()
    await resolved.db.collection("portalComments").add({
      tenantId: resolved.link.tenantId, companyId: resolved.link.companyId, taskId,
      authorUid: "", authorName, body: text, createdAt: FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Public comment failed", error)
    return NextResponse.json({ error: "We couldn’t send your feedback." }, { status: 500 })
  }
}
