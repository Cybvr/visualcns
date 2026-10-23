"use client"

import { Copy, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { DateField, Pick } from "@/components/dashboard/creator-brief"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { BRIEF_CURRENCIES, BRIEF_PAYMENT_METHODS, campaignSharePath, newOpening, type CampaignOpening } from "@/lib/campaign-brief"
import { siteUrl } from "@/lib/email-composer"

/**
 * The campaign's openings, like a graphic designer or a strategist: each with
 * what they hand over, dates, pay and questions, and its own link to share.
 * Saved with the About campaign tab's one Save button.
 */
export function CampaignOpeningsForm({
  projectId,
  value,
  savedIds,
  currency,
  onChange,
}: {
  projectId: string
  value: CampaignOpening[]
  /** Openings already saved, whose links work. */
  savedIds: string[]
  currency: string
  onChange: (openings: CampaignOpening[]) => void
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
      <p className="text-sm text-muted-foreground">Jobs on this campaign besides posting. Each gets its own link: people see the campaign, then only their job.</p>
      {value.map((opening, index) => {
        const id = `opening-${opening.id}`
        const saved = savedIds.includes(opening.id)
        return (
          <section key={opening.id} aria-label={opening.title || `Opening ${index + 1}`} className="space-y-4 rounded-xs border border-border p-4">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor={`${id}-title`}>Role</Label>
                <Input id={`${id}-title`} value={opening.title} maxLength={80} placeholder="e.g. Graphic designer" onChange={(event) => update(opening.id, { title: event.target.value })} />
              </div>
              <Button type="button" variant="outline" size="icon" disabled={!saved} onClick={() => void copyLink(opening.id)} aria-label="Copy link" title={saved ? "Copy link" : "Save to get its link"}>
                <Copy className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => onChange(value.filter((item) => item.id !== opening.id))} aria-label={`Remove ${opening.title || "opening"}`} title="Remove">
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-deliverables`}>What we need</Label>
              <Textarea id={`${id}-deliverables`} rows={3} maxLength={1000} placeholder={"One per line, e.g.\n12 static ads, 1080×1350"} value={opening.deliverables} onChange={(event) => update(opening.id, { deliverables: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-details`}>Details</Label>
              <Textarea id={`${id}-details`} rows={3} maxLength={2000} value={opening.details} onChange={(event) => update(opening.id, { details: event.target.value })} />
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
                <Label htmlFor={`${id}-show-pay`}>Show pay on the shared page</Label>
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
          </section>
        )
      })}
      <Button type="button" variant="outline" onClick={() => onChange([...value, newOpening(currency)])}>Add opening</Button>
    </div>
  )
}
