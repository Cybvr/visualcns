import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminServices } from "@/lib/firebase-admin"

export const runtime = "nodejs"
const COLLECTIONS = ["users", "projects", "tasks", "invoices", "contracts", "estimates", "companyDocuments", "documents", "approvals", "comments", "portalProjects", "portalTasks", "portalComments", "emailMessages", "emailTemplates", "emailDrafts", "emailLists", "organizations", "settings", "invites", "tenantUsage"]

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Error("Missing authorization")
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token)
  const user = (await db.collection("users").doc(decoded.uid).get()).data() || {}
  if (user.role !== "admin" && user.role !== "superadmin") throw new Error("Admin access required")
  return { db, uid: decoded.uid, role: user.role, tenantId: typeof user.tenantId === "string" && user.tenantId ? user.tenantId : "legacy-visualcns" }
}

export async function GET(request: NextRequest) {
  try {
    const { db, role, tenantId: ownTenant } = await authorize(request)
    const requested = new URL(request.url).searchParams.get("tenantId")?.trim() || ownTenant
    if (role !== "superadmin" && requested !== ownTenant) throw new Error("You can only export your own tenant")
    const data: Record<string, unknown[]> = {}
    for (const name of COLLECTIONS) {
      const snapshot = await db.collection(name).where("tenantId", "==", requested).get()
      data[name] = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    }
    return NextResponse.json({ tenantId: requested, exportedAt: new Date().toISOString(), data })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 403 }) }
}

export async function DELETE(request: NextRequest) {
  try {
    const { db, role, tenantId: ownTenant } = await authorize(request)
    const body = await request.json() as { tenantId?: unknown; confirmation?: unknown }
    const requested = typeof body.tenantId === "string" ? body.tenantId.trim() : ownTenant
    if (role !== "superadmin" && requested !== ownTenant) throw new Error("You can only delete your own tenant")
    if (body.confirmation !== `DELETE ${requested}`) return NextResponse.json({ error: `Type DELETE ${requested} to confirm.` }, { status: 400 })
    for (const name of COLLECTIONS) {
      const snapshot = await db.collection(name).where("tenantId", "==", requested).get()
      for (let index = 0; index < snapshot.docs.length; index += 400) {
        const batch = db.batch()
        snapshot.docs.slice(index, index + 400).forEach((item) => batch.delete(item.ref))
        await batch.commit()
      }
    }
    await db.collection("tenants").doc(requested).set({ status: "suspended", deletedAt: FieldValue.serverTimestamp() }, { merge: true })
    return NextResponse.json({ ok: true, tenantId: requested })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Deletion failed" }, { status: 403 }) }
}
