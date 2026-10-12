"use client"

import { useRef, useState, type FormEvent, type ReactNode } from "react"
import { Pencil, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { SectionAddButton } from "@/components/company/section-add-button"
import { ListToolbar, useListSearch } from "@/components/dashboard/list-search"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  addCampaignPeople,
  compactCount,
  deleteCampaignPerson,
  formatPay,
  normalizeHandle,
  onRoster,
  parseCount,
  PAY_CURRENCIES,
  payCurrency,
  PERSON_APPS,
  PERSON_CATEGORIES,
  PERSON_STATUSES,
  PERSON_TIERS,
  PERSON_WAVES,
  profileUrl,
  updateCampaignPerson,
  type CampaignPerson,
  type CampaignPersonInput,
} from "@/lib/campaign-people"
import { cn } from "@/lib/utils"

interface CampaignPeopleProps {
  people: CampaignPerson[]
  agencyId?: string
  companyId: string
  projectId: string
  /** The agency: adds creators and edits every detail. */
  canEdit: boolean
  /** The client's own people: can add a suggested creator. */
  canReview?: boolean
}

const fieldClass = "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"

/**
 * The Creators tab: one table of everyone on the campaign. The agency adds
 * creators in the row above the table or by Import, and opens any of them to change the rest.
 */
