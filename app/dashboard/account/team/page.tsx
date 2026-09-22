"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { Check, Copy, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { AccountHeader, AccountNav } from "@/components/account/account-nav"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getUsers, userRoleLabel, type AppUser } from "@/lib/users"

type Invite = {
  id: string
  email: string
  role: string
  status: string
  expiresAt?: { _seconds?: number; seconds?: number }
}

function inviteExpiry(invite: Invite): number {
  const seconds = invite.expiresAt?._seconds ?? invite.expiresAt?.seconds
  return seconds ? seconds * 1000 : 0
}

function initial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?"
}

/**
 * The people who run this tenant: everyone with admin access, plus admin
 * invites that haven't been used yet. Inviting creates a link to send.
 */
export default function AccountTeamPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [members, setMembers] = useState<AppUser[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [users, response] = await Promise.all([
        getUsers(),
        fetch("/api/admin/invites", { headers: { Authorization: `Bearer ${await user.getIdToken()}` } }),
      ])
      setMembers(
        users
          .filter((u) => u.role === "admin" || u.role === "superadmin")
          .sort((a, b) => (a.displayName || a.email || "").localeCompare(b.displayName || b.email || "")),
      )
      const data = await response.json()
      if (response.ok) {
        const now = Date.now()
        setInvites(
          (data.invites as Invite[]).filter(
            (invite) => invite.role === "admin" && invite.status === "pending" && inviteExpiry(invite) > now,
          ),
        )
      }
    } catch (loadError) {
      console.error("Error loading team:", loadError)
      setError("Couldn't load the team.")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && isAdmin) void load()
  }, [authLoading, isAdmin, load])

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault()
    const address = email.trim()
    if (!address || !user || inviting) return
    setInviting(true)
    setError("")
    setInviteUrl("")
    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: address, role: "admin" }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not create invite")
      setInviteUrl(data.inviteUrl)
      setCopied(false)
      setEmail("")
      void load()
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Could not create invite")
    } finally {
      setInviting(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast.success("Invite link copied")
    } catch {
      toast.error("Couldn't copy. Select the link and copy it.")
    }
  }

  if (!authLoading && !isAdmin) return null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-9 sm:px-6">
      <AccountNav />
      <AccountHeader title="Team" description="People who can manage this workspace. Invite someone and send them the link." />

      <form onSubmit={handleInvite} className="mt-6 space-y-1.5">
        <Label htmlFor="invite-email">Invite by email</Label>
        <div className="flex gap-2">
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            className="min-w-0 flex-1"
            required
          />
          <Button type="submit" disabled={inviting}>
            {inviting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Invite
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      {inviteUrl && (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-sm font-medium">Invite link ready</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Send this to them. It works once and expires in 7 days.</p>
          <div className="mt-2 flex gap-2">
            <Input readOnly value={inviteUrl} onFocus={(event) => event.target.select()} className="min-w-0 flex-1 text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={() => void copyLink()} aria-label="Copy invite link">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <DashboardPageSkeleton rows={4} />
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-sm font-medium">Members</h2>
            <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
              {members.length === 0 && <li className="p-3 text-sm text-muted-foreground">No team members yet.</li>}
              {members.map((member) => (
                <li key={member.uid} className="flex items-center gap-3 p-3">
                  {member.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.photoURL} alt="" referrerPolicy="no-referrer" className="size-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                      {initial(member.displayName || member.email || "")}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.displayName || member.email}
                      {member.uid === user?.uid && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{userRoleLabel(member.role)}</span>
                </li>
              ))}
            </ul>
          </section>

          {invites.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-medium">Pending invites</h2>
              <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                {invites.map((invite) => (
                  <li key={invite.id} className="flex items-center gap-3 p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-sm text-muted-foreground">
                      {initial(invite.email)}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm">{invite.email}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Expires {new Date(inviteExpiry(invite)).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  )
}
