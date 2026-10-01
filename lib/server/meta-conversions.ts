import { createHash } from "node:crypto"
import type { NextRequest } from "next/server"

import { META_PIXEL_ID } from "@/lib/meta-pixel-id"
import { getAgencySecret } from "@/lib/server/agency-secrets"

const GRAPH_VERSION = "v23.0"

function sha256(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

function cookie(request: NextRequest, name: string) {
  return request.cookies.get(name)?.value || undefined
}

/**
 * Sends a Lead to Meta from the server through the Conversions API, so ad
 * blockers can't drop it. The browser pixel sends the same event with the
 * same `eventId`, and Meta counts the pair once.
 *
 * Needs META_CAPI_ACCESS_TOKEN (agency secret or env). Without it this does
 * nothing. Set META_CAPI_TEST_EVENT_CODE to see events under Test events.
 */
export async function sendMetaLead(
  request: NextRequest,
  agencyId: string,
  lead: { eventId: string; uid: string; email: string; name: string; sourceUrl: string },
) {
  const accessToken = await getAgencySecret(agencyId, "META_CAPI_ACCESS_TOKEN", process.env.META_CAPI_ACCESS_TOKEN || "")
  if (!accessToken) return

  const [firstName, ...rest] = lead.name.trim().split(/\s+/).filter(Boolean)
  const lastName = rest.join(" ")
  const userData: Record<string, unknown> = {
    external_id: [sha256(lead.uid)],
    client_ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
    client_user_agent: request.headers.get("user-agent") || undefined,
    // Set by the browser pixel; they let Meta match the lead to the ad click.
    fbp: cookie(request, "_fbp"),
    fbc: cookie(request, "_fbc"),
  }
  if (lead.email) userData.em = [sha256(lead.email)]
  if (firstName) userData.fn = [sha256(firstName)]
  if (lastName) userData.ln = [sha256(lastName)]

  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      ...(testEventCode ? { test_event_code: testEventCode } : {}),
      data: [{
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: lead.eventId,
        action_source: "website",
        event_source_url: lead.sourceUrl,
        user_data: userData,
      }],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) console.error("Meta Conversions API rejected the Lead:", await response.text().catch(() => response.status))
}
