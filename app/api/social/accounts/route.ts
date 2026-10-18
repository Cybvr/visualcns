import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { authorizeSocial, canPublish, companyAccountIds, listOf, socialApi, socialApiKey, socialFailure, text } from "@/lib/server/social-api"
import type { SocialAccount, SocialAccountsInfo } from "@/lib/social"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * A company's connected social accounts.
 * - GET ?companyId=                      the accounts and who may post
 * - DELETE { companyId, accountId }      disconnects one
 * - PATCH { companyId, clientPosting }   the agency lets the client post on their own
 */

function failure(error: unknown) {
  const { body, status } = socialFailure(error)
  return NextResponse.json(body, { status })
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId")?.trim() || ""
    const { db, agencyId, org, role } = await authorizeSocial(request, companyId)
    const info: SocialAccountsInfo = {
      configured: Boolean(await socialApiKey(agencyId)),
      accounts: [],
      clientPosting: org.socialClientPosting === true,
      canPublish: canPublish(role, org),
      role,
    }
    if (!info.configured) return NextResponse.json(info)

    const linked = await companyAccountIds(db, companyId)
    if (!linked.length) return NextResponse.json(info)
    const live = listOf(await socialApi(agencyId, "/accounts"))
    const byId = new Map(live.map((account) => [text(account.id), account]))
    info.accounts = linked.flatMap((saved): SocialAccount[] => {
      const account = byId.get(saved.id)
      // SocialAPI drops an account when the platform revokes access; it needs connecting again.
      if (!account) return [{ id: saved.id, platform: saved.platform || "", name: "", username: "", status: "disconnected" }]
      return [{ id: saved.id, platform: text(account.platform) || saved.platform || "", name: text(account.name), username: text(account.username), status: text(account.status) || "active" }]
    })
    return NextResponse.json(info)
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { companyId?: unknown; accountId?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const accountId = typeof body.accountId === "string" ? body.accountId.trim() : ""
    const { db, agencyId } = await authorizeSocial(request, companyId)
    const ref = db.collection("socialAccounts").doc(accountId)
    const saved = accountId ? (await ref.get()).data() : undefined
    if (!saved || saved.companyId !== companyId) return NextResponse.json({ error: "That account isn't connected here." }, { status: 404 })
    await socialApi(agencyId, `/accounts/${encodeURIComponent(accountId)}`, { method: "DELETE" }).catch((error) => {
      // Already gone on SocialAPI's side; just forget it here.
      if (!(error && typeof error === "object" && "status" in error && error.status === 404)) throw error
    })
    await ref.delete()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { companyId?: unknown; clientPosting?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const { db } = await authorizeSocial(request, companyId, { agencyOnly: true })
    if (typeof body.clientPosting !== "boolean") return NextResponse.json({ error: "Nothing to change." }, { status: 400 })
    await db.collection("organizations").doc(companyId).set({ socialClientPosting: body.clientPosting, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}
