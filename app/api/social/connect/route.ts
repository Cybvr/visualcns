import { NextResponse, type NextRequest } from "next/server"

import { authorizeSocial, signState, SOCIAL_CALLBACK_URL, socialApi, socialFailure, text } from "@/lib/server/social-api"
import { platformInfo } from "@/lib/social"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST { companyId, platform, returnTo } starts connecting a social account.
 * Returns the platform's sign-in page; the person approves there and comes
 * back through /api/social/callback. No password is ever shared with us.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { companyId?: unknown; platform?: unknown; returnTo?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const platform = typeof body.platform === "string" ? body.platform.trim() : ""
    const { agencyId, uid } = await authorizeSocial(request, companyId)
    if (!platformInfo(platform)) return NextResponse.json({ error: "Pick a platform to connect." }, { status: 400 })

    // Back to the page they started on, on the same site (agency subdomains included).
    const origin = request.nextUrl.origin
    // SocialAPI caps state at 512 characters, so only the path is kept.
    const path = typeof body.returnTo === "string" && body.returnTo.startsWith("/") && !body.returnTo.startsWith("//") ? body.returnTo.split(/[?#]/)[0].slice(0, 160) : "/"
    const state = signState({ companyId, agencyId, uid, returnTo: `${origin}${path}` })

    const result = await socialApi(agencyId, "/accounts/connect", { method: "POST", body: { platform, redirect_uri: SOCIAL_CALLBACK_URL, state } })
    const url = text(result.auth_url)
    if (!url) return NextResponse.json({ error: "SocialAPI didn't return a sign-in link." }, { status: 502 })
    return NextResponse.json({ url })
  } catch (error) {
    const { body, status } = socialFailure(error)
    return NextResponse.json(body, { status })
  }
}
