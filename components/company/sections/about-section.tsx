"use client"

import { useEffect, useState, type ReactNode } from "react"
import { X } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { CompanyBookings } from "@/components/company/company-bookings"
import { CompanyLinks } from "@/components/company/company-links"
import { useCompanyPage } from "@/components/company/company-page-context"
import { CompanyDetails, type CompanyDetailsPatch } from "@/components/company/company-sidebar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function ProfileCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-2">
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function ReadOnlyFormField({ id, label, value, multiline = false }: { id: string; label: string; value?: string; multiline?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-muted-foreground">{label}</Label>
      {multiline ? (
        <Textarea
          id={id}
          value={value ?? ""}
          placeholder="Not set"
          readOnly
          rows={4}
          className="min-h-28 resize-none bg-background"
        />
      ) : (
        <Input
          id={id}
          value={value ?? ""}
          placeholder="Not set"
          readOnly
          className="h-10 rounded-md border border-input bg-background px-3"
        />
      )}
    </div>
  )
}

function CompanyAboutCard({ description, onSave }: { description?: string; onSave?: (patch: CompanyDetailsPatch) => Promise<void> }) {
  const [draft, setDraft] = useState(description ?? "")

  useEffect(() => setDraft(description ?? ""), [description])

  return (
    <ProfileCard title="About">
      {onSave ? (
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            const next = draft.trim()
            if (next !== (description ?? "")) void onSave({ description: next })
          }}
          placeholder="Add a description"
          className="min-h-28 resize-y border-transparent bg-transparent px-0 text-sm leading-6 shadow-none focus-visible:border-transparent focus-visible:ring-0"
          aria-label="Company description"
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
          {description || "No description yet."}
        </p>
      )}
    </ProfileCard>
  )
}

function CompanyTagsCard({ tags = [], onSave }: { tags?: string[]; onSave?: (patch: CompanyDetailsPatch) => Promise<void> }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState("")

  function addTag() {
    const next = draft.trim()
    setDraft("")
    setAdding(false)
    if (!next || tags.includes(next) || !onSave) return
    void onSave({ tags: [...tags, next] })
  }

  return (
    <ProfileCard title="Tags">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
            {tag}
            {onSave && (
              <button
                type="button"
                onClick={() => void onSave({ tags: tags.filter((item) => item !== tag) })}
                aria-label={`Remove ${tag} tag`}
                className="text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </span>
        ))}
        {onSave && (adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                addTag()
              }
              if (event.key === "Escape") {
                setDraft("")
                setAdding(false)
              }
            }}
            onBlur={addTag}
            placeholder="Tag name"
            className="h-9 w-28 rounded-full bg-muted px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="New tag"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            + Add tag
          </button>
        ))}
        {!tags.length && !onSave && <span className="text-sm text-muted-foreground">No tags yet.</span>}
      </div>
    </ProfileCard>
  )
}

export function AboutSection({ singleColumn = false, formStyle = false }: { singleColumn?: boolean; formStyle?: boolean } = {}) {
  const { company, admin } = useCompanyPage()
  const { user } = useAuth()

  const profile = {
    id: company.id,
    name: company.name,
    logoUrl: company.logoUrl,
    industry: company.industry,
    location: company.location,
    address: company.address,
    website: company.website,
    description: company.description,
    companySize: company.companySize,
    source: company.source,
    linkedIn: company.linkedIn,
    tags: company.tags,
    primaryContactId: company.primaryContactId,
  }

  const about = <CompanyAboutCard description={company.description} onSave={admin?.onUpdateCompany} />
  const details = (
    <ProfileCard title="Details">
      <CompanyDetails company={profile} onSave={admin?.onUpdateCompany} hideTags hideDescription />
    </ProfileCard>
  )
  const settings = admin?.profileSettings ? <ProfileCard title="Profile">{admin.profileSettings}</ProfileCard> : null
  const tags = <CompanyTagsCard tags={company.tags} onSave={admin?.onUpdateCompany} />
  const links = <CompanyLinks links={company.links} onSave={admin ? (next) => admin.onUpdateCompany({ links: next }) : undefined} />
  const bookings = user ? <CompanyBookings companyId={company.id} canCancel={!admin} /> : null

  if (formStyle) {
    return (
      <div className="mt-5 w-full max-w-2xl space-y-8">
        <ProfileCard title="About">
          <ReadOnlyFormField id={`company-about-${company.id}`} label="Description" value={company.description} multiline />
        </ProfileCard>
        <ProfileCard title="Details">
          <div className="space-y-5">
            <ReadOnlyFormField id={`company-domain-${company.id}`} label="Domain" value={company.website} />
            <ReadOnlyFormField id={`company-industry-${company.id}`} label="Industry" value={company.industry} />
            <ReadOnlyFormField id={`company-location-${company.id}`} label="Location" value={company.location} />
            <ReadOnlyFormField id={`company-address-${company.id}`} label="Address" value={company.address} multiline />
            <ReadOnlyFormField id={`company-size-${company.id}`} label="Company size" value={company.companySize ? `${company.companySize} employees` : undefined} />
            <ReadOnlyFormField id={`company-source-${company.id}`} label="Source" value={company.source} />
            <ReadOnlyFormField id={`company-linkedin-${company.id}`} label="LinkedIn" value={company.linkedIn} />
          </div>
        </ProfileCard>
        {tags}
        {links}
        {bookings}
      </div>
    )
  }

  if (singleColumn) {
    return <div className="mt-5 min-w-0 space-y-6">{settings}{about}{details}{tags}{links}{bookings}</div>
  }

  return (
    <div className="mt-5">
      {settings && <div className="mb-6 max-w-md">{settings}</div>}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <div className="min-w-0 space-y-6">{about}{tags}</div>
        {details}
      </div>
      <div className="mt-6">{links}</div>
      <div className="mt-6 empty:hidden">{bookings}</div>
    </div>
  )
}
