"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, UserPlus, X } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { PlanKey } from "@/lib/subscription"

/**
 * A company's team seats: its people plus outstanding legacy invites, capped by
 * the Visitor Sign-in plan. Staff and agency admins can add and remove people.
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

/** Add team members directly and resolve outstanding invitations. */
export function TeamMembersPanel({ info, call, onChange }: {
  info: TeamSeatInfo
  call: (method: "GET" | "POST" | "DELETE", body?: Record<string, string>) => Promise<Record<string, unknown>>
  onChange: () => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const nameInput = useRef<HTMLInputElement>(null)
  const full = info.limit !== null && info.seats >= info.limit

  async function addMember() {
    setBusy("add")
    setError("")
    try {
      await call("POST", { name: name.trim(), email: email.trim() })
      setName("")
      setEmail("")
      toast.success("Team member added.")
      onChange()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't add the team member.")
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

  function preparePending(address: string) {
    setEmail(address)
    setName("")
    nameInput.current?.focus()
  }

  return (
    <div className="mt-3 space-y-3">
      <form onSubmit={(event) => { event.preventDefault(); void addMember() }} className="flex flex-col gap-2 sm:flex-row">
        <Input ref={nameInput} value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" aria-label="Team member name" required disabled={busy === "add"} className="h-9 min-w-0" />
        <Input type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="colleague@company.com" aria-label="Team member email" required disabled={busy === "add"} className="h-9 min-w-0" />
        <Button type="submit" size="sm" className="h-9 shrink-0" disabled={busy === "add" || !name.trim() || !email.trim()}>
          {busy === "add" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />}
          Add
        </Button>
      </form>
      {full && !error && <p className="text-xs text-muted-foreground">{info.pending.length ? `You've used all ${info.limit} seats. You can still add someone who already has a pending invite.` : `You've used all ${info.limit} seats. Upgrade your plan to add more people.`}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {info.pending.length > 0 && (
        <div className="space-y-2">
          {info.pending.map((pending) => (
            <MobileDataCard
              key={pending.id}
              surface="muted"
              icon={<UserPlus className="size-5 text-muted-foreground" aria-hidden="true" />}
              title={pending.email}
              subtitle="Pending invite · add directly or cancel"
              trailing={<Button type="button" variant="outline" size="sm" onClick={() => preparePending(pending.email)}>Add now</Button>}
              menuLabel={`Actions for ${pending.email}`}
              actions={{
                noun: "invite",
                name: pending.email,
                extra: (
                  <DropdownMenuItem disabled={busy === pending.id} onSelect={() => void cancel(pending.id)}>
                    {busy === pending.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
                    Cancel invite
                  </DropdownMenuItem>
                ),
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
