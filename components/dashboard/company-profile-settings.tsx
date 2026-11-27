"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Camera, Copy, Eye, ImageIcon, Info, Loader2, Share } from "lucide-react"
import { toast } from "sonner"

import { useCompany } from "@/components/dashboard/company-context"
import { ShareDialog } from "@/components/dashboard/share-dialog"
import { uploadToCloudinary } from "@/components/image-dropzone"
import { updateOrganization, uniqueOrganizationSlug } from "@/lib/organizations"
import { updateUser } from "@/lib/users"
import { cn } from "@/lib/utils"

const DOMAIN = "visualcns.com/"

function GroupLabel({ children }: { children: ReactNode }) {
  return <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>
}

function ActionButton({ label, icon, onClick, primary = false }: { label: string; icon: ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-2 outline-none">
      <span className={cn(
        "flex size-14 items-center justify-center rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring",
        primary ? "bg-primary text-primary-foreground group-hover:bg-primary/90" : "bg-muted text-foreground group-hover:bg-accent",
      )}>
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

/**
 * The client's Home on the dashboard: a card with the logo, name and public link,
 * then the profile and description, saved together with Save changes.
 */
export function CompanyProfileSettings() {
  const { client, organization, workspaceId, reload } = useCompany()
  const savedName = organization?.name || client.company || ""
  const savedSlug = organization?.slug ?? ""
  const savedDescription = organization?.description ?? ""
  const logoUrl = organization?.logoUrl || client.photoURL || ""

  const [name, setName] = useState(savedName)
  const [slug, setSlug] = useState(savedSlug)
  const [description, setDescription] = useState(savedDescription)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => setName(savedName), [savedName])
  useEffect(() => setSlug(savedSlug), [savedSlug])
  useEffect(() => setDescription(savedDescription), [savedDescription])

  const publicSlug = savedSlug || workspaceId
  const publicPath = `/${encodeURIComponent(publicSlug)}`
  const dirty = name.trim() !== savedName || slug.trim() !== savedSlug || description.trim() !== savedDescription

  async function uploadLogo(file: File) {
    if (!file.type.startsWith("image/")) return
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      await updateOrganization(workspaceId, { logoUrl: url })
      await reload()
    } catch (error) {
      console.error("Logo upload failed:", error)
      toast.error("The logo could not be uploaded.")
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    if (!dirty || saving) return
    setSaving(true)
    try {
      const nextName = name.trim() || "Unnamed company"
      const typedSlug = slug.trim()
      const patch: { name?: string; slug?: string; description?: string } = {}
      if (nextName !== savedName) patch.name = nextName
      // Cleans it up and avoids reserved words and other companies' addresses; blank falls back to the name.
      if (typedSlug !== savedSlug) patch.slug = await uniqueOrganizationSlug(typedSlug || nextName, workspaceId)
      if (description.trim() !== savedDescription) patch.description = description.trim()
      await updateOrganization(workspaceId, patch)
      // The user record keeps the name too, as the fallback before an org doc existed.
      if (patch.name) await updateUser(client.uid, { company: patch.name })
      await reload()
      toast.success("Saved")
    } catch (error) {
      console.error("Error saving company:", error)
      toast.error(error instanceof Error ? error.message : "The company could not be saved.")
    } finally {
      setSaving(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`)
      toast.success("Link copied")
    } catch {
      toast.error("Couldn't copy the link.")
    }
  }

  return (
    <div className="space-y-8">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file) void uploadLogo(file)
        }}
      />

      <section className="flex flex-col items-center rounded-3xl bg-muted/50 px-5 py-8 text-center">
        <div className="relative">
          <div className="flex size-28 items-center justify-center overflow-hidden rounded-full bg-background">
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="" className="size-full object-cover" />
              : <ImageIcon className="size-8 text-muted-foreground" aria-hidden="true" />}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Change logo"
            className="absolute -bottom-1 -right-1 flex size-10 items-center justify-center rounded-full border-4 border-muted bg-background text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Camera className="size-4" aria-hidden="true" />}
          </button>
        </div>
        <p className="mt-4 text-xl font-semibold">{savedName || "Unnamed company"}</p>
        <a
          href={publicPath}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-background/60 px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <span className="size-2 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
          <span className="truncate">{DOMAIN}{publicSlug}</span>
        </a>
        <div className="mt-6 grid w-full max-w-xs grid-cols-3">
          <ActionButton primary label="Share" icon={<Share className="size-5" aria-hidden="true" />} onClick={() => setSharing(true)} />
          <ActionButton label="Preview" icon={<Eye className="size-5" aria-hidden="true" />} onClick={() => window.open(publicPath, "_blank", "noreferrer")} />
          <ActionButton label="Copy link" icon={<Copy className="size-5" aria-hidden="true" />} onClick={() => void copyLink()} />
        </div>
        <ShareDialog showTrigger={false} open={sharing} onOpenChange={setSharing} path={publicPath} title={savedName || "Company page"} />
      </section>

      <section className="space-y-3">
        <GroupLabel>Profile</GroupLabel>
        <div className="divide-y divide-border rounded-3xl bg-muted/50 px-5">
          <div className="flex items-center gap-4 py-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-background">
              <ImageIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Logo</p>
              <p className="text-sm text-muted-foreground">Square image recommended</p>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="shrink-0 rounded-full bg-background px-4 py-2 text-sm font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              Change
            </button>
          </div>
          <label className="block py-4">
            <span className="text-sm text-muted-foreground">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Company name"
              className="mt-1 block w-full bg-transparent text-lg outline-none placeholder:text-muted-foreground"
            />
          </label>
          <label className="block py-4">
            <span className="text-sm text-muted-foreground">Public URL</span>
            <span className="mt-1 flex items-center text-lg">
              <span className="shrink-0 text-muted-foreground">{DOMAIN}</span>
              <input
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="company-name"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </span>
          </label>
        </div>
        <p className="flex gap-2 px-1 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Changing the URL moves your public page to the new address.
        </p>
      </section>

      <section className="space-y-3">
        <GroupLabel>About</GroupLabel>
        <label className="block rounded-3xl bg-muted/50 px-5 py-4">
          <span className="text-sm text-muted-foreground">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Tell people what the company does"
            rows={5}
            className="mt-1 block w-full resize-none bg-transparent text-base leading-7 outline-none placeholder:text-muted-foreground"
          />
        </label>
      </section>

      <div className="sticky bottom-4 z-10">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || saving}
          className="h-14 w-full rounded-full bg-foreground text-base font-semibold text-background shadow-lg outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  )
}
