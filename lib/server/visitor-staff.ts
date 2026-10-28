import type { Firestore } from "firebase-admin/firestore"

/** A company's staff (including contacts added to this company) and outstanding legacy invites. */
export async function visitorStaff(db: Firestore, agencyId: string, companyId: string) {
  const [workspacePeople, sharedPeople, invites] = await Promise.all([
    db.collection("users").where("agencyId", "==", agencyId).where("companyId", "==", companyId).get(),
    db.collection("users").where("agencyId", "==", agencyId).where("companyIds", "array-contains", companyId).get(),
    db.collection("invites").where("agencyId", "==", agencyId).where("companyId", "==", companyId).where("status", "==", "pending").get(),
  ])
  const now = Date.now()
  const people = new Map([...workspacePeople.docs, ...sharedPeople.docs].map((item) => [item.id, item]))
  const staff = [...people.values()]
    .filter((item) => item.data().role === "client")
    .map((item) => ({ id: item.id, name: String(item.data().displayName || ""), email: String(item.data().email || "") }))
  const pending = invites.docs
    .filter((item) => (item.data().expiresAt?.toMillis?.() ?? 0) > now)
    .map((item) => ({ id: item.id, email: String(item.data().email || "") }))
  return { staff, pending, seats: staff.length + pending.length }
}
