import type { ReactNode } from "react"
import { ArrowLeft, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/** Navigation and actions stay outside the mail, so they remain available while it scrolls. */
export function EmailReaderToolbar({ onBack, backLabel, actions }: {
  onBack: () => void
  backLabel: string
  actions?: ReactNode
}) {
  return (
    <div className="shrink-0 border-b border-border px-2 py-0.5 sm:px-3 sm:py-1">
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="-ml-1 size-10 sm:size-9" onClick={onBack} aria-label={backLabel} title={backLabel}><ArrowLeft className="size-[18px]" aria-hidden="true" /></Button>
        <span className="flex-1" />
        {actions}
      </div>
    </div>
  )
}

/** Subject, people, date and status are part of the scrollable mail surface. */
export function EmailReaderMessageHeader({ subject, summary, details, date, formatDate, status, children }: {
  subject: string
  /** Compact sender or recipient line; its chevron reveals the full addresses. */
  summary?: string
  /** Full address lines, such as "To …" and "From …". */
  details: string[]
  date?: string | null
  formatDate: (value: string) => string
  status?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="bg-white px-5 pt-4 text-neutral-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="break-words text-[1.375rem] leading-snug tracking-tight sm:text-base sm:font-semibold sm:tracking-normal">{subject || "(No subject)"}</h2>
          {summary ? (
            <div className="mt-1 flex min-w-0 items-center gap-1 text-sm text-neutral-600">
              <span className="min-w-0 truncate">{summary}</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900" aria-label="Show sender and recipient details" title="Show sender and recipient details"><ChevronDown className="size-4" aria-hidden="true" /></Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] space-y-2 p-3 text-sm">
                  {details.map((line) => <p key={line} className="break-words text-popover-foreground">{line}</p>)}
                </PopoverContent>
              </Popover>
            </div>
          ) : details.map((line, index) => <p key={line} className={index === 0 ? "mt-1 truncate text-sm text-neutral-600" : "truncate text-xs text-neutral-600"}>{line}</p>)}
        </div>
        {(date || status) && (
          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            {date && <time dateTime={date} className="text-xs text-neutral-600">{formatDate(date)}</time>}
            {status}
          </div>
        )}
      </div>
      {children && <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}
