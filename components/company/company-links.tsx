"use client"

import { ExternalLink, Link2, Plus, X } from "lucide-react"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CompanyLink } from "@/lib/organizations"

function externalHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

export function CompanyLinks({
  links = [],
  onSave,
}: {
  links?: CompanyLink[]
  onSave?: (links: CompanyLink[]) => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState("")
  const [url, setUrl] = useState("")
  const [saving, setSaving] = useState(false)

  async function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextLabel = label.trim()
    const nextUrl = url.trim()
    if (!onSave || !nextLabel || !nextUrl || saving) return
    setSaving(true)
    try {
      await onSave([...links, { id: `link-${Date.now()}`, label: nextLabel, url: nextUrl }])
      setLabel("")
      setUrl("")
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  async function removeLink(id: string) {
    if (!onSave || saving) return
    setSaving(true)
    try {
      await onSave(links.filter((link) => link.id !== id))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="py-2" aria-labelledby="company-links-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="company-links-heading" className="text-xl font-semibold tracking-[-0.02em] text-foreground">Links</h2>
        {onSave && !adding && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add link
          </Button>
        )}
      </div>

      {links.length > 0 ? (
        <div className="mt-5 space-y-2">
          {links.map((link) => (
            <div key={link.id} className="flex min-w-0 items-center gap-3 py-1">
              <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <a
                href={externalHref(link.url)}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                <span>{link.label}</span>
                <span className="ml-2 font-normal text-muted-foreground">{link.url}</span>
              </a>
              {onSave && (
                <button
                  type="button"
                  onClick={() => void removeLink(link.id)}
                  disabled={saving}
                  aria-label={`Remove ${link.label}`}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
              <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>
          ))}
        </div>
      ) : !adding ? (
        <p className="mt-5 text-sm text-muted-foreground">Add websites, social profiles, or other useful links.</p>
      ) : null}

      {adding && (
        <form onSubmit={addLink} className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] sm:items-end">
          <label className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Label</span>
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Instagram" autoFocus />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-muted-foreground">URL</span>
            <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="instagram.com/company" />
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving || !label.trim() || !url.trim()}>Save</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)} disabled={saving}>Cancel</Button>
          </div>
        </form>
      )}
    </section>
  )
}
