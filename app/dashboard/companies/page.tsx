"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2, Maximize2, Pencil } from "lucide-react"
import type { Timestamp } from "firebase/firestore"

import { useAuth } from "@/components/auth-provider"
import { ClientPreview } from "@/components/dashboard/client-preview"
import { CompactListRow, InitialAvatar, shortListDate } from "@/components/dashboard/compact-list-row"
import { CompanyCreateSheet } from "@/components/dashboard/company-create-sheet"
import { DocumentSplitPane } from "@/components/dashboard/document-split-pane"
import { FirstRunState } from "@/components/dashboard/empty-state"
import { useRecordTitle } from "@/components/dashboard/page-title-context"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { TableFilterBar } from "@/components/dashboard/table-filter-bar"
import { useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { deleteOrganization, getOrganizations, type Organization } from "@/lib/organizations"
import { formatTimestamp, tsToMillis } from "@/lib/tasks"
import { getProjects, type Project } from "@/lib/projects"
import { deleteUser, getUsers, userRef, type AppUser } from "@/lib/users"

/**
 * A company as this page shows it: one row per real company, sourced from the
 * organizations collection and joined to the client account only for the
 * actions that still need one (open the workspace, remove it). Rows are folded
 * by name so companies that were saved twice before the name check existed
 * collapse into a single row.
 */
type CompanyRow = {
  /** The workspace id: the organization doc id, and the client user's companyId. */
  id: string
  slug?: string
  name: string
  label: string
  projectCount: number
  logoUrl?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
  /** The client account behind this company, when there is one. */
  user?: AppUser
  hasOrg: boolean
}

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase()
}

/** The ref a client is addressed by, in its page URL and in ?client= on this page. */
function companyRefOf(row: CompanyRow): string {
  // Company pages are addressed by the organization slug. A user slug can
  // differ from it (for example, sadaya vs sadaya-client), which would make
  // the same company appear at two different dashboard URLs.
  return row.slug || (row.user ? userRef(row.user) : row.id)
}

function companyHref(row: CompanyRow): string {
  return `/dashboard/clients/${companyRefOf(row)}`
}


