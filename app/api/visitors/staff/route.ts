import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { authorizeVisitorManager as authorize, VisitorRefused } from "@/lib/server/visitor-auth"
import { visitorStaff } from "@/lib/server/visitor-staff"
import { isPlanKey, planForStaff, PLANS, staffLimit } from "@/lib/subscription"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * A company's Visitor Sign-in staff: the people visitors can pick and who get
 * arrival emails. Each staff member or outstanding legacy invite is a seat, capped by the
 * site's plan. The company's own staff and the agency's admins can use it.
 * - GET ?companyId=   staff, pending invites, seats and the limit
 * - POST { name, email } add someone directly, converting a matching invite
 * - DELETE { inviteId } cancels an invite; DELETE { userId } removes someone
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function seatInfo(db: FirebaseFirestore.Firestore, agencyId: string, companyId: string) {
  const [people, billing] = await Promise.all([
    visitorStaff(db, agencyId, companyId),
    db.collection("visitorBilling").doc(companyId).get().then((snapshot) => snapshot.data()),
  ])
  const allowed = staffLimit(billing as Parameters<typeof staffLimit>[0])
  const plan = isPlanKey(billing?.plan) ? billing.plan : null
  // null means no limit (Pro); Infinity doesn't survive JSON.
  return { ...people, limit: Number.isFinite(allowed) ? allowed : null, plan }
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status })
}

function failure(error: unknown) {
  if (error instanceof VisitorRefused) return json({ error: error.message }, 403)
  console.error("Visitor staff failed", error)
  return json({ error: "Something went wrong. Please try again." }, 500)
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId")?.trim() || ""
    const { db, agencyId } = await authorize(request, companyId)
    return json(await seatInfo(db, agencyId, companyId))
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { companyId?: unknown; name?: unknown; email?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const { auth, db, agencyId } = await authorize(request, companyId)
    if (!name) return json({ error: "Enter the team member's name." }, 400)
    if (!EMAIL_PATTERN.test(email)) return json({ error: "Enter a valid email address." }, 400)

    const info = await seatInfo(db, agencyId, companyId)
    if (info.staff.some((person) => person.email.toLowerCase() === email)) return json({ error: "That person is already on your staff." }, 409)
    const pending = info.pending.find((invite) => invite.email.toLowerCase() === email)
    if (!pending && info.limit !== null && info.seats >= info.limit) {
      const next = planForStaff(info.seats + 1)
      return json({
        error: `Your ${info.plan ? PLANS[info.plan].name : "current"} plan covers ${info.limit} staff. Upgrade to ${PLANS[next].name} to add more.`,
        upgrade: next,
      }, 402)
    }

    const agencyUsers = await db.collection("users").where("agencyId", "==", agencyId).get()
    const contact = agencyUsers.docs.find((item) => String(item.data().email || "").trim().toLowerCase() === email)
    let ref = contact?.ref
    let existing = contact?.data()

    if (!ref) {
      let account
      try {
        account = await auth.getUserByEmail(email)
      } catch (error) {
        if ((error as { code?: string }).code !== "auth/user-not-found") throw error
        account = await auth.createUser({ email, displayName: name })
      }
      ref = db.collection("users").doc(account.uid)
      existing = (await ref.get()).data()
    }

    if (existing?.agencyId && existing.agencyId !== agencyId) return json({ error: "This person belongs to another agency." }, 409)
    if (existing?.role && existing.role !== "client") return json({ error: "This person has a different role. Add them from Contacts." }, 409)
    if (existing?.companyId === companyId || (Array.isArray(existing?.companyIds) && existing.companyIds.includes(companyId))) {
      return json({ error: "That person is already on this team." }, 409)
    }

    const batch = db.batch()
    if (existing?.companyId && existing.agencyId === agencyId) {
      batch.update(ref, {
        companyIds: FieldValue.arrayUnion(companyId),
        role: "client",
        displayName: existing.displayName || name,
        updatedAt: FieldValue.serverTimestamp(),
      })
    } else {
      batch.set(ref, {
        agencyId,
        companyId,
        role: "client",
        email,
        displayName: existing?.displayName || name,
        updatedAt: FieldValue.serverTimestamp(),
        ...(!existing ? { createdAt: FieldValue.serverTimestamp() } : {}),
      }, { merge: true })
    }
    if (pending) batch.update(db.collection("invites").doc(pending.id), { status: "cancelled", updatedAt: FieldValue.serverTimestamp() })
    await batch.commit()
    return json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { companyId?: unknown; inviteId?: unknown; userId?: unknown }
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : ""
    const { db, uid, agencyId } = await authorize(request, companyId)

    if (typeof body.inviteId === "string" && body.inviteId) {
      const ref = db.collection("invites").doc(body.inviteId)
      const invite = (await ref.get()).data()
      if (!invite || invite.companyId !== companyId || invite.agencyId !== agencyId) return json({ error: "We couldn't find that invite." }, 404)
      await ref.update({ status: "cancelled", updatedAt: FieldValue.serverTimestamp() })
      return json({ ok: true })
    }

    if (typeof body.userId === "string" && body.userId) {
      if (body.userId === uid) return json({ error: "You can't remove yourself." }, 400)
      const ref = db.collection("users").doc(body.userId)
      const person = (await ref.get()).data()
      const linked = person?.companyId === companyId || (Array.isArray(person?.companyIds) && person.companyIds.includes(companyId))
      if (!person || !linked || person.agencyId !== agencyId || person.role !== "client") return json({ error: "We couldn't find that person." }, 404)
      if (person.companyId !== companyId) {
        await ref.update({ companyIds: FieldValue.arrayRemove(companyId), updatedAt: FieldValue.serverTimestamp() })
      } else {
        const otherCompanies = Array.isArray(person.companyIds) ? person.companyIds.filter((id: unknown) => typeof id === "string" && id !== companyId) as string[] : []
        if (otherCompanies.length) {
          await ref.update({ companyId: otherCompanies[0], companyIds: FieldValue.arrayRemove(companyId, otherCompanies[0]), company: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() })
        } else {
          // They keep their login but lose access to this company.
          await ref.update({ role: FieldValue.delete(), agencyId: FieldValue.delete(), companyId: FieldValue.delete(), company: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() })
        }
      }
      return json({ ok: true })
    }

    return json({ error: "Nothing to remove." }, 400)
  } catch (error) {
    return failure(error)
  }
}
