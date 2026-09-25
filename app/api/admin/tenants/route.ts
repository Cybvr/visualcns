import { NextRequest, NextResponse } from "next/server"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

export const runtime = "nodejs"
const TENANT_COLLECTIONS = ["users", "projects", "tasks", "invoices", "contracts", "estimates", "companyDocuments", "documents", "approvals", "comments", "portalProjects", "portalTasks", "portalComments", "emailMessages", "emailTemplates", "emailDrafts", "emailLists", "organizations", "settings", "invites", "tenantUsage", "tenantSecrets"]

function services() {
  const app = getApps()[0] ?? initializeApp({ credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }) })
  return { auth: getAuth(app), db: getFirestore(app) }
}

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Error("Missing authorization")
  const { auth, db } = services()
  const decoded = await auth.verifyIdToken(token)
  const caller = await db.collection("users").doc(decoded.uid).get()
  if (caller.data()?.role !== "superadmin") throw new Error("Superadmin access required")
  const tenantId = caller.data()?.tenantId
  return { db, tenantId: typeof tenantId === "string" && tenantId.trim() ? tenantId : "legacy-visualcns" }
}

export async function GET(request: NextRequest) {
  try {
    const { db, tenantId: ownTenantId } = await authorize(request)
    const snapshot = await db.collection("tenants").get()
    const tenants = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    return NextResponse.json({ tenants, ownTenantId })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 403 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { db, tenantId: ownTenantId } = await authorize(request)
    const body = await request.json() as { tenantId?: unknown; status?: unknown }
    const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : ""
    const status = typeof body.status === "string" ? body.status : ""
    if (!tenantId || !["trial", "active", "past_due", "suspended"].includes(status)) {
      return NextResponse.json({ error: "A valid tenantId and status are required." }, { status: 400 })
    }
    if (tenantId === ownTenantId) {
      return NextResponse.json({ error: "You cannot suspend or reactivate the current tenant." }, { status: 400 })
    }
    await db.collection("tenants").doc(tenantId).set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return NextResponse.json({ tenantId, status })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Tenant update failed" }, { status: 403 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { db, tenantId: ownTenantId } = await authorize(request)
    const body = await request.json() as { tenantId?: unknown; confirmation?: unknown }
    const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : ""
    if (!tenantId) return NextResponse.json({ error: "A tenantId is required." }, { status: 400 })
    if (tenantId === ownTenantId) return NextResponse.json({ error: "You cannot delete the current tenant." }, { status: 400 })
    if (body.confirmation !== `DELETE ${tenantId}`) return NextResponse.json({ error: `Type DELETE ${tenantId} to confirm.` }, { status: 400 })

    for (const collectionName of TENANT_COLLECTIONS) {
      const snapshot = await db.collection(collectionName).where("tenantId", "==", tenantId).get()
      for (let index = 0; index < snapshot.docs.length; index += 400) {
        const batch = db.batch()
        snapshot.docs.slice(index, index + 400).forEach((item) => batch.delete(item.ref))
        await batch.commit()
      }
    }
    await db.collection("tenants").doc(tenantId).delete()
    return NextResponse.json({ ok: true, tenantId })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Tenant deletion failed" }, { status: 403 })
  }
}
