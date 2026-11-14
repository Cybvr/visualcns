import { NextResponse, type NextRequest } from "next/server"

import { authorizeVisitorManager, VisitorRefused } from "@/lib/server/visitor-auth"

/** The same people who manage a company's visitor sign-in manage its domains: its own staff and the agency's admins. */
export async function authorizeDomainManager(request: NextRequest, companyId: string) {
  return authorizeVisitorManager(request, companyId)
}

export function domainJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status })
}

export function domainFailure(error: unknown) {
  if (error instanceof VisitorRefused) return domainJson({ error: "You can't manage domains for this company." }, 403)
  console.error("Domains request failed", error)
  return domainJson({ error: "Something went wrong. Please try again." }, 500)
}

/** Adds or removes the domain on the builder's Vercel project when it's configured; otherwise does nothing. */
export async function syncVercelDomain(name: string, action: "add" | "remove") {
  const token = process.env.VERCEL_TOKEN
  const project = process.env.VERCEL_BUILDER_PROJECT_ID
  if (!token || !project) return
  const team = process.env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : ""
  const base = `https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/domains`
  const response = action === "add"
    ? await fetch(`${base}${team}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
    : await fetch(`${base}/${encodeURIComponent(name)}${team}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok && response.status !== 409 && response.status !== 404) {
    console.error(`Vercel domain ${action} failed`, response.status, await response.text().catch(() => ""))
  }
}
