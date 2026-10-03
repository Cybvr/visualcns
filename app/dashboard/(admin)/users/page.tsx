"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { Loader2, Mail, Plus, Trash2, User as UserIcon, UserPlus } from "lucide-react"
import { getUsers, deleteUser, type AppUser } from "@/lib/users"
import { getOrganizations } from "@/lib/organizations"
import { CompactListRow } from "@/components/dashboard/compact-list-row"
import { DocumentSplitPane } from "@/components/dashboard/document-split-pane"
import { FirstRunState } from "@/components/dashboard/empty-state"
import { UserForm } from "@/components/dashboard/user-form"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth-provider"
import { useRecordTitle } from "@/components/dashboard/page-title-context"
import { useUrlSelection } from "@/hooks/use-url-selection"
import { FilterBar, useFilterBar, type SortOption } from "@/components/dashboard/filter-bar"
import { formatTimestamp, tsToMillis } from "@/lib/tasks"
import { buildEmailComposeHref } from "@/lib/email-composer"

/** Contacts as a list on the left and the open contact's details on the right, like clients, tasks and notes. */
export default function UsersAdminPage() {
  const router = useRouter()
  const { user, viewAsUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AppUser | null>(null)
  const [selectedId, setSelectedId] = useUrlSelection("contact")
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
    {
      value: "updatedAt",
      label: "Last modified",
      get: (u) => Math.max(tsToMillis(u.updatedAt), tsToMillis(u.createdAt)),
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
      setPendingDelete(null)
    } catch (err) {
      console.error("Error deleting user:", err)
    } finally {
      setDeleting(null)
    }
  }

  // Saving keeps the contact open, so a new contact becomes the one in the right pane.
  async function handleSaved(uid: string) {
    await fetchUsers()
    setSelectedId(uid, { replace: true })
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

  function canViewAs(u: AppUser) {
    return (u.role === "client" && Boolean(u.companyId)) || ((u.role === "admin" || u.role === "superadmin") && Boolean(u.agencyId))
  }

  function handleViewAs(u: AppUser) {
    if (!canViewAs(u)) return
    viewAsUser(u)
    router.push(u.role === "client" ? `/${encodeURIComponent(u.companyId as string)}` : "/dashboard/overview")
  }

  function emailHref(u: AppUser) {
    const recipientName = u.displayName?.trim() || undefined
    return buildEmailComposeHref({
      recipientEmail: u.email?.trim(),
      recipientName,
      body: `Hi ${recipientName?.split(/\s+/)[0] || "there"},\n\n`,
    })
  }

  const { results: visibleUsers, bar } = useFilterBar({
    items: users,
    search: searchUser,
    sorts: USER_SORTS,
    defaultSort: "updatedAt",
    defaultDirection: "desc",
  })

  const isNew = selectedId === "new"
  const selectedUser = selectedId && !isNew ? users.find((u) => u.uid === selectedId) ?? null : null
  useRecordTitle(isNew ? "New contact" : selectedUser?.displayName || selectedUser?.email || null)

  const contactFilter = (
    <FilterBar
      {...bar}
      className="mb-0 h-16 border-b border-border"
      placeholder="Search contacts"
      actions={
        <>
          <Button variant="ghost" size="icon" className="bg-transparent text-foreground hover:bg-transparent" disabled={inviting} onClick={() => void handleInvite()} aria-label="Invite contact" title="Invite contact">
            {inviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" aria-hidden="true" />}
          </Button>
          <Button variant="ghost" className="bg-transparent text-foreground hover:bg-transparent" onClick={() => setSelectedId("new")}>
            <Plus className="size-4" aria-hidden="true" />
            New
          </Button>
        </>
      }
    />
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}

      {!loading && users.length === 0 && !isNew ? (
        <>
          <div className="lg:max-w-[30rem]">{contactFilter}</div>
          <FirstRunState
            label="Contact"
            title="Let's add your first contact"
            description="Keep the people you work with here, and give them access to their company's page."
            action={<Button onClick={() => setSelectedId("new")}>New contact</Button>}
          />
        </>
      ) : (
        <DocumentSplitPane
          visibleItems={loading ? [] : visibleUsers}
          loading={loading}
          selectedId={isNew || selectedUser ? selectedId : null}
          onClearSelection={() => setSelectedId(null)}
          sectionLabel="Contacts"
          filter={contactFilter}
          emptySearchLabel="No contacts match your search."
          getKey={(u) => u.uid}
          selectedTitle={isNew ? "New contact" : selectedUser?.displayName || selectedUser?.email || "Contact"}
          headerActions={selectedUser && (
            <>
              {selectedUser.email?.trim() && (
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={() => router.push(emailHref(selectedUser))} aria-label="Email contact" title="Email contact">
                  <Mail className="size-4" aria-hidden="true" />
                </Button>
              )}
              {canViewAs(selectedUser) && (
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={() => handleViewAs(selectedUser)} aria-label="View as this contact" title="View as">
                  <UserIcon className="size-4" aria-hidden="true" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => setPendingDelete(selectedUser)} aria-label="Delete contact" title="Delete contact">
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </>
          )}
          content={(isNew || selectedUser) && (
            <UserForm
              key={selectedUser?.uid ?? "new"}
              user={selectedUser}
              subjectNoun="contact"
              onSaved={handleSaved}
              onCancel={() => setSelectedId(null)}
            />
          )}
          renderItem={(u, active) => (
            <CompactListRow
              leading={u.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.photoURL} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full object-cover" />
              ) : (
                <span className="flex size-8 items-center justify-center rounded-full bg-muted"><UserIcon className="size-4 text-muted-foreground" aria-hidden="true" /></span>
              )}
              title={u.displayName || u.email || "—"}
              subtitle={`${[u.email, companyNameOf(u)].filter(Boolean).join(" · ") || "—"} · ${formatTimestamp(u.updatedAt ?? u.createdAt)}`}
              mobileSubtitle={u.email || companyNameOf(u) || formatTimestamp(u.updatedAt ?? u.createdAt)}
              active={active}
              onClick={() => setSelectedId(u.uid)}
              ariaLabel={`Open ${u.displayName || u.email || "contact"}`}
              menuLabel={`Options for ${u.displayName || u.email || "contact"}`}
              menu={<>
                <DropdownMenuItem onSelect={() => setSelectedId(u.uid)}>Open contact</DropdownMenuItem>
                <DropdownMenuItem disabled={!u.email?.trim()} onSelect={() => router.push(emailHref(u))}>Email</DropdownMenuItem>
                {canViewAs(u) && <DropdownMenuItem onSelect={() => handleViewAs(u)}>View as</DropdownMenuItem>}
                <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(u)}>Delete</DropdownMenuItem>
              </>}
            />
          )}
        />
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove contact?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;re about to remove {pendingDelete?.displayName || pendingDelete?.email || "this contact"}. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting !== null}
              onClick={(event) => {
                event.preventDefault()
                if (pendingDelete) void handleDelete(pendingDelete.uid)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