export function CampaignPeople({ people, agencyId, companyId, projectId, canEdit, canReview = false }: CampaignPeopleProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [deleting, setDeleting] = useState<CampaignPerson | null>(null)
  const open = people.find((person) => person.id === openId) ?? null
  // Added creators first, then suggestions, each by best match.
  const sorted = [...people].sort((a, b) => Number(onRoster(b)) - Number(onRoster(a)) || (b.overlap ?? 0) - (a.overlap ?? 0))
  const { query, setQuery, results } = useListSearch(sorted, (person) => [person.handle, person.app, person.category, person.status])

  async function addToRoster(person: CampaignPerson) {
    try {
      await updateCampaignPerson(person.id, { onRoster: true })
    } catch (error) {
      console.error("Error adding creator:", error)
      toast.error("That didn't save.")
    }
  }

  async function removeCreator(person: CampaignPerson) {
    setDeleting(null)
    try {
      await deleteCampaignPerson(person.id)
    } catch (error) {
      console.error("Error removing creator:", error)
      toast.error("Couldn't delete them.")
    }
  }

  function rowActions(person: CampaignPerson) {
    return (
      <div className="flex shrink-0 items-center justify-end gap-1">
        {!onRoster(person) && (canEdit || canReview) && (
          <Button type="button" size="sm" onClick={() => void addToRoster(person)}>Add</Button>
        )}
        {canEdit && (
          <>
            <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setOpenId(person.id)} aria-label={`Edit ${person.handle}`} title="Edit">
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setDeleting(person)} aria-label={`Delete ${person.handle}`} title="Delete">
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search creators"
        actions={
          <>
            {canEdit && <Button type="button" variant="ghost" onClick={() => setImporting(true)}>Import</Button>}
            {people.length > 0 && <Button type="button" variant="ghost" onClick={() => downloadCsv(people.filter(onRoster))}>Download</Button>}
            {canEdit && <SectionAddButton label="New creator" disabled={adding} onClick={() => setAdding(true)} />}
          </>
        }
      />

      {canEdit && adding && (
        <AddCreatorRow
          scope={{ agencyId, companyId, projectId }}
          onDone={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Phones get a stacked list instead of the table, so nothing scrolls sideways. */}
      <div className="divide-y divide-border xl:hidden">
        {results.map((person) => (
          <div key={person.id} className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1 text-sm">
              <CreatorName person={person} />
              <p className="truncate text-muted-foreground">{[person.app, person.category, `${compactCount(person.followers)} followers`].filter(Boolean).join(" · ")}</p>
              <p className="truncate text-muted-foreground">{person.status} · {person.source === "ngai" && !person.pay ? "Pay unknown" : person.pay ? formatPay(person.pay, payCurrency(person)) : "Free"}</p>
            </div>
            {rowActions(person)}
          </div>
        ))}
        {results.length === 0 && <p className="py-4 text-sm text-muted-foreground">{people.length === 0 ? "No creators yet." : "Nothing matches your search."}</p>}
      </div>

      <div className="hidden xl:block">
      <Table className="table-fixed">
        <Columns />
        <TableHeader>
          <TableRow>
            <TableHead className="overflow-hidden text-ellipsis">Creator</TableHead>
            <TableHead className="overflow-hidden text-ellipsis">App</TableHead>
            <TableHead className="overflow-hidden text-ellipsis">Category</TableHead>
            <TableHead className="overflow-hidden text-ellipsis">Followers</TableHead>
            <TableHead className="overflow-hidden text-ellipsis">Status</TableHead>
            <TableHead className="overflow-hidden text-ellipsis">Pay</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((person) => {
            const suggested = !onRoster(person)
            return (
              <TableRow key={person.id}>
                <TableCell className="overflow-hidden"><CreatorName person={person} /></TableCell>
                <TableCell className="overflow-hidden text-ellipsis" title={person.app}>{person.app}</TableCell>
                <TableCell className="overflow-hidden">
                  <span className="block truncate" title={person.category || undefined}>{person.category || "—"}</span>
                </TableCell>
                <TableCell className="overflow-hidden text-ellipsis">{compactCount(person.followers)}</TableCell>
                <TableCell className="overflow-hidden text-ellipsis">{suggested ? "Suggested" : person.status}</TableCell>
                <TableCell className="overflow-hidden text-ellipsis">{person.source === "ngai" && !person.pay ? "—" : person.pay ? formatPay(person.pay, payCurrency(person)) : "Free"}</TableCell>
                <TableCell>{rowActions(person)}</TableCell>
              </TableRow>
            )
          })}
          {results.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground">
                {people.length === 0 ? "No creators yet." : "Nothing matches your search."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>

      {canEdit && <ImportDialog open={importing} onOpenChange={setImporting} scope={{ agencyId, companyId, projectId }} />}
      {canEdit && <CreatorDialog person={open} onClose={() => setOpenId(null)} />}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(next) => { if (!next) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.handle}?</AlertDialogTitle>
            <AlertDialogDescription>They'll be removed from this campaign.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleting) void removeCreator(deleting) }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

type Scope = { agencyId?: string; companyId: string; projectId: string }

async function saveCreators(scope: Scope, rows: CampaignPersonInput[]) {
  try {
    await addCampaignPeople(scope, rows)
    return true
  } catch (error) {
    console.error("Error adding creators:", error)
    toast.error("Couldn't add them. Try again.")
    return false
  }
}

/** Column widths shared by the add row and the table under it, so each box sits over its column. */
function Columns() {
  const widths = ["19%", "11%", "24%", "10%", "12%", "8%", "16%"]
  return <colgroup>{widths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
}

/** A row of boxes above the table, one per column, to add a creator. */
function AddCreatorRow({ scope, onDone, onCancel }: { scope: Scope; onDone: () => void; onCancel: () => void }) {
  const [handle, setHandle] = useState("")
  const [app, setApp] = useState<string>(PERSON_APPS[0])
  const [category, setCategory] = useState("")
  const [followers, setFollowers] = useState("")
  const [currency, setCurrency] = useState<string>(PAY_CURRENCIES[0])
  const [pay, setPay] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!normalizeHandle(handle) || busy) return
    setBusy(true)
    const saved = await saveCreators(scope, [{
      handle,
      app,
      category: category.trim(),
      followers: parseCount(followers),
      tier: PERSON_TIERS[0],
      currency,
      pay: parseCount(pay),
    }])
    setBusy(false)
    if (!saved) return
    setHandle("")
    setFollowers("")
    setPay("")
    onDone()
  }

  return (
    <form onSubmit={handleAdd}>
      {/* Phones: the same boxes stacked two to a row. */}
      <div className="grid grid-cols-2 gap-2 xl:hidden">
        <input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="@handle" aria-label="Handle" className={cn(fieldClass, "col-span-2")} />
        <Pick label="App" value={app} options={PERSON_APPS} onChange={setApp} />
        <Pick label="Category" placeholder="Category" value={category} options={PERSON_CATEGORIES} onChange={setCategory} />
        <input value={followers} onChange={(event) => setFollowers(event.target.value)} placeholder="Followers" inputMode="numeric" aria-label="Followers" className={fieldClass} />
        <div className="flex gap-1">
          <Pick label="Currency" value={currency} options={PAY_CURRENCIES} onChange={setCurrency} className="w-20 shrink-0" />
          <input value={pay} onChange={(event) => setPay(event.target.value)} placeholder="Pay" inputMode="numeric" aria-label="Pay" className={fieldClass} />
        </div>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy || !normalizeHandle(handle)}>Add creator</Button>
      </div>
      <div className="hidden xl:block">
      <Table className="table-fixed">
        <Columns />
        <TableBody>
          <TableRow className="border-0 hover:bg-transparent">
            <TableCell><input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="@handle" aria-label="Handle" className={fieldClass} /></TableCell>
            <TableCell>
              <Pick label="App" value={app} options={PERSON_APPS} onChange={setApp} />
            </TableCell>
            <TableCell><Pick label="Category" placeholder="Category" value={category} options={PERSON_CATEGORIES} onChange={setCategory} /></TableCell>
            <TableCell><input value={followers} onChange={(event) => setFollowers(event.target.value)} placeholder="Followers" inputMode="numeric" aria-label="Followers" className={fieldClass} /></TableCell>
            <TableCell />
            <TableCell>
              <div className="flex gap-1">
                <Pick label="Currency" value={currency} options={PAY_CURRENCIES} onChange={setCurrency} className="w-20 shrink-0" />
                <input value={pay} onChange={(event) => setPay(event.target.value)} placeholder="Pay" inputMode="numeric" aria-label="Pay" className={fieldClass} />
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onCancel} disabled={busy} aria-label="Cancel" title="Cancel">
                  <X className="size-4" aria-hidden="true" />
                </Button>
                <Button type="submit" size="sm" disabled={busy || !normalizeHandle(handle)}>Add</Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      </div>
    </form>
  )
}

/** Reads one creator per line: handle, app, followers, category, pay, currency (dollars if left out). Commas or tabs, so CSV files and spreadsheet pastes both work. */
function parseCreatorList(text: string): CampaignPersonInput[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(line.includes("\t") ? "\t" : ",").map((cell) => cell.trim().replace(/^"|"$/g, "")))
    .filter((cells) => normalizeHandle(cells[0] ?? "") && !/^handle$/i.test(cells[0] ?? ""))
    .map(([handle, app = "", followers = "", category = "", pay = "", currency = ""]) => ({
      handle,
      app: PERSON_APPS.find((item) => item.toLowerCase() === app.toLowerCase()) ?? PERSON_APPS[0],
      followers: parseCount(followers),
      tier: PERSON_TIERS[0],
      category,
      pay: parseCount(pay),
      currency: PAY_CURRENCIES.find((item) => item === currency.toUpperCase()) ?? PAY_CURRENCIES[0],
    }))
}

/** Add many creators at once, pasted in or from a CSV file. */
function ImportDialog({ open, onOpenChange, scope }: { open: boolean; onOpenChange: (open: boolean) => void; scope: Scope }) {
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const rows = parseCreatorList(text)

  async function readFile(file: File | undefined) {
    if (!file) return
    try {
      setText(await file.text())
    } catch {
      toast.error("Couldn't read that file.")
    }
  }

  async function importAll() {
    if (!rows.length || busy) return
    setBusy(true)
    const saved = await saveCreators(scope, rows)
    setBusy(false)
    if (!saved) return
    toast.success(`Added ${rows.length} ${rows.length === 1 ? "creator" : "creators"}`)
    setText("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import creators</DialogTitle>
          <DialogDescription>One per line: handle, app, followers, category, pay, currency.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          placeholder={"@ada, Instagram, 12k, Food, 500, USD\n@tunde, X, 3400, Sport, 50000, NGN"}
          aria-label="Creators to import"
        />
        <input ref={fileInput} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden onChange={(event) => { void readFile(event.target.files?.[0]); event.target.value = "" }} />
        <DialogFooter className="items-center gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => fileInput.current?.click()} className="-ml-3">Choose a file</Button>
          <Button type="button" disabled={busy || !rows.length} onClick={() => void importAll()}>
            {busy ? "Importing…" : rows.length ? `Import ${rows.length}` : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Edit every detail of one creator, then Save. */
function CreatorDialog({ person, onClose }: { person: CampaignPerson | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(person)} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {person?.handle ?? "creator"}</DialogTitle>
          <DialogDescription className="sr-only">Change this creator&apos;s details.</DialogDescription>
        </DialogHeader>
        {person && <CreatorForm key={person.id} person={person} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function CreatorForm({ person, onDone }: { person: CampaignPerson; onDone: () => void }) {
  const [draft, setDraft] = useState({
    handle: person.handle,
    app: person.app,
    followers: String(person.followers || ""),
    category: person.category ?? "",
    overlap: String(person.overlap || ""),
    tier: person.tier,
    status: person.status,
    wave: person.wave,
    postLink: person.postLink,
    currency: payCurrency(person),
    pay: String(person.pay || ""),
    paid: person.paid,
    labelled: person.labelled,
    onRoster: onRoster(person),
  })
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((current) => ({ ...current, [key]: value }))

  async function save(event: FormEvent) {
    event.preventDefault()
    const handle = normalizeHandle(draft.handle)
    if (!handle || saving) return
    setSaving(true)
    try {
      await updateCampaignPerson(person.id, {
        handle,
        app: draft.app,
        followers: parseCount(draft.followers),
        category: draft.category,
        overlap: Math.min(100, parseCount(draft.overlap.replace("%", ""))),
        tier: draft.tier,
        status: draft.status,
        wave: draft.wave,
        postLink: draft.postLink.trim(),
        currency: draft.currency,
        pay: parseCount(draft.pay),
        paid: draft.paid,
        labelled: draft.labelled,
        onRoster: draft.onRoster,
      })
      onDone()
    } catch (error) {
      console.error("Error saving creator:", error)
      toast.error("That didn't save.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Handle"><Input value={draft.handle} onChange={(event) => set("handle", event.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="App"><Pick label="App" value={draft.app} options={PERSON_APPS} onChange={(value) => set("app", value)} /></Field>
        <Field label="Category"><Pick label="Category" value={draft.category} options={["", ...PERSON_CATEGORIES]} onChange={(value) => set("category", value)} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Followers"><Input value={draft.followers} onChange={(event) => set("followers", event.target.value)} inputMode="numeric" /></Field>
        <Field label="Match %"><Input value={draft.overlap} onChange={(event) => set("overlap", event.target.value)} inputMode="numeric" /></Field>
        <Field label="Size"><Pick label="Size" value={draft.tier} options={PERSON_TIERS} onChange={(value) => set("tier", value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status"><Pick label="Status" value={draft.status} options={PERSON_STATUSES} onChange={(value) => set("status", value)} /></Field>
        <Field label="Posting day"><Pick label="Posting day" value={draft.wave} options={PERSON_WAVES} onChange={(value) => set("wave", value)} show={(option) => (option ? `Day ${option}` : "—")} /></Field>
      </div>
      <Field label="Post link"><Input value={draft.postLink} onChange={(event) => set("postLink", event.target.value)} placeholder="https://" /></Field>
      <div className="grid grid-cols-[6rem_1fr] gap-3">
        <Field label="Currency"><Pick label="Currency" value={draft.currency} options={PAY_CURRENCIES} onChange={(value) => set("currency", value)} /></Field>
        <Field label="Pay"><Input value={draft.pay} onChange={(event) => set("pay", event.target.value)} inputMode="numeric" placeholder="0 if free" /></Field>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.paid} onChange={(event) => set("paid", event.target.checked)} className="size-4 accent-foreground" />
          Paid
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.labelled} onChange={(event) => set("labelled", event.target.checked)} className="size-4 accent-foreground" />
          Marked as ad
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!draft.onRoster} onChange={(event) => set("onRoster", !event.target.checked)} className="size-4 accent-foreground" />
          Suggestion only
        </label>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving || !normalizeHandle(draft.handle)}>{saving ? "Saving…" : "Save"}</Button>
      </DialogFooter>
    </form>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function downloadCsv(people: CampaignPerson[]) {
  const header = ["Handle", "App", "Followers", "Category", "Match %", "Size", "Posting day", "Status", "Post link", "Pay", "Currency", "Paid", "Marked as ad"]
  const rows = people.map((person) => [
    person.handle, person.app, person.followers, person.category ?? "", person.overlap ?? "", person.tier, person.wave, person.status, person.postLink, person.pay, payCurrency(person), person.paid ? "Yes" : "No", person.labelled ? "Yes" : "No",
  ])
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "campaign-creators.csv"
  anchor.click()
  URL.revokeObjectURL(url)
}

// Radix Select can't hold an empty value, so "none" stands in for it.
const NONE = "__none"

/** The shadcn select, for a plain list of strings. An empty option shows as "—". */
function Pick({
  value,
  options,
  onChange,
  label,
  placeholder,
  show = (option) => option || "—",
  className,
}: {
  value: string
  options: readonly string[]
  onChange: (value: string) => void
  label: string
  placeholder?: string
  show?: (option: string) => string
  className?: string
}) {
  const all = [...new Set([...options, ...(value && !options.includes(value) ? [value] : [])])]
  return (
    <Select value={value || (placeholder ? undefined : NONE)} onValueChange={(next) => onChange(next === NONE ? "" : next)}>
      <SelectTrigger size="default" aria-label={label} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {all.map((option) => (
          <SelectItem key={option || NONE} value={option || NONE}>{show(option)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** The creator's handle, linked to their profile when we know the app. */
function CreatorName({ person }: { person: CampaignPerson }) {
  const href = profileUrl(person)
  return href
    ? <a href={href} target="_blank" rel="noreferrer" className="block truncate font-medium text-foreground hover:underline" title={person.handle}>{person.handle}</a>
    : <span className="block truncate font-medium text-foreground" title={person.handle}>{person.handle}</span>
}
