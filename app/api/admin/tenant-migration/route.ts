import { NextRequest, NextResponse } from "next/server"
import { getApps, initializeApp, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { FieldValue, getFirestore } from "firebase-admin/firestore"

export const runtime = "nodejs"

const COLLECTIONS = [
  "users", "projects", "tasks", "invoices", "contracts", "estimates", "companyDocuments", "documents",
  "approvals", "comments", "portalProjects", "portalTasks", "portalComments", "emailMessages", "emailTemplates",
  "emailDrafts", "emailLists", "organizations", "settings",
]
const LEGACY_TENANT_ID = process.env.LEGACY_TENANT_ID || "legacy-visualcns"

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
  const user = await db.collection("users").doc(decoded.uid).get()
  const data = user.data() || {}
  if (data.role !== "admin" && data.role !== "superadmin") throw new Error("Admin access required")
  return { db, tenantId: typeof data.tenantId === "string" && data.tenantId ? data.tenantId : LEGACY_TENANT_ID }
}

async function inspect(db: FirebaseFirestore.Firestore, migrate: boolean, tenantId: string) {
  const counts: Record<string, number> = {}
  let total = 0
  for (const name of COLLECTIONS) {
    const snapshot = await db.collection(name).get()
    let missing = 0
    let batch = db.batch()
    let writes = 0
    for (const item of snapshot.docs) {
      if (typeof item.data().tenantId === "string" && item.data().tenantId) continue
      missing += 1
      if (migrate) {
        batch.set(item.ref, {
          tenantId,
          ...(name === "organizations" && item.data().publicVisible === undefined ? { publicVisible: true } : {}),
        }, { merge: true })
        writes += 1
        if (writes >= 400) { await batch.commit(); batch = db.batch(); writes = 0 }
      }
    }
    if (migrate && writes) await batch.commit()
    counts[name] = missing
    total += missing
  }
  return { tenantId, counts, total, migrated: migrate }
}

export async function GET(request: NextRequest) {
  try {
    const { db, tenantId } = await authorize(request)
    return NextResponse.json(await inspect(db, false, tenantId))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db, tenantId } = await authorize(request)
    const tenantRef = db.collection("tenants").doc(tenantId)
    const tenantSnapshot = await tenantRef.get()
    if (tenantSnapshot.data()?.migrationCompletedAt) {
      return NextResponse.json({ tenantId, counts: {}, total: 0, migrated: true, alreadyComplete: true })
    }

    const result = await inspect(db, true, tenantId)
    await tenantRef.set({ migrationCompletedAt: FieldValue.serverTimestamp() }, { merge: true })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Migration failed" }, { status: 403 })
  }
}
