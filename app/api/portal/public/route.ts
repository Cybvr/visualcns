import { NextRequest, NextResponse } from "next/server"
import { adminServices } from "@/lib/firebase-admin"
import { findPortalLink, organizationTenant, toWire } from "@/lib/server/portal-links"

export const runtime = "nodejs"

const notFound = () => NextResponse.json({ error: "This link isn’t valid anymore. Ask your agency for a new one." }, { status: 404 })

/**
 * Everything a company's portal shows, for someone holding its share link.
 * Mirrors what a signed-in client can read: published projects and tasks,
 * issued (non-draft) billing documents, files for the company, and written
 * documents that were toggled public.
 */
export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key")?.trim() || ""
    const { db } = adminServices()
    const link = await findPortalLink(db, key)
    if (!link) return notFound()
    const { tenantId, companyId } = link

    const [organizationSnapshot, tenantSnapshot] = await Promise.all([
      db.collection("organizations").doc(companyId).get(),
      db.collection("tenants").doc(tenantId).get(),
    ])
    if (!organizationSnapshot.exists || organizationTenant(organizationSnapshot.data()) !== tenantId) return notFound()
    const tenant = tenantSnapshot.data()
    if (tenant?.deletedAt || tenant?.status === "suspended") return notFound()

    const byCompany = (name: string) => db.collection(name).where("tenantId", "==", tenantId).where("companyId", "==", companyId).get()
    const [projects, tasks, invoices, contracts, estimates, files, documents, owner] = await Promise.all([
      byCompany("portalProjects"),
      byCompany("portalTasks"),
      byCompany("invoices"),
      byCompany("contracts"),
      byCompany("estimates"),
      byCompany("documents"),
      db.collection("companyDocuments").where("tenantId", "==", tenantId).where("companyId", "==", companyId).where("shareEnabled", "==", true).get(),
      db.collection("organizations").where("tenantId", "==", tenantId).where("isOwner", "==", true).limit(1).get(),
    ])

    const rows = (snapshot: FirebaseFirestore.QuerySnapshot) => snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as Record<string, unknown> & { id: string })
    const newest = <T extends Record<string, unknown>>(items: T[]) => items.sort((a, b) => millis(b.createdAt) - millis(a.createdAt))
    const issued = (items: Record<string, unknown>[]) => newest(items.filter((item) => item.status !== "draft"))
    const projectIds = new Set(projects.docs.map((item) => item.id))
    const ownerData = owner.empty ? null : owner.docs[0].data()

    return NextResponse.json(toWire({
      organization: { ...organizationSnapshot.data(), id: organizationSnapshot.id },
      projects: rows(projects),
      // Tasks only show under a project that is itself shared.
      tasks: rows(tasks).filter((task) => projectIds.has(String(task.projectId))),
      invoices: issued(rows(invoices)).map((row) => (!row.invoiceNumber && row.reference ? { ...row, invoiceNumber: row.reference } : row)),
      contracts: issued(rows(contracts)),
      estimates: issued(rows(estimates)),
      files: newest(rows(files)),
      documents: newest(rows(documents)),
      issuer: ownerData ? {
        name: ownerData.name, email: ownerData.email, phone: ownerData.phone, address: ownerData.address,
        website: ownerData.website, taxNumber: ownerData.taxNumber, logoUrl: ownerData.logoUrl,
      } : null,
    }), { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Public portal load failed", error)
    return NextResponse.json({ error: "We couldn’t load this workspace." }, { status: 500 })
  }
}

function millis(value: unknown): number {
  return value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function" ? value.toMillis() : 0
}
