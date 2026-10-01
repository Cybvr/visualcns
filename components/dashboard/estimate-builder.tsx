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
import { ArrowLeft, GripVertical, Loader2, Plus, Printer, Share2, X } from "lucide-react"

import {
  DepartmentField,
  EditorActionBar,
  EditorCard,
  EditorDeleteCard,
  EditorField,
  EditorHeader,
  ExpandableTextRow,
} from "@/components/dashboard/billing-editor"
import { EstimateDocument } from "@/components/dashboard/estimate-document"
import { downloadEstimatePdf } from "@/components/dashboard/estimate-pdf"
import { DocumentPreviewFrame } from "@/components/dashboard/document-preview-frame"
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DEFAULT_ESTIMATE_NOTES, DEFAULT_ESTIMATE_TERMS, getBusinessProfile, type BusinessProfile } from "@/lib/business-profile"
import { getOrganizations, organizationRef, type Organization } from "@/lib/organizations"
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
import { estimateEmailContext } from "@/lib/document-emails"
import { buildEmailComposeHref } from "@/lib/email-composer"
import { getProjects, type Project } from "@/lib/projects"
import { getUsers, type AppUser } from "@/lib/users"

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "NGN", symbol: "₦" },
  { code: "GBP", symbol: "£" },
] as const

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
  children: (handle: ReactNode) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })

  const handle = (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Move item ${index + 1}`}
      title="Drag to reorder"
      className="inline-flex size-11 shrink-0 touch-none cursor-grab items-center justify-center rounded-xl border border-border bg-background text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing disabled:cursor-default disabled:opacity-30"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" aria-hidden="true" />
    </button>
  )

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`space-y-2 bg-background py-3 first:pt-0 ${isDragging ? "relative z-10 rounded-xl shadow-lg" : ""}`}
    >
      {children(handle)}
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
  const [terms, setTerms] = useState(estimate?.terms ?? DEFAULT_ESTIMATE_TERMS)
  const [paymentDetails, setPaymentDetails] = useState(estimate?.paymentDetails ?? "")
  const [notes, setNotes] = useState(estimate?.notes ?? DEFAULT_ESTIMATE_NOTES)
  const [shareEnabled, setShareEnabled] = useState(estimate?.shareEnabled ?? false)

  const [clients, setClients] = useState<AppUser[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  // Email links use the company's slug; a company that no longer exists falls back to its id.
  const companyRefFor = (id: string) => { const organization = organizations.find((entry) => entry.id === id); return organization ? organizationRef(organization) : id }
  const [projects, setProjects] = useState<Project[]>([])
  const [issuer, setIssuer] = useState<BusinessProfile | null>(null)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pdfDownloading, setPdfDownloading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
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
    Promise.all([getUsers(), getProjects(), getOrganizations(), getBusinessProfile()])
      .then(([userList, projectList, organizationList, profile]) => {
        if (!active) return
        // Several people can share a workspace, so this is narrowed to one
        // entry per companyId - otherwise the same company lists twice (and
        // the duplicate companyId shows up as a duplicate React key).
        const seenWorkspaces = new Set<string>()
        const nextClients = userList.filter((user) => {
            if (!user.companyId || seenWorkspaces.has(user.companyId)) return false
            seenWorkspaces.add(user.companyId)
            return true
          })
        setClients(nextClients)
        setOrganizations(organizationList)
        setProjects(projectList)
        setIssuer(profile)
        if (!isEdit) {
          setTerms(profile.estimateTerms ?? DEFAULT_ESTIMATE_TERMS)
          setPaymentDetails(profile.estimatePaymentDetails ?? "")
          setNotes(profile.estimateNotes ?? DEFAULT_ESTIMATE_NOTES)
        }

        const selectedCompanyId = estimate?.companyId || initialCompanyId || ""
        const selectedClient = nextClients.find((client) => client.companyId === selectedCompanyId)
        const selectedOrganization = organizationList.find((organization) => organization.id === selectedCompanyId)
        if (selectedClient || selectedOrganization) {
          const details = {
            name: selectedOrganization?.name || selectedClient?.company || selectedClient?.displayName || selectedClient?.email || "",
            email: selectedOrganization?.email || selectedClient?.email || "",
            address: selectedOrganization?.address || selectedOrganization?.website || selectedOrganization?.location || selectedClient?.website || "",
          }
          if (!isEdit) {
            setPreparedForName(details.name)
            setPreparedForEmail(details.email)
            setPreparedForAddress(details.address)
          } else {
            if (!preparedForName.trim()) setPreparedForName(details.name)
            if (!preparedForEmail.trim()) setPreparedForEmail(details.email)
            if (!preparedForAddress.trim()) setPreparedForAddress(details.address)
          }
        }
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

  const selectedClient = clients.find((entry) => entry.companyId === companyId)
  const selectedProject = projects.find((entry) => entry.id === projectId)
  const draftEstimate: Estimate = {
    ...(estimate ?? {}),
    id: estimate?.id ?? "preview",
    companyId,
    client: selectedClient?.company || selectedClient?.displayName || preparedForName,
    estimateNumber: estimateNumber || "Estimate preview",
    title,
    projectId: projectId || "",
    project: selectedProject?.title || "",
    status,
    preparedFor: {
      name: preparedForName,
      email: preparedForEmail,
      address: preparedForAddress,
    },
    scope,
    lineItems: lines
      .filter((line) => line.description.trim() || moneyToMinorUnits(line.amount) > 0)
      .map((line) => ({
        id: line.id,
        description: line.description.trim(),
        details: line.details.trim(),
        billing: line.billing.trim() || "One-time",
        optional: line.optional,
        amount: moneyToMinorUnits(line.amount),
      })),
    amount: requiredTotal,
    currency,
    issuedOn,
    validUntil,
    terms,
    paymentDetails,
    notes,
    shareEnabled,
  }

  function selectClient(value: string) {
    setCompanyId(value)
    const client = clients.find((entry) => entry.companyId === value)
    const organization = organizations.find((entry) => entry.id === value)
    if (client || organization) {
      setPreparedForName(organization?.name || client?.company || client?.displayName || client?.email || "")
      setPreparedForEmail(organization?.email || client?.email || "")
      setPreparedForAddress(organization?.address || organization?.website || organization?.location || client?.website || "")
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveEstimate("page")
  }

  /** Saves, then opens the estimate, or the email composer with it attached. */
  async function saveEstimate(destination: "page" | "email") {
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
      if (destination === "email") router.push(buildEmailComposeHref(estimateEmailContext({ ...estimate, ...payload, id } as Estimate, companyRefFor(companyId))))
      else router.push(`/dashboard/estimates/${id}`)
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

  async function handleDownloadPdf() {
    if (pdfDownloading) return
    setPdfDownloading(true)
    setError(null)
    try {
      await downloadEstimatePdf({ estimate: draftEstimate, issuer: issuer ?? undefined })
    } catch (downloadError) {
      console.error("Error creating estimate PDF:", downloadError)
      setError("Couldn’t create the PDF. Try again.")
    } finally {
      setPdfDownloading(false)
    }
  }

  const statusMeta = estimateStatusMeta[status]

  return (
    <>
    <form onSubmit={submit} className="billing-editor mx-auto max-w-2xl space-y-3 bg-card px-4 pt-3 print:hidden sm:rounded-2xl">
      <div className="flex items-center gap-1">
        <Link
          href="/dashboard/estimates"
          aria-label="Back to estimates"
          className="-ml-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <span className="flex-1" />
        <Button type="button" variant="ghost" size="icon" title="Share estimate" aria-label="Share estimate" onClick={() => setShareOpen(true)}>
          <Share2 className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <EditorHeader issuer={issuer} kind="Estimate" onPrint={() => window.print()} onDownload={() => void handleDownloadPdf()} downloading={pdfDownloading} number={estimateNumber} status={statusMeta} />

      <EditorCard>
        <EditorField label="Title" htmlFor="estimate-title">
          <Input id="estimate-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Website and email restoration" />
        </EditorField>
      </EditorCard>

      <EditorCard title="Prepared for">
        <div className="space-y-3">
          <EditorField label="Client" htmlFor="estimate-client">
            <Select value={companyId} onValueChange={selectClient}>
              <SelectTrigger id="estimate-client"><SelectValue placeholder={optionsLoading ? "Loading…" : "Choose a client"} /></SelectTrigger>
              <SelectContent>
                {[...clients].sort((a, b) => (a.company || a.displayName || a.email || "").localeCompare(b.company || b.displayName || b.email || "", undefined, { sensitivity: "base" })).map((client) => <SelectItem key={client.uid} value={client.companyId as string}>{client.company || client.displayName || client.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </EditorField>
          <EditorField label="Department" htmlFor="prepared-for-name">
            <DepartmentField id="prepared-for-name" companyId={companyId} value={preparedForName} onChange={setPreparedForName} />
          </EditorField>
          <EditorField label="Email" htmlFor="prepared-for-email">
            <Input id="prepared-for-email" type="email" value={preparedForEmail} onChange={(event) => setPreparedForEmail(event.target.value)} />
          </EditorField>
          <EditorField label="Address" htmlFor="prepared-for-address">
            <Input id="prepared-for-address" value={preparedForAddress} onChange={(event) => setPreparedForAddress(event.target.value)} placeholder="Address or website" />
          </EditorField>
        </div>
      </EditorCard>

      <EditorCard title="Details">
        <div className="space-y-3">
          <EditorField label="Project" htmlFor="estimate-project">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="estimate-project" className="min-w-0 overflow-hidden">
                <SelectValue className="min-w-0 flex-1 truncate" placeholder="Not tied to a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.filter((project) => !companyId || project.companyId === companyId).sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" })).map((project) => <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </EditorField>
          <div className="grid grid-cols-2 gap-3">
            <EditorField label="Estimate number" htmlFor="estimate-number">
              <Input id="estimate-number" value={estimateNumber} onChange={(event) => setEstimateNumber(event.target.value)} />
            </EditorField>
            <EditorField label="Status" htmlFor="estimate-status">
              <Select value={status} onValueChange={(value) => setStatus(value as EstimateStatus)}>
                <SelectTrigger id="estimate-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(estimateStatusMeta).map(([value, meta]) => <SelectItem key={value} value={value}>{meta.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </EditorField>
            <EditorField label="Issue date" htmlFor="estimate-issued">
              <Input id="estimate-issued" type="date" value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} />
            </EditorField>
            <EditorField label="Valid until" htmlFor="estimate-valid">
              <Input id="estimate-valid" type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
            </EditorField>
            <EditorField label="Currency" htmlFor="estimate-currency">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="estimate-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((entry) => <SelectItem key={entry.code} value={entry.code}>{entry.code} {entry.symbol}</SelectItem>)}
                </SelectContent>
              </Select>
            </EditorField>
          </div>
        </div>
      </EditorCard>

      <EditorCard title="Scope of work">
        <RichTextEditor value={scope} onChange={setScope} placeholder="Describe the work, inclusions, exclusions, and delivery assumptions…" />
      </EditorCard>

      <EditorCard title="Items">
        <DndContext sensors={lineSensors} collisionDetection={closestCenter} onDragEnd={handleLineDragEnd}>
          <SortableContext items={lines.map((line) => line.id)} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-border">
              {lines.map((line, index) => (
                <SortableEstimateLine key={line.id} id={line.id} index={index} disabled={lines.length === 1}>
                  {(handle) => (
                    <>
                      <div className="flex items-center gap-2">
                        <Input
                          value={line.description}
                          onChange={(event) => updateLine(line.id, { description: event.target.value })}
                          placeholder="Item"
                          aria-label={`Item ${index + 1}`}
                          className="billing-editor-row-label flex-1"
                        />
                        {handle}
                        <button
                          type="button"
                          onClick={() => setLines((current) => current.filter((entry) => entry.id !== line.id))}
                          disabled={lines.length === 1}
                          aria-label={`Remove item ${index + 1}`}
                          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                      <Textarea
                        value={line.details}
                        onChange={(event) => updateLine(line.id, { details: event.target.value })}
                        placeholder="Description (optional)"
                        aria-label="Description"
                        rows={1}
                        className="min-h-11 resize-y"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <EditorField label="Billing" htmlFor={`billing-${line.id}`}>
                          <Input id={`billing-${line.id}`} value={line.billing} onChange={(event) => updateLine(line.id, { billing: event.target.value })} />
                        </EditorField>
                        <EditorField label="Amount" htmlFor={`amount-${line.id}`}>
                          <Input id={`amount-${line.id}`} value={line.amount} onChange={(event) => updateLine(line.id, { amount: event.target.value })} inputMode="decimal" placeholder="0.00" />
                        </EditorField>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Switch id={`optional-${line.id}`} checked={line.optional} onCheckedChange={(checked) => updateLine(line.id, { optional: checked })} />
                          <Label htmlFor={`optional-${line.id}`}>Optional</Label>
                        </div>
                        <p className="billing-editor-row-label text-right">{formatMoney(moneyToMinorUnits(line.amount), currency)}</p>
                      </div>
                    </>
                  )}
                </SortableEstimateLine>
              ))}
              <div className="py-3">
                <button
                  type="button"
                  onClick={() => setLines((current) => [...current, makeLine()])}
                  className="billing-editor-row-label inline-flex items-center gap-1 text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add item
                </button>
              </div>
            </div>
          </SortableContext>
        </DndContext>
        <div className="mt-1 space-y-3 border-t border-border pt-4">
          {optionalTotal > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Optional additions</span>
              <span>{formatMoney(optionalTotal, currency)}</span>
            </div>
          )}
          <div className="billing-editor-strong flex items-center justify-between">
            <span>Total</span>
            <span>{formatMoney(requiredTotal, currency)}</span>
          </div>
        </div>
      </EditorCard>

      <EditorCard>
        <ExpandableTextRow id="estimate-terms" label="Terms" value={terms} onChange={setTerms} rows={7} />
        <ExpandableTextRow id="estimate-payment" label="Payment details" value={paymentDetails} onChange={setPaymentDetails} placeholder="Account name, bank, account number…" rows={5} />
        <ExpandableTextRow id="estimate-notes" label="Estimate disclaimer" value={notes} onChange={setNotes} rows={5} />
      </EditorCard>

      {error && <p className="px-1 text-destructive">{error}</p>}

      <EditorActionBar
        onPreview={() => setPreviewOpen(true)}
        onSend={() => void saveEstimate("email")}
        saving={saving}
        saveLabel="Save"
        deleteAction={isEdit && estimate ? (
          <EditorDeleteCard
            label="estimate"
            confirmTitle="Delete this estimate?"
            confirmDescription={`${estimate.estimateNumber} will be removed for good. This cannot be undone.`}
            onDelete={handleDelete}
          />
        ) : undefined}
      />
    </form>

    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="w-[calc(100vw-0.5rem)] max-h-[calc(100vh-0.5rem)] max-w-5xl overflow-hidden p-2 print:hidden sm:p-6">
        <DialogHeader>
          <DialogTitle>Estimate preview</DialogTitle>
          <DialogDescription>Preview the complete estimate with your current edits before saving or downloading.</DialogDescription>
        </DialogHeader>
        <DocumentPreviewFrame>
          <EstimateDocument estimate={draftEstimate} issuer={issuer ?? undefined} />
        </DocumentPreviewFrame>
        <DialogFooter>
          <Button type="button" onClick={() => void handleDownloadPdf()} disabled={pdfDownloading}>
            {pdfDownloading ? <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" /> : <Printer className="mr-1.5 size-4" aria-hidden="true" />}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={shareOpen} onOpenChange={setShareOpen}>
      <DialogContent className="w-[calc(100vw-0.5rem)] max-w-md p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle>Share estimate</DialogTitle>
          <DialogDescription>Control access to this estimate with a public link.</DialogDescription>
        </DialogHeader>
        <ShareLinkField
          enabled={shareEnabled}
          onEnabledChange={setShareEnabled}
          path={estimate ? `/share/estimates/${estimate.id}` : undefined}
        />
        {!estimate && <p className="text-sm text-muted-foreground">Save the estimate first to generate its public link.</p>}
      </DialogContent>
    </Dialog>

    <div className="hidden print:block print:bg-white print:p-0">
      <EstimateDocument estimate={draftEstimate} issuer={issuer ?? undefined} />
    </div>
    </>
  )
}
