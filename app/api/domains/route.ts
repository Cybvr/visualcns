import type { NextRequest } from "next/server"

import { isValidDomain, normalizeDomain, type ConnectedDomain } from "@/lib/domains"
import { authorizeDomainManager, domainFailure, domainJson, syncVercelDomain } from "@/lib/server/domains-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * A company's custom domains.
 * - GET ?companyId=                     the company's domains
 * - POST { companyId, name }            connect a new domain
 * - PATCH { companyId, name, siteSlug } choose the website it shows
 * - DELETE { companyId, name }          disconnect it
 */

function toDomain(id: string, data: FirebaseFirestore.DocumentData): ConnectedDomain {
  return {
    name: id,
    companyId: String(data.companyId || ""),
    siteSlug: typeof data.siteSlug === "string" && data.siteSlug ? data.siteSlug : null,
    status: data.status === "connected" ? "connected" : "pending",
    createdAt: typeof data.createdAt === "number" ? data.createdAt : undefined,
    checkedAt: typeof data.checkedAt === "number" ? data.checkedAt : undefined,
  }
}

async function readBody(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  return {
    companyId: typeof body.companyId === "string" ? body.companyId.trim() : "",
    name: typeof body.name === "string" ? normalizeDomain(body.name) : "",
    siteSlug: typeof body.siteSlug === "string" ? body.siteSlug.trim() : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId")?.trim() || ""
    const { db } = await authorizeDomainManager(request, companyId)
    const snapshot = await db.collection("domains").where("companyId", "==", companyId).get()
    const domains = snapshot.docs.map((doc) => toDomain(doc.id, doc.data())).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    return domainJson({ domains })
  } catch (error) {
    return domainFailure(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { companyId, name } = await readBody(request)
    const { db, agencyId } = await authorizeDomainManager(request, companyId)
    if (!isValidDomain(name)) return domainJson({ error: "Enter a domain like yourbusiness.com." }, 400)
    if (name === "visualcns.com" || name.endsWith(".visualcns.com")) return domainJson({ error: "That domain can't be connected." }, 400)
    const ref = db.collection("domains").doc(name)
    const created = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref)
      if (existing.exists) return null
      const data = { companyId, agencyId, siteSlug: null, status: "pending", createdAt: Date.now() }
      transaction.set(ref, data)
      return toDomain(name, data)
    })
    if (!created) return domainJson({ error: "That domain is already connected." }, 409)
    await syncVercelDomain(name, "add").catch((error) => console.error("Vercel domain add failed", error))
    return domainJson({ domain: created })
  } catch (error) {
    return domainFailure(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { companyId, name, siteSlug } = await readBody(request)
    const { db } = await authorizeDomainManager(request, companyId)
    const ref = db.collection("domains").doc(name)
    const snapshot = await ref.get()
    if (!snapshot.exists || snapshot.data()?.companyId !== companyId) return domainJson({ error: "We couldn't find that domain." }, 404)
    await ref.update({ siteSlug: siteSlug || null })
    return domainJson({ domain: toDomain(name, { ...snapshot.data(), siteSlug: siteSlug || null }) })
  } catch (error) {
    return domainFailure(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { companyId, name } = await readBody(request)
    const { db } = await authorizeDomainManager(request, companyId)
    const ref = db.collection("domains").doc(name)
    const snapshot = await ref.get()
    if (!snapshot.exists || snapshot.data()?.companyId !== companyId) return domainJson({ error: "We couldn't find that domain." }, 404)
    await ref.delete()
    await syncVercelDomain(name, "remove").catch((error) => console.error("Vercel domain remove failed", error))
    return domainJson({ ok: true })
  } catch (error) {
    return domainFailure(error)
  }
}
