"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { CompanyBookings } from "@/components/company/company-bookings"
import { CompanyLinks } from "@/components/company/company-links"
import { SocialAccounts } from "@/components/company/social-accounts"
import { useCompanyPage } from "@/components/company/company-page-context"
import { CompanyDetails, type CompanyDetailsPatch } from "@/components/company/company-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SectionHeader } from "@/components/dashboard/section-header"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { COMPANY_SIZES } from "@/lib/organizations"

/** A titled block on the dashboard Account tab. */
export function SettingsGroup({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 space-y-6">
      <SectionHeader id={`${id}-title`} title={title} />
      {children}
    </section>
  )
}

function ProfileCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-2">
      <SectionHeader title={title} />
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

const FORM_FIELDS = ["description", "website", "industry", "location", "address", "companySize", "source", "linkedIn"] as const
type FormField = (typeof FORM_FIELDS)[number]
type FormValues = Record<FormField, string>

/** The settings page's About and Details as one form, saved with its Save button. */
function CompanySettingsForm({ company, onSave }: { company: Partial<FormValues> & { id: string }; onSave: (patch: CompanyDetailsPatch) => Promise<void> }) {
  const initial = Object.fromEntries(FORM_FIELDS.map((field) => [field, company[field] ?? ""])) as FormValues
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const initialKey = JSON.stringify(initial)
  const dirty = FORM_FIELDS.some((field) => values[field].trim() !== initial[field])

  // Takes in changes saved elsewhere, as long as nothing is being typed here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!dirty) setValues(initial) }, [initialKey])

  const set = (field: FormField) => (value: string) => setValues((current) => ({ ...current, [field]: value }))
  const field = (name: FormField, label: string, placeholder: string, multiline = false) => (
    <div className="space-y-2">
      <Label htmlFor={`company-${name}-${company.id}`}>{label}</Label>
      {multiline ? (
        <Textarea id={`company-${name}-${company.id}`} value={values[name]} onChange={(event) => set(name)(event.target.value)} placeholder={placeholder} rows={4} className="min-h-28 resize-y" />
      ) : (
        <Input id={`company-${name}-${company.id}`} value={values[name]} onChange={(event) => set(name)(event.target.value)} placeholder={placeholder} />
      )}
    </div>
  )

  async function save(event: FormEvent) {
    event.preventDefault()
    const patch: CompanyDetailsPatch = {}
    for (const name of FORM_FIELDS) {
      const next = values[name].trim()
      if (next !== initial[name]) patch[name] = next
    }
    setSaving(true)
    try {
      await onSave(patch)
      toast.success("Saved")
    } catch {
      toast.error("Couldn't save the company details.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-8">
      <div id="company-settings-about"><ProfileCard title="About">{field("description", "Description", "Add a description", true)}</ProfileCard></div>
      <div id="company-settings-details"><ProfileCard title="Details">
        <div className="space-y-5">
          {field("website", "Domain", "Add domain")}
          {field("industry", "Industry", "Add industry")}
          {field("location", "Location", "Add location")}
          {field("address", "Address", "Add the billing address", true)}
          <div className="space-y-2">
            <Label htmlFor={`company-companySize-${company.id}`}>Company size</Label>
            <Select value={values.companySize} onValueChange={set("companySize")}>
              <SelectTrigger id={`company-companySize-${company.id}`} className="w-full"><SelectValue placeholder="Select company size" /></SelectTrigger>
              <SelectContent>{COMPANY_SIZES.map((size) => <SelectItem key={size} value={size}>{size} employees</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {field("source", "Source", "Add source")}
          {field("linkedIn", "LinkedIn", "Add LinkedIn")}
        </div>
      </ProfileCard></div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setValues(initial)} disabled={!dirty || saving}>Cancel</Button>
        <Button type="submit" disabled={!dirty || saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </form>
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
          className="min-h-28 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 shadow-none focus-visible:ring-2"
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
  const { company, admin, canSeeVisitors } = useCompanyPage()
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
      <CompanyDetails company={profile} onSave={admin?.onUpdateCompany} hideTags hideDescription formStyle={singleColumn} />
    </ProfileCard>
  )
  const settings = admin?.profileSettings ? <ProfileCard title="Profile">{admin.profileSettings}</ProfileCard> : null
  const tags = <CompanyTagsCard tags={company.tags} onSave={admin?.onUpdateCompany} />
  const links = <CompanyLinks links={company.links} onSave={admin ? (next) => admin.onUpdateCompany({ links: next }) : undefined} />
  const bookings = user ? <CompanyBookings companyId={company.id} canCancel={!admin} /> : null
  // The agency and the company's own people; same rule as the Social section.
  const social = user && canSeeVisitors ? <SocialAccounts companyId={company.id} /> : null

  if (formStyle) {
    return (
      <div className="mt-5 w-full max-w-2xl space-y-8">
        {admin ? (
          <CompanySettingsForm company={profile} onSave={admin.onUpdateCompany} />
        ) : (
        <>
        <div id="company-settings-about">
          <ProfileCard title="About">
            <ReadOnlyFormField id={`company-about-${company.id}`} label="Description" value={company.description} multiline />
          </ProfileCard>
        </div>
        <div id="company-settings-details">
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
        </div>
        </>
        )}
        <div id="company-settings-tags">{tags}</div>
        <div id="company-settings-links">{links}</div>
      </div>
    )
  }

  if (singleColumn) {
    return (
      <div className="mt-5 min-w-0 space-y-10">
        <SettingsGroup id="company-settings-profile" title="Profile">
          {admin?.profileSettings ? <div>{admin.profileSettings}</div> : null}
          <div id="company-settings-about">{about}</div>
          <div id="company-settings-details">{details}</div>
          <div id="company-settings-tags">{tags}</div>
          <div id="company-settings-links">{links}</div>
        </SettingsGroup>
        {social && <SettingsGroup id="company-settings-social" title="Social">{social}</SettingsGroup>}
        <div id="company-settings-bookings" className="empty:hidden">{bookings}</div>
      </div>
    )
  }

  return (
    <div className="mt-5">
      {settings && <div className="mb-6 max-w-md">{settings}</div>}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <div className="min-w-0 space-y-6">{about}{tags}</div>
        {details}
      </div>
      <div className="mt-6">{links}</div>
      <div id="company-settings-social" className="mt-6 max-w-2xl empty:hidden">{social}</div>
      <div className="mt-6 empty:hidden">{bookings}</div>
    </div>
  )
}

/** Connected accounts live on their own page in the company-site settings. */
export function CompanySocialSettings() {
  const { company, canSeeVisitors } = useCompanyPage()
  const { user } = useAuth()

  if (!user || !canSeeVisitors) return <p className="mt-5 text-sm text-muted-foreground">Sign in with a company account to manage social connections.</p>
  return <div className="mt-5 w-full max-w-2xl"><SocialAccounts companyId={company.id} /></div>
}
