import { NextResponse, type NextRequest } from "next/server"

import { authorizeSocial, socialFailure } from "@/lib/server/social-api"
import { GOOGLE_SERVICES, googleAuthUrl, googleFailure, signGoogleState, type GoogleService } from "@/lib/server/google-marketing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST { companyId, service, returnTo } starts a Google sign-in for one
 * service (ga4, searchConsole or googleAds). Returns Google's consent page;
 * the person approves there and comes back through /api/google/callback.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { companyId?: unknown; service?: unknown; returnTo?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const service = String(body.service || "") as GoogleService
    if (!GOOGLE_SERVICES.includes(service)) return NextResponse.json({ error: "Pick a Google service to connect." }, { status: 400 })

    const { agencyId, uid } = await authorizeSocial(request, companyId)
    const origin = request.nextUrl.origin
    const path = typeof body.returnTo === "string" && body.returnTo.startsWith("/") && !body.returnTo.startsWith("//") ? body.returnTo.split(/[?#]/)[0].slice(0, 160) : "/"
    const state = signGoogleState({ companyId, agencyId, uid, service, returnTo: `${origin}${path}` })
    return NextResponse.json({ url: googleAuthUrl(service, state) })
  } catch (error) {
    const social = socialFailure(error)
    if (social.status !== 500) return NextResponse.json(social.body, { status: social.status })
    const { body, status } = googleFailure(error)
    return NextResponse.json(body, { status })
  }
}
