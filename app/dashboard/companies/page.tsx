"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"
import type { Timestamp } from "firebase/firestore"

import { useAuth } from "@/components/auth-provider"
import { CollectionView } from "@/components/dashboard/collection-view"
import { CompactListRow, InitialAvatar } from "@/components/dashboard/compact-list-row"
import { thumbnailIcon } from "@/components/dashboard/grid-card"
import type { ItemActions } from "@/components/dashboard/item-menu"
import { CompanyCreateSheet } from "@/components/dashboard/company-create-sheet"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SortOption } from "@/components/dashboard/filter-bar"
import { useCachedState } from "@/lib/page-cache"
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


/** Clients list. Opening a client uses its full page instead of a split preview. */
export default function CompaniesPage() {
  const router = useRouter()
  const { viewAsUser } = useAuth()
  const [users, setUsers, cached] = useCachedState<AppUser[]>("users", [])
  const [projects, setProjects] = useCachedState<Project[]>("projects", [])
  const [organizations, setOrganizations] = useCachedState<Organization[]>("organizations", [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [clientTab, setClientTab] = useState<"active" | "archived">("active")

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
      { value: "projects", label: "Campaigns", get: (row) => row.projectCount, ascLabel: "Fewest", descLabel: "Most" },
      { value: "createdAt", label: "Date added", get: (row) => tsToMillis(row.createdAt), ascLabel: "Oldest", descLabel: "Newest" },
      { value: "updatedAt", label: "Last modified", get: (row) => Math.max(tsToMillis(row.updatedAt), tsToMillis(row.createdAt)), ascLabel: "Oldest", descLabel: "Newest" },
    ],
    [],
  )

  const search = useMemo(() => (row: CompanyRow) => [row.name, row.label, row.slug, row.id], [])

  const activeCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const isActive = (row: CompanyRow) => row.projectCount > 0 && Math.max(tsToMillis(row.updatedAt), tsToMillis(row.createdAt)) >= activeCutoff
  const activeCompanies = companies.filter(isActive)
  const archivedCompanies = companies.filter((company) => !isActive(company))
  const tabCompanies = clientTab === "active" ? activeCompanies : archivedCompanies

  async function handleDelete(row: CompanyRow) {
    setError(null)
    try {
      if (row.hasOrg) await deleteOrganization(row.id)
      if (row.user) await deleteUser(row.user.uid)
      await fetchCompanies()
    } catch (deleteError) {
      console.error("Error deleting company:", deleteError)
      setError(deleteError instanceof Error ? deleteError.message : "The client could not be removed. Try again.")
    }
  }

  function handleViewWorkspace(row: CompanyRow) {
    if (!row.user || row.user.role !== "client" || !row.user.companyId) return
    viewAsUser(row.user)
    router.push(`/${encodeURIComponent(row.slug || row.user.companyId)}`)
  }

  function clientActions(row: CompanyRow): ItemActions {
    return {
      noun: "client",
      name: row.name,
      onOpen: () => router.push(companyHref(row)),
      extra: row.user ? <DropdownMenuItem onSelect={() => handleViewWorkspace(row)}>View workspace</DropdownMenuItem> : undefined,
      onDelete: () => handleDelete(row),
      deleteLabel: "Remove client",
      deleteMessage: `This removes ${row.name}'s account. Their projects, tasks, and documents will remain in the database, but the client will no longer appear here. This cannot be undone.`,
    }
  }

  function projectCountLabel(row: CompanyRow) {
    return row.projectCount ? `${row.projectCount} project${row.projectCount === 1 ? "" : "s"}` : "No projects yet"
  }

  return (
    <main className="w-full px-4 pb-12 pt-4 sm:px-6">
      {error && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => void fetchCompanies()}>
            Try again
          </Button>
        </div>
      )}

      <Tabs
        value={clientTab}
        onValueChange={(value) => setClientTab(value as "active" | "archived")}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="active">Active <span className="ml-1 text-xs text-muted-foreground">{activeCompanies.length}</span></TabsTrigger>
          <TabsTrigger value="archived">Archived <span className="ml-1 text-xs text-muted-foreground">{archivedCompanies.length}</span></TabsTrigger>
        </TabsList>
      </Tabs>

      <CollectionView
        className="min-w-0"
        items={tabCompanies}
        getKey={companyRefOf}
        searchFields={search}
        searchPlaceholder="Search clients"
        viewKey="clients"
        initialView="list"
        createAction={{ label: "New client", onClick: () => setCreating(true) }}
        sorts={sorts}
        defaultSort="updatedAt"
        defaultDirection="desc"
        loading={loading}
        empty={companies.length === 0 ? {
          icon: Building2,
          title: "Let's add your first client",
          description: "Add a client to create a company for their projects, tasks, and documents.",
          action: <Button onClick={() => setCreating(true)}>Add client</Button>,
        } : { icon: Building2, title: `No ${clientTab} clients.` }}
        itemActions={clientActions}
        card={(row) => ({
          title: row.name,
          icon: <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />,
          imageUrl: row.logoUrl,
          imageAlt: "",
          placeholder: thumbnailIcon(Building2),
          subtitle: row.label || `${row.projectCount} project${row.projectCount === 1 ? "" : "s"}`,
          href: companyHref(row),
          ariaLabel: `Open ${row.name}`,
          menuLabel: `Options for ${row.name}`,
        })}
        listItem={(row) => (
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
            meta={formatTimestamp(row.updatedAt ?? row.createdAt)}
            subtitle={row.label || projectCountLabel(row)}
            mobileSubtitle={[row.label, projectCountLabel(row)].filter(Boolean).join(" · ")}
            href={companyHref(row)}
            ariaLabel={`Open ${row.name}`}
            menuLabel={`Options for ${row.name}`}
            actions={clientActions(row)}
          />
        )}
      />

      {/* Creating stays a sheet; the new client opens on its full page once it saves. */}
      <CompanyCreateSheet
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(workspaceId) => {
          setCreating(false)
          router.push(`/dashboard/clients/${encodeURIComponent(workspaceId)}`)
        }}
      />
    </main>
  )
}
