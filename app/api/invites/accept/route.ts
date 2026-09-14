import { createHash } from "node:crypto"
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

function hashToken(token: string) { return createHash("sha256").update(token).digest("hex") }

export async function POST(request: NextRequest) {
  try {
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    const body = await request.json() as { token?: unknown }
    const inviteToken = typeof body.token === "string" ? body.token.trim() : ""
    if (!bearer || !inviteToken) return NextResponse.json({ error: "Sign in and provide an invite token." }, { status: 401 })
    const { auth, db } = services()
    const decoded = await auth.verifyIdToken(bearer)
    const snapshot = await db.collection("invites").where("tokenHash", "==", hashToken(inviteToken)).limit(1).get()
    if (snapshot.empty) return NextResponse.json({ error: "Invite not found or already used." }, { status: 404 })
    const invite = snapshot.docs[0]
    const data = invite.data()
    if (data.status !== "pending" || data.expiresAt?.toMillis?.() < Date.now()) return NextResponse.json({ error: "Invite is no longer valid." }, { status: 410 })
    if ((decoded.email || "").toLowerCase() !== String(data.email || "").toLowerCase()) return NextResponse.json({ error: "This invite belongs to a different email address." }, { status: 403 })

    const userRef = db.collection("users").doc(decoded.uid)
    const existing = await userRef.get()
    const existingData = existing.data() || {}
    if (existingData.tenantId && existingData.tenantId !== data.tenantId) return NextResponse.json({ error: "This account already belongs to another agency." }, { status: 409 })
    await userRef.set({
      email: decoded.email || data.email,
      displayName: decoded.name || existingData.displayName || "",
      photoURL: decoded.picture || existingData.photoURL || "",
      role: data.role === "admin" ? "admin" : "client",
      tenantId: data.tenantId,
      companyId: data.companyId || existingData.companyId || decoded.uid,
      company: data.company || existingData.company || "",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: existingData.createdAt || FieldValue.serverTimestamp(),
    }, { merge: true })
    await invite.ref.update({ status: "accepted", acceptedBy: decoded.uid, acceptedAt: FieldValue.serverTimestamp() })
    return NextResponse.json({ ok: true, tenantId: data.tenantId, companyId: data.companyId || decoded.uid })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invite acceptance failed" }, { status: 403 })
  }
}
