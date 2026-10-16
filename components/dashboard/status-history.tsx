"use client"

import type { StatusEvent } from "@/lib/status-history"
import { tsToMillis } from "@/lib/tasks"

function formatStatusChangeDate(value: unknown) {
  const millis = tsToMillis(value)
  return millis
    ? new Date(millis).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—"
}

export function StatusHistory({
  events,
  labels,
  loading = false,
  emptyLabel = "No status changes yet.",
}: {
  events: StatusEvent[]
  labels: Record<string, string>
  loading?: boolean
  emptyLabel?: string
}) {
  return (
    <section className="border-t border-border pt-5">
      <h3 className="text-sm font-medium text-foreground">Status history</h3>
      {loading ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading history…</p>
      ) : events.length ? (
        <ol className="mt-3 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0 text-foreground">
                {labels[event.fromStatus] ?? event.fromStatus} <span className="text-muted-foreground">→</span>{" "}
                <span className="font-medium">{labels[event.toStatus] ?? event.toStatus}</span>
              </span>
              <time
                className="shrink-0 text-xs tabular-nums text-muted-foreground"
                dateTime={tsToMillis(event.changedAt) ? new Date(tsToMillis(event.changedAt)).toISOString() : undefined}
              >
                {formatStatusChangeDate(event.changedAt)}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </section>
  )
}
