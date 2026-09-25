import { NextRequest, NextResponse } from "next/server"
import { adminServices } from "@/lib/firebase-admin"
import { getOrCreatePortalLink, organizationTenant } from "@/lib/server/portal-links"

export const runtime = "nodejs"

/** An admin of the company's own tenant (or a superadmin) may see or reset its link. */
async function authorize(request: NextRequest, companyId: string) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Error("Missing authorization")
  if (!companyId) throw new Error("companyId is required")
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token)
  const caller = (await db.collection("users").doc(decoded.uid).get()).data() || {}
  if (caller.role !== "admin" && caller.role !== "superadmin") throw new Error("Admin access required")
  const organization = await db.collection("organizations").doc(companyId).get()
  if (!organization.exists) throw new Error("Company not found")
  const tenantId = organizationTenant(organization.data())
  const callerTenant = typeof caller.tenantId === "string" && caller.tenantId ? caller.tenantId : organizationTenant(undefined)
  if (caller.role !== "superadmin" && callerTenant !== tenantId) throw new Error("You can only share your own clients")
  return { db, tenantId }
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId")?.trim() || ""
    const { db, tenantId } = await authorize(request, companyId)
    return NextResponse.json({ key: await getOrCreatePortalLink(db, tenantId, companyId) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load the portal link" }, { status: 403 })
  }
}

/** Replace the key; the previous link stops working immediately. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { companyId?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const { db, tenantId } = await authorize(request, companyId)
    return NextResponse.json({ key: await getOrCreatePortalLink(db, tenantId, companyId, true) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not reset the portal link" }, { status: 403 })
  }
}
