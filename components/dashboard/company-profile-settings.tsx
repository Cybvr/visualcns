"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { useCompany } from "@/components/dashboard/company-context"
import { CreatorDefaultsForm } from "@/components/dashboard/creator-brief"
import { ImageDropzone } from "@/components/image-dropzone"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateOrganization, uniqueOrganizationSlug } from "@/lib/organizations"
import { deleteUser, updateUser } from "@/lib/users"

/** The client's logo, name and public address, saved as each one changes, plus delete. */
export function CompanyProfileSettings() {
  const router = useRouter()
  const { client, organization, workspaceId, reload } = useCompany()
  const savedName = organization?.name || client.company || ""
  const savedSlug = organization?.slug ?? ""
  const [name, setName] = useState(savedName)
  const [slug, setSlug] = useState(savedSlug)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => setName(savedName), [savedName])
  useEffect(() => setSlug(savedSlug), [savedSlug])

  async function save(run: () => Promise<unknown>) {
    setError(null)
    try {
      await run()
      await reload()
    } catch (saveError) {
      console.error("Error saving company:", saveError)
      setError(saveError instanceof Error ? saveError.message : "The company could not be saved.")
    }
  }

  function saveName() {
    const next = name.trim() || "Unnamed company"
    if (next === savedName) return
    // The user record keeps the name too, as the fallback before an org doc existed.
    void save(() => Promise.all([updateOrganization(workspaceId, { name: next }), updateUser(client.uid, { company: next })]))
  }

  function saveSlug() {
    const typed = slug.trim()
    if (typed === savedSlug) return
    // Cleans it up and avoids reserved words and other companies' addresses; blank falls back to the name.
    void save(async () => updateOrganization(workspaceId, { slug: await uniqueOrganizationSlug(typed || savedName, workspaceId) }))
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteUser(client.uid)
      router.push("/dashboard/clients")
    } catch (deleteError) {
      console.error("Error deleting company:", deleteError)
      setError(deleteError instanceof Error ? deleteError.message : "The company could not be removed.")
      setDeleting(false)
      setPendingDelete(false)
    }
  }

  return (
    <div className="space-y-5">
      <ImageDropzone
        label="Logo"
        compact
        value={organization?.logoUrl || client.photoURL || ""}
        onChange={(url) => void save(() => updateOrganization(workspaceId, { logoUrl: url.trim() }))}
      />
      <div className="space-y-1.5">
        <Label htmlFor="company-name">Name</Label>
        <Input id="company-name" value={name} onChange={(event) => setName(event.target.value)} onBlur={saveName} className="h-10 rounded-md border border-input bg-background px-3" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="company-slug">Public URL</Label>
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-sm text-muted-foreground">visualcns.com/</span>
          <Input
            id="company-slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            onBlur={saveSlug}
            placeholder="company-name"
            className="h-10 rounded-md border border-input bg-background px-3 font-mono"
          />
        </div>
        <p className="text-xs text-muted-foreground">Changing it moves the public page to the new address.</p>
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <h3 className="text-sm font-medium">Creator defaults</h3>
        <CreatorDefaultsForm companyId={workspaceId} saved={organization?.creatorDefaults} onSaved={reload} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="button" variant="outline" className="text-destructive" onClick={() => setPendingDelete(true)} disabled={deleting}>
        <Trash2 className="size-4" />
        Delete client
      </Button>

      <AlertDialog open={pendingDelete} onOpenChange={(open) => !open && !deleting && setPendingDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove company?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {savedName || "this company"}&apos;s account. Their projects, tasks, and documents will remain in the
              database, but the company will no longer appear here. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing…" : "Remove Company"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
