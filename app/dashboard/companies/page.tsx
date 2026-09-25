"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Eye, Pencil, Plus, Trash2 } from "lucide-react"
import { FaBuilding } from "react-icons/fa"
import type { Timestamp } from "firebase/firestore"

import { useAuth } from "@/components/auth-provider"
import { CompanyCreateSheet } from "@/components/dashboard/company-create-sheet"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { ReactIcon } from "@/components/react-icon"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { GridCard, GridCardList } from "@/components/dashboard/grid-card"
import { ViewToggle, useViewMode } from "@/components/dashboard/view-toggle"
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
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FilterBar, useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { TableBulkBar } from "@/components/dashboard/table-bulk-bar"
import { Checkbox } from "@/components/ui/checkbox"
import { useRowSelection } from "@/hooks/use-row-selection"
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
  /** The client account behind this company, when there is one. */
  user?: AppUser
  hasOrg: boolean
}

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase()
}

export default function CompaniesPage() {
  const router = useRouter()
  const { viewAsUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<CompanyRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [view, setView] = useViewMode("clients")

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
    ],
    [],
  )

  const search = useMemo(() => (row: CompanyRow) => [row.name, row.label, row.slug, row.id], [])

  const { results: visibleCompanies, bar } = useFilterBar({
    items: companies,
    search,
    sorts,
    defaultSort: "name",
  })

  const selection = useRowSelection(visibleCompanies, (row) => row.id)

  async function handleDelete(row: CompanyRow) {
    if (deleting) return
    setDeleting(row.id)
    setError(null)
    try {
      if (row.hasOrg) await deleteOrganization(row.id)
      if (row.user) await deleteUser(row.user.uid)
      setPendingDelete(null)
      await fetchCompanies()
    } catch (deleteError) {
      console.error("Error deleting company:", deleteError)
      setError(deleteError instanceof Error ? deleteError.message : "The client could not be removed. Try again.")
    } finally {
      setDeleting(null)
    }
  }

  async function handleBulkDelete() {
    const ids = selection.selectedIds
    if (ids.length === 0 || bulkDeleting) return
    setBulkDeleting(true)
    setError(null)
    try {
      const byId = new Map(companies.map((row) => [row.id, row]))
      await Promise.all(
        ids.map(async (id) => {
          const row = byId.get(id)
          if (!row) return
          if (row.hasOrg) await deleteOrganization(row.id)
          if (row.user) await deleteUser(row.user.uid)
        }),
      )
      selection.clear()
      await fetchCompanies()
    } catch (deleteError) {
      console.error("Error deleting companies:", deleteError)
      setError(deleteError instanceof Error ? deleteError.message : "Some clients could not be removed. Try again.")
    } finally {
      setBulkDeleting(false)
    }
  }

  function companyHref(row: CompanyRow): string {
    // Company pages are addressed by the organization slug. A user slug can
    // differ from it (for example, sadaya vs sadaya-client), which would make
    // the same company appear at two different dashboard URLs.
    return `/dashboard/clients/${row.slug || (row.user ? userRef(row.user) : row.id)}`
  }

  function handleViewWorkspace(row: CompanyRow) {
    if (!row.user || row.user.role !== "client" || !row.user.companyId) return
    viewAsUser(row.user)
    router.push(`/${encodeURIComponent(row.slug || row.user.companyId)}`)
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6">
      <FilterBar
        {...bar}
        mobileVariant="drawer"
        headerOnMobile
        placeholder="Search clients"
        controls={<ViewToggle view={view} onChange={setView} />}
        actions={
          <Button variant="ghost" size="icon" className="bg-transparent text-foreground hover:bg-transparent" onClick={() => setCreating(true)} aria-label="Add client" title="Add client">
            <Plus className="size-4" aria-hidden="true" />
          </Button>
        }
      />

      {error && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => void fetchCompanies()}>
            Try again
          </Button>
        </div>
      )}

      {loading ? (
        <DashboardPageSkeleton rows={6} />
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </span>
            <h2 className="mt-4 font-medium">No clients yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add a client to create a company for their projects, tasks, and documents.
            </p>
            <Button className="mt-5" onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </CardContent>
        </Card>
      ) : visibleCompanies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No clients match your search.
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <GridCardList>
          {visibleCompanies.map((row) => (
            <GridCard
              key={row.id}
              href={companyHref(row)}
              ariaLabel={`Open ${row.name}`}
              title={row.name}
              icon={<ReactIcon icon={FaBuilding} className="size-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
              preview={row.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.logoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-contain p-6" />
              ) : undefined}
              placeholder={<ReactIcon icon={FaBuilding} className="size-12 text-muted-foreground/40" aria-hidden="true" />}
              menuLabel={`Options for ${row.name}`}
              menu={
                <>
                  <DropdownMenuItem onSelect={() => router.push(companyHref(row))}>Open client</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => router.push(`${companyHref(row)}/edit`)}>Edit client</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(row)}>Remove client</DropdownMenuItem>
                </>
              }
            />
          ))}
        </GridCardList>
      ) : (
        <>
          <div className="space-y-2 sm:hidden">
            {visibleCompanies.map((row) => (
              <MobileDataCard
                key={row.id}
                href={companyHref(row)}
                title={row.name}
                subtitle={row.label || (row.projectCount ? `${row.projectCount} project${row.projectCount === 1 ? "" : "s"}` : "No projects yet")}
                imageUrl={row.logoUrl}
                icon={<ReactIcon icon={FaBuilding} className="size-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
                menuLabel={`Options for ${row.name}`}
                menu={
                  <>
                    <DropdownMenuItem onSelect={() => router.push(companyHref(row))}>Open client</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push(`${companyHref(row)}/edit`)}>Edit client</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(row)}>Remove client</DropdownMenuItem>
                  </>
                }
              />
            ))}
          </div>

          <div className="hidden rounded-lg border border-border sm:block">
          <TableBulkBar
            count={selection.selectedCount}
            noun="client"
            nounPlural="clients"
            deleting={bulkDeleting}
            onClear={selection.clear}
            onDelete={handleBulkDelete}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all clients"
                    checked={selection.allSelected}
                    indeterminate={selection.someSelected}
                    onChange={selection.toggleAll}
                  />
                </TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Date added</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCompanies.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(companyHref(row))}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      aria-label={`Select ${row.name}`}
                      checked={selection.isSelected(row.id)}
                      onChange={() => selection.toggle(row.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {row.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.logoUrl}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                      <span className="font-medium">{row.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.label || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{row.projectCount}</TableCell>
                  <TableCell className="text-muted-foreground">{formatTimestamp(row.createdAt)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {row.user ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => handleViewWorkspace(row)}
                      >
                        <Eye className="mr-2 h-3.5 w-3.5" />
                        View
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => router.push(`${companyHref(row)}/edit`)}
                        aria-label="Edit client"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setPendingDelete(row)}
                        aria-label="Remove client"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </>
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

      {/* Creating stays a sheet; the new company's own page opens once it saves. */}
      <CompanyCreateSheet
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(workspaceId) => {
          setCreating(false)
          router.push(`/dashboard/clients/${workspaceId}`)
        }}
      />
    </main>
  )
}
