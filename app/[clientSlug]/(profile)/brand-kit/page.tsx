"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Check, Copy, Download, Plus, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { useCompanyPage } from "@/components/company/company-page-context"
import { SectionHeader } from "@/components/dashboard/section-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadFileToStorage } from "@/lib/documents"
import type { BrandColor, BrandKit } from "@/lib/organizations"

const HEX = /^#[0-9a-f]{6}$/i

/** Loads a Google Font by name so its sample shows in that font. */
function useGoogleFont(name?: string) {
  useEffect(() => {
    const family = name?.trim()
    if (!family) return
    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;700&display=swap`
    if (document.querySelector(`link[href="${href}"]`)) return
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href
    document.head.appendChild(link)
  }, [name])
}

/** Black or white, whichever reads better on the colour. */
function textOn(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111111" : "#ffffff"
}

export default function BrandKitPage() {
  const { company, admin } = useCompanyPage()
  const kit: BrandKit = company.brandKit ?? {}
  const editable = Boolean(admin)
  const logos = [...new Set([...(company.logoUrl ? [company.logoUrl] : []), ...(kit.logos ?? [])])]
  const colors = kit.colors ?? []

  async function save(patch: Partial<BrandKit>) {
    if (!admin) return
    try {
      await admin.onUpdateCompany({ brandKit: { ...kit, ...patch } })
    } catch (error) {
      console.error("Error saving brand kit:", error)
      toast.error("Couldn't save. Try again.")
      throw error
    }
  }

  const empty = !logos.length && !colors.length && !kit.headingFont && !kit.bodyFont
  if (empty && !editable) {
    return <p className="mt-10 text-center text-sm text-muted-foreground">No brand kit yet.</p>
  }

  return (
    <div className="mt-9 mb-10 space-y-10">
      <Logos logos={logos} primary={company.logoUrl} editable={editable} onChange={(next) => save({ logos: next })} />
      <Colors colors={colors} editable={editable} onChange={(next) => save({ colors: next })} />
      <Fonts heading={kit.headingFont} body={kit.bodyFont} companyName={company.name} editable={editable} onSave={(headingFont, bodyFont) => save({ headingFont, bodyFont })} />
    </div>
  )
}

function Logos({ logos, primary, editable, onChange }: { logos: string[]; primary?: string; editable: boolean; onChange: (next: string[]) => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  if (!logos.length && !editable) return null

  async function upload(files: FileList | null) {
    const list = [...(files ?? [])].filter((file) => file.type.startsWith("image/"))
    if (!list.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(list.map((file) => uploadFileToStorage(file)))
      await onChange([...logos.filter((url) => url !== primary), ...urls])
    } catch (error) {
      console.error("Error uploading logo:", error)
      toast.error("Couldn't upload that logo.")
    } finally {
      setUploading(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <section aria-labelledby="brand-logos-heading">
      <div className="flex items-center justify-between gap-3">
        <SectionHeader id="brand-logos-heading" title="Logos" />
        {editable && (
          <>
            <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={() => input.current?.click()}>
              <Upload className="size-4" aria-hidden="true" />
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={(event) => void upload(event.target.files)} />
          </>
        )}
      </div>
      {logos.length ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {logos.map((url, index) => (
            <div key={url} className="group relative">
              <div className={`flex aspect-square items-center justify-center rounded-2xl p-6 ${index % 2 ? "bg-neutral-900" : "bg-muted/60"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Logo ${index + 1}`} className="max-h-full max-w-full object-contain" />
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <a href={url} target="_blank" rel="noreferrer" download aria-label="Download logo" className="flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring">
                  <Download className="size-4" aria-hidden="true" />
                </a>
                {editable && url !== primary && (
                  <button type="button" aria-label="Remove logo" onClick={() => void onChange(logos.filter((item) => item !== url && item !== primary))} className="flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm outline-none hover:bg-background hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring">
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()} className="mt-3 flex aspect-[3/1] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm text-muted-foreground outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <Upload className="size-4" aria-hidden="true" />
          Upload a logo
        </button>
      )}
    </section>
  )
}

function Colors({ colors, editable, onChange }: { colors: BrandColor[]; editable: boolean; onChange: (next: BrandColor[]) => Promise<void> }) {
  const [adding, setAdding] = useState(false)
  const [hex, setHex] = useState("#2563eb")
  const [name, setName] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  if (!colors.length && !editable) return null

  async function add(event: FormEvent) {
    event.preventDefault()
    const value = hex.trim().startsWith("#") ? hex.trim() : `#${hex.trim()}`
    if (!HEX.test(value)) {
      toast.error("Enter a colour like #2563EB.")
      return
    }
    await onChange([...colors, { name: name.trim() || value.toUpperCase(), hex: value.toUpperCase() }])
    setName("")
    setAdding(false)
  }

  function copy(value: string) {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(value)
      window.setTimeout(() => setCopied((current) => (current === value ? null : current)), 1500)
    })
  }

  return (
    <section aria-labelledby="brand-colors-heading">
      <div className="flex items-center justify-between gap-3">
        <SectionHeader id="brand-colors-heading" title="Colours" />
        {editable && !adding && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add
          </Button>
        )}
      </div>
      {adding && (
        <form onSubmit={add} className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-muted/50 p-3">
          <input type="color" aria-label="Colour" value={HEX.test(hex) ? hex : "#000000"} onChange={(event) => setHex(event.target.value)} className="size-10 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
          <Input aria-label="Hex code" value={hex} onChange={(event) => setHex(event.target.value)} className="w-28" />
          <Input aria-label="Colour name" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} className="min-w-32 flex-1" />
          <Button type="submit" size="sm">Save</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
        </form>
      )}
      {colors.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {colors.map((color, index) => (
            <div key={`${color.hex}-${index}`} className="group relative">
              <button
                type="button"
                onClick={() => copy(color.hex)}
                aria-label={`Copy ${color.hex}`}
                className="flex aspect-[4/3] w-full flex-col justify-end rounded-2xl p-3 text-left outline-none ring-1 ring-black/5 ring-inset focus-visible:ring-2 focus-visible:ring-ring"
                style={{ backgroundColor: color.hex, color: textOn(color.hex) }}
              >
                <span className="text-sm font-medium leading-tight">{color.name}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs opacity-80">
                  {color.hex}
                  {copied === color.hex ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3 opacity-0 group-hover:opacity-100" aria-hidden="true" />}
                </span>
              </button>
              {editable && (
                <button type="button" aria-label={`Remove ${color.name}`} onClick={() => void onChange(colors.filter((_, i) => i !== index))} className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground opacity-100 shadow-sm outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100">
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : !adding ? (
        <p className="mt-3 text-sm text-muted-foreground">No colours yet.</p>
      ) : null}
    </section>
  )
}

function Fonts({ heading, body, companyName, editable, onSave }: { heading?: string; body?: string; companyName: string; editable: boolean; onSave: (heading: string, body: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [headingDraft, setHeadingDraft] = useState(heading ?? "")
  const [bodyDraft, setBodyDraft] = useState(body ?? "")
  const [saving, setSaving] = useState(false)
  useGoogleFont(heading)
  useGoogleFont(body)
  if (!heading && !body && !editable) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave(headingDraft.trim(), bodyDraft.trim())
      setEditing(false)
    } catch {
      // The toast already said what went wrong.
    } finally {
      setSaving(false)
    }
  }

  const fonts = [
    { label: "Heading", name: heading, sample: companyName, className: "text-3xl font-bold" },
    { label: "Body", name: body, sample: "The quick brown fox jumps over the lazy dog.", className: "text-base" },
  ]

  return (
    <section aria-labelledby="brand-fonts-heading">
      <div className="flex items-center justify-between gap-3">
        <SectionHeader id="brand-fonts-heading" title="Fonts" />
        {editable && !editing && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setHeadingDraft(heading ?? ""); setBodyDraft(body ?? ""); setEditing(true) }}>
            Edit
          </Button>
        )}
      </div>
      {editing ? (
        <form onSubmit={submit} className="mt-3 grid gap-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">Heading</span>
            <Input value={headingDraft} onChange={(event) => setHeadingDraft(event.target.value)} placeholder="e.g. Poppins" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">Body</span>
            <Input value={bodyDraft} onChange={(event) => setBodyDraft(event.target.value)} placeholder="e.g. Inter" />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      ) : heading || body ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {fonts.filter((font) => font.name).map((font) => (
            <div key={font.label} className="rounded-2xl bg-muted/50 p-5">
              <div className="text-xs text-muted-foreground">{font.label}</div>
              <div className="mt-1 text-sm font-medium text-foreground">{font.name}</div>
              <p className={`mt-4 break-words leading-tight text-foreground ${font.className}`} style={{ fontFamily: `"${font.name}", sans-serif` }}>
                {font.sample}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No fonts yet.</p>
      )}
    </section>
  )
}
