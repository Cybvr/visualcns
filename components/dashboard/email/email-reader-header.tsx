import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

/** The top of an open email, the same in Inbox, Sent and Bin: back and actions, then subject, people, date and status. */
export function EmailReaderHeader({
  onBack,
  backLabel,
  actions,
  subject,
  details,
  date,
  formatDate,
  status,
  children,
}: {
  onBack: () => void
  backLabel: string
  /** Icon buttons on the right of the top row. */
  actions?: ReactNode
  subject: string
  /** Lines under the subject, such as "To …" and "From …". */
  details: string[]
  date?: string | null
  formatDate: (value: string) => string
  /** Shown under the date, such as Sent or Deleted. */
  status?: ReactNode
  /** Buttons under the header, such as Reply or Restore. */
  children?: ReactNode
}) {
  return (
    <div className="shrink-0 border-b border-border px-4 py-4 sm:px-5">
      <div className="mb-2 flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="-ml-2 size-10" onClick={onBack} aria-label={backLabel} title={backLabel}><ArrowLeft className="size-5" aria-hidden="true" /></Button>
        <span className="flex-1" />
        {actions}
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="break-words text-[1.375rem] leading-snug tracking-tight sm:text-base sm:font-semibold sm:tracking-normal">{subject || "(No subject)"}</h2>
          {details.map((line, index) => <p key={line} className={index === 0 ? "mt-1 truncate text-sm text-muted-foreground" : "truncate text-xs text-muted-foreground"}>{line}</p>)}
        </div>
        {(date || status) && (
          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            {date && <time dateTime={date} className="text-xs text-muted-foreground">{formatDate(date)}</time>}
            {status}
          </div>
        )}
      </div>
      {children && <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
