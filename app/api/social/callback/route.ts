import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { readState } from "@/lib/server/social-api"
import { SITE_ORIGIN } from "@/lib/server/email-branding"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Where SocialAPI sends someone after they approve (or refuse) a connection.
 * Links the new account to the company, then returns them to where they started.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const state = readState(params.get("state") || "")
  const back = (result: string) => {
    const url = new URL(state?.returnTo || SITE_ORIGIN)
    url.searchParams.set("social", result)
    return NextResponse.redirect(url)
  }
  if (!state) return back("expired")

  const accountId = params.get("account_id") || ""
  if (params.get("status") !== "success" || !accountId) return back("cancelled")

  const { db } = adminServices()
  const org = (await db.collection("organizations").doc(state.companyId).get()).data()
  if (!org || String(org.agencyId || "") !== state.agencyId) return back("error")
  await db.collection("socialAccounts").doc(accountId).set({
    companyId: state.companyId,
    agencyId: state.agencyId,
    platform: params.get("platform") || "",
    connectedBy: state.uid,
    connectedAt: FieldValue.serverTimestamp(),
  })
  return back("connected")
}
