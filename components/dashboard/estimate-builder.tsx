"use client"

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ArrowLeft, GripVertical, Loader2, Plus, Trash2 } from "lucide-react"

import { DangerZone } from "@/components/dashboard/danger-zone"
import { RichTextEditor } from "@/components/dashboard/rich-text-editor"
import { ShareLinkField } from "@/components/dashboard/share-link-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  createEstimate,
  deleteEstimate,
  estimateStatusMeta,
  formatMoney,
  nextEstimateNumber,
  updateEstimate,
  type Estimate,
  type EstimateLineItem,
  type EstimateStatus,
} from "@/lib/billing"
import { getProjects, type Project } from "@/lib/projects"
import { getUsers, type AppUser } from "@/lib/users"

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "NGN", symbol: "₦" },
  { code: "GBP", symbol: "£" },
] as const

const DEFAULT_TERMS = "Work begins after acceptance.\nA deposit may be required before work starts.\nPrices exclude taxes and third-party fees unless stated otherwise."
const DEFAULT_DISCLAIMER = "This estimate covers the services described above and is not an invoice. Pricing may be adjusted if the scope changes or new information materially affects delivery."

type EditableLine = {
  id: string
  description: string
  details: string
  billing: string
  amount: string
  optional: boolean
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function inFourteenDays() {
  const date = new Date()
  date.setDate(date.getDate() + 14)
  return date.toISOString().slice(0, 10)
}

function makeLine(): EditableLine {
  return {
    id: crypto.randomUUID(),
    description: "",
    details: "",
    billing: "One-time",
    amount: "",
    optional: false,
  }
}

function toEditableLine(line: EstimateLineItem): EditableLine {
  return {
    id: line.id,
    description: line.description,
    details: line.details ?? "",
    billing: line.billing ?? "One-time",
    amount: (line.amount / 100).toFixed(2),
    optional: Boolean(line.optional),
  }
}

function moneyToMinorUnits(value: string) {
  const amount = Number.parseFloat(value)
  return Math.round((Number.isFinite(amount) ? amount : 0) * 100)
}

function SortableEstimateLine({
  id,
  index,
  disabled,
  children,
}: {
  id: string
  index: number
  disabled: boolean
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative rounded-[12px] border border-border bg-card p-4 ${isDragging ? "z-10 shadow-lg" : ""}`}
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={`Move item ${index + 1}`}
        title="Drag to reorder"
        className="absolute right-3 top-3 inline-flex size-8 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing disabled:cursor-default disabled:opacity-30"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <div className="grid gap-3 pr-10 lg:grid-cols-[1.2fr_1.5fr_0.7fr_0.7fr_auto] lg:items-start lg:pr-10">
        {children}
      </div>
    </div>
  )
}

export function EstimateBuilder({ estimate, initialCompanyId }: { estimate?: Estimate | null; initialCompanyId?: string }) {
  const router = useRouter()
  const isEdit = Boolean(estimate)

  const [estimateNumber, setEstimateNumber] = useState(estimate?.estimateNumber ?? "")
  const [title, setTitle] = useState(estimate?.title ?? "")
  const [companyId, setCompanyId] = useState(estimate?.companyId ?? initialCompanyId ?? "")
  const [projectId, setProjectId] = useState(estimate?.projectId ?? "")
  const [status, setStatus] = useState<EstimateStatus>(estimate?.status ?? "draft")
  const [currency, setCurrency] = useState(estimate?.currency || "NGN")
  const [issuedOn, setIssuedOn] = useState(estimate?.issuedOn || today())
  const [validUntil, setValidUntil] = useState(estimate?.validUntil || inFourteenDays())
  const [preparedForName, setPreparedForName] = useState(estimate?.preparedFor?.name ?? estimate?.client ?? "")
  const [preparedForEmail, setPreparedForEmail] = useState(estimate?.preparedFor?.email ?? "")
  const [preparedForAddress, setPreparedForAddress] = useState(estimate?.preparedFor?.address ?? "")
  const [scope, setScope] = useState(estimate?.scope ?? "")
  const [lines, setLines] = useState<EditableLine[]>(
    estimate?.lineItems?.length ? estimate.lineItems.map(toEditableLine) : [makeLine()],
  )
  const [terms, setTerms] = useState(estimate?.terms ?? DEFAULT_TERMS)
  const [paymentDetails, setPaymentDetails] = useState(estimate?.paymentDetails ?? "")
  const [notes, setNotes] = useState(estimate?.notes ?? DEFAULT_DISCLAIMER)
  const [shareEnabled, setShareEnabled] = useState(estimate?.shareEnabled ?? false)

  const [clients, setClients] = useState<AppUser[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lineSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (estimateNumber) return
    let active = true
    nextEstimateNumber().then((number) => active && setEstimateNumber(number))
    return () => {
      active = false
    }
  }, [estimateNumber])

  useEffect(() => {
    let active = true
    Promise.all([getUsers(), getProjects()])
      .then(([userList, projectList]) => {
        if (!active) return
        // Several people can share a workspace, so this is narrowed to one
        // entry per companyId - otherwise the same company lists twice (and
        // the duplicate companyId shows up as a duplicate React key).
        const seenWorkspaces = new Set<string>()
        setClients(
          userList.filter((user) => {
            if (!user.companyId || seenWorkspaces.has(user.companyId)) return false
            seenWorkspaces.add(user.companyId)
            return true
          }),
        )
        setProjects(projectList)
      })
      .catch(() => active && setError("Couldn’t load clients and projects."))
      .finally(() => active && setOptionsLoading(false))
    return () => {
      active = false
    }
  }, [])

  const requiredTotal = useMemo(
    () => lines.reduce((sum, line) => sum + (line.optional ? 0 : moneyToMinorUnits(line.amount)), 0),
    [lines],
  )
  const optionalTotal = useMemo(
    () => lines.reduce((sum, line) => sum + (line.optional ? moneyToMinorUnits(line.amount) : 0), 0),
    [lines],
  )

  function selectClient(value: string) {
    setCompanyId(value)
    const client = clients.find((entry) => entry.companyId === value)
    if (client && !preparedForName.trim()) {
      setPreparedForName(client.company || client.displayName || "")
      setPreparedForEmail(client.email || "")
    }
    if (projectId && projects.find((project) => project.id === projectId)?.companyId !== value) setProjectId("")
  }

  function updateLine(id: string, patch: Partial<EditableLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  function handleLineDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setLines((current) => {
      const from = current.findIndex((line) => line.id === active.id)
      const to = current.findIndex((line) => line.id === over.id)
      return from === -1 || to === -1 ? current : arrayMove(current, from, to)
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if (!companyId) return setError("Choose which client this estimate is for.")
    if (!title.trim()) return setError("Give this estimate a title.")
    if (!preparedForName.trim()) return setError("Enter who this estimate is prepared for.")

    const usefulLines = lines.filter((line) => line.description.trim() && moneyToMinorUnits(line.amount) > 0)
    if (usefulLines.length === 0) return setError("Add at least one priced item.")

    setSaving(true)
    setError(null)
    try {
      const client = clients.find((entry) => entry.companyId === companyId)
      const project = projects.find((entry) => entry.id === projectId)
      const lineItems: EstimateLineItem[] = usefulLines.map((line) => ({
        id: line.id,
        description: line.description.trim(),
        details: line.details.trim(),
        billing: line.billing.trim() || "One-time",
        optional: line.optional,
        amount: moneyToMinorUnits(line.amount),
      }))
      const payload = {
        estimateNumber: estimateNumber.trim() || (await nextEstimateNumber()),
        title: title.trim(),
        companyId,
        client: client?.company || client?.displayName || preparedForName.trim(),
        projectId: projectId || "",
        project: project?.title || "",
        status,
        preparedFor: {
          name: preparedForName.trim(),
          email: preparedForEmail.trim(),
          address: preparedForAddress.trim(),
        },
        scope,
        lineItems,
        amount: lineItems.reduce((sum, line) => sum + (line.optional ? 0 : line.amount), 0),
        currency,
        issuedOn,
        validUntil,
        terms: terms.trim(),
        paymentDetails: paymentDetails.trim(),
        notes: notes.trim(),
        shareEnabled,
      }

      const id = estimate ? estimate.id : await createEstimate(payload)
      if (estimate) await updateEstimate(estimate.id, payload)
      router.push(`/dashboard/estimates/${id}`)
    } catch (saveError) {
      console.error("Error saving estimate:", saveError)
      setError("Couldn’t save this estimate. Try again.")
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!estimate) return
    await deleteEstimate(estimate.id)
    router.push("/dashboard/estimates")
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/estimates"
          aria-label="Back to estimates"
          className="-ml-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-[-0.01em]">{estimateNumber || "New estimate"}</h1>
        <Button type="submit" size="sm" disabled={saving} className="shrink-0">
          {saving && <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />}
          {isEdit ? "Save" : "Create"}
        </Button>
      </div>

      <ShareLinkField
        enabled={shareEnabled}
        onEnabledChange={setShareEnabled}
        path={estimate ? `/share/estimates/${estimate.id}` : undefined}
      />

      <div className="space-y-8 sm:rounded-[14px] sm:border sm:border-border sm:bg-card sm:p-6">
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <div>
              <Label htmlFor="estimate-title">Estimate title</Label>
              <Input id="estimate-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Website and email restoration" className="mt-1" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="estimate-number">Estimate number</Label>
                <Input id="estimate-number" value={estimateNumber} onChange={(event) => setEstimateNumber(event.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="estimate-status">Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as EstimateStatus)}>
                  <SelectTrigger id="estimate-status" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(estimateStatusMeta).map(([value, meta]) => <SelectItem key={value} value={value}>{meta.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="estimate-client">Client</Label>
                <Select value={companyId} onValueChange={selectClient}>
                  <SelectTrigger id="estimate-client" className="mt-1"><SelectValue placeholder={optionsLoading ? "Loading…" : "Choose a client"} /></SelectTrigger>
                  <SelectContent>
                    {[...clients].sort((a, b) => (a.company || a.displayName || a.email || "").localeCompare(b.company || b.displayName || b.email || "", undefined, { sensitivity: "base" })).map((client) => <SelectItem key={client.uid} value={client.companyId as string}>{client.company || client.displayName || client.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Label htmlFor="estimate-project">Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="estimate-project" className="mt-1 w-full min-w-0 overflow-hidden">
                    <SelectValue className="min-w-0 flex-1 truncate" placeholder="Not tied to a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.filter((project) => !companyId || project.companyId === companyId).sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" })).map((project) => <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="estimate-issued">Issue date</Label>
                <Input id="estimate-issued" type="date" value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="estimate-valid">Valid until</Label>
                <Input id="estimate-valid" type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="estimate-currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="estimate-currency" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((entry) => <SelectItem key={entry.code} value={entry.code}>{entry.code} {entry.symbol}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="prepared-for-name">Prepared for</Label>
              <Input id="prepared-for-name" value={preparedForName} onChange={(event) => setPreparedForName(event.target.value)} placeholder="Client or organisation name" className="mt-1" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="prepared-for-email">Email</Label>
                <Input id="prepared-for-email" type="email" value={preparedForEmail} onChange={(event) => setPreparedForEmail(event.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="prepared-for-address">Address or website</Label>
                <Input id="prepared-for-address" value={preparedForAddress} onChange={(event) => setPreparedForAddress(event.target.value)} className="mt-1" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border pt-6">
          <div className="mb-3">
            <h2 className="text-sm font-medium">Scope of work</h2>
            <p className="mt-1 text-xs text-muted-foreground">Describe the work, inclusions, exclusions, and delivery assumptions.</p>
          </div>
          <RichTextEditor value={scope} onChange={setScope} placeholder="Describe the scope of work…" />
        </section>

        <section className="border-t border-border pt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Pricing</h2>
              <p className="mt-1 text-xs text-muted-foreground">Optional items appear separately and do not change the base estimate.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => setLines((current) => [...current, makeLine()])}>
              <Plus className="size-4" aria-hidden="true" /> Add item
            </Button>
          </div>
          <DndContext sensors={lineSensors} collisionDetection={closestCenter} onDragEnd={handleLineDragEnd}>
            <SortableContext items={lines.map((line) => line.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {lines.map((line, index) => (
                  <SortableEstimateLine key={line.id} id={line.id} index={index} disabled={lines.length === 1}>
                    <div>
                      <Label htmlFor={`item-${line.id}`}>Item {index + 1}</Label>
                      <Input id={`item-${line.id}`} value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} placeholder="Email audit" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor={`details-${line.id}`}>Description</Label>
                      <Textarea
                        id={`details-${line.id}`}
                        value={line.details}
                        onChange={(event) => updateLine(line.id, { details: event.target.value })}
                        placeholder="Audit and resolve delivery issues"
                        rows={3}
                        className="mt-1 min-h-20 max-h-40 resize-y overflow-y-auto"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`billing-${line.id}`}>Billing</Label>
                      <Input id={`billing-${line.id}`} value={line.billing} onChange={(event) => updateLine(line.id, { billing: event.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor={`amount-${line.id}`}>Amount</Label>
                      <Input id={`amount-${line.id}`} value={line.amount} onChange={(event) => updateLine(line.id, { amount: event.target.value })} inputMode="decimal" placeholder="0.00" className="mt-1" />
                    </div>
                    <div>
                      <Label className="invisible select-none">Optional</Label>
                      <div className="mt-1 flex h-10 items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch id={`optional-${line.id}`} checked={line.optional} onCheckedChange={(checked) => updateLine(line.id, { optional: checked })} />
                          <Label htmlFor={`optional-${line.id}`} className="text-xs">Optional</Label>
                        </div>
                        <button type="button" onClick={() => setLines((current) => current.filter((entry) => entry.id !== line.id))} disabled={lines.length === 1} aria-label={`Remove item ${index + 1}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40">
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </SortableEstimateLine>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div className="mt-4 ml-auto max-w-sm space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-8 font-semibold"><span>Base estimate</span><span>{formatMoney(requiredTotal, currency)}</span></div>
            {optionalTotal > 0 && <div className="flex justify-between gap-8 text-muted-foreground"><span>Optional additions</span><span>{formatMoney(optionalTotal, currency)}</span></div>}
          </div>
        </section>

        <section className="grid gap-6 border-t border-border pt-6 lg:grid-cols-2">
          <div>
            <Label htmlFor="estimate-terms">Terms</Label>
            <Textarea id="estimate-terms" value={terms} onChange={(event) => setTerms(event.target.value)} rows={7} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="estimate-payment">Payment details</Label>
            <Textarea id="estimate-payment" value={paymentDetails} onChange={(event) => setPaymentDetails(event.target.value)} rows={7} placeholder="Account name, bank, account number, currency…" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="estimate-notes">Estimate disclaimer</Label>
            <Textarea id="estimate-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="mt-1" />
          </div>
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {isEdit && estimate && (
        <DangerZone
          label="estimate"
          confirmTitle="Delete this estimate?"
          confirmDescription={`${estimate.estimateNumber} will be removed for good. This cannot be undone.`}
          onDelete={handleDelete}
        />
      )}
    </form>
  )
}
