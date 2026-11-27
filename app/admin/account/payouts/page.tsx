"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { AccountNav } from "@/components/account/account-nav"
import { inlineInput, Row } from "@/components/account/profile-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const FIELDS = [
  { key: "accountName", label: "Account name", type: "text" },
  { key: "bankName", label: "Bank", type: "text" },
  { key: "accountNumber", label: "Account number", type: "text" },
  { key: "paypalEmail", label: "PayPal", type: "email" },
] as const

type Payout = Record<(typeof FIELDS)[number]["key"], string>

/** Where a creator gets paid. Saved through /api/creator; their agency's admins can read it. */
export default function PayoutsPage() {
  const { user } = useAuth()
  const [payout, setPayout] = useState<Payout>({ accountName: "", bankName: "", accountNumber: "", paypalEmail: "" })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    user.getIdToken()
      .then((token) => fetch("/api/creator", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }))
      .then((response) => response.json())
      .then((result: { payout?: Payout }) => { if (active && result.payout) setPayout(result.payout) })
      .catch(() => undefined)
    return () => { active = false }
  }, [user])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || saving) return
    setSaving(true)
    setNotice(null)
    try {
      const response = await fetch("/api/creator", {
        method: "PUT",
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify(payout),
      })
      if (!response.ok) throw new Error()
      setNotice({ tone: "success", text: "Saved." })
    } catch {
      setNotice({ tone: "error", text: "Couldn't save. Try again." })
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-9 sm:px-6 lg:mx-0">
      <AccountNav />
      <form onSubmit={save} className="mt-6">
        {FIELDS.map((field) => (
          <Row key={field.key} id={`payout-${field.key}`} label={field.label}>
            <Input
              id={`payout-${field.key}`}
              type={field.type}
              value={payout[field.key]}
              onChange={(event) => setPayout((current) => ({ ...current, [field.key]: event.target.value }))}
              className={inlineInput}
            />
          </Row>
        ))}
        <div className="flex items-center gap-3 pt-5">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save changes
          </Button>
          {notice && <span className={notice.tone === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{notice.text}</span>}
        </div>
      </form>
    </main>
  )
}
