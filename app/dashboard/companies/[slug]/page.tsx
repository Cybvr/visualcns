"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/components/auth-provider"
import { CompanyPage } from "@/components/company/company-page"
import { useCompany } from "@/components/dashboard/company-context"
import { updateOrganization } from "@/lib/organizations"
import { getUsers, updateUser, type AppUser } from "@/lib/users"

export default function DashboardCompanyPage() {
  const router = useRouter()
  const { viewAsUser, isAdmin } = useAuth()
  const [allContacts, setAllContacts] = useState<AppUser[]>([])

  useEffect(() => {
    if (!isAdmin) return
    getUsers()
      .then((users) => setAllContacts(users.filter((person) => Boolean(person.displayName?.trim() || person.email?.trim()))))
      .catch(() => setAllContacts([]))
  }, [isAdmin])
  const {
    client,
    workspaceId,
    name,
    categoryLabel,
    organization,
    people,
    projects,
    invoices,
    contracts,
    estimates,
    documents,
    reload,
  } = useCompany()

  return (
    <CompanyPage
      company={{
        id: workspaceId,
        name,
        slug: organization?.slug || workspaceId,
        logoUrl: organization?.logoUrl || client.photoURL,
        categoryLabel,
        industry: organization?.industry,
        location: organization?.location,
        website: organization?.website,
        description: organization?.description,
        companySize: organization?.companySize,
        source: organization?.source,
        linkedIn: organization?.linkedIn,
        tags: organization?.tags,
        primaryContactId: organization?.primaryContactId,
        media: organization?.media,
        publicTeam: organization?.publicTeam,
      }}
      people={people.map((person) => ({
        id: person.uid,
        name: person.displayName || person.email || "Unnamed person",
        subtitle: person.email || "No email address",
        role: person.role || "client",
        photoUrl: person.photoURL,
        adminUser: person,
      }))}
      allContacts={allContacts.map((person) => ({
        id: person.uid,
        name: person.displayName || person.email || "Unnamed person",
        subtitle: person.email || "No email address",
        role: person.role || "client",
        photoUrl: person.photoURL,
        adminUser: person,
      }))}
      projects={projects}
      invoices={invoices}
      contracts={contracts}
      estimates={estimates}
      documents={documents}
      admin={
        isAdmin
          ? {
              sharePath: `/${encodeURIComponent(organization?.slug || workspaceId)}`,
              onViewWorkspace: (person) => {
                const canViewClient = person.role === "client" && Boolean(person.companyId)
                const canViewAdmin = (person.role === "admin" || person.role === "superadmin") && Boolean(person.tenantId)
                if (!canViewClient && !canViewAdmin) return
                viewAsUser(person)
                const clientWorkspace = organization?.slug || person.companyId
                router.push(canViewClient ? `/${encodeURIComponent(clientWorkspace as string)}` : "/dashboard/overview")
              },
              onMediaChange: async (media) => {
                await updateOrganization(workspaceId, { media })
                await reload()
              },
              onUpdateCompany: async (patch) => {
                await updateOrganization(workspaceId, patch)
                await reload()
              },
              onSelectPrimaryContact: async (contactId) => {
                const contact = allContacts.find((person) => person.uid === contactId)
                // Attach the contact to this company if they aren't already, then set them primary.
                if (contact && contact.companyId !== workspaceId) {
                  await updateUser(contactId, { companyId: workspaceId })
                }
                await updateOrganization(workspaceId, { primaryContactId: contactId })
                await reload()
              },
              onAddExistingContact: async (contactId) => {
                const contact = allContacts.find((person) => person.uid === contactId)
                if (!contact || contact.companyId === workspaceId) return
                await updateUser(contactId, { companyId: workspaceId })
                setAllContacts((current) => current.map((person) => person.uid === contactId ? { ...person, companyId: workspaceId } : person))
                await reload()
              },
              reload,
            }
          : undefined
      }
    />
  )
}
