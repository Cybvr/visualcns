"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronDown, Copy, ImagePlus, Plus, Share2, X } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { uploadToCloudinary } from "@/components/image-dropzone"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { INDUSTRIES } from "@/lib/industries"
import { COMPANY_SIZES } from "@/lib/organizations"
import { cn } from "@/lib/utils"

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

export interface CompanySidebarAdmin {
  onSave: (patch: CompanyDetailsPatch) => Promise<void>
  onAddPerson: () => void
  onNewProject: () => void
  onShare: () => void
  /** Pick a primary contact from the full contacts list; attaches them to this company if needed. */
  onSelectPrimaryContact?: (contactId: string) => void | Promise<void>
  /** The single client-portal action, rendered between New and Share. */
  extraAction?: ReactNode
}

function initialsFor(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  )
}

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
 * The company profile panel on the left of the company detail page: logo,
 * name, tags, quick actions, the primary contact, and the editable Details
 * fields. Read-only whenever `admin` is omitted.
 */
export function CompanySidebar({
  company,
  people,
  contacts,
  admin,
}: {
  company: CompanySidebarCompany
  people: CompanySidebarPerson[]
  /** All contacts to choose a primary contact from; defaults to this company's people. */
  contacts?: CompanySidebarPerson[]
  admin?: CompanySidebarAdmin
}) {
  // Collapsed by default on mobile so the tabs below don't sit under a wall of
  // fields; always shown on desktop, where the sidebar has its own column.
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [addingTag, setAddingTag] = useState(false)
  const [tagDraft, setTagDraft] = useState("")
  const [nameDraft, setNameDraft] = useState(company.name)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [contactQuery, setContactQuery] = useState("")
  const logoInputRef = useRef<HTMLInputElement>(null)

  const pickList = contacts ?? people
  const primaryContact =
    pickList.find((person) => person.id === company.primaryContactId) ?? people[0]
  const filteredContacts = contactQuery.trim()
    ? pickList.filter((person) =>
        `${person.name} ${person.subtitle ?? ""}`.toLowerCase().includes(contactQuery.trim().toLowerCase()),
      )
    : pickList

  useEffect(() => {
    setNameDraft(company.name)
  }, [company.name])

  async function commitTags(next: string[]) {
    if (!admin) return
    try {
      await admin.onSave({ tags: next })
    } catch (error) {
      console.error("Error saving tags:", error)
    }
  }

  /** Auto-save a single Details field, skipping the write when it's unchanged. */
  async function commitField(
    field: "name" | "website" | "description" | "industry" | "location" | "companySize" | "source" | "linkedIn",
    value: string,
  ) {
    if (!admin) return
    const next = value.trim()
    if ((company[field] ?? "") === next) return
    try {
      await admin.onSave({ [field]: next })
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

  function copyEmail(email: string) {
    void navigator.clipboard.writeText(email)
    toast.success("Email copied to clipboard")
  }

  async function handleLogoChange(file: File) {
    if (!admin) return
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.")
      return
    }

    setUploadingLogo(true)
    try {
      const logoUrl = await uploadToCloudinary(file)
      await admin.onSave({ logoUrl })
      toast.success("Company avatar updated")
    } catch (error) {
      console.error("Error uploading company avatar:", error)
      toast.error("The company avatar could not be uploaded.")
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <aside className="min-w-0 print:hidden lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-start gap-3">
          {admin ? (
            <>
              <button
                type="button"
                className="group relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                aria-label="Change company avatar"
                title="Change company avatar"
              >
                {company.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
                    {company.name.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-foreground/55 text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <ImagePlus className="size-5" aria-hidden="true" />
                </span>
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleLogoChange(file)
                  event.target.value = ""
                }}
              />
            </>
          ) : (
            <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
              {company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
                  {company.name.trim().charAt(0).toUpperCase() || "?"}
                </span>
              )}
            </div>
          )}
          <div className="min-w-0 flex-1 pt-1">
            {admin ? (
              <Input
                aria-label="Company name"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                onBlur={() => void commitField("name", nameDraft)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    event.currentTarget.blur()
                  }
                  if (event.key === "Escape") {
                    setNameDraft(company.name)
                    event.currentTarget.blur()
                  }
                }}
                className="surface-record-title h-8 border-transparent bg-transparent px-1.5 shadow-none hover:border-input focus-visible:border-ring"
              />
            ) : (
              <h1 className="surface-record-title truncate">{company.name}</h1>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {(company.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="surface-body group/tag inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium"
                >
                  {tag}
                  {admin && (
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove ${tag} tag`}
                      className="text-muted-foreground opacity-0 outline-none transition-opacity hover:text-foreground group-hover/tag:opacity-100 focus-visible:opacity-100"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  )}
                </span>
              ))}
              {admin &&
                (addingTag ? (
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
                ))}
            </div>
          </div>
        </div>

        {admin && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" className="rounded-full" aria-label="New" title="New">
                  <Plus className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => admin.onNewProject()}>New project</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => admin.onAddPerson()}>New person</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {admin.extraAction}
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full"
              onClick={() => admin.onShare()}
              aria-label="Share"
              title="Share"
            >
              <Share2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        )}

        <Separator className="my-5" />

        <div>
          <div className="flex items-center justify-between">
            <h3 className="surface-section-label">Primary Contact</h3>
            {admin && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Set primary contact"
                    className="flex size-6 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-1">
                  {pickList.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => admin.onAddPerson()}
                      className="surface-body w-full rounded-sm px-2 py-1.5 text-left outline-none hover:bg-accent"
                    >
                      Add a contact first
                    </button>
                  ) : (
                    <>
                      <Input
                        autoFocus
                        value={contactQuery}
                        onChange={(event) => setContactQuery(event.target.value)}
                        placeholder="Search contacts"
                        className="surface-body mb-1 h-8"
                      />
                      <div className="max-h-64 overflow-y-auto">
                        {filteredContacts.length === 0 ? (
                          <p className="surface-body px-2 py-1.5">No matching contacts.</p>
                        ) : (
                          [...filteredContacts].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })).map((person) => (
                            <button
                              key={person.id}
                              type="button"
                              onClick={() =>
                                void (admin.onSelectPrimaryContact
                                  ? admin.onSelectPrimaryContact(person.id)
                                  : admin.onSave({ primaryContactId: person.id }))
                              }
                              className={cn(
                                "surface-body flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left outline-none hover:bg-accent",
                                person.id === primaryContact?.id && "font-medium",
                              )}
                            >
                              <span className="w-full truncate">{person.name}</span>
                              {person.subtitle && (
                                <span className="surface-body w-full truncate text-muted-foreground">{person.subtitle}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </PopoverContent>
              </Popover>
            )}
          </div>

          {primaryContact ? (
            <div className="mt-3 flex items-center gap-3">
              <Avatar size="lg">
                {primaryContact.photoUrl && <AvatarImage src={primaryContact.photoUrl} alt="" />}
                <AvatarFallback>{initialsFor(primaryContact.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="surface-body truncate font-semibold text-foreground">{primaryContact.name}</p>
                {primaryContact.subtitle && (
                  <div className="flex items-center gap-1.5">
                    <p className="surface-body truncate text-muted-foreground">{primaryContact.subtitle}</p>
                    <button
                      type="button"
                      onClick={() => copyEmail(primaryContact.subtitle!)}
                      aria-label="Copy email"
                      className="shrink-0 text-muted-foreground outline-none transition-colors hover:text-foreground"
                    >
                      <Copy className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="surface-body mt-3 text-muted-foreground">No primary contact yet.</p>
          )}
        </div>

        <Separator className="my-5" />

        <div>
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            aria-expanded={detailsOpen}
            className="flex w-full items-center justify-between outline-none lg:pointer-events-none"
          >
            <h3 className="surface-section-label">Details</h3>
            <ChevronDown
              className={cn("size-4 text-muted-foreground transition-transform lg:hidden", detailsOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>

          {admin ? (
            <div className={cn("mt-3 divide-y divide-border/60 lg:block", detailsOpen ? "block" : "hidden")}>
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
            <div className={cn("mt-3 divide-y divide-border/60 lg:block", detailsOpen ? "block" : "hidden")}>
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
      </div>
    </aside>
  )
}
