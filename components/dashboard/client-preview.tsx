"use client"

import Link from "next/link"
import { Building2, Globe, MapPin } from "lucide-react"

import { CompanyProvider, useCompanyState } from "@/components/dashboard/company-context"
import { Skeleton } from "@/components/ui/skeleton"
import { formatTimestamp } from "@/lib/tasks"

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-border px-4 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring">
      <span className="block text-xl font-semibold text-foreground">{value}</span>
      <span className="block text-xs text-muted-foreground">{label}</span>
    </Link>
  )
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <Link href={href} className="text-xs text-muted-foreground hover:text-foreground hover:underline">See all</Link>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function ClientPreviewBody({ href }: { href: string }) {
  const { loading, error, organization, client, people, projects, invoices, estimates, documents, name, categoryLabel } = useCompanyState()

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4"><Skeleton className="size-14 rounded-xl" /><Skeleton className="h-6 w-48" /></div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (error || !client) return <p className="text-sm text-muted-foreground">{error ?? "This client could not be loaded."}</p>

  const logoUrl = organization?.logoUrl || client.photoURL
  const tab = (key: string) => `${href}?tab=${key}`
  const recentProjects = [...projects].slice(0, 5)
  const recentDocuments = [...documents].slice(0, 5)

  return (
    <div>
      <div className="flex items-center gap-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" referrerPolicy="no-referrer" className="size-14 shrink-0 rounded-xl border border-border object-cover" />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted"><Building2 className="size-6 text-muted-foreground" aria-hidden="true" /></span>
        )}
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold text-foreground">{name}</p>
          {(categoryLabel || organization?.industry) && <p className="truncate text-sm text-muted-foreground">{categoryLabel || organization?.industry}</p>}
        </div>
      </div>

      {(organization?.location || organization?.website) && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {organization?.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{organization.location}</span>}
          {organization?.website && (
            <a href={organization.website.startsWith("http") ? organization.website : `https://${organization.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline">
              <Globe className="size-4" aria-hidden="true" />{organization.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      )}
      {organization?.description && <p className="mt-4 text-sm leading-relaxed text-foreground/80">{organization.description}</p>}

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Projects" value={projects.length} href={tab("projects")} />
        <Stat label="Contacts" value={people.length} href={tab("team")} />
        <Stat label="Documents" value={documents.length} href={tab("documents")} />
        <Stat label="Invoices & estimates" value={invoices.length + estimates.length} href={tab("documents")} />
      </div>

      <Section title="Projects" href={tab("projects")}>
        {recentProjects.length === 0 ? <p className="text-sm text-muted-foreground">No projects yet.</p> : (
          <ul className="divide-y divide-border/60">
            {recentProjects.map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="truncate text-foreground">{project.title}</span>
                <span className="shrink-0 text-xs capitalize text-muted-foreground">{String(project.status || "").replace(/-/g, " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Contacts" href={tab("team")}>
        {people.length === 0 ? <p className="text-sm text-muted-foreground">No contacts yet.</p> : (
          <ul className="divide-y divide-border/60">
            {people.slice(0, 5).map((person) => (
              <li key={person.uid} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="truncate text-foreground">{person.displayName || person.email || "Unnamed person"}</span>
                <span className="shrink-0 truncate text-xs text-muted-foreground">{person.email}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Documents" href={tab("documents")}>
        {recentDocuments.length === 0 ? <p className="text-sm text-muted-foreground">No documents yet.</p> : (
          <ul className="divide-y divide-border/60">
            {recentDocuments.map((document) => (
              <li key={document.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link href={`/dashboard/documents?document=${encodeURIComponent(document.id)}`} className="truncate text-foreground hover:underline">{document.title || "Untitled document"}</Link>
                <span className="shrink-0 text-xs text-muted-foreground">{formatTimestamp(document.updatedAt ?? document.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

/** A quick look at one client in the clients split view, with links into the full client page. */
export function ClientPreview({ companyRef, href }: { companyRef: string; href: string }) {
  return (
    <CompanyProvider key={companyRef} companyRef={companyRef}>
      <ClientPreviewBody href={href} />
    </CompanyProvider>
  )
}
