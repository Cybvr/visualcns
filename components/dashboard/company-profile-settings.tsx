"use client"

import { useEffect, useState } from "react"

import { useCompany } from "@/components/dashboard/company-context"
import { ImageDropzone } from "@/components/image-dropzone"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateOrganization, uniqueOrganizationSlug } from "@/lib/organizations"
import { updateUser } from "@/lib/users"

/** The client's logo, name and public address, saved as each one changes. */
export function CompanyProfileSettings() {
  const { client, organization, workspaceId, reload } = useCompany()
  const savedName = organization?.name || client.company || ""
  const savedSlug = organization?.slug ?? ""
  const [name, setName] = useState(savedName)
  const [slug, setSlug] = useState(savedSlug)
  const [error, setError] = useState<string | null>(null)

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

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
