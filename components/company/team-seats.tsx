"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, UserPlus, X } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { PlanKey } from "@/lib/subscription"

/**
 * A company's team seats: its people plus pending invites, capped by the
 * Visitor Sign-in plan. The company's own staff and agency admins can invite
 * and remove people. Backed by /api/visitors/staff.
 */

export type TeamSeatInfo = {
  staff: { id: string; name: string; email: string }[]
  pending: { id: string; email: string }[]
  seats: number
  /** null means no limit. */
  limit: number | null
  plan: PlanKey | null
}

export function useTeamSeats(companyId: string, enabled = true) {
  const { user } = useAuth()
  const [info, setInfo] = useState<TeamSeatInfo | null>(null)

  const call = useCallback(async (method: "GET" | "POST" | "DELETE", body?: Record<string, string>) => {
    if (!user) throw new Error("Please sign in again.")
    const response = await fetch(method === "GET" ? `/api/visitors/staff?companyId=${encodeURIComponent(companyId)}` : "/api/visitors/staff", {
      method,
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify({ companyId, ...body }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.")
    return data as Record<string, unknown>
  }, [companyId, user])

  const reload = useCallback(async () => {
    try {
      setInfo(await call("GET") as unknown as TeamSeatInfo)
    } catch {
      setInfo(null)
    }
  }, [call])

  useEffect(() => {
    if (enabled && user && companyId) void reload()
  }, [enabled, user, companyId, reload])

  const removePerson = useCallback(async (userId: string) => {
    await call("DELETE", { userId })
    await reload()
  }, [call, reload])

  return { info, reload, call, removePerson }
}

/** Seat count, invite by email, and pending invites. Sits at the top of the Team tab. */
export function TeamInvitePanel({ info, call, onChange }: {
  info: TeamSeatInfo
  call: (method: "GET" | "POST" | "DELETE", body?: Record<string, string>) => Promise<Record<string, unknown>>
  onChange: () => void
}) {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const full = info.limit !== null && info.seats >= info.limit

  async function invite() {
    setBusy("invite")
    setError("")
    try {
      const result = await call("POST", { email: email.trim() })
      setEmail("")
      if (result.emailed) toast.success("Invite sent.")
      else {
        // Email isn't set up for this agency, so hand them the link to send themselves.
        await navigator.clipboard.writeText(String(result.inviteUrl || "")).catch(() => undefined)
        toast.success("Invite made. We couldn't email it, so the link is copied. Send it to them.")
      }
      onChange()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't send the invite.")
    } finally {
      setBusy("")
    }
  }

  async function cancel(inviteId: string) {
    setBusy(inviteId)
    try {
      await call("DELETE", { inviteId })
      onChange()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Couldn't cancel the invite. Try again.")
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <form onSubmit={(event) => { event.preventDefault(); void invite() }} className="flex gap-2">
        <Input type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="colleague@company.com" aria-label="Email to invite" disabled={busy === "invite"} className="h-9" />
        <Button type="submit" size="sm" className="h-9 shrink-0" disabled={busy === "invite" || !email.trim()}>
          {busy === "invite" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />}
          Invite
        </Button>
      </form>
      {full && !error && <p className="text-xs text-muted-foreground">You&apos;ve used all {info.limit} seats. Upgrade your plan to add more people.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {info.pending.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
          {info.pending.map((pending) => (
            <li key={pending.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{pending.email}</p>
                <p className="text-xs text-muted-foreground">Invited · waiting to accept</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => void cancel(pending.id)} disabled={busy === pending.id} aria-label={`Cancel invite for ${pending.email}`}>
                {busy === pending.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
