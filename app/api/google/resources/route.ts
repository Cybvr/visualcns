import { NextResponse, type NextRequest } from "next/server"

import { authorizeSocial, socialFailure } from "@/lib/server/social-api"
import {
  GOOGLE_SERVICES,
  connectionView,
  disconnectGoogle,
  googleFailure,
  googleMarketingConfigured,
  readGoogleConnections,
  resourceOptions,
  serviceSummary,
  setGoogleResource,
  type GoogleService,
} from "@/lib/server/google-marketing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function fail(error: unknown) {
  const social = socialFailure(error)
  if (social.status !== 500) return NextResponse.json(social.body, { status: social.status })
  const { body, status } = googleFailure(error)
  return NextResponse.json(body, { status })
}

function serviceParam(value: string | null): GoogleService | null {
  return GOOGLE_SERVICES.includes(value as GoogleService) ? (value as GoogleService) : null
}

/**
 * GET ?companyId=                     the company's Google connections
 *     &service=ga4&list=1            the accounts/properties/sites that sign-in can pick from
 *     &service=ga4&summary=1         live numbers for the chosen one
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const companyId = params.get("companyId") || ""
    await authorizeSocial(request, companyId)
    const service = serviceParam(params.get("service"))

    if (service && params.get("list")) {
      const { options, note } = await resourceOptions(companyId, service)
      return NextResponse.json({ options, note })
    }
    if (service && params.get("summary")) {
      const { summary, note } = await serviceSummary(companyId, service)
      return NextResponse.json({ summary, note })
    }

    const stored = await readGoogleConnections(companyId)
    return NextResponse.json({
      configured: googleMarketingConfigured(),
      connections: GOOGLE_SERVICES.map((key) => connectionView(key, stored[key])),
    })
  } catch (error) {
    return fail(error)
  }
}

/** POST { companyId, service, resourceId, resourceLabel } picks the property, site or account to track. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { companyId?: unknown; service?: unknown; resourceId?: unknown; resourceLabel?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId : ""
    await authorizeSocial(request, companyId)
    const service = serviceParam(String(body.service || ""))
    if (!service) return NextResponse.json({ error: "Unknown service." }, { status: 400 })
    const resourceId = typeof body.resourceId === "string" ? body.resourceId.slice(0, 300) : ""
    if (!resourceId) return NextResponse.json({ error: "Pick an account first." }, { status: 400 })
    const resourceLabel = typeof body.resourceLabel === "string" ? body.resourceLabel.slice(0, 200) : resourceId
    await setGoogleResource(companyId, service, resourceId, resourceLabel)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return fail(error)
  }
}

/** DELETE { companyId, service } removes the connection. */
export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { companyId?: unknown; service?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId : ""
    await authorizeSocial(request, companyId)
    const service = serviceParam(String(body.service || ""))
    if (!service) return NextResponse.json({ error: "Unknown service." }, { status: 400 })
    await disconnectGoogle(companyId, service)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return fail(error)
  }
}
