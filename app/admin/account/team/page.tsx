"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { Check, Copy, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { AccountHeader, AccountNav } from "@/components/account/account-nav"
import { InitialAvatar } from "@/components/dashboard/compact-list-row"
import { MobileCardsSkeleton } from "@/components/dashboard/collection-skeletons"
import { MobileDataCard } from "@/components/dashboard/mobile-data-card"
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

/**
 * The people who run this agency: everyone with admin access, plus admin
 * invites that haven't been used yet. Adding someone gives them access right
 * away and returns a link for them to set a password.
 */
export default function AccountTeamPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [members, setMembers] = useState<AppUser[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
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
      const response = await fetch("/api/admin/team", {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: address, name: name.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not add team member")
      setInviteUrl(data.setupUrl)
      setCopied(false)
      setName("")
      setEmail("")
      toast.success("Team member added")
      void load()
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Could not add team member")
    } finally {
      setInviting(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast.success("Link copied")
    } catch {
      toast.error("Couldn't copy. Select the link and copy it.")
    }
  }

  if (!authLoading && !isAdmin) return null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-9 sm:px-6">
      <AccountNav />
      <AccountHeader title="Team" />

      <form onSubmit={handleInvite} className="mt-6 space-y-3">
        <h2 className="text-sm font-medium">Add team member</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="member-name">Name</Label>
            <Input id="member-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ada Obi" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>
        </div>
        <Button type="submit" disabled={inviting}>
          {inviting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Add member
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      {inviteUrl && (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-sm font-medium">Added. Send them this link to set their password</p>
          <div className="mt-2 flex gap-2">
            <Input readOnly value={inviteUrl} onFocus={(event) => event.target.select()} className="min-w-0 flex-1 text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={() => void copyLink()} aria-label="Copy link">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <section className="mt-8" role="status" aria-label="Loading members">
          <h2 className="text-sm font-medium">Members</h2>
          <div className="mt-2"><MobileCardsSkeleton rows={4} /></div>
        </section>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-sm font-medium">Members</h2>
            <div className="mt-2 space-y-2">
              {members.length === 0 && <p className="py-3 text-sm text-muted-foreground">No team members yet.</p>}
              {members.map((member) => (
                <MobileDataCard
                  key={member.uid}
                  surface="muted"
                  iconShape="circle"
                  imageUrl={member.photoURL || undefined}
                  icon={!member.photoURL ? <InitialAvatar text={member.displayName || member.email || ""} className="size-11" /> : undefined}
                  title={<>{member.displayName || member.email}{member.uid === user?.uid && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}</>}
                  subtitle={member.email}
                  trailing={userRoleLabel(member.role)}
                />
              ))}
            </div>
          </section>

          {invites.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-medium">Pending invites</h2>
              <div className="mt-2 space-y-2">
                {invites.map((invite) => (
                  <MobileDataCard
                    key={invite.id}
                    surface="muted"
                    iconShape="circle"
                    icon={<InitialAvatar text={invite.email} className="size-11" />}
                    title={invite.email}
                    subtitle="Pending invite"
                    trailing={`Expires ${new Date(inviteExpiry(invite)).toLocaleDateString()}`}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}
