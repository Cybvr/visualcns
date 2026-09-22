"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Eye, Pencil, Plus, Trash2, Loader2, User as UserIcon, UserPlus } from "lucide-react"
import { getUsers, deleteUser, type AppUser } from "@/lib/users"
import { getOrganizations } from "@/lib/organizations"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { UserEditorSheet } from "@/components/dashboard/user-editor-sheet"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth-provider"
import { FilterBar, useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { TableBulkBar } from "@/components/dashboard/table-bulk-bar"
import { Checkbox } from "@/components/ui/checkbox"
import { useRowSelection } from "@/hooks/use-row-selection"
import { tsToMillis } from "@/lib/tasks"
import { cn } from "@/lib/utils"

export default function UsersAdminPage() {
  const router = useRouter()
  const { user, viewAsUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null)
  const [inviting, setInviting] = useState(false)

  // A contact's company lives on the linked organization, keyed by companyId;
  // the user doc's `company` string stays empty. Resolve the org name so the
  // column reflects the company (and any change to it), falling back to the
  // legacy string for older records.
  function companyNameOf(u: AppUser) {
    return (u.companyId && companyNames[u.companyId]) || u.company || ""
  }

  const USER_SORTS: SortOption<AppUser>[] = [
    { value: "name", label: "Name", get: (u) => u.displayName || u.email, ascLabel: "A–Z", descLabel: "Z–A" },
    { value: "email", label: "Email", get: (u) => u.email, ascLabel: "A–Z", descLabel: "Z–A" },
    { value: "role", label: "Role", get: (u) => u.role, ascLabel: "A–Z", descLabel: "Z–A" },
    { value: "company", label: "Company", get: (u) => companyNameOf(u), ascLabel: "A–Z", descLabel: "Z–A" },
    {
      value: "createdAt",
      label: "Date added",
      get: (u) => tsToMillis(u.createdAt),
      ascLabel: "Oldest",
      descLabel: "Newest",
    },
  ]

  function searchUser(u: AppUser) {
    return [u.displayName, u.email, companyNameOf(u), u.role, u.companyId]
  }

  async function fetchUsers() {
    setError(null)
    try {
      const [data, orgs] = await Promise.all([getUsers(), getOrganizations()])
      // Company workspace owner records are intentionally blank placeholders;
      // keep them out of the Contacts list while retaining real contacts.
      setUsers(data.filter((user) => Boolean(user.displayName?.trim() || user.email?.trim())))
      setCompanyNames(Object.fromEntries(orgs.map((org) => [org.id, org.name])))
    } catch (err) {
      console.error("Error fetching users:", err)
      setError(err instanceof Error ? err.message : "Failed to load contacts.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  async function handleDelete(uid: string) {
    setDeleting(uid)
    try {
      await deleteUser(uid)
      setUsers((prev) => prev.filter((u) => u.uid !== uid))
      if (selectedId === uid) setSelectedId(null)
    } catch (err) {
      console.error("Error deleting user:", err)
    } finally {
      setDeleting(null)
    }
  }

  async function handleSaved() {
    await fetchUsers()
    setSelectedId(null)
  }

  async function handleInvite() {
    const email = window.prompt("Email address to invite")?.trim()
    if (!email || !user || inviting) return
    setInviting(true)
    try {
      const response = await fetch("/api/admin/invites", { method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not create invite")
      await navigator.clipboard?.writeText(data.inviteUrl)
      window.alert(`Invite created. The link was copied:\n\n${data.inviteUrl}`)
    } catch (inviteError) { setError(inviteError instanceof Error ? inviteError.message : "Could not create invite") }
    finally { setInviting(false) }
  }

  function handleViewAs(u: AppUser) {
    viewAsUser(u)
    router.push("/dashboard")
  }

  const { results: visibleUsers, bar } = useFilterBar({
    items: users,
    search: searchUser,
    sorts: USER_SORTS,
    defaultSort: "name",
  })

  const selection = useRowSelection(visibleUsers, (u) => u.uid)

  async function handleBulkDelete() {
    const ids = selection.selectedIds
    if (ids.length === 0 || bulkDeleting) return
    setBulkDeleting(true)
    try {
      await Promise.all(ids.map((uid) => deleteUser(uid)))
      const removed = new Set(ids)
      setUsers((prev) => prev.filter((u) => !removed.has(u.uid)))
      if (selectedId && removed.has(selectedId)) setSelectedId(null)
      selection.clear()
    } catch (err) {
      console.error("Error deleting contacts:", err)
    } finally {
      setBulkDeleting(false)
    }
  }

  const selectedUser =
    typeof selectedId === "string" && selectedId !== "new" ? users.find((u) => u.uid === selectedId) ?? null : null

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      <FilterBar
        {...bar}
        mobileVariant="drawer"
        showSearch={false}
        placeholder="Search contacts"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" disabled={inviting} onClick={() => void handleInvite()} aria-label="Invite contact" title="Invite contact">
              {inviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" aria-hidden="true" />}
            </Button>
            <Button size="icon" onClick={() => setSelectedId("new")} aria-label="Add contact" title="Add contact">
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </div>
        }
      />

      {loading ? (
        <DashboardPageSkeleton rows={6} />
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="mb-4 text-muted-foreground">No contacts yet.</p>
            <Button onClick={() => setSelectedId("new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add the first contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {visibleUsers.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                No contacts match your search.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-2 sm:hidden">
                {visibleUsers.map((u) => (
                  <MobileDataCard
                    key={u.uid}
                    onClick={() => setSelectedId(u.uid)}
                    ariaLabel={`Open ${u.displayName || u.email || "contact"}`}
                    title={u.displayName || u.email || "—"}
                    subtitle={u.email || companyNameOf(u) || "—"}
                    imageUrl={u.photoURL}
                    icon={<UserIcon className="size-5 text-violet-600 dark:text-violet-400" aria-hidden="true" />}
                    menuLabel={`Options for ${u.displayName || u.email || "contact"}`}
                    menu={
                      <>
                        <DropdownMenuItem onSelect={() => setSelectedId(u.uid)}>Edit contact</DropdownMenuItem>
                      </>
                    }
                  />
                ))}
              </div>

              <div className="hidden rounded-lg border border-border sm:block">
              <TableBulkBar
                count={selection.selectedCount}
                noun="contact"
                deleting={bulkDeleting}
                onClear={selection.clear}
                onDelete={handleBulkDelete}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Select all contacts"
                        checked={selection.allSelected}
                        indeterminate={selection.someSelected}
                        onChange={selection.toggleAll}
                      />
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>View as</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleUsers.map((u) => (
                    <TableRow
                      key={u.uid}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(u.uid)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select ${u.displayName || u.email || "contact"}`}
                          checked={selection.isSelected(u.uid)}
                          onChange={() => selection.toggle(u.uid)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.photoURL}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded-full"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                              <UserIcon className="h-4 w-4 text-muted-foreground" />
                            </span>
                          )}
                          <span className="font-medium">{u.displayName || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                      <TableCell>
                        {u.role ? (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-muted text-muted-foreground",
                            )}
                          >
                            {u.role}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{companyNameOf(u) || "—"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => handleViewAs(u)}
                        >
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          View as
                        </Button>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedId(u.uid)}
                            aria-label="Edit contact"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                aria-label="Delete contact"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove contact?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  You&apos;re about to remove {u.displayName || u.email || "this contact"}. This can&apos;t be
                                  undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(u.uid)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleting === u.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </>
      )}

      <UserEditorSheet
        subjectNoun="contact"
        open={selectedId !== null}
        user={selectedId === "new" ? null : selectedUser}
        isNew={selectedId === "new"}
        onClose={() => setSelectedId(null)}
        onSaved={handleSaved}
      />
    </main>
  )
}
