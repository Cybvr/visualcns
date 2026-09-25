import { NextRequest, NextResponse } from "next/server"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, FieldValue } from "firebase-admin/firestore"
import { requireAgencyId } from "@/lib/require-agency-id"

export const runtime = "nodejs"
const AGENCY_COLLECTIONS = ["users", "projects", "tasks", "invoices", "contracts", "estimates", "companyDocuments", "documents", "approvals", "comments", "portalProjects", "portalTasks", "portalComments", "emailMessages", "emailTemplates", "emailDrafts", "emailLists", "organizations", "settings", "invites", "agencyUsage", "agencySecrets"]

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
  return { db, agencyId: requireAgencyId(caller.data()) }
}

export async function GET(request: NextRequest) {
  try {
    const { db, agencyId: ownAgencyId } = await authorize(request)
    const snapshot = await db.collection("agencies").get()
    const agencies = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    return NextResponse.json({ agencies, ownAgencyId })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 403 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { db, agencyId: ownAgencyId } = await authorize(request)
    const body = await request.json() as { agencyId?: unknown; status?: unknown }
    const agencyId = typeof body.agencyId === "string" ? body.agencyId.trim() : ""
    const status = typeof body.status === "string" ? body.status : ""
    if (!agencyId || !["trial", "active", "past_due", "suspended"].includes(status)) {
      return NextResponse.json({ error: "A valid agencyId and status are required." }, { status: 400 })
    }
    if (agencyId === ownAgencyId) {
      return NextResponse.json({ error: "You cannot suspend or reactivate the current agency." }, { status: 400 })
    }
    await db.collection("agencies").doc(agencyId).set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return NextResponse.json({ agencyId, status })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agency update failed" }, { status: 403 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { db, agencyId: ownAgencyId } = await authorize(request)
    const body = await request.json() as { agencyId?: unknown; confirmation?: unknown }
    const agencyId = typeof body.agencyId === "string" ? body.agencyId.trim() : ""
    if (!agencyId) return NextResponse.json({ error: "A agencyId is required." }, { status: 400 })
    if (agencyId === ownAgencyId) return NextResponse.json({ error: "You cannot delete the current agency." }, { status: 400 })
    if (body.confirmation !== `DELETE ${agencyId}`) return NextResponse.json({ error: `Type DELETE ${agencyId} to confirm.` }, { status: 400 })

    for (const collectionName of AGENCY_COLLECTIONS) {
      const snapshot = await db.collection(collectionName).where("agencyId", "==", agencyId).get()
      for (let index = 0; index < snapshot.docs.length; index += 400) {
        const batch = db.batch()
        snapshot.docs.slice(index, index + 400).forEach((item) => batch.delete(item.ref))
        await batch.commit()
      }
    }
    await db.collection("agencies").doc(agencyId).delete()
    return NextResponse.json({ ok: true, agencyId })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agency deletion failed" }, { status: 403 })
  }
}
