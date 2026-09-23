"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"

import { useCompany } from "@/components/dashboard/company-context"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { INDUSTRIES } from "@/lib/industries"
import { updateOrganization, uniqueOrganizationSlug } from "@/lib/organizations"
import { deleteUser, updateUser, userRef } from "@/lib/users"

export default function CompanyEditPage() {
  const router = useRouter()
  const { client, organization, workspaceId, reload } = useCompany()

  const [form, setForm] = useState({
    name: organization?.name || client.company || "",
    logoUrl: organization?.logoUrl || client.photoURL || "",
    industry: organization?.industry ?? "",
    location: organization?.location ?? "",
    website: organization?.website ?? "",
    slug: organization?.slug ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const name = form.name.trim() || "Unnamed company"
      // Whatever the admin typed wins; falls back to the name if left blank.
      // uniqueOrganizationSlug also cleans it up and dodges reserved words
      // and other companies' slugs, so this covers both first-time backfill
      // and a deliberate rename.
      const slug = await uniqueOrganizationSlug(form.slug.trim() || name, workspaceId)
      await Promise.all([
        updateOrganization(workspaceId, {
          name,
          logoUrl: form.logoUrl.trim(),
          industry: form.industry.trim(),
          location: form.location.trim(),
          website: form.website.trim(),
          slug,
        }),
        // Kept in step so the fallback name (used before an org doc existed)
        // doesn't go stale.
        updateUser(client.uid, { company: name }),
      ])
      await reload()
      router.push(`/dashboard/clients/${userRef(client)}`)
    } catch (error) {
      console.error("Error saving company:", error)
      setSaveError(error instanceof Error ? error.message : "The company could not be saved.")
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteUser(client.uid)
      router.push("/dashboard/clients")
    } catch (deleteError) {
      console.error("Error deleting company:", deleteError)
      setSaveError(deleteError instanceof Error ? deleteError.message : "The company could not be removed.")
      setDeleting(false)
      setPendingDelete(false)
    }
  }

  const displayName = form.name || "this company"

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-md space-y-8">
        <div className="space-y-5 px-1">
          <ImageDropzone label="Logo" value={form.logoUrl} onChange={(url) => set("logoUrl", url)} />
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(event) => set("name", event.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Public URL</Label>
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 text-sm text-muted-foreground">visualcns.com/</span>
              <Input
                id="slug"
                value={form.slug}
                onChange={(event) => set("slug", event.target.value)}
                placeholder={organization?.name ? undefined : "company-name"}
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to generate one from the name. Changing it moves the public page to the new address.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Select value={form.industry} onValueChange={(value) => set("industry", value)}>
              <SelectTrigger id="industry" className="w-full">
                <SelectValue placeholder="Select an industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(event) => set("location", event.target.value)}
              placeholder="Lagos, Nigeria"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={form.website}
              onChange={(event) => set("website", event.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>

        {saveError && <p className="px-1 text-sm text-destructive">{saveError}</p>}

        <div className="flex items-center justify-end gap-2 px-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/clients/${userRef(client)}`)}
            disabled={saving || deleting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving || deleting}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setPendingDelete(true)}
            disabled={saving || deleting}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </form>

      <AlertDialog open={pendingDelete} onOpenChange={(open) => !open && !deleting && setPendingDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove company?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {displayName}&apos;s account. Their projects, tasks, and documents will remain in the
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
    </>
  )
}
