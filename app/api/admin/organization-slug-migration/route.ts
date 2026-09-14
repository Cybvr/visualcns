import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"

export const runtime = "nodejs"

const LEGACY_TENANT_ID = process.env.LEGACY_TENANT_ID || "legacy-visualcns"
const BATCH_LIMIT = 400
const RESERVED_SLUGS = new Set([
  "about", "blog", "brands", "capabilities", "case-studies", "contact", "faq", "finance", "industries",
  "login", "portfolio", "pricing", "privacy", "ratecard", "signup", "templates", "terms", "visualhq", "share",
  "quotes", "estimates", "auth", "api", "dashboard", "portal", "offline", "manifest",
])

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Error("Missing authorization")
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token)
  const caller = await db.collection("users").doc(decoded.uid).get()
  const data = caller.data() || {}
  if (data.role !== "admin" && data.role !== "superadmin") throw new Error("Admin access required")
  return { db, tenantId: typeof data.tenantId === "string" && data.tenantId ? data.tenantId : LEGACY_TENANT_ID }
}

async function scanOrganizations(db: FirebaseFirestore.Firestore, tenantId: string) {
  const snapshot = await db.collection("organizations").where("tenantId", "==", tenantId).get()
  const missing = snapshot.docs
    .filter((item) => !String(item.data().slug || "").trim())
    .map((item) => ({ id: item.id, name: String(item.data().name || "Unnamed company") }))
  return { snapshot, missing }
}

async function migrateOrganizations(db: FirebaseFirestore.Firestore, tenantId: string) {
  const { snapshot, missing } = await scanOrganizations(db, tenantId)
  const used = new Set(
    snapshot.docs
      .map((item) => String(item.data().slug || "").trim().toLowerCase())
      .filter(Boolean),
  )
  let batch = db.batch()
  let writes = 0
  const migrated: { id: string; name: string; slug: string }[] = []

  for (const item of missing) {
    const base = slugify(item.name) || `company-${item.id.slice(0, 6).toLowerCase()}`
    let candidate = RESERVED_SLUGS.has(base) ? `${base}-1` : base
    let suffix = 2
    while (used.has(candidate)) candidate = `${base}-${suffix++}`
    used.add(candidate)
    const ref = db.collection("organizations").doc(item.id)
    batch.set(ref, { slug: candidate, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    migrated.push({ ...item, slug: candidate })
    writes += 1
    if (writes >= BATCH_LIMIT) {
      await batch.commit()
      batch = db.batch()
      writes = 0
    }
  }
  if (writes) await batch.commit()
  return { migrated, organizationCount: snapshot.size }
}

export async function GET(request: NextRequest) {
  try {
    const { db, tenantId } = await authorize(request)
    const { snapshot, missing } = await scanOrganizations(db, tenantId)
    return NextResponse.json({ tenantId, total: missing.length, organizationCount: snapshot.size, organizations: missing })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db, tenantId } = await authorize(request)
    const { migrated, organizationCount } = await migrateOrganizations(db, tenantId)
    return NextResponse.json({ tenantId, total: migrated.length, organizationCount, organizations: migrated })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Organization URL migration failed" }, { status: 403 })
  }
}
