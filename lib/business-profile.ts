import { deleteDoc, doc, getDoc, Timestamp, writeBatch } from "firebase/firestore"
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
import { ensureCurrentAgency, getAgency, type Agency } from "./agencies"
import { getCurrentAgencyId } from "./agency-scope"

const COLLECTION_NAME = "settings"
const DOC_ID = "business"

export interface BusinessProfile extends InvoiceParty {
  logoUrl?: string
  invoicePaymentTermsDays?: number
  invoiceNotes?: string
  invoicePaymentInstructions?: string
  estimateTerms?: string
  estimatePaymentDetails?: string
  estimateNotes?: string
}

export const DEFAULT_ESTIMATE_TERMS = "Work begins after acceptance.\nA deposit may be required before work starts.\nPrices exclude taxes and third-party fees unless stated otherwise."
export const DEFAULT_ESTIMATE_NOTES = "This estimate covers the services described above and is not an invoice. Pricing may be adjusted if the scope changes or new information materially affects delivery."

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
    invoicePaymentTermsDays: source.invoicePaymentTermsDays ?? 14,
    invoiceNotes: source.invoiceNotes ?? "",
    invoicePaymentInstructions: source.invoicePaymentInstructions ?? "",
    estimateTerms: source.estimateTerms ?? DEFAULT_ESTIMATE_TERMS,
    estimatePaymentDetails: source.estimatePaymentDetails ?? "",
    estimateNotes: source.estimateNotes ?? DEFAULT_ESTIMATE_NOTES,
  }
}

async function getLegacyBusinessProfile(): Promise<Partial<BusinessProfile> | null> {
  const snapshot = await getDoc(doc(db, COLLECTION_NAME, DOC_ID))
  return snapshot.exists() ? (snapshot.data() as Partial<BusinessProfile>) : null
}

function organizationProfile(organization: Organization): BusinessProfile {
  return asBusinessProfile({
    name: organization.name,
    email: organization.email ?? "",
    phone: organization.phone ?? "",
    address: organization.address ?? "",
    website: organization.website ?? "",
    taxNumber: organization.taxNumber,
    logoUrl: organization.logoUrl,
    invoicePaymentTermsDays: organization.invoicePaymentTermsDays,
    invoiceNotes: organization.invoiceNotes,
    invoicePaymentInstructions: organization.invoicePaymentInstructions,
    estimateTerms: organization.estimateTerms,
    estimatePaymentDetails: organization.estimatePaymentDetails,
    estimateNotes: organization.estimateNotes,
  })
}

/**
 * Who invoices, estimates, and contracts are issued from. The owner
 * organization is canonical; the legacy settings document is read only until
 * an admin signs in and the one-time migration completes.
 */
async function getPublicBusinessProfile(agencyId: string): Promise<BusinessProfile | null> {
  const response = await fetch(`/api/agency/issuer?agencyId=${encodeURIComponent(agencyId)}`, { cache: "no-store" })
  if (!response.ok) return null
  const data = await response.json() as { profile?: Partial<BusinessProfile> }
  return data.profile ? asBusinessProfile(data.profile) : null
}

export async function getBusinessProfile(agencyId?: string): Promise<BusinessProfile> {
  try {
    if (agencyId) return (await getPublicBusinessProfile(agencyId)) ?? { ...INVOICE_ISSUER }
    const owner = await getOwnerOrganization()
    if (owner) {
      const agency = await getAgency().catch(() => null)
      return {
        ...organizationProfile(owner),
        name: agency?.name || owner.name,
        logoUrl: agency?.logoUrl || owner.logoUrl,
      }
    }

    const legacy = await getLegacyBusinessProfile()
    return legacy ? asBusinessProfile(legacy) : { ...INVOICE_ISSUER }
  } catch (error) {
    try {
      const publicProfile = await getPublicBusinessProfile(agencyId || await getCurrentAgencyId())
      if (publicProfile) return publicProfile
    } catch { /* A missing public profile keeps the existing fallback. */ }
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

/** Save the agency brand and document issuer/defaults together. */
export async function updateAgencyBusinessSettings(
  agencyData: Partial<Pick<Agency, "name" | "logoUrl" | "primaryColor" | "accentColor" | "subdomain" | "senderEmail">>,
  businessData: Partial<BusinessProfile>,
): Promise<void> {
  const [agencyId, owner] = await Promise.all([getCurrentAgencyId(), getOwnerOrganization()])
  if (!owner) throw new Error("The agency business profile has not been created yet.")
  const batch = writeBatch(db)
  const updatedAt = Timestamp.now()
  batch.set(doc(db, "agencies", agencyId), { ...agencyData, updatedAt }, { merge: true })
  batch.set(doc(db, "organizations", owner.id), { ...businessData, agencyId, updatedAt }, { merge: true })
  await batch.commit()
}
