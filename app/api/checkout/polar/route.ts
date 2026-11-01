import { NextResponse, type NextRequest } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { polarCheckout, PolarError } from "@/lib/server/polar"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Dollar checkout: one item straight to Polar, no cart. Signed in or not; a
 * signed-in buyer's company gets the plan. Returns { url } to send them to.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { serviceId?: string; returnTo?: string }
  const serviceId = typeof body.serviceId === "string" ? body.serviceId : ""
  if (!serviceId) return NextResponse.json({ error: "Pick something to buy." }, { status: 400 })

  const { auth, db } = adminServices()
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  let uid = ""
  let email = ""
  let user: Record<string, unknown> = {}
  if (token) {
    const decoded = await auth.verifyIdToken(token).catch(() => null)
    if (!decoded) return NextResponse.json({ error: "Please sign in again." }, { status: 401 })
    uid = decoded.uid
    user = (await db.collection("users").doc(uid).get()).data() ?? {}
    email = String(decoded.email || user.email || "")
  }

  // Back to the page they bought from: the site's pricing or a company page's.
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin
  const returnTo = typeof body.returnTo === "string" && /^(?:\/[A-Za-z0-9%._~-]+)*\/?$/.test(body.returnTo) ? body.returnTo : "/pricing"
  const back = new URL(`${origin}${returnTo}`)
  back.searchParams.set("paid", "polar")
  back.searchParams.set("item", serviceId)

  try {
    const url = await polarCheckout(serviceId, {
      successUrl: back.toString(),
      email,
      metadata: {
        kind: "visualcns",
        uid,
        companyId: String(user.companyId || ""),
        agencyId: String(user.agencyId || ""),
      },
    })
    return NextResponse.json({ url })
  } catch (error) {
    if (error instanceof PolarError) return NextResponse.json({ error: error.message }, { status: 502 })
    console.error("Polar checkout failed", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
