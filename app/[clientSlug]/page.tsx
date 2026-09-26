"use client"

import { useParams } from "next/navigation"

import { AuthProvider } from "@/components/auth-provider"
import { CompanyPage } from "@/components/company/company-page"
import { CompanyProvider, useCompanyState } from "@/components/dashboard/company-context"
import { PageTitleProvider } from "@/components/dashboard/page-title-context"
import { Skeleton } from "@/components/ui/skeleton"

function LoadingState() {
  return <div className="min-h-svh bg-background px-4 py-6" role="status" aria-label="Loading company page"><div className="mx-auto max-w-7xl space-y-5"><Skeleton className="h-32 w-full" /><div className="flex items-center gap-4"><Skeleton className="size-20 rounded-full" /><div className="space-y-2"><Skeleton className="h-6 w-56" /><Skeleton className="h-4 w-40" /></div></div><Skeleton className="h-10 w-full" /></div></div>
}

function CompanyPageContent() {
  const params = useParams<{ clientSlug: string }>()
  const { loading, error, client, organization, projects, invoices, contracts, estimates, documents, workspaceId, name, categoryLabel } = useCompanyState()

  if (loading) return <LoadingState />
  if (error || !client) return <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-6"><h1 className="text-xl font-semibold">Company page unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error ?? "This company could not be loaded."}</p></main>

  const publicPeople = organization?.publicTeam ?? []

  return (
    <PageTitleProvider>
      <CompanyPage
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
