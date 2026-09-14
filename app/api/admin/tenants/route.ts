import { NextRequest, NextResponse } from "next/server"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

export const runtime = "nodejs"

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
  return db
}

export async function GET(request: NextRequest) {
  try {
    const db = await authorize(request)
    const snapshot = await db.collection("tenants").get()
    const tenants = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    return NextResponse.json({ tenants })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 403 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const db = await authorize(request)
    const body = await request.json() as { tenantId?: unknown; status?: unknown }
    const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : ""
    const status = typeof body.status === "string" ? body.status : ""
    if (!tenantId || !["trial", "active", "past_due", "suspended"].includes(status)) {
      return NextResponse.json({ error: "A valid tenantId and status are required." }, { status: 400 })
    }
    await db.collection("tenants").doc(tenantId).set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return NextResponse.json({ tenantId, status })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Tenant update failed" }, { status: 403 })
  }
}
