import { NextResponse, type NextRequest } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { SITE_ORIGIN } from "@/lib/server/email-branding"
import { exchangeCode, googleUserEmail, readGoogleState, saveGoogleConnection } from "@/lib/server/google-marketing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Where Google sends someone after they approve (or refuse). Saves the refresh
 * token for the company and service, then returns them to where they started.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const state = readGoogleState(params.get("state") || "")
  const back = (result: string) => {
    const url = new URL(state?.returnTo || SITE_ORIGIN)
    url.searchParams.set("google", result)
    if (state) url.searchParams.set("service", state.service)
    return NextResponse.redirect(url)
  }
  if (!state) return back("expired")
  if (params.get("error") || !params.get("code")) return back("cancelled")

  try {
    // The connection belongs to the company that started it; the signed state carries that.
    const org = (await adminServices().db.collection("organizations").doc(state.companyId).get()).data()
    if (!org || String(org.agencyId || "") !== state.agencyId) return back("error")

    const { accessToken, refreshToken, scope } = await exchangeCode(params.get("code") as string)
    const email = accessToken ? await googleUserEmail(accessToken).catch(() => "") : ""
    await saveGoogleConnection(state.companyId, state.service, { email, refreshToken, scope, connectedBy: state.uid })
    return back("connected")
  } catch (error) {
    console.error("Google marketing callback failed", error)
    return back("error")
  }
}
