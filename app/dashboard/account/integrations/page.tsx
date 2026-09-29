"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Link2, Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { AccountHeader, AccountNav } from "@/components/account/account-nav"
import { Button } from "@/components/ui/button"

type Notice = { tone: "success" | "error"; text: string } | null

export default function IntegrationsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const [googleConfigured, setGoogleConfigured] = useState(false)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  useEffect(() => {
    if (!user) {
      setGoogleConfigured(false)
      setGoogleEmail(null)
      setStatusLoading(false)
      return
    }

    let active = true
    setStatusLoading(true)
    void user.getIdToken().then((idToken) => fetch("/api/email/google/status", {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: "no-store",
    })).then(async (response) => {
      const result = await response.json().catch(() => ({})) as { configured?: boolean; email?: string | null; warning?: string }
      if (!active) return
      setGoogleConfigured(Boolean(result.configured))
      setGoogleEmail(result.email || null)
      if (result.warning) setNotice({ tone: "error", text: result.warning })
    }).catch(() => {
      if (active) setNotice({ tone: "error", text: "Google mailbox status could not be loaded." })
    }).finally(() => {
      if (active) setStatusLoading(false)
    })

    return () => { active = false }
  }, [user])

  useEffect(() => {
    const status = searchParams.get("google")
    if (status === "connected") {
      setNotice({ tone: "success", text: "Google mailbox connected." })
    } else if (status === "error") {
      setNotice({ tone: "error", text: searchParams.get("message") || "Google mailbox connection failed." })
    }
  }, [searchParams])

  async function connectGoogleMailbox() {
    if (!user || connecting) return
    setConnecting(true)
    setNotice(null)
    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/email/google/connect", { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" })
      const result = await response.json().catch(() => ({})) as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error || "Google mailbox setup is not configured yet.")
      window.location.assign(result.url)
    } catch (error) {
      setConnecting(false)
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Google mailbox connection failed." })
    }
  }

  if (!authLoading && !isAdmin) return null
  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-9 sm:px-6">
      <AccountNav />
      <AccountHeader title="Integrations" />

      <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Link2 className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-medium">Google mailbox</h2>
              <p className="mt-1 text-sm text-muted-foreground">Connect the mailbox used to send and receive email.</p>
              <p className="mt-3 flex items-center gap-2 text-sm">
                {googleConfigured ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" /> : <span className="size-2 rounded-full bg-muted-foreground/50" aria-hidden="true" />}
                <span className="text-muted-foreground">
                  {statusLoading ? "Checking connection…" : googleConfigured ? `Connected${googleEmail ? ` as ${googleEmail}` : ""}` : "Not connected"}
                </span>
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={connectGoogleMailbox} disabled={connecting || statusLoading}>
            {connecting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {connecting ? "Connecting…" : googleConfigured ? "Reconnect Google" : "Connect Google"}
          </Button>
        </div>
        {notice && <p role="status" className={`mt-4 text-sm ${notice.tone === "error" ? "text-destructive" : "text-emerald-700 dark:text-emerald-300"}`}>{notice.text}</p>}
      </section>
    </main>
  )
}
