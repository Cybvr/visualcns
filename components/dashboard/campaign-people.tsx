"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  addCampaignPeople,
  deleteCampaignPerson,
  normalizeHandle,
  parseCount,
  PERSON_APPS,
  PERSON_STATUSES,
  PERSON_TIERS,
  PERSON_WAVES,
  compactCount,
  onRoster,
  updateCampaignPerson,
  type CampaignPerson,
  type CampaignPersonInput,
} from "@/lib/campaign-people"
import { creativeStatus, type CampaignCreative } from "@/lib/campaign-creatives"
import { updateProject, type Project } from "@/lib/projects"
import { cn } from "@/lib/utils"

interface CampaignPeopleProps {
  people: CampaignPerson[]
  agencyId?: string
  companyId: string
  projectId: string
  canEdit: boolean
  /** The client's own people, who can add and remove creators from the roster. */
  canReview?: boolean
  project: Project
  content: CampaignCreative[]
  onPatched?: (patch: Partial<Project>) => void
}

const fieldClass = "h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
const cellClass = "h-9 w-full min-w-0 rounded-md bg-transparent px-2 text-sm text-foreground outline-none hover:bg-muted/60 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring"

const naira = (value: number) => value.toLocaleString("en-NG")

/**
 * The Creators tab: the client as the founder anchor, the roster with how well
 * each creator's audience matches, and the posting plan for everyone on it.
 */
