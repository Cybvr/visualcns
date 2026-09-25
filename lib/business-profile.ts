import { deleteDoc, doc, getDoc } from "firebase/firestore"
import { db } from "./firebase"
import { INVOICE_ISSUER, type InvoiceParty } from "./billing"
import {
  createOrganization,
  getOrganization,
  getOwnerOrganization,
  uniqueOrganizationSlug,
  updateOrganization,
  type Organization,
} from "./organizations"
import { ensureCurrentAgency } from "./agencies"

const COLLECTION_NAME = "settings"
const DOC_ID = "business"

export interface BusinessProfile extends InvoiceParty {
  logoUrl?: string
}

export interface AdminBusinessSeed {
  id: string
  name?: string
  email?: string
  logoUrl?: string
}

function asBusinessProfile(source: Partial<BusinessProfile>): BusinessProfile {
  return {
    name: source.name?.trim() || INVOICE_ISSUER.name,
    email: source.email ?? INVOICE_ISSUER.email,
    phone: source.phone ?? INVOICE_ISSUER.phone,
    address: source.address ?? INVOICE_ISSUER.address,
    website: source.website ?? INVOICE_ISSUER.website,
    taxNumber: source.taxNumber,
    logoUrl: source.logoUrl,
  }
}

async function getLegacyBusinessProfile(): Promise<Partial<BusinessProfile> | null> {
  const snapshot = await getDoc(doc(db, COLLECTION_NAME, DOC_ID))
  return snapshot.exists() ? (snapshot.data() as Partial<BusinessProfile>) : null
}

function organizationProfile(organization: Organization): BusinessProfile {
  return asBusinessProfile({
    name: organization.name,
    email: organization.email,
    phone: organization.phone,
    address: organization.address,
    website: organization.website,
    taxNumber: organization.taxNumber,
    logoUrl: organization.logoUrl,
  })
}

/**
 * Who invoices, estimates, and contracts are issued from. The owner
 * organization is canonical; the legacy settings document is read only until
 * an admin signs in and the one-time migration completes.
 */
export async function getBusinessProfile(): Promise<BusinessProfile> {
  try {
    const owner = await getOwnerOrganization()
    if (owner) return organizationProfile(owner)

    const legacy = await getLegacyBusinessProfile()
    return legacy ? asBusinessProfile(legacy) : { ...INVOICE_ISSUER }
  } catch (error) {
    console.error("Error loading business profile:", error)
    return { ...INVOICE_ISSUER }
  }
}

/**
 * Ensures the signed-in admin owns a real organization. Existing organization
 * values win; missing contact fields are filled from the legacy profile once,
 * then the legacy settings document is removed.
 */
export async function ensureAdminBusinessOrganization(seed: AdminBusinessSeed): Promise<Organization> {
  await ensureCurrentAgency(seed.name || "VisualHQ workspace")
  const [currentOwner, legacy] = await Promise.all([getOwnerOrganization(), getLegacyBusinessProfile()])

  if (currentOwner) {
    if (legacy) {
      const patch: Partial<Organization> = {}
      if (!currentOwner.slug) patch.slug = await uniqueOrganizationSlug(currentOwner.name, currentOwner.id)
      if (!currentOwner.email && legacy.email) patch.email = legacy.email
      if (!currentOwner.phone && legacy.phone) patch.phone = legacy.phone
      if (!currentOwner.address && legacy.address) patch.address = legacy.address
      if (!currentOwner.website && legacy.website) patch.website = legacy.website
      if (!currentOwner.taxNumber && legacy.taxNumber) patch.taxNumber = legacy.taxNumber
      if (!currentOwner.logoUrl && legacy.logoUrl) patch.logoUrl = legacy.logoUrl
      if (Object.keys(patch).length > 0) await updateOrganization(currentOwner.id, patch)
      await deleteDoc(doc(db, COLLECTION_NAME, DOC_ID))
      return { ...currentOwner, ...patch }
    }
    if (!currentOwner.slug) {
      const slug = await uniqueOrganizationSlug(currentOwner.name, currentOwner.id)
      await updateOrganization(currentOwner.id, { slug })
      return { ...currentOwner, slug }
    }
    return currentOwner
  }

  const existing = await getOrganization(seed.id)
  const profile = asBusinessProfile({
    name: existing?.name || legacy?.name || seed.name,
    email: existing?.email || legacy?.email || seed.email,
    phone: existing?.phone || legacy?.phone,
    address: existing?.address || legacy?.address,
    website: existing?.website || legacy?.website,
    taxNumber: existing?.taxNumber || legacy?.taxNumber,
    logoUrl: existing?.logoUrl || legacy?.logoUrl || seed.logoUrl,
  })
  const organizationData = {
    name: profile.name,
    isOwner: true,
    logoUrl: profile.logoUrl || "",
    industry: existing?.industry || "Creative services",
    location: existing?.location || "Lagos, Nigeria",
    website: profile.website || "",
    email: profile.email || "",
    phone: profile.phone || "",
    address: profile.address || "",
    taxNumber: profile.taxNumber || "",
    publicTeam: existing?.publicTeam || [],
  }

  if (existing) await updateOrganization(seed.id, organizationData)
  else await createOrganization(seed.id, organizationData)

  if (legacy) await deleteDoc(doc(db, COLLECTION_NAME, DOC_ID))
  return { ...existing, ...organizationData, id: seed.id }
}

export async function updateBusinessProfile(data: Partial<BusinessProfile>): Promise<void> {
  const owner = await getOwnerOrganization()
  if (!owner) throw new Error("The owner organization has not been created yet.")
  await updateOrganization(owner.id, data)
}
