import { createHmac, randomBytes } from "node:crypto"
import { NextResponse } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { requireAgencyId } from "@/lib/require-agency-id"
import { googleOAuthConfig, GOOGLE_GMAIL_SCOPES } from "@/lib/server/google-gmail"

const STATE_COOKIE = "visualhq-google-oauth-state"

function stateSecret() {
  return process.env.GOOGLE_GMAIL_CLIENT_SECRET || "visualhq-google-oauth-state"
}

function encodeState(value: Record<string, unknown>) {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url")
  const signature = createHmac("sha256", stateSecret()).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

async function callerFromRequest(request: Request) {
  const authorization = request.headers.get("authorization")
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : ""
  if (!idToken) return null
  try {
    const { auth, db } = adminServices()
    const decoded = await auth.verifyIdToken(idToken)
    const snapshot = await db.collection("users").doc(decoded.uid).get()
    if (!snapshot.exists) return null
    const data = snapshot.data() || {}
    if (data.role !== "admin" && data.role !== "superadmin") return null
    return { uid: decoded.uid, data }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const caller = await callerFromRequest(request)
  if (!caller) return NextResponse.json({ error: "Only an agency admin can connect the mailbox." }, { status: 403 })
  let agencyId: string
  try {
    agencyId = requireAgencyId(caller.data)
  } catch {
    return NextResponse.json({ error: "Your account has no agency assigned." }, { status: 403 })
  }

  try {
    const config = googleOAuthConfig()
    const state = encodeState({ uid: caller.uid, agencyId, exp: Date.now() + 10 * 60 * 1000, nonce: randomBytes(16).toString("hex") })
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    url.searchParams.set("client_id", config.clientId)
    url.searchParams.set("redirect_uri", config.redirectUri)
    url.searchParams.set("response_type", "code")
    url.searchParams.set("access_type", "offline")
    url.searchParams.set("prompt", "consent")
    url.searchParams.set("include_granted_scopes", "true")
    url.searchParams.set("scope", GOOGLE_GMAIL_SCOPES.join(" "))
    url.searchParams.set("state", state)

    const response = NextResponse.json({ url: url.toString() })
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/email/google",
    })
    return response
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Google mailbox setup is not configured yet." }, { status: 503 })
  }
}

