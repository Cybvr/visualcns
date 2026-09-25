"use client"

import { Loader2 } from "lucide-react"
import { useParams } from "next/navigation"

import { AuthProvider } from "@/components/auth-provider"
import { CompanyPage } from "@/components/company/company-page"
import { CompanyProvider, useCompanyState } from "@/components/dashboard/company-context"
import { PageTitleProvider } from "@/components/dashboard/page-title-context"

function LoadingState() {
  return <div className="flex min-h-svh items-center justify-center bg-background"><Loader2 className="size-7 animate-spin text-muted-foreground" /></div>
}

function CompanyPageContent() {
  const params = useParams<{ clientSlug: string }>()
  const { loading, error, client, organization, people, projects, invoices, contracts, estimates, documents, workspaceId, name, categoryLabel } = useCompanyState()

  if (loading) return <LoadingState />
  if (error || !client) return <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-6"><h1 className="text-xl font-semibold">Company page unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error ?? "This company could not be loaded."}</p></main>

  return (
    <PageTitleProvider>
      <CompanyPage
        company={{
          id: workspaceId,
          name,
          slug: params?.clientSlug,
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
          links: organization?.links,
          publicTeam: organization?.publicTeam,
        }}
        people={people.map((person) => ({
          id: person.uid,
          name: person.displayName || person.email || "Unnamed person",
          subtitle: person.email || "No email address",
          role: person.role || "client",
          photoUrl: person.photoURL,
        }))}
        projects={projects}
        invoices={invoices}
        contracts={contracts}
        estimates={estimates}
        documents={documents}
      />
    </PageTitleProvider>
  )
}

function PublicCompanyPageContent() {
  const params = useParams<{ clientSlug: string }>()
  return <CompanyProvider companyRef={params?.clientSlug} publicView><CompanyPageContent /></CompanyProvider>
}

export default function PublicCompanyPage() {
  return <AuthProvider><PublicCompanyPageContent /></AuthProvider>
}
