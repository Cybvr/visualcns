"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Image from "next/image"
import { ChevronRight, Download, Loader2, Mail, Printer } from "lucide-react"

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
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getEstimates, getInvoices } from "@/lib/billing"
import type { BusinessProfile } from "@/lib/business-profile"
import { cn } from "@/lib/utils"

/**
 * Shared pieces for the invoice and estimate editors: a stack of white cards
 * on a grey page, with Preview and Save pinned to the bottom.
 */

export function EditorHeader({
  issuer,
  kind,
  number,
  status,
  onPrint,
  onDownload,
  downloading = false,
}: {
  issuer: BusinessProfile | null
  kind: string
  number: string
  status?: { label: string; className: string }
  onPrint: () => void
  onDownload: () => void
  downloading?: boolean
}) {
  const round =
    "inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary outline-none transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
  return (
    <header className="flex items-start justify-between gap-4 px-1 py-2">
      <div className="flex min-w-0 items-center gap-3">
        {issuer?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={issuer.logoUrl} alt="" width={44} height={44} className="size-11 shrink-0 rounded object-cover" />
        ) : (
          <Image src="/visualhqlogo.svg" alt="" width={44} height={44} className="size-11 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="billing-editor-brand truncate">{issuer?.name || "Your company"}</p>
          {issuer?.website && <p className="truncate text-muted-foreground">{issuer.website}</p>}
        </div>
      </div>
      <div className="min-w-0 shrink-0 text-right">
        <p className="text-muted-foreground">{kind}</p>
        <p className="billing-editor-number truncate">{number || "—"}</p>
        <div className="mt-2 flex items-center justify-end gap-2">
          {status && (
            <span className={cn("rounded-full px-3 py-1 font-medium", status.className)}>{status.label}</span>
          )}
          <button type="button" onClick={onPrint} title="Print" aria-label="Print" className={round}>
            <Printer className="size-[18px]" aria-hidden="true" />
          </button>
          <button type="button" onClick={onDownload} disabled={downloading} title="Download PDF" aria-label="Download PDF" className={round}>
            {downloading ? <Loader2 className="size-[18px] animate-spin" aria-hidden="true" /> : <Download className="size-[18px]" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  )
}

export function EditorCard({
  title,
  action,
  children,
  className,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-background p-4", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="billing-editor-section">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function EditorField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5 block">
        {label}
      </Label>
      {children}
    </div>
  )
}

/** Two sub-segments side by side, e.g. Internal / Link. */
export function EditorToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex rounded-full bg-card p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-full px-3.5 py-1 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            value === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** A label with a one-line preview that opens into a text box when tapped. */
export function ExpandableTextRow({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  const [open, setOpen] = useState(false)
  const preview = value.replace(/\s+/g, " ").trim()

  return (
    <div className="border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="billing-editor-row-label shrink-0">{label}</span>
        {!open && (
          <span className="min-w-0 flex-1 truncate text-right text-muted-foreground">
            {preview || placeholder || "Add"}
          </span>
        )}
        {open && <span className="flex-1" />}
        <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} aria-hidden="true" />
      </button>
      {open && (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          aria-label={label}
          className="mt-3"
          autoFocus
        />
      )}
    </div>
  )
}

export function EditorDeleteCard({
  label,
  confirmTitle,
  confirmDescription,
  onDelete,
}: {
  label: string
  confirmTitle: string
  confirmDescription: string
  onDelete: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="billing-editor-delete w-full rounded-2xl border border-border bg-background p-4 text-center text-destructive outline-none transition-colors hover:bg-destructive/5 focus-visible:ring-2 focus-visible:ring-ring"
      >
        Delete {label}
      </button>
      <AlertDialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/** Editor actions, stuck to the bottom of the screen. */
export function EditorActionBar({
  onPreview,
  onSend,
  saving,
  saveLabel,
}: {
  onPreview: () => void
  onSend?: () => void
  saving: boolean
  saveLabel: string
}) {
  return (
    <div className={cn("sticky bottom-0 z-20 -mx-4 mt-2 gap-2 border-t border-border bg-background px-4 py-3 sm:rounded-b-2xl", onSend ? "grid grid-cols-[1fr_0.9fr_1.4fr] sm:flex" : "flex sm:gap-3")}>
      <Button type="button" onClick={onPreview} className={cn("billing-editor-action h-12 min-w-0 rounded-xl bg-primary/10 text-primary shadow-none hover:bg-primary/15", onSend ? "px-2 sm:px-6" : "px-6")}>
        Preview
      </Button>
      {onSend && (
        <Button type="button" onClick={onSend} disabled={saving} title="Save and open email draft" className="billing-editor-action h-12 min-w-0 rounded-xl bg-primary/10 px-2 text-primary shadow-none hover:bg-primary/15 sm:px-5">
          <Mail className="hidden size-4 sm:block" aria-hidden="true" />
          Send
        </Button>
      )}
      <Button type="submit" disabled={saving} className="billing-editor-action h-12 min-w-0 flex-1 rounded-xl bg-primary px-2 text-primary-foreground hover:bg-primary/90 sm:px-4">
        {saving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
        {saveLabel}
      </Button>
    </div>
  )
}

/**
 * Departments are the names a client's invoices and estimates were addressed
 * to before, e.g. "School of Media and Communications" at a university.
 */
export function useDepartmentNames(companyId: string, current: string): string[] {
  const [names, setNames] = useState<{ companyId: string; name: string }[]>([])

  useEffect(() => {
    let active = true
    Promise.all([getInvoices().catch(() => []), getEstimates().catch(() => [])]).then(([invoices, estimates]) => {
      if (!active) return
      setNames([
        ...invoices.map((invoice) => ({ companyId: invoice.companyId, name: invoice.billTo?.name ?? "" })),
        ...estimates.map((estimate) => ({ companyId: estimate.companyId, name: estimate.preparedFor?.name ?? "" })),
      ])
    })
    return () => {
      active = false
    }
  }, [])

  return useMemo(() => {
    const unique = new Map<string, string>()
    for (const entry of names) {
      const name = entry.name.trim()
      if (entry.companyId === companyId && name) unique.set(name.toLowerCase(), name)
    }
    const trimmed = current.trim()
    if (trimmed) unique.set(trimmed.toLowerCase(), trimmed)
    return [...unique.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  }, [names, companyId, current])
}

export function DepartmentField({
  id,
  companyId,
  value,
  onChange,
}: {
  id: string
  companyId: string
  value: string
  onChange: (value: string) => void
}) {
  const names = useDepartmentNames(companyId, value)
  return (
    <Combobox
      id={id}
      options={names.map((name) => ({ value: name, label: name }))}
      value={value.trim()}
      onChange={onChange}
      onCreate={async (name) => ({ value: name, label: name })}
      placeholder="Choose or add a department"
      searchPlaceholder="Search or type a new one"
      emptyText="No departments yet."
      createLabel={(query) => `Use “${query}”`}
      createHint="Type a department name"
      className="billing-editor-combobox"
    />
  )
}
