import { NextResponse, type NextRequest } from "next/server"
import { randomBytes } from "node:crypto"
import { FieldValue } from "firebase-admin/firestore"

import { authorizeVisitorManager, VisitorRefused } from "@/lib/server/visitor-auth"
import { AGREEMENT_TEXT_MAX, AGREEMENT_TITLE_MAX, checkConnectionUrl, getVisitorSettings, sendTest } from "@/lib/server/visitor-connections"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * A company's visitor sign-in extras: the phone QR link, the visitor agreement,
 * and the Slack, Teams and webhook connections.
 * - GET ?companyId=                           current settings
 * - POST { action: "save", ... }               agreement and connection addresses
 * - POST { action: "qr", enabled }             switch phone sign-in on or off
 * - POST { action: "qr_reset" }                new QR code; the old one stops working
 * - POST { action: "test", kind, url }         sends a sample arrival
 */

const KINDS = ["slack", "teams", "webhook"] as const
type Kind = (typeof KINDS)[number]
const FIELD: Record<Kind, "slackUrl" | "teamsUrl" | "webhookUrl"> = { slack: "slackUrl", teams: "teamsUrl", webhook: "webhookUrl" }

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status })
}

const newKey = () => randomBytes(18).toString("hex")
const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "")

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId")?.trim() || ""
    const { db } = await authorizeVisitorManager(request, companyId)
    const settings = await getVisitorSettings(db, companyId)
    return json({
      qrKey: settings.qrKey || "",
      agreement: settings.agreement ?? { enabled: false, title: "", text: "" },
      slackUrl: settings.slackUrl || "",
      teamsUrl: settings.teamsUrl || "",
      webhookUrl: settings.webhookUrl || "",
    })
  } catch (error) {
    if (error instanceof VisitorRefused) return json({ error: error.message }, 403)
    console.error("Visitor settings failed", error)
    return json({ error: "Something went wrong. Please try again." }, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const companyId = text(body.companyId, 200)
    const { db, agencyId, org } = await authorizeVisitorManager(request, companyId)
    const ref = db.collection("visitorSettings").doc(companyId)
    const stamp = { agencyId, companyId, updatedAt: FieldValue.serverTimestamp() }

    if (body.action === "qr") {
      const current = await getVisitorSettings(db, companyId)
      const qrKey = body.enabled ? current.qrKey || newKey() : ""
      await ref.set({ ...stamp, qrKey: qrKey || FieldValue.delete() }, { merge: true })
      return json({ ok: true, qrKey })
    }

    if (body.action === "qr_reset") {
      const qrKey = newKey()
      await ref.set({ ...stamp, qrKey }, { merge: true })
      return json({ ok: true, qrKey })
    }

    if (body.action === "test") {
      const kind = KINDS.find((item) => item === body.kind)
      const url = text(body.url, 1000)
      if (!kind || !url) return json({ error: "Paste the address first." }, 400)
      const problem = await checkConnectionUrl(kind, url)
      if (problem) return json({ error: problem }, 400)
      const sent = await sendTest(kind, url, companyId, String(org.name || "your company"))
      return sent ? json({ ok: true }) : json({ error: "It didn't accept the test. Check the address and try again." }, 502)
    }

    if (body.action === "save") {
      const update: Record<string, unknown> = { ...stamp }
      for (const kind of KINDS) {
        const field = FIELD[kind]
        if (!(field in body)) continue
        const url = text(body[field], 1000)
        const problem = await checkConnectionUrl(kind, url)
        if (problem) return json({ error: problem, field }, 400)
        update[field] = url || FieldValue.delete()
      }
      if (body.agreement && typeof body.agreement === "object") {
        const raw = body.agreement as Record<string, unknown>
        const agreement = { enabled: raw.enabled === true, title: text(raw.title, AGREEMENT_TITLE_MAX), text: text(raw.text, AGREEMENT_TEXT_MAX) }
        if (agreement.enabled && (!agreement.title || !agreement.text)) return json({ error: "Add a title and the agreement text, or switch it off.", field: "agreement" }, 400)
        update.agreement = agreement
      }
      await ref.set(update, { merge: true })
      return json({ ok: true })
    }

    return json({ error: "Unknown action." }, 400)
  } catch (error) {
    if (error instanceof VisitorRefused) return json({ error: error.message }, 403)
    console.error("Visitor settings failed", error)
    return json({ error: "Something went wrong. Please try again." }, 500)
  }
}
