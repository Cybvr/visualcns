import type { NextRequest } from "next/server"

import { adminServices } from "@/lib/firebase-admin"

/** A signed-in person who may not manage this company's visitor sign-in. */
export class VisitorRefused extends Error {}

/**
 * Checks the caller may manage a company's visitor sign-in: its own staff, the
 * agency's admins, or a superadmin.
 */
export async function authorizeVisitorManager(request: NextRequest, companyId: string) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token || !companyId) throw new VisitorRefused("Please sign in again.")
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token).catch(() => null)
  if (!decoded) throw new VisitorRefused("Please sign in again.")
  const user = (await db.collection("users").doc(decoded.uid).get()).data() ?? {}
  const org = (await db.collection("organizations").doc(companyId).get()).data()
  if (!org) throw new VisitorRefused("We couldn't find that company.")
  const agencyId = String(org.agencyId || "")
  const allowed = user.role === "superadmin"
    || (user.role === "admin" && user.agencyId === agencyId)
    || (user.agencyId === agencyId && user.companyId === companyId)
  if (!agencyId || !allowed) throw new VisitorRefused("You can't manage visitor sign-in for this company.")
  return { db, uid: decoded.uid, agencyId, org, inviterName: String(user.displayName || decoded.name || decoded.email || "") }
}
