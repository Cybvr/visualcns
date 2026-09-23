"use client"

import { useState, type ReactNode } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { INDUSTRIES } from "@/lib/industries"
import { COMPANY_SIZES } from "@/lib/organizations"

export interface CompanySidebarPerson {
  id: string
  name: string
  subtitle?: string
  photoUrl?: string
}

export interface CompanySidebarCompany {
  id: string
  name: string
  logoUrl?: string
  industry?: string
  location?: string
  website?: string
  description?: string
  companySize?: string
  source?: string
  linkedIn?: string
  tags?: string[]
  primaryContactId?: string
}

export type CompanyDetailsPatch = Partial<
  Pick<
    CompanySidebarCompany,
    "name" | "logoUrl" | "tags" | "description" | "industry" | "location" | "website" | "companySize" | "source" | "linkedIn" | "primaryContactId"
  >
>

function DetailRow({ label, value, editable }: { label: string; value?: string; editable: boolean }) {
  return (
    <div className="surface-body flex items-center justify-between gap-3 py-2.5">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      {value ? (
        <span className="truncate text-right font-medium text-foreground">{value}</span>
      ) : (
        <span className="truncate text-right text-muted-foreground/60">
          {editable ? `Add ${label.toLowerCase()}` : "Not set"}
        </span>
      )}
    </div>
  )
}

function DetailsRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="surface-body flex items-center justify-between gap-3 py-1">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/**
 * The company profile panel on the left of the company detail page.
 */
export function CompanySidebar({
  company,
}: {
  company: CompanySidebarCompany
}) {
  if (!company.industry) return null

  return (
    <aside className="min-w-0 space-y-4 print:hidden lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <span className="surface-body inline-flex items-center rounded-full bg-muted px-2.5 py-1 font-medium">
          {company.industry}
        </span>
      </div>
    </aside>
  )
}

/**
 * The editable company fields (including tags), shown on the About tab.
 * Read-only whenever `onSave` is omitted.
 */
