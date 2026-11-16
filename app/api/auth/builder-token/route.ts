import { NextResponse } from "next/server"

import { adminServices } from "@/lib/firebase-admin"

/**
 * Signs the caller in to Juju SiteBuilder, which runs on the same Firebase
 * project. Takes the caller's own ID token and returns a one-time custom token
 * for that same account only, so a VisualCNS sign-in carries over to the builder.
 */
export async function POST(request: Request) {
  const authorization = request.headers.get("authorization")
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : ""
  if (!idToken) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  try {
    const { auth } = adminServices()
    const decoded = await auth.verifyIdToken(idToken, true)
    const token = await auth.createCustomToken(decoded.uid)
    return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Could not sign you in to the builder." }, { status: 401 })
  }
}
