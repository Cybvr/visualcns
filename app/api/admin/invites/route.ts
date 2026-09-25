import { requireAgencyId } from "@/lib/require-agency-id"
import { createHash, randomBytes } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore"

export const runtime = "nodejs"

function services() {
  const app = getApps()[0] ?? initializeApp({ credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }) })
  return { auth: getAuth(app), db: getFirestore(app) }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

async function caller(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Error("Missing authorization")
  const { auth, db } = services()
  const decoded = await auth.verifyIdToken(token)
  const snapshot = await db.collection("users").doc(decoded.uid).get()
  const data = snapshot.data() || {}
  if (data.role !== "admin" && data.role !== "superadmin") throw new Error("Admin access required")
  return { db, uid: decoded.uid, agencyId: requireAgencyId(data) }
}

export async function POST(request: NextRequest) {
  try {
    const { db, uid, agencyId } = await caller(request)
    const body = await request.json() as { email?: unknown; role?: unknown; companyId?: unknown; company?: unknown }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const role = body.role === "admin" ? "admin" : "client"
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const company = typeof body.company === "string" ? body.company.trim() : ""
    if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 })

    const rawToken = randomBytes(32).toString("hex")
    const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const ref = db.collection("invites").doc()
    await ref.set({
      agencyId,
      email,
      role,
      companyId: companyId || undefined,
      company: company || undefined,
      tokenHash: hashToken(rawToken),
      status: "pending",
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    })
    const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN || process.env.SITE_ORIGIN || "http://localhost:3069"
    return NextResponse.json({ id: ref.id, inviteUrl: `${origin.replace(/\/$/, "")}/invite/${rawToken}`, expiresAt: expiresAt.toDate().toISOString() })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invite creation failed" }, { status: 403 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { db, agencyId } = await caller(request)
    const snapshot = await db.collection("invites").where("agencyId", "==", agencyId).orderBy("createdAt", "desc").get()
    return NextResponse.json({ invites: snapshot.docs.map((item) => ({ id: item.id, ...item.data(), tokenHash: undefined })) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invite lookup failed" }, { status: 403 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { db, agencyId } = await caller(request)
    const body = await request.json() as { token?: unknown }
    const token = typeof body.token === "string" ? body.token.trim() : ""
    if (!token) return NextResponse.json({ error: "Invite token is required." }, { status: 400 })
    const snapshot = await db.collection("invites").where("tokenHash", "==", hashToken(token)).limit(1).get()
    if (snapshot.empty) return NextResponse.json({ error: "Invite not found or already used." }, { status: 404 })
    const invite = snapshot.docs[0]
    const data = invite.data()
    if (data.agencyId !== agencyId || data.status !== "pending" || data.expiresAt?.toMillis?.() < Date.now()) {
      return NextResponse.json({ error: "Invite is no longer valid." }, { status: 410 })
    }
    await invite.ref.update({ status: "revoked", revokedAt: FieldValue.serverTimestamp() })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invite update failed" }, { status: 403 })
  }
}