export function CompanyDetails({
  company,
  onSave,
}: {
  company: CompanySidebarCompany
  onSave?: (patch: CompanyDetailsPatch) => Promise<void>
}) {
  const [addingTag, setAddingTag] = useState(false)
  const [tagDraft, setTagDraft] = useState("")

  async function commitTags(next: string[]) {
    if (!onSave) return
    try {
      await onSave({ tags: next })
    } catch (error) {
      console.error("Error saving tags:", error)
    }
  }

  /** Auto-save a single company field, skipping the write when it's unchanged. */
  async function commitField(
    field: "website" | "description" | "industry" | "location" | "companySize" | "source" | "linkedIn",
    value: string,
  ) {
    if (!onSave) return
    const next = value.trim()
    if ((company[field] ?? "") === next) return
    try {
      await onSave({ [field]: next })
    } catch (error) {
      console.error("Error saving company details:", error)
    }
  }

  function addTag() {
    const value = tagDraft.trim()
    setTagDraft("")
    setAddingTag(false)
    if (!value) return
    if ((company.tags ?? []).includes(value)) return
    void commitTags([...(company.tags ?? []), value])
  }

  function removeTag(tag: string) {
    void commitTags((company.tags ?? []).filter((t) => t !== tag))
  }

  return (
    <div>
      {onSave ? (
          <div className="divide-y divide-border/60">
            <div className="surface-body flex items-start justify-between gap-3 py-2.5">
              <span className="shrink-0 pt-0.5 text-muted-foreground">Tags</span>
              <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
                {(company.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="surface-body group/tag inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove ${tag} tag`}
                      className="text-muted-foreground opacity-0 outline-none transition-opacity hover:text-foreground group-hover/tag:opacity-100 focus-visible:opacity-100"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                {addingTag ? (
                  <input
                    autoFocus
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        addTag()
                      }
                      if (event.key === "Escape") {
                        setTagDraft("")
                        setAddingTag(false)
                      }
                    }}
                    onBlur={addTag}
                    placeholder="Tag name"
                    className="surface-body h-6 w-24 rounded-full border border-border bg-transparent px-2.5 outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTag(true)}
                    className="surface-body text-muted-foreground outline-none transition-colors hover:text-foreground"
                  >
                    {(company.tags?.length ?? 0) > 0 ? "Add tag" : "Add tags"}
                  </button>
                )}
              </div>
            </div>
            <DetailsRow label="Domain">
              <Input
                key={company.website ?? ""}
                defaultValue={company.website ?? ""}
                onBlur={(event) => void commitField("website", event.target.value)}
                placeholder="acme.com"
                className="surface-body h-7 border-transparent bg-transparent px-2 text-right shadow-none hover:border-input focus-visible:border-ring"
              />
            </DetailsRow>
            <DetailsRow label="Description">
              <Input
                key={company.description ?? ""}
                defaultValue={company.description ?? ""}
                onBlur={(event) => void commitField("description", event.target.value)}
                placeholder="Add a description"
                className="surface-body h-7 border-transparent bg-transparent px-2 text-right shadow-none hover:border-input focus-visible:border-ring"
              />
            </DetailsRow>
            <DetailsRow label="Industry">
              <Select
                value={company.industry ?? ""}
                onValueChange={(value) => void commitField("industry", value)}
              >
                <SelectTrigger className="surface-body ml-auto h-7 w-fit border-transparent bg-muted! shadow-none focus-visible:border-transparent! focus-visible:ring-0!">
                  <SelectValue placeholder="Add industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DetailsRow>
            <DetailsRow label="Location">
              <Input
                key={company.location ?? ""}
                defaultValue={company.location ?? ""}
                onBlur={(event) => void commitField("location", event.target.value)}
                placeholder="Add location"
                className="surface-body h-7 border-transparent bg-transparent px-2 text-right shadow-none hover:border-input focus-visible:border-ring"
              />
            </DetailsRow>
            <DetailsRow label="Company Size">
              <Select
                value={company.companySize ?? ""}
                onValueChange={(value) => void commitField("companySize", value)}
              >
                <SelectTrigger className="surface-body ml-auto h-7 w-fit border-transparent bg-muted! shadow-none focus-visible:border-transparent! focus-visible:ring-0!">
                  <SelectValue placeholder="Add size" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size} employees
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DetailsRow>
            <DetailsRow label="Source">
              <Input
                key={company.source ?? ""}
                defaultValue={company.source ?? ""}
                onBlur={(event) => void commitField("source", event.target.value)}
                placeholder="Add source"
                className="surface-body h-7 border-transparent bg-transparent px-2 text-right shadow-none hover:border-input focus-visible:border-ring"
              />
            </DetailsRow>
            <DetailsRow label="LinkedIn">
              <Input
                key={company.linkedIn ?? ""}
                defaultValue={company.linkedIn ?? ""}
                onBlur={(event) => void commitField("linkedIn", event.target.value)}
                placeholder="Add LinkedIn"
                className="surface-body h-7 border-transparent bg-transparent px-2 text-right shadow-none hover:border-input focus-visible:border-ring"
              />
            </DetailsRow>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            <div className="surface-body flex items-center justify-between gap-3 py-2.5">
              <span className="shrink-0 text-muted-foreground">Tags</span>
              {(company.tags?.length ?? 0) > 0 ? (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {company.tags!.map((tag) => (
                    <span key={tag} className="surface-body rounded-full bg-muted px-2.5 py-1 font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground/60">Not set</span>
              )}
            </div>
            <DetailRow label="Domain" value={company.website} editable={false} />
            <DetailRow label="Description" value={company.description} editable={false} />
            <DetailRow label="Industry" value={company.industry} editable={false} />
            <DetailRow label="Location" value={company.location} editable={false} />
            <DetailRow
              label="Company Size"
              value={company.companySize ? `${company.companySize} employees` : undefined}
              editable={false}
            />
            <DetailRow label="Source" value={company.source} editable={false} />
            <DetailRow label="LinkedIn" value={company.linkedIn} editable={false} />
          </div>
        )}
    </div>
  )
}
