"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Image from "next/image"
import { ChevronRight, Download, Eye, Loader2, Mail, Printer, Trash2 } from "lucide-react"

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
import { getEstimates, getInvoices, INVOICE_ISSUER } from "@/lib/billing"
import type { BusinessProfile } from "@/lib/business-profile"
import { cn } from "@/lib/utils"

/**
 * Shared pieces for the invoice and estimate editors: a stack of white cards
 * on a grey page, with every action in one bar pinned to the top.
 */

/** Print, Download and Email, for the Share dialog of an invoice or estimate. */
export function billingShareActions({ onPrint, onDownload, downloading = false, onEmail, saving = false }: {
  onPrint: () => void
  onDownload: () => void
  downloading?: boolean
  /** Saves, then opens an email with the PDF attached. */
  onEmail?: () => void
  saving?: boolean
}) {
  return [
    { label: "Print", icon: <Printer />, onSelect: onPrint },
    { label: "Download", icon: downloading ? <Loader2 className="animate-spin" /> : <Download />, onSelect: onDownload, disabled: downloading },
    ...(onEmail ? [{ label: "Email", icon: <Mail />, onSelect: onEmail, disabled: saving }] : []),
  ]
}

/**
 * The bar across the top of the editor: back and status on the left, then delete
 * and any round tools, then Preview, Share and Save.
 */
export function EditorToolbar({
  status,
  tools,
  shareAction,
  deleteAction,
  onPreview,
  saving,
  saveLabel,
  leading,
  flush = false,
  autosaveStatus,
  trailing,
}: {
  /** Edge to edge across its pane, at the height of the Ngai panel's header. */
  flush?: boolean
  /** Set when it saves by itself: the Save button goes, with nothing in its place. */
  autosaveStatus?: string
  /** After Save, e.g. minimize and close. */
  trailing?: ReactNode
  /** Before the status, e.g. a back button. */
  leading?: ReactNode
  status?: { label: string; className: string }
  /** Round icon buttons after Delete, e.g. payment settings. */
  tools?: ReactNode
  /** The Share button; its dialog holds Print, Download and Email. */
  shareAction?: ReactNode
  /** An EditorDeleteCard, for saved records. */
  deleteAction?: ReactNode
  onPreview: () => void
  saving: boolean
  saveLabel: string
}) {
  return (
    <div className={cn(
      "sticky top-0 z-20 flex items-center gap-2 border-b border-border",
      flush ? "h-14 shrink-0 bg-background px-3 lg:px-4" : "-mx-2 -mt-2 bg-card px-2 py-2 sm:-mx-4 sm:-mt-3 sm:rounded-t-2xl sm:px-4",
    )}>
      {leading}
      {status && <span className={cn("shrink-0 rounded-full px-3 py-1 font-medium", status.className)}>{status.label}</span>}
      <div className="ml-auto flex min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {deleteAction}
        {tools}
        <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />
        <Button type="button" variant="secondary" size="sm" onClick={onPreview} aria-label="Preview" className="billing-editor-action shrink-0 rounded-md shadow-none">
          <Eye className="size-4" aria-hidden="true" />
          <span className="max-sm:sr-only">Preview</span>
        </Button>
        {shareAction}
        {autosaveStatus === undefined && (
          <Button type="submit" size="sm" disabled={saving} className="billing-editor-action shrink-0 rounded-md">
            {saving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
            {saveLabel}
          </Button>
        )}
        {trailing}
      </div>
    </div>
  )
}

/** Who the record is from, and its kind and number. The actions live in EditorToolbar. */
export function EditorHeader({
  issuer,
  kind,
  number,
  visualCnsBrand = false,
}: {
  issuer: BusinessProfile | null
  kind: string
  number: string
  visualCnsBrand?: boolean
}) {
  return (
    <header className="flex items-start justify-between gap-4 px-1 py-2">
      <div className="flex min-w-0 items-center gap-3">
        {visualCnsBrand ? (
          <Image src="/visualhqlogo.svg" alt="" width={44} height={44} className="size-11 shrink-0" />
        ) : issuer?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={issuer.logoUrl} alt="" width={44} height={44} className="size-11 shrink-0 rounded object-cover" />
        ) : (
          <Image src="/visualhqlogo.svg" alt="" width={44} height={44} className="size-11 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="billing-editor-brand truncate">{visualCnsBrand ? INVOICE_ISSUER.name : issuer?.name || "Your company"}</p>
          {(visualCnsBrand ? INVOICE_ISSUER.website : issuer?.website) && <p className="truncate text-muted-foreground">{visualCnsBrand ? INVOICE_ISSUER.website : issuer?.website}</p>}
        </div>
      </div>
      <div className="min-w-0 shrink-0 text-right">
        <p className="text-muted-foreground">{kind}</p>
        <p className="billing-editor-number truncate">{number || "—"}</p>
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
    <section className={cn("rounded-2xl bg-muted/50 p-3 sm:p-4", className)}>
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
        aria-label={`Delete ${label}`}
        title={`Delete ${label}`}
        className="billing-editor-delete grid size-8 shrink-0 place-items-center rounded-md text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Trash2 className="size-4" aria-hidden="true" />
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

/**
 * Editor actions in one row, stuck to the bottom of the screen: the delete icon
 * on the left, Preview, Send and Save on the right.
 * The page pads its bottom by 1.5rem from md up, so md:-bottom-6 sits it flush
 * with the screen edge instead of floating above that padding.
 */
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
