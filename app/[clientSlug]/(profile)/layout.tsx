"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"

import { AuthProvider } from "@/components/auth-provider"
import { AppEntryLoader } from "@/components/app-entry-loader"
import { CompanyPageProvider } from "@/components/company/company-page-context"
import { CompanyProfileShell } from "@/components/company/company-profile-shell"
import { CompanyProvider, useCompanyState } from "@/components/dashboard/company-context"
import { PageTitleProvider } from "@/components/dashboard/page-title-context"

function PublicCompany({ children }: { children: ReactNode }) {
  const params = useParams<{ clientSlug: string }>()
  const { loading, error, client, organization, projects, invoices, contracts, estimates, documents, workspaceId, name, categoryLabel } = useCompanyState()
  const [hasOpened, setHasOpened] = useState(false)
  const [entryComplete, setEntryComplete] = useState(false)

  useEffect(() => {
    if (loading || error || !client || hasOpened) return
    setEntryComplete(true)
    const timeout = window.setTimeout(() => setHasOpened(true), 350)
    return () => window.clearTimeout(timeout)
  }, [loading, error, client, hasOpened])

  if (loading) return <AppEntryLoader phase="workspace" message="Loading company page" />
  if (error || !client) return <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-6"><h1 className="text-xl font-semibold">Company page unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error ?? "This company could not be loaded."}</p></main>
  if (!hasOpened) return <AppEntryLoader phase={entryComplete ? "complete" : "workspace"} message={entryComplete ? "Company page ready" : "Loading company page"} />

  const publicPeople = organization?.publicTeam ?? []

  return (
    <PageTitleProvider>
      <CompanyPageProvider
        mode="routes"
        company={{
          id: workspaceId,
          agencyId: organization?.agencyId,
          name,
          slug: params?.clientSlug,
          logoUrl: organization?.logoUrl || client.photoURL,
          categoryLabel,
          industry: organization?.industry,
          location: organization?.location,
          website: organization?.website,
          description: organization?.description,
          targetCustomers: organization?.targetCustomers,
          companySize: organization?.companySize,
          source: organization?.source,
          linkedIn: organization?.linkedIn,
          tags: organization?.tags,
          primaryContactId: organization?.primaryContactId,
          media: organization?.media,
          links: organization?.links,
          publicTeam: organization?.publicTeam,
        }}
        people={publicPeople.map((person) => ({
          id: person.uid,
          name: person.name,
          subtitle: person.role || "Team member",
          role: person.role || "client",
          photoUrl: person.photoUrl,
        }))}
        projects={projects}
        invoices={invoices}
        contracts={contracts}
        estimates={estimates}
        documents={documents}
      >
        <CompanyProfileShell>{children}</CompanyProfileShell>
      </CompanyPageProvider>
    </PageTitleProvider>
  )
}

/**
 * The public company page frame. It loads the company once and holds the
 * sidebar, so moving between section pages doesn't reload anything.
 */
export default function PublicCompanyLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ clientSlug: string }>()
  return (
    <AuthProvider>
      <CompanyProvider key={params?.clientSlug} companyRef={params?.clientSlug} publicView>
        <PublicCompany>{children}</PublicCompany>
      </CompanyProvider>
    </AuthProvider>
  )
}
