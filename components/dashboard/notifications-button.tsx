"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Bell } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { CompactListSkeleton } from "@/components/dashboard/compact-list-row"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { buildActivity, getCompanyActivity, type ActivityItem } from "@/lib/activity"
import { getContracts, getEstimates, getInvoices } from "@/lib/billing"
import { getProjects } from "@/lib/projects"
import { getTasks } from "@/lib/tasks"

const SEEN_KEY = "visualcns.notificationsSeenAt"

/** Where a notification jumps to in the workspace. */
function notificationHref(item: ActivityItem): string | undefined {
  switch (item.kind) {
    case "invoice": return `/dashboard/invoices/${item.refId}`
    case "estimate": return `/dashboard/estimates/${item.refId}`
    case "contract": return `/dashboard/contracts/${item.refId}`
    case "project": return "/dashboard/projects"
    case "task": return "/dashboard/tasks"
    default: return undefined
  }
}

function readSeenAt() {
  try { return Number(window.localStorage.getItem(SEEN_KEY)) || 0 } catch { return 0 }
}

/**
 * The bell in the header: recent activity, with a dot for anything new since it was last opened.
 * The dashboard lets it load its own; a company page passes the company's activity in.
 */
export function NotificationsButton({ activity, hrefFor = notificationHref, viewAllHref }: {
  activity?: ActivityItem[]
  hrefFor?: (item: ActivityItem) => string | undefined
  viewAllHref?: string
} = {}) {
  const { user, isAdmin, appUser } = useAuth()
  const companyId = appUser?.companyId ?? ""
  const [loaded, setLoaded] = useState<ActivityItem[] | null>(null)
  const items = activity ?? loaded
  const [seenAt, setSeenAt] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setSeenAt(readSeenAt())
  }, [])

  useEffect(() => {
    if (!user || activity) return
    let active = true
    // Admins see the whole agency, as on the home page; everyone else sees their own company.
    const load = isAdmin
      ? Promise.all([getProjects(), getTasks(), getInvoices(), getEstimates(), getContracts()])
        .then(([projects, tasks, invoices, estimates, contracts]) => buildActivity({ projects, tasks, invoices, estimates, contracts }, 20))
      : companyId ? getCompanyActivity(companyId, 20) : Promise.resolve([])
    load
      .then((next) => { if (active) setLoaded(next) })
      .catch(() => { if (active) setLoaded([]) })
    return () => { active = false }
  }, [user, isAdmin, companyId, Boolean(activity)])

  const unseenCount = items?.filter((item) => item.at > seenAt).length ?? 0
  const unseen = unseenCount > 0

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next) return
    const now = Date.now()
    setSeenAt(now)
    try { window.localStorage.setItem(SEEN_KEY, String(now)) } catch { /* Storage blocked; the dot just comes back next visit. */ }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={unseen ? `Notifications, ${unseenCount} unread` : "Notifications"}
          title="Notifications"
          className="relative rounded-full text-foreground hover:bg-muted/50 active:bg-muted/50"
        >
          <Bell className="size-[18px]" aria-hidden="true" />
          {unseen && <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-pink-500 px-1 text-[10px] leading-4 font-semibold text-white" aria-hidden="true">{unseenCount > 9 ? "9+" : unseenCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm font-medium">
          Notifications
          {viewAllHref && <Link href={viewAllHref} onClick={() => setOpen(false)} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">View all</Link>}
        </div>
        <div className="max-h-96 overflow-y-auto px-2 py-1" onClickCapture={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false) }}>
          {items === null ? (
            <div className="p-2"><CompactListSkeleton rows={4} /></div>
          ) : (
            <ActivityFeed items={items} hrefFor={hrefFor}showHeader={false} emptyLabel="No notifications yet." className="mt-0" />
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