/** Clients as a list on the left and the open client on the right, like tasks and notes. */
export default function CompaniesPage() {
  const router = useRouter()
  const { viewAsUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CompanyRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [selectedRef, setSelectedRef] = useUrlSelection("client")

  async function fetchCompanies() {
    setError(null)
    try {
      const [allUsers, allProjects, allOrgs] = await Promise.all([getUsers(), getProjects(), getOrganizations()])
      setUsers(allUsers)
      setProjects(allProjects)
      setOrganizations(allOrgs)
    } catch (fetchError) {
      console.error("Error fetching companies:", fetchError)
      setError(fetchError instanceof Error ? fetchError.message : "Clients could not be loaded.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchCompanies()
  }, [])

  /** Project count and the "category · industry" line, keyed by workspace id. */
  const metaByWorkspace = useMemo(() => {
    const orgById = new Map(organizations.map((org) => [org.id, org]))
    const meta = new Map<string, { label: string; projectCount: number }>()
    for (const project of projects) {
      if (!project.companyId) continue
      const current = meta.get(project.companyId) ?? { label: "", projectCount: 0 }
      current.projectCount += 1
      meta.set(project.companyId, current)
    }
    for (const [id, current] of meta) {
      const category = [...new Set(projects.filter((p) => p.companyId === id).flatMap((p) => p.category ?? []))]
        .filter(Boolean)
        .join(" & ")
      current.label = [category, orgById.get(id)?.industry].filter(Boolean).join(" · ")
    }
    return meta
  }, [projects, organizations])

  /** One row per organization. Contacts (users) are people, not companies, so they are never listed here. */
  const companies = useMemo(() => {
    const userByWorkspace = new Map<string, AppUser>()
    for (const user of users) {
      if (user.role === "client") userByWorkspace.set(user.companyId || user.uid, user)
    }

    const rows = new Map<string, CompanyRow>()
    const add = (row: CompanyRow) => {
      const key = normalize(row.name) || row.id
      const existing = rows.get(key)
      if (!existing) { rows.set(key, row); return }
      // Prefer the record that has an organization, then the older one; keep any user we found.
      const keep = existing.hasOrg || !row.hasOrg
        ? existing
        : row
      keep.user = keep.user ?? existing.user ?? row.user
      keep.logoUrl = keep.logoUrl || existing.logoUrl || row.logoUrl
      rows.set(key, keep)
    }

    for (const org of organizations) {
      const meta = metaByWorkspace.get(org.id)
      add({
        id: org.id,
        slug: org.slug,
        name: org.name || userByWorkspace.get(org.id)?.company || "Unnamed company",
        label: meta?.label ?? "",
        projectCount: meta?.projectCount ?? 0,
        logoUrl: org.logoUrl || userByWorkspace.get(org.id)?.photoURL,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        user: userByWorkspace.get(org.id),
        hasOrg: true,
      })
    }
    return [...rows.values()]
  }, [users, organizations, metaByWorkspace])

  const sorts = useMemo<SortOption<CompanyRow>[]>(
    () => [
      { value: "name", label: "Name", get: (row) => row.name, ascLabel: "A–Z", descLabel: "Z–A" },
      { value: "category", label: "Category", get: (row) => row.label, ascLabel: "A–Z", descLabel: "Z–A" },
      { value: "projects", label: "Projects", get: (row) => row.projectCount, ascLabel: "Fewest", descLabel: "Most" },
      { value: "createdAt", label: "Date added", get: (row) => tsToMillis(row.createdAt), ascLabel: "Oldest", descLabel: "Newest" },
      { value: "updatedAt", label: "Last modified", get: (row) => Math.max(tsToMillis(row.updatedAt), tsToMillis(row.createdAt)), ascLabel: "Oldest", descLabel: "Newest" },
    ],
    [],
  )

  const search = useMemo(() => (row: CompanyRow) => [row.name, row.label, row.slug, row.id], [])

  const { results: visibleCompanies, bar } = useFilterBar({
    items: companies,
    search,
    sorts,
    defaultSort: "updatedAt",
    defaultDirection: "desc",
  })

  // ?client= holds the slug, but an old link may carry the raw workspace id.
  const selected = selectedRef ? companies.find((row) => companyRefOf(row) === selectedRef || row.id === selectedRef) ?? null : null
  useRecordTitle(selected?.name ?? null)

  async function handleDelete(row: CompanyRow) {
    if (deleting) return
    setDeleting(row.id)
    setError(null)
    try {
      if (row.hasOrg) await deleteOrganization(row.id)
      if (row.user) await deleteUser(row.user.uid)
      setPendingDelete(null)
      if (selected?.id === row.id) setSelectedRef(null)
      await fetchCompanies()
    } catch (deleteError) {
      console.error("Error deleting company:", deleteError)
      setError(deleteError instanceof Error ? deleteError.message : "The client could not be removed. Try again.")
    } finally {
      setDeleting(null)
    }
  }

  function handleViewWorkspace(row: CompanyRow) {
    if (!row.user || row.user.role !== "client" || !row.user.companyId) return
    viewAsUser(row.user)
    router.push(`/${encodeURIComponent(row.slug || row.user.companyId)}`)
  }

  const clientFilter = (
    <TableFilterBar
      {...bar}
      placeholder="Search clients"
      createAction={{ label: "New client", onClick: () => setCreating(true) }}
    />
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6">
      {error && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => void fetchCompanies()}>
            Try again
          </Button>
        </div>
      )}

      {!loading && companies.length === 0 ? (
        <>
          <div className="lg:max-w-[30rem]">{clientFilter}</div>
          <FirstRunState
            label="Client"
            title="Let's add your first client"
            description="Add a client to create a company for their projects, tasks, and documents."
            action={<Button onClick={() => setCreating(true)}>Add client</Button>}
          />
        </>
      ) : (
        <DocumentSplitPane
          visibleItems={loading ? [] : visibleCompanies}
          loading={loading}
          selectedId={selected ? companyRefOf(selected) : null}
          onClearSelection={() => setSelectedRef(null, { clear: ["tab"] })}
          sectionLabel="Clients"
          filter={clientFilter}
          emptySearchLabel="No clients match your search."
          getKey={companyRefOf}
          selectedTitle={selected?.name}
          headerActions={selected && (
            <>
              <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label="Edit client" title="Edit client">
                <Link href={`${companyHref(selected)}/edit`}><Pencil className="size-4" aria-hidden="true" /></Link>
              </Button>
              <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label="Open full client page" title="Open full client page">
                <Link href={companyHref(selected)}><Maximize2 className="size-4" aria-hidden="true" /></Link>
              </Button>
            </>
          )}
          content={selected ? <ClientPreview companyRef={companyRefOf(selected)} href={companyHref(selected)} /> : null}
          renderItem={(row, active) => (
            <CompactListRow
              leading={row.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.logoUrl} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full object-cover max-sm:size-12" />
              ) : (
                <>
                  <InitialAvatar text={row.name} className="sm:hidden" />
                  <span className="flex size-8 items-center justify-center rounded-full bg-muted max-sm:hidden"><Building2 className="size-4 text-muted-foreground" aria-hidden="true" /></span>
                </>
              )}
              title={row.name}
              meta={shortListDate(Math.max(tsToMillis(row.updatedAt), tsToMillis(row.createdAt)))}
              subtitle={`${row.label || (row.projectCount ? `${row.projectCount} project${row.projectCount === 1 ? "" : "s"}` : "No projects yet")} · ${formatTimestamp(row.updatedAt ?? row.createdAt)}`}
              mobileSubtitle={[row.label, row.projectCount ? `${row.projectCount} project${row.projectCount === 1 ? "" : "s"}` : "No projects yet"].filter(Boolean).join(" · ")}
              active={active}
              onClick={() => setSelectedRef(companyRefOf(row), { clear: ["tab"] })}
              menuLabel={`Options for ${row.name}`}
              menu={<>
                <DropdownMenuItem onSelect={() => setSelectedRef(companyRefOf(row), { clear: ["tab"] })}>Open client</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push(companyHref(row))}>Open full page</DropdownMenuItem>
                {row.user && <DropdownMenuItem onSelect={() => handleViewWorkspace(row)}>View workspace</DropdownMenuItem>}
                <DropdownMenuItem onSelect={() => router.push(`${companyHref(row)}/edit`)}>Edit client</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(row)}>Remove client</DropdownMenuItem>
              </>}
            />
          )}
        />
      )}

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove client?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {pendingDelete?.name ?? "this client"}&apos;s account. Their projects, tasks, and documents
              will remain in the database, but the client will no longer appear here. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting !== null}
              onClick={(event) => {
                event.preventDefault()
                if (pendingDelete) void handleDelete(pendingDelete)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing…" : "Remove Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Creating stays a sheet; the new client opens in the right pane once it saves. */}
      <CompanyCreateSheet
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(workspaceId) => {
          setCreating(false)
          void fetchCompanies().then(() => setSelectedRef(workspaceId))
        }}
      />
    </main>
  )
}
