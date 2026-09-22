import { NextRequest, NextResponse } from "next/server"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { FieldValue, getFirestore } from "firebase-admin/firestore"

export const runtime = "nodejs"

function services() {
  const app = getApps()[0] ?? initializeApp({ credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }) })
  return { auth: getAuth(app), db: getFirestore(app) }
}

async function caller(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Error("Missing authorization")
  const { auth, db } = services()
  const decoded = await auth.verifyIdToken(token)
  const snapshot = await db.collection("users").doc(decoded.uid).get()
  const data = snapshot.data() || {}
  if (data.role !== "admin" && data.role !== "superadmin") throw new Error("Admin access required")
  return { auth, db, tenantId: typeof data.tenantId === "string" && data.tenantId ? data.tenantId : "legacy-visualcns" }
}

/**
 * Adds a team member to the caller's tenant straight away: creates their
 * login if they don't have one, gives them admin access, and returns a link
 * they use to set their password.
 */
export async function POST(request: NextRequest) {
  let context: Awaited<ReturnType<typeof caller>>
  try {
    context = await caller(request)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Admin access required" }, { status: 403 })
  }
  const { auth, db, tenantId } = context
  try {
    const body = await request.json() as { email?: unknown; name?: unknown }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 })

    let account
    try {
      account = await auth.getUserByEmail(email)
    } catch {
      account = await auth.createUser({ email, displayName: name || undefined })
    }

    const ref = db.collection("users").doc(account.uid)
    const existing = await ref.get()
    const data = existing.data() || {}
    if (data.tenantId && data.tenantId !== tenantId) {
      return NextResponse.json({ error: "This person already belongs to another workspace." }, { status: 409 })
    }
    if (data.role === "admin" || data.role === "superadmin") {
      return NextResponse.json({ error: "This person is already on the team." }, { status: 409 })
    }

    await ref.set({
      email,
      displayName: name || data.displayName || account.displayName || "",
      role: "admin",
      tenantId,
      companyId: data.companyId || account.uid,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true })

    const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN || process.env.SITE_ORIGIN || "http://localhost:3069"
    const setupUrl = await auth.generatePasswordResetLink(email, { url: `${origin.replace(/\/$/, "")}/login` })
    return NextResponse.json({ uid: account.uid, setupUrl })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add team member" }, { status: 500 })
  }
}
