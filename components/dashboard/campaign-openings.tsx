"use client"

import { ChevronDown, Link2, Trash2 } from "lucide-react"
import { useId, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { CreatorsJobFields, DateField, Pick } from "@/components/dashboard/creator-brief"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { BRIEF_CURRENCIES, BRIEF_PAYMENT_METHODS, campaignSharePath, CREATORS_ROLE, newOpening, type CampaignOpening, type CreatorBrief } from "@/lib/campaign-brief"
import { siteUrl } from "@/lib/email-composer"
import { cn } from "@/lib/utils"

/**
 * The campaign's jobs: openings like a graphic designer or a strategist, each with
 * what they hand over, dates, pay and questions, and the Creators job for people
 * who post. Each has its own link. Saved with the About campaign tab's one Save button.
 */
export function CampaignOpeningsForm({
  projectId,
  value,
  savedIds,
  brief,
  creatorsSaved,
  onChange,
  onBriefChange,
}: {
  projectId: string
  value: CampaignOpening[]
  /** Openings already saved, whose links work. */
  savedIds: string[]
  /** The creator brief being edited; its hireCreators decides whether the Creators job is there. */
  brief: CreatorBrief
  /** The Creators job is saved, so its link works. */
  creatorsSaved: boolean
  onChange: (openings: CampaignOpening[]) => void
  onBriefChange: (patch: Partial<CreatorBrief>) => void
}) {
  const update = (id: string, patch: Partial<CampaignOpening>) => onChange(value.map((opening) => (opening.id === id ? { ...opening, ...patch } : opening)))

  async function copyLink(id: string) {
    try {
      await navigator.clipboard.writeText(siteUrl(campaignSharePath(projectId, id)))
      toast.success("Link copied")
    } catch {
      toast.error("Couldn't copy the link.")
    }
  }

  return (
    <div className="space-y-4">
      {brief.hireCreators && (
        <JobCard title="Creators" defaultOpen={!creatorsSaved} linkReady={creatorsSaved} onCopyLink={() => void copyLink(CREATORS_ROLE)} onRemove={() => onBriefChange({ hireCreators: false })}>
          <CreatorsJobFields value={brief} onChange={onBriefChange} />
        </JobCard>
      )}
      {value.map((opening, index) => {
        const id = `opening-${opening.id}`
        const saved = savedIds.includes(opening.id)
        return (
          <JobCard
            key={opening.id}
            title={opening.title || `Job ${index + 1}`}
            defaultOpen={!saved}
            linkReady={saved}
            onCopyLink={() => void copyLink(opening.id)}
            onRemove={() => onChange(value.filter((item) => item.id !== opening.id))}
          >
            <div className="space-y-2">
              <Label htmlFor={`${id}-title`}>Job title</Label>
              <Input id={`${id}-title`} value={opening.title} maxLength={80} placeholder="e.g. Graphic designer" onChange={(event) => update(opening.id, { title: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-deliverables`}>What we need</Label>
              <Textarea id={`${id}-deliverables`} rows={3} maxLength={1000} placeholder={"One per line, e.g.\n12 static ads, 1080×1350"} value={opening.deliverables} onChange={(event) => update(opening.id, { deliverables: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <RichTextEditor value={opening.details} onChange={(details) => update(opening.id, { details })} ariaLabel="Job details" compact className="min-h-40 text-foreground" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField label="Apply by" value={opening.registerBy} onChange={(registerBy) => update(opening.id, { registerBy })} />
              <DateField label="Due" value={opening.dueBy} onChange={(dueBy) => update(opening.id, { dueBy })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch id={`${id}-fixed`} checked={opening.fixedOffer} onCheckedChange={(fixedOffer) => update(opening.id, { fixedOffer })} />
                <Label htmlFor={`${id}-fixed`}>Fixed pay</Label>
              </div>
              {opening.fixedOffer ? (
                <div className="flex gap-2">
                  <Select value={opening.currency} onValueChange={(next) => update(opening.id, { currency: next })}>
                    <SelectTrigger className="w-28" aria-label="Currency"><SelectValue /></SelectTrigger>
                    <SelectContent>{BRIEF_CURRENCIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={opening.offerAmount || ""}
                    onChange={(event) => update(opening.id, { offerAmount: Math.max(0, Math.round(Number(event.target.value) || 0)) })}
                    placeholder="Amount"
                    aria-label="Amount"
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Applicants send their rate.</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Pick label="Payment method" value={opening.paymentMethod} options={BRIEF_PAYMENT_METHODS} onChange={(paymentMethod) => update(opening.id, { paymentMethod })} />
              <div className="flex items-center gap-2 sm:pt-7">
                <Switch id={`${id}-show-pay`} checked={opening.showOffer} onCheckedChange={(showOffer) => update(opening.id, { showOffer })} />
                <Label htmlFor={`${id}-show-pay`}>Show the pay</Label>
              </div>
            </div>
            {opening.questions.map((question, at) => (
              <div key={at} className="space-y-2">
                <Label htmlFor={`${id}-question-${at}`}>Question {at + 1}</Label>
                <Input
                  id={`${id}-question-${at}`}
                  value={question}
                  maxLength={200}
                  onChange={(event) => update(opening.id, { questions: opening.questions.map((item, i) => (i === at ? event.target.value : item)) })}
                />
              </div>
            ))}
          </JobCard>
        )
      })}
      <Button type="button" variant="outline" onClick={() => onChange([...value, newOpening(brief.currency)])}>Add job</Button>
    </div>
  )
}

/** One job, folded to its title row until opened, with its link and remove buttons always in reach. New jobs start open. */
function JobCard({ title, defaultOpen, linkReady, onCopyLink, onRemove, children }: {
  title: string
  defaultOpen: boolean
  linkReady: boolean
  onCopyLink: () => void
  onRemove: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section aria-label={title} className="rounded-xs border border-border">
      <div className="flex items-center gap-2 p-2 pl-4">
        <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls={id} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{title}</span>
        </button>
        <Button type="button" variant="outline" size="icon" disabled={!linkReady} onClick={onCopyLink} aria-label="Copy job link" title={linkReady ? "Copy job link" : "Save to get its link"}>
          <Link2 className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${title}`} title="Remove">
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div id={id} hidden={!open} className="space-y-4 border-t border-border p-4">{children}</div>
    </section>
  )
}
