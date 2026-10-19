import { NextResponse, type NextRequest } from "next/server"

import { adminServices } from "@/lib/firebase-admin"
import { companyAccountIds, listOf, socialApi, socialApiKey, text } from "@/lib/server/social-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * No login: the brand's connected social handles for a shared campaign page,
 * so creators see who they'd be posting for. Only platform and @handle leave.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim() || ""
  const none = NextResponse.json({ accounts: [] })
  if (!id) return none
  try {
    const { db } = adminServices()
    const project = (await db.collection("projects").doc(id).get()).data()
    const companyId = String(project?.companyId || "")
    if (!project || project.isArchived || !companyId) return none
    const org = (await db.collection("organizations").doc(companyId).get()).data()
    const agencyId = String(org?.agencyId || "")
    if (!agencyId || !(await socialApiKey(agencyId))) return none
    const linked = await companyAccountIds(db, companyId)
    if (!linked.length) return none
    const live = new Map(listOf(await socialApi(agencyId, "/accounts")).map((account) => [text(account.id), account]))
    const accounts = linked.flatMap((saved): { platform: string; username: string }[] => {
      const account = live.get(saved.id)
      const username = text(account?.username).replace(/^@/, "")
      return account && username ? [{ platform: text(account.platform) || saved.platform || "", username }] : []
    })
    return NextResponse.json({ accounts })
  } catch (error) {
    console.error("Campaign socials lookup failed:", error)
    return none
  }
}
