import { promises as dns } from "node:dns"
import type { NextRequest } from "next/server"

import { DOMAIN_A_RECORD, isRootDomain, normalizeDomain } from "@/lib/domains"
import { authorizeDomainManager, domainFailure, domainJson } from "@/lib/server/domains-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** POST { companyId, name }: looks up the domain's DNS and marks it connected once it points at us. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const name = typeof body.name === "string" ? normalizeDomain(body.name) : ""
    const { db } = await authorizeDomainManager(request, companyId)
    const ref = db.collection("domains").doc(name)
    const snapshot = await ref.get()
    if (!snapshot.exists || snapshot.data()?.companyId !== companyId) return domainJson({ error: "We couldn't find that domain." }, 404)

    let connected = false
    if (isRootDomain(name)) {
      const addresses = await dns.resolve4(name).catch(() => [] as string[])
      connected = addresses.includes(DOMAIN_A_RECORD)
    } else {
      const targets = await dns.resolveCname(name).catch(() => [] as string[])
      connected = targets.some((target) => target.toLowerCase().replace(/\.$/, "").endsWith("vercel-dns.com"))
    }
    const status = connected ? "connected" : "pending"
    await ref.update({ status, checkedAt: Date.now() })
    return domainJson({ status })
  } catch (error) {
    return domainFailure(error)
  }
}
