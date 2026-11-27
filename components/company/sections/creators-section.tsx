"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Contact } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { SectionAddButton } from "@/components/company/section-add-button"
import { LeadFavicon, useMarketingLeads } from "@/components/company/sections/marketing-flow"
import { AddCreatorRow, CreatorDialog, CreatorThumbnail } from "@/components/dashboard/campaign-people"
import { CollectionView } from "@/components/dashboard/collection-view"
import type { ItemActions } from "@/components/dashboard/item-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  compactCount,
  deleteCampaignPerson,
  formatPay,
  onRoster,
  payCurrency,
  personStatusLabel,
  profileUrl,
  updateCampaignPerson,
  watchCompanyCampaignPeople,
  type CampaignPerson,
} from "@/lib/campaign-people"
import { hostOf, type Customer, type Person } from "@/lib/marketing-flow"
import { isProjectArchived, type Project } from "@/lib/projects"

type Lead =
  | { kind: "company"; id: string; company: Customer; contact?: Person; group: string }
  | { kind: "campaign"; id: string; person: CampaignPerson; group: string }

const EVERYONE = "__all"
const MARKETING = "__marketing"

/** Leads: the Marketing run's companies and every campaign's people, in one list. */
export function LeadsPage() {
  const { company, projects, admin } = useCompanyPage()
  const { appUser } = useAuth()
  const { flow, act } = useMarketingLeads()
  const [people, setPeople] = useState<CampaignPerson[]>([])
  const [loaded, setLoaded] = useState(false)
  const [group, setGroup] = useState(EVERYONE)
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    setLoaded(false)
    return watchCompanyCampaignPeople(
      company.id,
      (rows) => { setPeople(rows); setLoaded(true) },
      () => { setPeople([]); setLoaded(true) },
    )
  }, [company.id])

  // Live campaigns first; archived ones only if they have people.
  const campaigns = useMemo(() => [...projects]
    .filter((project) => !isProjectArchived(project) || people.some((person) => person.projectId === project.id))
    .sort((a, b) => Number(isProjectArchived(a)) - Number(isProjectArchived(b))), [projects, people])

  const canEdit = Boolean(admin)
  const canReview = !admin && appUser?.companyId === company.id
  const audiences = flow?.audiences ?? []
  const audienceName = (id: string) => audiences.find((item) => item.id === id)?.name ?? ""
  const campaignName = (id: string) => campaigns.find((project) => project.id === id)?.title || "Campaign"

  const leads: Lead[] = [
    ...(flow?.customers ?? []).map((item): Lead => ({ kind: "company", id: `m-${item.id}`, company: item, contact: flow?.people?.find((person) => person.customerId === item.id), group: MARKETING })),
    ...people
      .filter((person) => campaigns.some((project) => project.id === person.projectId))
      .sort((a, b) => Number(onRoster(b)) - Number(onRoster(a)) || (b.overlap ?? 0) - (a.overlap ?? 0))
      .map((person): Lead => ({ kind: "campaign", id: `c-${person.id}`, person, group: person.projectId })),
  ]
  const groups = [
    ...(leads.some((lead) => lead.group === MARKETING) ? [{ value: MARKETING, label: "Marketing" }] : []),
    ...campaigns.filter((project) => leads.some((lead) => lead.group === project.id)).map((project) => ({ value: project.id, label: project.title || "Campaign" })),
  ]
  const activeGroup = groups.some((item) => item.value === group) ? group : EVERYONE
  const shown = activeGroup === EVERYONE ? leads : leads.filter((lead) => lead.group === activeGroup)
  const open = people.find((person) => person.id === openId) ?? null

  if (!loaded) {
    return (
      <div className="mt-5 space-y-3">
        <Skeleton className="h-11 w-full rounded-full" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  const pay = (person: CampaignPerson) => person.source === "ngai" && !person.pay ? "Pay unknown" : person.pay ? formatPay(person.pay, payCurrency(person)) : "Free"
  const openUrl = (url: string) => window.open(url, "_blank", "noopener,noreferrer")

  function actionsFor(lead: Lead): ItemActions {
    if (lead.kind === "company") {
      const { company: item, contact } = lead
      return {
        noun: "lead",
        name: item.name,
        onOpen: item.url ? () => openUrl(item.url) : undefined,
        extra: contact && (
          <>
            {contact.email && <DropdownMenuItem asChild><a href={`mailto:${encodeURIComponent(contact.email)}`}>Email {contact.name}</a></DropdownMenuItem>}
            {contact.email && <DropdownMenuItem onSelect={() => void navigator.clipboard?.writeText(contact.email!).then(() => toast.success("Copied."))}>Copy email</DropdownMenuItem>}
            {!contact.email && <DropdownMenuItem onSelect={() => void act({ action: "find-emails", ids: [contact.id] })}>Find email</DropdownMenuItem>}
            {contact.linkedin && <DropdownMenuItem asChild><a href={contact.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></DropdownMenuItem>}
          </>
        ),
        onDelete: () => act({ action: "remove", step: "customers", id: item.id }),
        deleteMessage: "They'll be removed from your leads.",
      }
    }
    const { person } = lead
    const href = profileUrl(person)
    const canAdd = !onRoster(person) && (canEdit || canReview)
    return {
      noun: "lead",
      name: person.handle,
      onOpen: href ? () => openUrl(href) : undefined,
      extra: (canEdit || canAdd) && (
        <>
          {canEdit && <DropdownMenuItem onSelect={() => setOpenId(person.id)}>Edit</DropdownMenuItem>}
          {canAdd && <DropdownMenuItem onSelect={() => void updateCampaignPerson(person.id, { onRoster: true }).catch(() => toast.error("That didn't save."))}>Add to campaign</DropdownMenuItem>}
        </>
      ),
      onDelete: canEdit ? () => deleteCampaignPerson(person.id).catch(() => { toast.error("Couldn't delete them.") }) : undefined,
      deleteMessage: "They'll be removed from this campaign.",
    }
  }

  function openLead(lead: Lead) {
    if (lead.kind === "company") return lead.company.url ? openUrl(lead.company.url) : undefined
    if (canEdit) return setOpenId(lead.person.id)
    const href = profileUrl(lead.person)
    if (href) openUrl(href)
  }

  const subtitle = (lead: Lead) => lead.kind === "company"
    ? (lead.contact ? [lead.contact.name, lead.contact.title, lead.contact.email].filter(Boolean).join(" · ") : hostOf(lead.company.url))
    : lead.person.opening || [lead.person.app, lead.person.category, `${compactCount(lead.person.followers)} followers`].filter(Boolean).join(" · ")
  const tag = (lead: Lead) => lead.kind === "company" ? audienceName(lead.company.audienceId) || "Marketing" : campaignName(lead.person.projectId)
  const title = (lead: Lead) => lead.kind === "company" ? lead.company.name : lead.person.handle
  const icon = (lead: Lead, large = false) => lead.kind === "company" ? <LeadFavicon url={lead.company.url} name={lead.company.name} large={large} /> : <CreatorThumbnail person={lead.person} compact={!large} />

  return (
    <div className="mt-5">
      <CollectionView
        className=""
        items={shown}
        getKey={(lead) => lead.id}
        searchFields={(lead) => [title(lead), subtitle(lead), tag(lead)]}
        searchPlaceholder="Search leads"
        viewKey="leads"
        initialView="list"
        filters={groups.length > 1 && (
          <Select value={activeGroup} onValueChange={setGroup}>
            <SelectTrigger size="sm" aria-label="Group" className="w-auto min-w-32 max-w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={EVERYONE}>Everyone</SelectItem>
              {groups.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        actions={<SectionAddButton label="New lead" onClick={() => setAdding(true)} />}
        empty={{ icon: Contact, title: "No leads yet", action: <SectionAddButton label="New lead" onClick={() => setAdding(true)} /> }}
        card={(lead) => ({
          icon: icon(lead),
          title: title(lead),
          subtitle: subtitle(lead),
          preview: lead.kind === "campaign" ? <CreatorThumbnail person={lead.person} /> : undefined,
          placeholder: lead.kind === "company" ? icon(lead, true) : undefined,
          onClick: () => openLead(lead),
          ariaLabel: `Open ${title(lead)}`,
          menuLabel: `Options for ${title(lead)}`,
        })}
        itemActions={actionsFor}
        row={(lead) => ({
          subtitle: subtitle(lead),
          trailing: (
            <span className="flex items-center gap-2">
              {lead.kind === "campaign" && <Badge variant="secondary" className="rounded-full">{personStatusLabel(lead.person)}</Badge>}
              {lead.kind === "campaign" && <span className="whitespace-nowrap max-sm:hidden">{pay(lead.person)}</span>}
              <Badge variant="outline" className="max-w-40 truncate rounded-full max-sm:hidden">{tag(lead)}</Badge>
            </span>
          ),
        })}
      />
      <NewLeadDialog
        open={adding}
        onClose={() => setAdding(false)}
        campaigns={canEdit ? campaigns.filter((project) => !isProjectArchived(project)) : []}
        audiences={audiences.map((item) => ({ value: item.id, label: item.name }))}
        companyId={company.id}
        addCompany={(values) => act({ action: "add", step: "customers", ...values })}
      />
      {canEdit && <CreatorDialog person={open} onClose={() => setOpenId(null)} />}
    </div>
  )
}

/** + New: a company for Marketing, or a person for one of the campaigns. */
function NewLeadDialog({ open, onClose, campaigns, audiences, companyId, addCompany }: {
  open: boolean
  onClose: () => void
  campaigns: Project[]
  audiences: { value: string; label: string }[]
  companyId: string
  addCompany: (values: Record<string, string>) => Promise<void>
}) {
  const [where, setWhere] = useState(MARKETING)
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [audienceId, setAudienceId] = useState("")
  const [busy, setBusy] = useState(false)
  const campaign = campaigns.find((project) => project.id === where)

  function close() {
    setName(""); setUrl(""); setAudienceId("")
    onClose()
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    await addCompany({ name, url, audienceId })
    setBusy(false)
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription className="sr-only">New lead</DialogDescription>
        </DialogHeader>
        {campaigns.length > 0 && (
          <Select value={where} onValueChange={setWhere}>
            <SelectTrigger aria-label="Add to" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={MARKETING}>Marketing</SelectItem>
              {campaigns.map((project) => <SelectItem key={project.id} value={project.id}>{project.title || "Campaign"}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {campaign ? (
          <AddCreatorRow scope={{ agencyId: campaign.agencyId, companyId: campaign.companyId || companyId, projectId: campaign.id }} onDone={close} onCancel={close} />
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Company name" aria-label="Company name" maxLength={80} />
            <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Website" aria-label="Website" maxLength={300} />
            {audiences.length > 0 && (
              <Select value={audienceId || EVERYONE} onValueChange={(value) => setAudienceId(value === EVERYONE ? "" : value)}>
                <SelectTrigger aria-label="Audience" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={EVERYONE}>No audience</SelectItem>
                  {audiences.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
              <Button type="submit" disabled={busy || !name.trim()}>{busy ? "Adding..." : "Add"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
