import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

import { setAgencySecret } from "@/lib/server/agency-secrets"
import { GOOGLE_CALENDAR_EVENTS_SCOPE, gmailProfile, googleOAuthConfig } from "@/lib/server/google-gmail"

const STATE_COOKIE = "visualhq-google-oauth-state"

function stateSecret() {
  return process.env.GOOGLE_GMAIL_CLIENT_SECRET || "visualhq-google-oauth-state"
}

function decodeState(value: string) {
  const [payload, signature] = value.split(".")
  if (!payload || !signature) return null
  const expected = createHmac("sha256", stateSecret()).update(payload).digest("base64url")
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { agencyId?: string; exp?: number }
    return parsed.agencyId && parsed.exp && parsed.exp > Date.now() ? parsed : null
  } catch {
    return null
  }
}

function redirect(request: Request, status: "connected" | "error", message?: string) {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "")
  const url = new URL(`${origin}/dashboard/account/integrations`)
  url.searchParams.set("google", status)
  if (message) url.searchParams.set("message", message.slice(0, 180))
  const response = NextResponse.redirect(url)
  response.cookies.delete(STATE_COOKIE)
  return response
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const error = url.searchParams.get("error")
  const state = url.searchParams.get("state") || ""
  const code = url.searchParams.get("code") || ""
  if (error) return redirect(request, "error", "Google mailbox connection was cancelled.")
  const stateCookie = request.headers.get("cookie")?.match(new RegExp(`${STATE_COOKIE}=([^;]+)`))?.[1] || ""
  const decoded = state && stateCookie && state === stateCookie ? decodeState(state) : null
  if (!decoded) return redirect(request, "error", "The Google connection expired. Start the connection again.")
  if (!code) return redirect(request, "error", "Google did not return an authorization code.")

  try {
    const config = googleOAuthConfig()
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code" }),
      cache: "no-store",
    })
    const tokens = await tokenResponse.json().catch(() => ({})) as { refresh_token?: string; scope?: string; error_description?: string; error?: string }
    if (!tokenResponse.ok || !tokens.refresh_token) throw new Error(tokens.error_description || tokens.error || "Google did not return a refresh token.")
    await setAgencySecret(decoded.agencyId as string, "GMAIL_REFRESH_TOKEN", tokens.refresh_token)
    const grantedScopes = (tokens.scope || "").split(/\s+/)
    await setAgencySecret(decoded.agencyId as string, "GOOGLE_CALENDAR_CONNECTED", String(grantedScopes.includes(GOOGLE_CALENDAR_EVENTS_SCOPE)))
    const profile = await gmailProfile(decoded.agencyId as string)
    await setAgencySecret(decoded.agencyId as string, "GMAIL_CONNECTED_EMAIL", profile?.emailAddress || "info@visualcns.com")
    await setAgencySecret(decoded.agencyId as string, "GMAIL_CONNECTED_AT", new Date().toISOString())
    return redirect(request, "connected")
  } catch (error) {
    return redirect(request, "error", error instanceof Error ? error.message : "Google mailbox connection failed.")
  }
}
