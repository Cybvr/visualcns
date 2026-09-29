"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type Project } from "@/lib/projects"
import { cn } from "@/lib/utils"

// Shared Notion-style inline table editors, used by the client dashboard and
// the admin tables. Each editor commits a single field and leaves persistence
// to the caller (optimistic update + write).

export function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", className)}>{children}</span>
}

// Click a cell to edit the text; commit on Enter/blur, discard on Escape.
export function InlineText({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  function commit() {
    setEditing(false)
    const next = draft.trim()
    if (next && next !== value) onCommit(next)
    else setDraft(value)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="-mx-1 w-full truncate rounded px-1 py-0.5 text-left font-medium hover:bg-muted/60"
      >
        {value || <span className="text-muted-foreground">Untitled</span>}
      </button>
    )
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit()
        if (e.key === "Escape") {
          setDraft(value)
          setEditing(false)
        }
      }}
      className="-mx-1 w-full rounded border border-input bg-background px-1 py-0.5 font-medium outline-none focus:ring-2 focus:ring-ring"
    />
  )
}

// A borderless Select that sits flush inside a table cell.
export function InlineSelect<T extends string>({
  value,
  options,
  onChange,
  renderOption,
  trigger,
}: {
  value: T
  options: readonly T[]
  onChange: (v: T) => void
  renderOption: (v: T) => ReactNode
  trigger: ReactNode
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className="h-auto w-full border-0 bg-transparent p-0 shadow-none hover:bg-muted/60 focus:ring-0 [&>svg]:opacity-40">
        {trigger}
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {renderOption(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Project picker cell: options are the projects passed in (already scoped to the
// relevant client by the caller).
export function InlineProject({
  projectId,
  projects,
  onChange,
}: {
  projectId: string
  projects: Project[]
  onChange: (p: Project) => void
}) {
  if (projects.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <Select
      value={projectId || undefined}
      onValueChange={(id) => {
        const p = projects.find((x) => x.id === id)
        if (p) onChange(p)
      }}
    >
      <SelectTrigger className="h-auto w-full border-0 bg-transparent p-0 text-muted-foreground shadow-none hover:bg-muted/60 focus:ring-0 [&>svg]:opacity-40">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function InlineDate({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onCommit(e.target.value)}
      className="w-full min-w-0 rounded bg-transparent px-1 py-0.5 text-muted-foreground outline-none hover:bg-muted/60 focus:ring-2 focus:ring-ring"
    />
  )
}
