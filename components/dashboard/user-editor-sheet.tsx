"use client"

import { useEffect, useState } from "react"
import { UserForm } from "@/components/dashboard/user-form"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { getUserByCompanyId, type AppUser } from "@/lib/users"
import type { UserRole } from "@/lib/users"

/**
 * The user record editor. Callers either hand it the user, ask for a blank one
 * with `isNew`, or give a `companyId` and let it look the account up.
 */
export function UserEditorSheet({
  open,
  user,
  companyId,
  isNew,
  fixedRole,
  subjectNoun = "user",
  joinWorkspaceId,
  joinWorkspaceName,
  onClose,
  onSaved,
}: {
  open: boolean
  user?: AppUser | null
  companyId?: string
  isNew?: boolean
  fixedRole?: UserRole
  subjectNoun?: "user" | "client" | "company" | "contact"
  /** When creating, attach the new person to this existing workspace instead of giving them their own. */
  joinWorkspaceId?: string
  joinWorkspaceName?: string
  onClose: () => void
  onSaved: (uid: string) => void | Promise<void>
}) {
  const [resolved, setResolved] = useState<AppUser | null>(user ?? null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const lookup = Boolean(open && !isNew && !user && companyId)

  useEffect(() => {
    if (user !== undefined) setResolved(user)
  }, [user])

  useEffect(() => {
    if (!lookup || !companyId) return
    let active = true
    setLoading(true)
    setFailed(false)
    getUserByCompanyId(companyId)
      .then((found) => {
        if (!active) return
        if (found) setResolved(found)
        else setFailed(true)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [lookup, companyId])

  const subject = isNew ? null : resolved
  const subjectLabel = joinWorkspaceId ? "person" : subjectNoun

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{isNew ? `New ${subjectLabel}` : `Edit ${subjectLabel}`}</SheetTitle>
          <SheetDescription>
            {isNew ? "" : subject?.email || subject?.displayName || ""}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 p-4" role="status" aria-label="Loading user">
            <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" />
          </div>
        ) : failed ? (
          <p className="p-4 text-sm text-muted-foreground">
            No account found for this client.
          </p>
        ) : (
          open && (
            <UserForm
              key={subject?.uid ?? "new"}
              user={subject}
              fixedRole={fixedRole}
              subjectNoun={subjectNoun}
              workspaceId={isNew ? joinWorkspaceId : undefined}
              workspaceName={joinWorkspaceName}
              onSaved={onSaved}
              onCancel={onClose}
            />
          )
        )}
      </SheetContent>
    </Sheet>
  )
}