export function CampaignPeople({ people, agencyId, companyId, projectId, canEdit, canReview = canEdit, project, content, onPatched }: CampaignPeopleProps) {
  const roster = people.filter(onRoster)
  return (
    <div className="space-y-10">
      <FounderAnchor content={content} />
      <RosterMatching people={people} project={project} canEdit={canEdit} canReview={canReview} onPatched={onPatched} />
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">Schedule</h3>
        </div>
      {canEdit && <AddPeopleForm agencyId={agencyId} companyId={companyId} projectId={projectId} />}

      {roster.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <Users className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No creators yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-border text-xs font-medium text-muted-foreground">
              <tr>
                <Th className="w-44">Handle</Th>
                <Th className="w-32">App</Th>
                <Th className="w-28">Followers</Th>
                <Th className="w-36">Type</Th>
                <Th className="w-28">Posting day</Th>
                <Th className="w-32">Status</Th>
                <Th>Post link</Th>
                <Th className="w-32">Pay (₦)</Th>
                <Th className="w-16 text-center">Paid</Th>
                <Th className="w-28 text-center">Marked as ad</Th>
                {canEdit && <Th className="w-12"><span className="sr-only">Remove</span></Th>}
              </tr>
            </thead>
            <tbody>
              {roster.map((person) => (
                <PersonRow key={person.id} person={person} canEdit={canEdit} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {roster.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => downloadCsv(roster)}>
            Download CSV
          </Button>
        </div>
      )}
      </section>
    </div>
  )
}

function Th({ className, children }: { className?: string; children: ReactNode }) {
  return <th scope="col" className={cn("px-3 py-3 font-medium", className)}>{children}</th>
}

function AddPeopleForm({ agencyId, companyId, projectId }: { agencyId?: string; companyId: string; projectId: string }) {
  const [handle, setHandle] = useState("")
  const [app, setApp] = useState<string>(PERSON_APPS[0])
  const [followers, setFollowers] = useState("")
  const [tier, setTier] = useState<string>(PERSON_TIERS[0])
  const [pay, setPay] = useState("")
  const [category, setCategory] = useState("")
  const [overlap, setOverlap] = useState("")
  // Suggestions show in Roster matching for the client to add; roster creators go straight into the posting plan.
  const [asSuggestion, setAsSuggestion] = useState(false)
  const [pasted, setPasted] = useState("")
  const [busy, setBusy] = useState(false)

  async function save(rows: CampaignPersonInput[]) {
    setBusy(true)
    try {
      await addCampaignPeople({ agencyId, companyId, projectId }, rows)
      return true
    } catch (error) {
      console.error("Error adding people:", error)
      toast.error("Couldn't add them. Try again.")
      return false
    } finally {
      setBusy(false)
    }
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!normalizeHandle(handle) || busy) return
    if (await save([{ handle, app, followers: parseCount(followers), tier, pay: parseCount(pay), category: category.trim(), overlap: Math.min(100, parseCount(overlap.replace("%", ""))), onRoster: !asSuggestion }])) {
      setHandle("")
      setFollowers("")
      setPay("")
      setOverlap("")
    }
  }

  async function handlePaste() {
    // One person per line: handle, app, followers, pay, category, overlap. Commas or tabs, so a spreadsheet paste works too.
    const rows = pasted
      .split(/\r?\n/)
      .map((line) => line.split(line.includes("\t") ? "\t" : ",").map((cell) => cell.trim()))
      .filter((cells) => normalizeHandle(cells[0] ?? ""))
    if (rows.length === 0 || busy) return
    const people = rows.map(([rowHandle, rowApp = "", rowFollowers = "", rowPay = "", rowCategory = "", rowOverlap = ""]) => ({
      handle: rowHandle,
      app: PERSON_APPS.find((item) => item.toLowerCase() === rowApp.toLowerCase()) ?? app,
      followers: parseCount(rowFollowers),
      tier,
      pay: parseCount(rowPay),
      category: rowCategory,
      overlap: Math.min(100, parseCount(rowOverlap.replace("%", ""))),
      onRoster: !asSuggestion,
    }))
    if (await save(people)) {
      setPasted("")
      toast.success(`Added ${people.length} ${people.length === 1 ? "creator" : "creators"}`)
    }
  }

  return (
    <div className="border-b border-border pb-4">
      <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
        <input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="@handle" aria-label="Handle" className={cn(fieldClass, "min-w-40 flex-[2]")} />
        <select value={app} onChange={(event) => setApp(event.target.value)} aria-label="App" className={cn(fieldClass, "min-w-28 flex-1")}>
          {PERSON_APPS.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={followers} onChange={(event) => setFollowers(event.target.value)} placeholder="Followers" inputMode="numeric" aria-label="Followers" className={cn(fieldClass, "min-w-28 flex-1")} />
        <select value={tier} onChange={(event) => setTier(event.target.value)} aria-label="Type" className={cn(fieldClass, "min-w-36 flex-1")}>
          {PERSON_TIERS.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category" aria-label="Category" className={cn(fieldClass, "min-w-32 flex-1")} />
        <input value={overlap} onChange={(event) => setOverlap(event.target.value)} placeholder="Match %" inputMode="numeric" aria-label="Match" className={cn(fieldClass, "w-28")} />
        <input value={pay} onChange={(event) => setPay(event.target.value)} placeholder="Pay ₦" inputMode="numeric" aria-label="Pay in naira" className={cn(fieldClass, "min-w-32 flex-1")} />
        <select value={asSuggestion ? "suggest" : "roster"} onChange={(event) => setAsSuggestion(event.target.value === "suggest")} aria-label="Add to" className={cn(fieldClass, "min-w-36")}>
          <option value="roster">Added</option>
          <option value="suggest">Suggested</option>
        </select>
        <Button type="submit" disabled={busy || !normalizeHandle(handle)} className="h-10">Add</Button>
      </form>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-muted-foreground">Paste a list</summary>
        <div className="mt-3 space-y-2">
          <Textarea
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={5}
            placeholder={"One per line: handle, app, followers, pay, category, match\n@ada, Instagram, 12k, 50000, Engineering, 82\n@tunde, X, 3400, 0, Founders, 64"}
            aria-label="Paste many creators"
          />
          <Button type="button" variant="outline" disabled={busy || !pasted.trim()} onClick={() => void handlePaste()}>
            Add all
          </Button>
        </div>
      </details>
    </div>
  )
}

function PersonRow({ person, canEdit }: { person: CampaignPerson; canEdit: boolean }) {
  const [handle, setHandle] = useState(person.handle)
  const [followers, setFollowers] = useState(String(person.followers || ""))
  const [postLink, setPostLink] = useState(person.postLink)
  const [pay, setPay] = useState(String(person.pay || ""))

  // Take in edits made elsewhere, e.g. another tab or teammate.
  useEffect(() => setHandle(person.handle), [person.handle])
  useEffect(() => setFollowers(String(person.followers || "")), [person.followers])
  useEffect(() => setPostLink(person.postLink), [person.postLink])
  useEffect(() => setPay(String(person.pay || "")), [person.pay])

  async function save(patch: Partial<CampaignPerson>) {
    try {
      await updateCampaignPerson(person.id, patch)
    } catch (error) {
      console.error("Error saving person:", error)
      toast.error("That change didn't save.")
    }
  }

  async function remove() {
    try {
      await deleteCampaignPerson(person.id)
    } catch (error) {
      console.error("Error removing person:", error)
      toast.error("Couldn't remove them.")
    }
  }

  const link = person.postLink && /^https?:\/\//i.test(person.postLink) ? person.postLink : ""

  if (!canEdit) {
    return (
      <tr className="border-b border-border last:border-0">
        <td className="px-3 py-3 font-medium">{person.handle}</td>
        <td className="px-3 py-3">{person.app}</td>
        <td className="px-3 py-3 tabular-nums">{person.followers ? naira(person.followers) : "—"}</td>
        <td className="px-3 py-3">{person.tier}</td>
        <td className="px-3 py-3">{person.wave ? `Day ${person.wave}` : "—"}</td>
        <td className="px-3 py-3">{person.status}</td>
        <td className="max-w-0 truncate px-3 py-3">
          {link ? <a href={link} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-4">{person.postLink}</a> : person.postLink || "—"}
        </td>
        <td className="px-3 py-3 tabular-nums">{naira(person.pay)}</td>
        <td className="px-3 py-3 text-center">{person.paid ? "Yes" : "No"}</td>
        <td className="px-3 py-3 text-center">{person.labelled ? "Yes" : "No"}</td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-1 py-1.5">
        <input
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          onBlur={() => {
            const next = normalizeHandle(handle)
            if (!next) return setHandle(person.handle)
            setHandle(next)
            if (next !== person.handle) void save({ handle: next })
          }}
          aria-label="Handle"
          className={cn(cellClass, "font-medium")}
        />
      </td>
      <td className="px-1 py-1.5">
        <select value={person.app} onChange={(event) => void save({ app: event.target.value })} aria-label="App" className={cellClass}>
          {[...new Set([...PERSON_APPS, person.app])].map((item) => <option key={item}>{item}</option>)}
        </select>
      </td>
      <td className="px-1 py-1.5">
        <input
          value={followers}
          onChange={(event) => setFollowers(event.target.value)}
          onBlur={() => { const next = parseCount(followers); setFollowers(String(next || "")); if (next !== person.followers) void save({ followers: next }) }}
          inputMode="numeric"
          aria-label="Followers"
          className={cn(cellClass, "tabular-nums")}
        />
      </td>
      <td className="px-1 py-1.5">
        <select value={person.tier} onChange={(event) => void save({ tier: event.target.value })} aria-label="Type" className={cellClass}>
          {[...new Set([...PERSON_TIERS, person.tier])].map((item) => <option key={item}>{item}</option>)}
        </select>
      </td>
      <td className="px-1 py-1.5">
        <select value={person.wave} onChange={(event) => void save({ wave: event.target.value })} aria-label="Posting day" className={cellClass}>
          {PERSON_WAVES.map((item) => <option key={item} value={item}>{item ? `Day ${item}` : "—"}</option>)}
        </select>
      </td>
      <td className="px-1 py-1.5">
        <select value={person.status} onChange={(event) => void save({ status: event.target.value })} aria-label="Status" className={cellClass}>
          {[...new Set([...PERSON_STATUSES, person.status])].map((item) => <option key={item}>{item}</option>)}
        </select>
      </td>
      <td className="px-1 py-1.5">
        <div className="flex items-center gap-2">
          <input
            value={postLink}
            onChange={(event) => setPostLink(event.target.value)}
            onBlur={() => { const next = postLink.trim(); if (next !== person.postLink) void save({ postLink: next }) }}
            placeholder="Paste link"
            aria-label="Post link"
            className={cellClass}
          />
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="shrink-0 px-1 text-sm text-accent underline underline-offset-4">Open</a>
          )}
        </div>
      </td>
      <td className="px-1 py-1.5">
        <input
          value={pay}
          onChange={(event) => setPay(event.target.value)}
          onBlur={() => { const next = parseCount(pay); setPay(String(next || "")); if (next !== person.pay) void save({ pay: next }) }}
          inputMode="numeric"
          placeholder="0"
          aria-label="Pay in naira"
          className={cn(cellClass, "tabular-nums")}
        />
      </td>
      <td className="px-1 py-1.5 text-center">
        <input type="checkbox" checked={person.paid} onChange={(event) => void save({ paid: event.target.checked })} aria-label="Paid" className="size-4 accent-foreground" />
      </td>
      <td className="px-1 py-1.5 text-center">
        <input type="checkbox" checked={person.labelled} onChange={(event) => void save({ labelled: event.target.checked })} aria-label="Marked as an ad" title="Post is marked as an ad" className="size-4 accent-foreground" />
      </td>
      <td className="px-1 py-1.5 text-center">
        <button
          type="button"
          onClick={() => void remove()}
          aria-label={`Remove ${person.handle}`}
          title="Remove"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </td>
    </tr>
  )
}

function downloadCsv(people: CampaignPerson[]) {
  const header = ["Handle", "App", "Followers", "Type", "Posting day", "Status", "Post link", "Pay (NGN)", "Paid", "Marked as ad"]
  const rows = people.map((person) => [
    person.handle, person.app, person.followers, person.tier, person.wave, person.status, person.postLink, person.pay, person.paid ? "Yes" : "No", person.labelled ? "Yes" : "No",
  ])
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "campaign-creators.csv"
  anchor.click()
  URL.revokeObjectURL(url)
}

/** The client posts the story first; this shows where their announcement post stands. */
function FounderAnchor({ content }: { content: CampaignCreative[] }) {
  const announcement = content.find((item) => item.type === "text" && /announcement/i.test(item.title))
  return (
    <section>
      <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">Your post</h3>
      <div className="mt-4 flex items-center gap-4 border-b border-border pb-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-base font-semibold text-foreground" aria-hidden="true">Y</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">You</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {announcement ? `Announcement: ${creativeStatus(announcement)}` : "No announcement yet."}
          </p>
        </div>
      </div>
    </section>
  )
}

const OVERLAP_STEPS = [0, 25, 50, 75]

/**
 * Creators ranked by how well their audience matches the client's, not by
 * follower count. Anyone can be added to the roster or taken off it.
 */
function RosterMatching({
  people,
  project,
  canEdit,
  canReview,
  onPatched,
}: {
  people: CampaignPerson[]
  project: Project
  canEdit: boolean
  canReview: boolean
  onPatched?: (patch: Partial<Project>) => void
}) {
  const [category, setCategory] = useState("All")
  const [minOverlap, setMinOverlap] = useState(0)
  const [target, setTarget] = useState(project.rosterTarget ?? "")
  useEffect(() => setTarget(project.rosterTarget ?? ""), [project.rosterTarget])

  const rosterCount = people.filter(onRoster).length
  const categories = [...new Set(people.map((person) => person.category).filter((value): value is string => Boolean(value)))].sort()
  const rows = people
    .filter((person) => category === "All" || person.category === category)
    .filter((person) => (person.overlap ?? 0) >= minOverlap)
    .sort((a, b) => (b.overlap ?? 0) - (a.overlap ?? 0))

  async function setOnRoster(person: CampaignPerson, next: boolean) {
    try {
      await updateCampaignPerson(person.id, { onRoster: next })
    } catch (error) {
      console.error("Error changing roster:", error)
      toast.error("That change didn't save.")
    }
  }

  async function saveTarget() {
    const next = target.trim()
    if (next === (project.rosterTarget ?? "")) return
    try {
      await updateProject(project.id, { rosterTarget: next })
      onPatched?.({ rosterTarget: next })
    } catch (error) {
      console.error("Error saving roster target:", error)
      toast.error("That change didn't save.")
    }
  }

  const selectClass = "h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <section>
      <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">Creators</h3>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-base text-muted-foreground">
        <span><span className="font-medium text-foreground">{rosterCount}</span> added</span>
        {canEdit ? (
          <label className="flex items-center gap-2">
            <span>· target</span>
            <input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              onBlur={() => void saveTarget()}
              placeholder="80–100"
              aria-label="Roster target"
              className="h-8 w-24 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        ) : project.rosterTarget ? (
          <span>· target {project.rosterTarget}</span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <label className="flex items-center gap-2">
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)} className={cn(selectClass, "min-w-36")}>
            <option>All</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Match
          <select value={minOverlap} onChange={(event) => setMinOverlap(Number(event.target.value))} className={selectClass}>
            {OVERLAP_STEPS.map((step) => <option key={step} value={step}>{step}%</option>)}
          </select>
        </label>
      </div>

      {people.length === 0 ? (
        <p className="mt-4 border-b border-border py-6 text-sm text-muted-foreground">No creators yet.</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 border-b border-border py-6 text-sm text-muted-foreground">No matches.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-sm text-muted-foreground">
              <tr>
                <th scope="col" className="py-3 pr-3 font-medium">Creator</th>
                <th scope="col" className="px-3 py-3 font-medium">Category</th>
                <th scope="col" className="px-3 py-3 font-medium">Match</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Followers</th>
                {canReview && <th scope="col" className="w-28 py-3 pl-3"><span className="sr-only">Add or remove</span></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((person) => {
                const overlap = Math.max(0, Math.min(100, person.overlap ?? 0))
                const inRoster = onRoster(person)
                return (
                  <tr key={person.id} className="border-b border-border">
                    <td className="py-3 pr-3 text-foreground">{person.handle}</td>
                    <td className="px-3 py-3 text-foreground">{person.category || "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                          <div className="h-full rounded-full bg-foreground" style={{ width: `${overlap}%` }} />
                        </div>
                        <span className="tabular-nums text-foreground">{overlap}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">{compactCount(person.followers)}</td>
                    {canReview && (
                      <td className="py-2 pl-3 text-right">
                        {inRoster ? (
                          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void setOnRoster(person, false)}>Remove</Button>
                        ) : (
                          <Button type="button" size="sm" onClick={() => void setOnRoster(person, true)}>Add</Button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
