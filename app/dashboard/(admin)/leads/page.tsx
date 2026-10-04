"use client"

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { FileUp, Kanban, Plus, Rows3 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { FilterBar, useFilterBar } from "@/components/dashboard/filter-bar"
import { ImportLeadsDialog } from "@/components/dashboard/import-leads-dialog"
import { TableBulkBar } from "@/components/dashboard/table-bulk-bar"
import { useViewMode, type ViewMode } from "@/components/dashboard/view-toggle"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { getCurrentAgencyId } from "@/lib/agency-scope"
import { createLead, deleteLead, LEAD_STAGES, updateLead, watchLeads, type Lead, type LeadFields, type LeadStage } from "@/lib/leads"
import { cn } from "@/lib/utils"
import { useRowSelection } from "@/hooks/use-row-selection"

const EMPTY_FORM: LeadFields = {
  name: "", title: "", seniority: "", departments: "", email: "", emailStatus: "", phone: "", mobilePhone: "", linkedin: "",
  address: "", city: "", state: "", country: "", company: "", category: "", website: "", companyLinkedin: "", companyPhone: "",
  employees: "", keywords: "", technologies: "", annualRevenue: "", totalFunding: "", companyAddress: "", companyCity: "",
  companyState: "", companyCountry: "", reviews: "", owner: "", lists: "", lastContacted: "", doNotCall: false, source: "",
  value: 0, notes: "", stage: "new",
}

/** The Apollo fields, shown in the lead sheet after the main ones. */
const APOLLO_FIELDS: Array<{ key: keyof LeadFields; label: string }> = [
  { key: "title", label: "Job title" },
  { key: "seniority", label: "Seniority" },
  { key: "departments", label: "Departments" },
  { key: "emailStatus", label: "Email status" },
  { key: "mobilePhone", label: "Mobile phone" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "website", label: "Website" },
  { key: "companyLinkedin", label: "Company LinkedIn" },
  { key: "companyPhone", label: "Company phone" },
  { key: "employees", label: "Employees" },
  { key: "keywords", label: "Keywords" },
  { key: "technologies", label: "Technologies" },
  { key: "annualRevenue", label: "Annual revenue" },
  { key: "totalFunding", label: "Total funding" },
  { key: "companyAddress", label: "Company address" },
  { key: "companyCity", label: "Company city" },
  { key: "companyState", label: "Company state" },
  { key: "companyCountry", label: "Company country" },
  { key: "owner", label: "Owner" },
  { key: "lists", label: "Lists" },
  { key: "lastContacted", label: "Last contacted" },
]

/** Stable id getter for row selection, defined once so the hook doesn't recompute each render. */
const leadId = (lead: Lead) => lead.id

const STAGE_LABELS = new Map<string, string>(LEAD_STAGES.map((stage) => [stage.value, stage.label]))

function searchLead(lead: Lead) {
  return [lead.name, lead.title, lead.company, lead.email, lead.phone, lead.mobilePhone, lead.address, lead.city, lead.country, lead.category, lead.website, lead.keywords, lead.reviews, lead.source, lead.lists, lead.notes]
}

function formatValue(value: number) {
  return value > 0 ? value.toLocaleString() : ""
}

/** The agency's sales pipeline as a board. Drag a card to move it to the next stage. */
export default function LeadsPage() {
  const { user } = useAuth()
  const uid = user?.uid || ""
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [error, setError] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  // Stage changes show straight away, before Firestore confirms them.
  const [pendingStages, setPendingStages] = useState<Record<string, LeadStage>>({})
  const [editing, setEditing] = useState<Lead | "new" | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Lead | null>(null)
  // "grid" is the board and "list" the table. The board comes first, and the choice is remembered.
  const [view, setView] = useViewMode("leads", "grid")

  useEffect(() => {
    if (!uid) return
    let stop = () => {}
    let cancelled = false
    getCurrentAgencyId()
      .then((agencyId) => {
        if (cancelled) return
        stop = watchLeads(agencyId, (rows) => { setLeads(rows); setError(false) }, (reason) => { console.error("Leads subscription failed", reason); setError(true) })
      })
      .catch(() => setError(true))
    return () => { cancelled = true; stop() }
  }, [uid])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A short hold on phones, so swiping still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const shownLeads = useMemo(
    () => (leads ?? []).map((lead) => (pendingStages[lead.id] ? { ...lead, stage: pendingStages[lead.id] } : lead)),
    [leads, pendingStages],
  )
  const { results: visibleLeads, bar } = useFilterBar({ items: shownLeads, search: searchLead, sorts: [] })
  const activeLead = activeId ? shownLeads.find((lead) => lead.id === activeId) ?? null : null

  async function moveLead(lead: Lead, stage: LeadStage) {
    if (lead.stage === stage) return
    setPendingStages((current) => ({ ...current, [lead.id]: stage }))
    try {
      await updateLead(lead.id, { stage })
    } catch {
      toast.error("Couldn't move this lead.")
    } finally {
      setPendingStages((current) => {
        const { [lead.id]: _done, ...rest } = current
        return rest
      })
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const lead = shownLeads.find((item) => item.id === event.active.id)
    const stage = event.over?.id as LeadStage | undefined
    if (lead && stage) void moveLead(lead, stage)
  }

  async function removeLead() {
    if (!confirmDelete) return
    const lead = confirmDelete
    setConfirmDelete(null)
    setEditing(null)
    try {
      await deleteLead(lead.id)
    } catch {
      toast.error("Couldn't delete this lead.")
    }
  }

  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      <div className="lg:max-w-[30rem]">
        <FilterBar
          {...bar}
          className="mb-0 h-16 border-b border-border"
          placeholder="Search leads"
          actions={
            <>
              <LeadsViewToggle view={view} onChange={setView} />
              <Button variant="ghost" className="bg-transparent text-foreground hover:bg-transparent" onClick={() => setImportOpen(true)} disabled={leads === null || error}>
                <FileUp className="size-4" aria-hidden="true" />
                Import CSV
              </Button>
              <Button variant="ghost" className="bg-transparent text-foreground hover:bg-transparent" onClick={() => setEditing("new")}>
                <Plus className="size-4" aria-hidden="true" />
                New
              </Button>
            </>
          }
        />
      </div>

      {error ? (
        <p role="alert" className="mt-10 text-sm text-destructive">Leads unavailable. Refresh to try again.</p>
      ) : view === "list" ? (
        <LeadsTable leads={visibleLeads} loading={leads === null} onOpen={setEditing} />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
          <div className="scrollbar-none -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
            {LEAD_STAGES.map((stage) => {
              const stageLeads = visibleLeads.filter((lead) => lead.stage === stage.value)
              const total = stageLeads.reduce((sum, lead) => sum + lead.value, 0)
              return (
                <StageColumn key={stage.value} stage={stage.value} label={stage.label} count={stageLeads.length} total={total} loading={leads === null}>
                  {stageLeads.map((lead) => (
                    <DraggableLead key={lead.id} lead={lead} hidden={lead.id === activeId} onOpen={() => setEditing(lead)} />
                  ))}
                </StageColumn>
              )
            })}
          </div>
          <DragOverlay>{activeLead ? <LeadCard lead={activeLead} dragging /> : null}</DragOverlay>
        </DndContext>
      )}

      {leads?.length === 0 && !error && (
        <p className="mt-2 text-sm text-muted-foreground">
          Add people you&apos;re talking to here. Once a lead is won, add them as a <Link href="/dashboard/clients" className="text-foreground underline-offset-4 hover:underline">client</Link>.
        </p>
      )}

      <LeadSheet
        lead={editing}
        onClose={() => setEditing(null)}
        onDelete={(lead) => setConfirmDelete(lead)}
        onSave={async (fields) => {
          if (editing === "new") await createLead(uid, fields)
          else if (editing) await updateLead(editing.id, fields)
        }}
      />

      <ImportLeadsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        uid={uid}
        existingLeads={(leads ?? []).map((lead) => ({ id: lead.id, email: lead.email }))}
      />

      <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>{confirmDelete?.name || "This lead"} will be removed for good.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void removeLead()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

/** Board first, then table, as a pill switch like the one on Drive. */
function LeadsViewToggle({ view, onChange }: { view: ViewMode; onChange: (view: ViewMode) => void }) {
  const options = [
    { value: "grid" as const, label: "Board", Icon: Kanban },
    { value: "list" as const, label: "Table", Icon: Rows3 },
  ]
  return (
    <div role="group" aria-label="View" className="flex shrink-0 items-center rounded-full bg-muted p-0.5">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-label={label}
          aria-pressed={view === value}
          title={label}
          className={cn(
            "flex h-8 w-10 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            view === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

function LeadsTable({ leads, loading, onOpen }: { leads: Lead[]; loading: boolean; onOpen: (lead: Lead) => void }) {
  const selection = useRowSelection(leads, leadId)
  const [bulkBusy, setBulkBusy] = useState(false)

  async function deleteSelected() {
    const ids = selection.selectedIds
    setBulkBusy(true)
    try {
      await Promise.all(ids.map((id) => deleteLead(id)))
      selection.clear()
      toast.success(`${ids.length} ${ids.length === 1 ? "lead" : "leads"} deleted.`)
    } catch {
      toast.error("Some leads couldn't be deleted. Try again.")
    } finally {
      setBulkBusy(false)
    }
  }

  async function moveSelected(stage: LeadStage) {
    const ids = selection.selectedIds
    setBulkBusy(true)
    try {
      await Promise.all(ids.map((id) => updateLead(id, { stage })))
      selection.clear()
      toast.success(`${ids.length} ${ids.length === 1 ? "lead" : "leads"} moved to ${STAGE_LABELS.get(stage)}.`)
    } catch {
      toast.error("Some leads couldn't be moved. Try again.")
    } finally {
      setBulkBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-4 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }
  return (
    <div className="mt-4">
      <TableBulkBar count={selection.selectedCount} noun="lead" deleting={bulkBusy} onClear={selection.clear} onDelete={() => void deleteSelected()}>
        <Select onValueChange={(stage) => void moveSelected(stage as LeadStage)} disabled={bulkBusy}>
          <SelectTrigger size="sm" className="h-8 w-40 bg-background"><SelectValue placeholder="Move to stage" /></SelectTrigger>
          <SelectContent>
            {LEAD_STAGES.map((stage) => <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableBulkBar>
      <div className="rounded-lg border border-border">
        {/* Fixed column widths: long values are cut with … and the table scrolls sideways on small screens. */}
        <Table className="min-w-[1340px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-3">
                <Checkbox aria-label="Select all leads" checked={selection.allSelected} indeterminate={selection.someSelected} onChange={selection.toggleAll} />
              </TableHead>
              <TableHead className="w-[170px]">Name</TableHead>
              <TableHead className="w-[160px]">Job title</TableHead>
              <TableHead className="w-[160px]">Company</TableHead>
              <TableHead className="w-[140px]">Category</TableHead>
              <TableHead className="w-[220px]">Address</TableHead>
              <TableHead className="w-[90px]">Reviews</TableHead>
              <TableHead className="w-[130px]">Phone</TableHead>
              <TableHead className="w-[180px]">Email</TableHead>
              <TableHead className="w-[100px]">Stage</TableHead>
              <TableHead className="w-[90px] text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">No leads.</TableCell>
              </TableRow>
            ) : leads.map((lead) => (
              <TableRow key={lead.id} className="cursor-pointer" data-state={selection.isSelected(lead.id) ? "selected" : undefined} onClick={() => onOpen(lead)}>
                <TableCell className="px-3" onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    aria-label={`Select ${lead.name || "lead"}`}
                    checked={selection.isSelected(lead.id)}
                    // Shift-click selects every lead between this one and the last one picked.
                    onChange={(event) => selection.toggle(lead.id, (event.nativeEvent as MouseEvent).shiftKey)}
                  />
                </TableCell>
                <TableCell className="truncate font-medium" title={lead.name}>
                  <button type="button" onClick={(event) => { event.stopPropagation(); onOpen(lead) }} className="block max-w-full truncate rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                    {lead.name || "Unnamed lead"}
                  </button>
                </TableCell>
                <TableCell className="truncate" title={lead.title}>{lead.title}</TableCell>
                <TableCell className="truncate" title={lead.company}>{lead.company}</TableCell>
                <TableCell className="truncate" title={lead.category}>{lead.category}</TableCell>
                <TableCell className="truncate" title={lead.address}>{lead.address}</TableCell>
                <TableCell className="truncate" title={lead.reviews}>{lead.reviews}</TableCell>
                <TableCell className="truncate" title={lead.phone}>{lead.phone}</TableCell>
                <TableCell className="truncate" title={lead.email}>{lead.email}</TableCell>
                <TableCell className="truncate">{STAGE_LABELS.get(lead.stage) ?? lead.stage}</TableCell>
                <TableCell className="truncate text-right">{formatValue(lead.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function StageColumn({ stage, label, count, total, loading, children }: { stage: LeadStage; label: string; count: number; total: number; loading: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={cn(
        "flex w-[78vw] max-w-72 shrink-0 snap-start flex-col rounded-xl bg-card p-2 transition-colors sm:w-64",
        isOver && "bg-muted ring-2 ring-ring/40",
      )}
    >
      <header className="flex items-baseline justify-between gap-2 px-1.5 pt-1 pb-2">
        <h2 className="text-sm font-medium text-foreground">
          {label} <span className="font-normal text-muted-foreground">{count}</span>
        </h2>
        {total > 0 && <span className="text-xs text-muted-foreground">{formatValue(total)}</span>}
      </header>
      <div className="flex min-h-24 flex-1 flex-col gap-2">
        {loading ? (
          <>
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </>
        ) : children}
      </div>
    </section>
  )
}

function DraggableLead({ lead, hidden, onOpen }: { lead: Lead; hidden: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: lead.id })
  return (
    <div ref={setNodeRef} className={cn("touch-manipulation", hidden && "opacity-30")} {...attributes} {...listeners}>
      <LeadCard lead={lead} onOpen={onOpen} />
    </div>
  )
}

function LeadCard({ lead, dragging = false, onOpen }: { lead: Lead; dragging?: boolean; onOpen?: () => void }) {
  const details = [lead.company, lead.category].filter(Boolean).join(" · ")
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "block w-full cursor-grab rounded-lg border border-border bg-background px-3 py-2.5 text-left outline-none transition-shadow hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
        dragging && "rotate-1 shadow-lg",
      )}
    >
      <span className="block truncate text-sm font-medium text-foreground">{lead.name || "Unnamed lead"}</span>
      {details && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{details}</span>}
      {lead.value > 0 && <span className="mt-1.5 block text-xs font-medium text-foreground">{formatValue(lead.value)}</span>}
    </button>
  )
}

function LeadSheet({ lead, onClose, onSave, onDelete }: { lead: Lead | "new" | null; onClose: () => void; onSave: (fields: LeadFields) => Promise<void>; onDelete: (lead: Lead) => void }) {
  const [form, setForm] = useState<LeadFields>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!lead) return
    if (lead === "new") setForm(EMPTY_FORM)
    else {
      const { id: _id, agencyId: _agencyId, createdBy: _createdBy, createdAt: _createdAt, updatedAt: _updatedAt, ...fields } = lead
      setForm(fields)
    }
  }, [lead])

  function set<K extends keyof LeadFields>(key: K, value: LeadFields[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      // Trim every text field; notes keep their inner line breaks.
      const trimmed = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])) as LeadFields
      await onSave(trimmed)
      onClose()
    } catch {
      toast.error("Couldn't save this lead.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={lead !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{lead === "new" ? "New lead" : "Edit lead"}</SheetTitle>
          <SheetDescription className="sr-only">Lead details</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="grid gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="lead-name">Name</Label>
              <Input id="lead-name" value={form.name} onChange={(event) => set("name", event.target.value)} required autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-company">Company</Label>
              <Input id="lead-company" value={form.company} onChange={(event) => set("company", event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-email">Email</Label>
              <Input id="lead-email" type="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input id="lead-phone" type="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="lead-address">Address</Label>
              <Input id="lead-address" value={form.address} onChange={(event) => set("address", event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-category">Category</Label>
              <Input id="lead-category" value={form.category} onChange={(event) => set("category", event.target.value)} placeholder="Restaurant, clinic, school…" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-reviews">Reviews</Label>
              <Input id="lead-reviews" value={form.reviews} onChange={(event) => set("reviews", event.target.value)} placeholder="4.6 (128)" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-source">Source</Label>
              <Input id="lead-source" value={form.source} onChange={(event) => set("source", event.target.value)} placeholder="Referral, website, event…" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-value">Value</Label>
              <Input id="lead-value" type="number" inputMode="numeric" min={0} value={form.value || ""} onChange={(event) => set("value", Math.max(0, Number(event.target.value) || 0))} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="lead-stage">Stage</Label>
              <Select value={form.stage} onValueChange={(value) => set("stage", value as LeadStage)}>
                <SelectTrigger id="lead-stage" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((stage) => <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="lead-notes">Notes</Label>
              <Textarea id="lead-notes" rows={4} value={form.notes} onChange={(event) => set("notes", event.target.value)} />
            </div>
            {APOLLO_FIELDS.map(({ key, label }) => (
              <div key={key} className="grid gap-1.5">
                <Label htmlFor={`lead-${key}`}>{label}</Label>
                <Input id={`lead-${key}`} value={String(form[key] ?? "")} onChange={(event) => set(key, event.target.value as never)} />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox checked={form.doNotCall} onChange={(event) => set("doNotCall", event.currentTarget.checked)} />
              Do not call
            </label>
          </div>
          {form.stage === "won" && (
            <p className="text-sm text-muted-foreground">
              Won? <Link href="/dashboard/clients" className="text-foreground underline-offset-4 hover:underline">Add them as a client</Link> to start work.
            </p>
          )}
          <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", lead !== "new" && "sm:justify-between")}>
            {lead && lead !== "new" && (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(lead)}>Delete</Button>
            )}
            <div className="flex gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.name.trim()}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
