import type { Firestore } from "firebase-admin/firestore"

/** A company's staff (its users) and invites still waiting to be accepted. Both count as seats. */
export async function visitorStaff(db: Firestore, agencyId: string, companyId: string) {
  const [people, invites] = await Promise.all([
    db.collection("users").where("agencyId", "==", agencyId).where("companyId", "==", companyId).get(),
    db.collection("invites").where("agencyId", "==", agencyId).where("companyId", "==", companyId).where("status", "==", "pending").get(),
  ])
  const now = Date.now()
  const staff = people.docs
    .filter((item) => item.data().role === "client")
    .map((item) => ({ id: item.id, name: String(item.data().displayName || ""), email: String(item.data().email || "") }))
  const pending = invites.docs
    .filter((item) => (item.data().expiresAt?.toMillis?.() ?? 0) > now)
    .map((item) => ({ id: item.id, email: String(item.data().email || "") }))
  return { staff, pending, seats: staff.length + pending.length }
}
