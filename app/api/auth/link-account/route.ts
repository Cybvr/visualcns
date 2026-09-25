import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminServices } from "@/lib/firebase-admin"

export const runtime = "nodejs"

/**
 * Attach a freshly signed-in account to the agency that already knows its
 * email, so nobody has to find an invite link. Matches, in order:
 *   1. a pending, unexpired invite for this email (keeps the invite's role);
 *   2. a client contact an agency added with this email.
 * Only verified emails (e.g. Google sign-in) are trusted, only accounts not
 * yet in a workspace are touched, and a contact known to more than one agency
 * is left alone rather than guessed.
 */
export async function POST(request: NextRequest) {
  try {
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!bearer) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
    const { auth, db } = adminServices()
    const decoded = await auth.verifyIdToken(bearer)
    const email = (decoded.email || "").trim()
    if (!email || decoded.email_verified !== true) return NextResponse.json({ linked: false })

    const userRef = db.collection("users").doc(decoded.uid)
    const existingData = (await userRef.get()).data() || {}
    if (existingData.role && existingData.tenantId) return NextResponse.json({ linked: false })

    const emails = [...new Set([email, email.toLowerCase()])]
    let match: { tenantId: string; companyId: string; company: string; role: "admin" | "client"; accept?: () => Promise<unknown> } | null = null

    const invites = (await db.collection("invites").where("email", "==", email.toLowerCase()).where("status", "==", "pending").get()).docs
      .filter((invite) => !(invite.data().expiresAt?.toMillis?.() < Date.now()))
      .sort((a, b) => (b.data().createdAt?.toMillis?.() ?? 0) - (a.data().createdAt?.toMillis?.() ?? 0))
    if (invites.length && new Set(invites.map((invite) => invite.data().tenantId)).size === 1) {
      const invite = invites[0]
      const data = invite.data()
      match = {
        tenantId: String(data.tenantId),
        companyId: String(data.companyId || decoded.uid),
        company: String(data.company || ""),
        role: data.role === "admin" ? "admin" : "client",
        accept: () => invite.ref.update({ status: "accepted", acceptedBy: decoded.uid, acceptedAt: FieldValue.serverTimestamp() }),
      }
    }

    if (!match) {
      const contacts = (await Promise.all(emails.map((value) => db.collection("users").where("email", "==", value).where("role", "==", "client").get())))
        .flatMap((snapshot) => snapshot.docs)
        .filter((contact) => contact.id !== decoded.uid && typeof contact.data().tenantId === "string" && contact.data().tenantId && contact.data().companyId)
      const tenants = new Set(contacts.map((contact) => contact.data().tenantId))
      if (contacts.length && tenants.size === 1) {
        const contact = contacts[0]
        const data = contact.data()
        match = {
          tenantId: String(data.tenantId),
          companyId: String(data.companyId),
          company: String(data.company || ""),
          role: "client",
          accept: () => contact.ref.set({ linkedUid: decoded.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
        }
      }
    }

    if (!match) return NextResponse.json({ linked: false })
    await userRef.set({
      email,
      displayName: decoded.name || existingData.displayName || "",
      photoURL: decoded.picture || existingData.photoURL || "",
      role: match.role,
      tenantId: match.tenantId,
      companyId: match.companyId,
      company: match.company || existingData.company || "",
      onboardingStatus: "active",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: existingData.createdAt || FieldValue.serverTimestamp(),
    }, { merge: true })
    await match.accept?.()
    return NextResponse.json({ linked: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not link this account" }, { status: 403 })
  }
}
