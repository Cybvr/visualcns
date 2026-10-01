import { createUser, getUsers } from "./users"
import { createOrganization, getOrganizations } from "./organizations"

/**
 * A company is a `users` doc with role "client" plus an `organizations` doc that
 * shares its id. Because every create path used to mint a fresh id without
 * checking, the same name could be saved as two separate workspaces and show up
 * twice. These helpers look a name up first so a company is only ever made once.
 */
export interface CompanyRef {
  /** The workspace id: the client user's uid, and the organization doc id. */
  id: string
  name: string
}

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase()
}

/** The existing workspace for this name, matched case-insensitively, or null. */
export async function findCompanyByName(name: string): Promise<CompanyRef | null> {
  const target = normalize(name)
  if (!target) return null

  const [users, organizations] = await Promise.all([getUsers(), getOrganizations()])
  const orgById = new Map(organizations.map((org) => [org.id, org]))

  for (const user of users) {
    if (user.role !== "client") continue
    const id = user.companyId || user.uid
    const display = orgById.get(id)?.name || user.company || user.displayName || ""
    if (normalize(display) === target) return { id, name: display || name.trim() }
  }
  return null
}

/**
 * Reuse the workspace that already carries this name, or spin up a bare one.
 * Every "add a company" surface should go through here so a name is never
 * duplicated. Extra org fields are only written when a new company is made; an
 * existing one is returned untouched.
 */
export async function findOrCreateCompany(input: {
  name: string
  logoUrl?: string
  industry?: string
  location?: string
  address?: string
}): Promise<CompanyRef> {
  const name = input.name.trim()
  const existing = await findCompanyByName(name)
  if (existing) return existing

  const uid = crypto.randomUUID()
  await createUser(uid, { displayName: "", email: "", company: name, companyId: uid, photoURL: "", role: "client" })
  await createOrganization(uid, {
    name: name || "Unnamed company",
    logoUrl: input.logoUrl?.trim() || "",
    industry: input.industry?.trim() || "",
    location: input.location?.trim() || "",
    address: input.address?.trim() || "",
  })
  return { id: uid, name }
}
