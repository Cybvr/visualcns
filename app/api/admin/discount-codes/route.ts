import { NextResponse, type NextRequest } from "next/server"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminServices } from "@/lib/firebase-admin"
import { normalizeCode } from "@/lib/server/discounts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Discount codes for the services checkout, for platform admins.
 * GET lists them, POST adds one, PATCH turns one on or off, DELETE removes it.
 */

class Refused extends Error {}

async function authorize(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new Refused("Please sign in again.")
  const { auth, db } = adminServices()
  const decoded = await auth.verifyIdToken(token).catch(() => null)
  if (!decoded) throw new Refused("Please sign in again.")
  const caller = await db.collection("users").doc(decoded.uid).get()
  if (caller.data()?.role !== "superadmin") throw new Refused("Only platform admins can manage discount codes.")
  return db
}

function failed(error: unknown) {
  if (error instanceof Refused) return NextResponse.json({ error: error.message }, { status: 403 })
  console.error("Discount codes failed", error)
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
}

const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0)

export async function GET(request: NextRequest) {
  try {
    const db = await authorize(request)
    const snapshot = await db.collection("discountCodes").get()
    const codes = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        code: doc.id,
        percent: number(data.percent),
        amountNGN: number(data.amountNGN),
        amountUSD: number(data.amountUSD),
        active: data.active !== false,
        expiresAt: data.expiresAt?.toMillis?.() ?? null,
        maxUses: typeof data.maxUses === "number" ? data.maxUses : null,
        uses: Number(data.uses || 0),
        createdAt: data.createdAt?.toMillis?.() ?? 0,
      }
    }).sort((a, b) => b.createdAt - a.createdAt)
    return NextResponse.json({ codes })
  } catch (error) {
    return failed(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await authorize(request)
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const code = normalizeCode(body.code)
    if (!/^[A-Z0-9_-]{2,40}$/.test(code)) return NextResponse.json({ error: "Use 2–40 letters, numbers, - or _ for the code." }, { status: 400 })
    const percent = Math.round(number(body.percent))
    const amountNGN = Math.round(number(body.amountNGN))
    const amountUSD = Math.round(number(body.amountUSD))
    if (percent > 100) return NextResponse.json({ error: "A percentage can't be over 100." }, { status: 400 })
    if (!percent && !amountNGN && !amountUSD) return NextResponse.json({ error: "Set a percentage or an amount off." }, { status: 400 })
    const expiresAt = typeof body.expiresAt === "number" && body.expiresAt > Date.now() ? Timestamp.fromMillis(body.expiresAt) : null
    const maxUses = Math.round(number(body.maxUses))

    const ref = db.collection("discountCodes").doc(code)
    const created = await db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) return false
      tx.set(ref, {
        ...(percent ? { percent } : { ...(amountNGN ? { amountNGN } : {}), ...(amountUSD ? { amountUSD } : {}) }),
        active: true,
        ...(expiresAt ? { expiresAt } : {}),
        ...(maxUses ? { maxUses } : {}),
        uses: 0,
        createdAt: FieldValue.serverTimestamp(),
      })
      return true
    })
    if (!created) return NextResponse.json({ error: "That code already exists." }, { status: 409 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return failed(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const db = await authorize(request)
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const code = normalizeCode(body.code)
    const ref = db.collection("discountCodes").doc(code)
    if (!code || !(await ref.get()).exists) return NextResponse.json({ error: "That code doesn't exist." }, { status: 404 })
    await ref.set({ active: body.active === true }, { merge: true })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return failed(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = await authorize(request)
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const code = normalizeCode(body.code)
    if (!code) return NextResponse.json({ error: "That code doesn't exist." }, { status: 404 })
    await db.collection("discountCodes").doc(code).delete()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return failed(error)
  }
}
