import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminServices } from "@/lib/firebase-admin"
import { findPortalLink } from "@/lib/server/portal-links"

export const runtime = "nodejs"

/** Accept a sent estimate through the share link, no account needed. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { key?: unknown; estimateId?: unknown }
    const key = typeof body.key === "string" ? body.key.trim() : ""
    const estimateId = typeof body.estimateId === "string" ? body.estimateId.trim() : ""
    const { db } = adminServices()
    const link = key ? await findPortalLink(db, key) : null
    if (!link || !estimateId) return NextResponse.json({ error: "This link isn’t valid anymore." }, { status: 404 })
    const ref = db.collection("estimates").doc(estimateId)
    const estimate = await ref.get()
    const data = estimate.data()
    if (!estimate.exists || data?.tenantId !== link.tenantId || data?.companyId !== link.companyId) {
      return NextResponse.json({ error: "This estimate isn’t available." }, { status: 404 })
    }
    if (data?.status !== "sent") return NextResponse.json({ error: "This estimate can’t be accepted." }, { status: 409 })
    await ref.set({ status: "accepted", acceptedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Public estimate accept failed", error)
    return NextResponse.json({ error: "We couldn’t accept this estimate." }, { status: 500 })
  }
}
