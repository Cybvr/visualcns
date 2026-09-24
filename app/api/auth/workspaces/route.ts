import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminServices } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function GET() {
  try {
    const { db } = adminServices()
    const [tenantSnapshot, organizationSnapshot] = await Promise.all([
      db.collection("tenants").get(),
      db.collection("organizations").get(),
    ])
    const workspaces = new Map<string, { id: string; name: string; logoUrl: string }>()

    for (const item of tenantSnapshot.docs) {
      const data = item.data()
      if (data.deletedAt) continue
      workspaces.set(item.id, {
        id: item.id,
        name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : "VisualHQ workspace",
        logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : "",
      })
    }

    // Older workspaces may have an owner organization but no tenant document.
    for (const item of organizationSnapshot.docs) {
      const data = item.data()
      const tenantId = typeof data.tenantId === "string" ? data.tenantId.trim() : ""
      if (!tenantId || workspaces.has(tenantId)) continue
      workspaces.set(tenantId, {
        id: tenantId,
        name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : "VisualHQ workspace",
        logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : "",
      })
    }

    return NextResponse.json({ workspaces: [...workspaces.values()].sort((a, b) => a.name.localeCompare(b.name)) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load organizations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    const body = await request.json() as { workspaceId?: unknown }
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : ""
    if (!bearer || !workspaceId) return NextResponse.json({ error: "Choose an organization first." }, { status: 400 })

    const { auth, db } = adminServices()
    const decoded = await auth.verifyIdToken(bearer)
    const tenantSnapshot = await db.collection("tenants").doc(workspaceId).get()
    const tenantData = tenantSnapshot.data() || {}
    const ownerSnapshot = await db.collection("organizations")
      .where("tenantId", "==", workspaceId)
      .where("isOwner", "==", true)
      .limit(1)
      .get()
    const owner = ownerSnapshot.empty ? null : ownerSnapshot.docs[0]
    if (!tenantSnapshot.exists && !owner) return NextResponse.json({ error: "That organization is not available." }, { status: 404 })
    const existing = await db.collection("users").doc(decoded.uid).get()
    const existingData = existing.data() || {}
    const existingTenantId = typeof existingData.tenantId === "string" ? existingData.tenantId : ""
    const isUnclaimedWorkspace =
      existingData.role === "admin" &&
      existingTenantId === decoded.uid &&
      existingData.companyId === decoded.uid &&
      existingData.welcomeEmailPending === true
    if (existingTenantId && existingTenantId !== workspaceId && !isUnclaimedWorkspace) {
      return NextResponse.json({ error: "This account already belongs to another organization." }, { status: 409 })
    }
    const attachWorkspace = !existingTenantId || isUnclaimedWorkspace
    const workspaceCompanyId = owner?.id || existingData.companyId || decoded.uid
    const workspaceCompany = owner?.data().name || tenantData.name || existingData.company || ""

    await db.collection("users").doc(decoded.uid).set({
      email: decoded.email || existingData.email || "",
      displayName: decoded.name || existingData.displayName || "",
      photoURL: decoded.picture || existingData.photoURL || "",
      ...(attachWorkspace ? {
        role: "admin",
        tenantId: workspaceId,
        companyId: workspaceCompanyId,
        company: workspaceCompany,
        onboardingStatus: "active",
        welcomeEmailPending: FieldValue.delete(),
      } : {}),
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: existingData.createdAt || FieldValue.serverTimestamp(),
    }, { merge: true })

    return NextResponse.json({
      ok: true,
      workspaceId,
      status: typeof tenantData.status === "string" ? tenantData.status : "trial",
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not join organization" }, { status: 403 })
  }
}
