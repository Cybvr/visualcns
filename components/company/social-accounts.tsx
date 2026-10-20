"use client"

import { useEffect, useState, type FormEvent } from "react"
import { SectionHeader } from "@/components/dashboard/section-header"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SocialIcon } from "@/components/company/social-icon"
import { platformLabel, SOCIAL_PLATFORMS } from "@/lib/social"
import { useSocialAccounts, useSocialRequest } from "@/lib/social-client"
import { cn } from "@/lib/utils"

const RESULT_MESSAGES: Record<string, [ok: boolean, message: string]> = {
  connected: [true, "Account connected."],
  cancelled: [false, "Connecting was cancelled."],
  expired: [false, "That link expired. Please try again."],
  error: [false, "Couldn't connect that account."],
}

const CONNECT_PLATFORMS = SOCIAL_PLATFORMS.filter((platform) => !["google", "threads", "youtube", "tiktok"].includes(platform.key))

/**
 * A company's social accounts on its settings page. The client (or the
 * agency) clicks a platform, signs in on the platform itself, and comes back.
 */
export function SocialAccounts({ companyId, variant = "default" }: { companyId: string; variant?: "default" | "compact" | "banner" }) {
  const { info, error, loading, reload, request } = useSocialAccounts(companyId)
  const [connecting, setConnecting] = useState("")
  const [removing, setRemoving] = useState("")
  const pathname = usePathname() ?? "/"
  const router = useRouter()
  const searchParams = useSearchParams()

  // Back from the platform's sign-in page: say how it went, then tidy the address.
  const result = searchParams.get("social")
  useEffect(() => {
    if (!result) return
    const [ok, message] = RESULT_MESSAGES[result] ?? RESULT_MESSAGES.error
    if (ok) toast.success(message)
    else toast.error(message)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("social")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  async function connect(platform: string) {
    setConnecting(platform)
    try {
      const { url } = await request<{ url: string }>("connect", { method: "POST", body: { companyId, platform, returnTo: pathname } })
      window.location.assign(url)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Couldn't start connecting.")
      setConnecting("")
    }
  }

  async function disconnect(accountId: string) {
    setRemoving(accountId)
    try {
      await request("accounts", { method: "DELETE", body: { companyId, accountId } })
      await reload()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Couldn't disconnect.")
    } finally {
      setRemoving("")
    }
  }

  // The SocialAPI key lives in Agency settings; until it's added there is nothing to connect.
  if (info && !info.configured) return null

  if (variant === "banner") {
    if (!info) return null
    return (
      <div className="relative overflow-hidden rounded-2xl bg-neutral-950 px-6 py-7 text-white sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-24 size-96 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.7)_0%,rgba(76,29,149,0.3)_45%,transparent_70%)]" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-md">
            <h2 className="text-xl font-semibold leading-snug text-white sm:text-2xl">Connect your social pages</h2>
            <div className="mt-2 text-sm text-white/65">Link your accounts to post from here and see your followers and posts in one place.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {CONNECT_PLATFORMS.map((platform, index) => (
              <button
                key={platform.key}
                type="button"
                disabled={Boolean(connecting)}
                onClick={() => void connect(platform.key)}
                aria-label={`Connect ${platform.label}`}
                title={`Connect ${platform.label}`}
                className={cn(
                  "grid size-12 place-items-center rounded-xl bg-white shadow-[0_8px_24px_rgba(124,58,237,0.35)] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-60 [&_svg]:size-5",
                  index % 2 ? "rotate-6" : "-rotate-6",
                )}
              >
                {connecting === platform.key ? <Loader2 className="animate-spin text-neutral-900" aria-hidden="true" /> : <SocialIcon platform={platform.key} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (variant === "compact") {
    if (loading && !info) return <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading social accounts" />
    if (!info) return null
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">Connect:</span>
        {CONNECT_PLATFORMS.map((platform) => (
          <Button key={platform.key} type="button" variant="outline" size="icon" disabled={Boolean(connecting)} onClick={() => void connect(platform.key)} aria-label={`Connect ${platform.label}`} title={`Connect ${platform.label}`}>
            {connecting === platform.key ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <SocialIcon platform={platform.key} />}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <section className="py-2">
      <SectionHeader title="Social accounts" />
      <div className="mt-5 space-y-5">
        {loading && !info ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading</p>
        ) : !info ? (
          <p className="text-sm text-muted-foreground">{error || "Couldn't load social accounts."}</p>
        ) : (
          <>
            {info.accounts.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {info.accounts.map((account) => (
                  <li key={account.id} className="flex items-center gap-3 px-4 py-3">
                    <SocialIcon platform={account.platform} className="size-5" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{account.name || account.username || platformLabel(account.platform)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {platformLabel(account.platform)}{account.username ? ` · @${account.username.replace(/^@/, "")}` : ""}
                      </p>
                    </div>
                    {account.status !== "active" && (
                      <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                        {account.status === "disconnected" ? "Connect again" : account.status}
                      </span>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" disabled={removing === account.id} onClick={() => void disconnect(account.id)} aria-label={`Disconnect ${platformLabel(account.platform)}`}>
                      {removing === account.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              {CONNECT_PLATFORMS.map((platform) => (
                <Button key={platform.key} type="button" variant="outline" size="icon" disabled={Boolean(connecting)} onClick={() => void connect(platform.key)} aria-label={`Connect ${platform.label}`} title={`Connect ${platform.label}`}>
                  {connecting === platform.key ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <SocialIcon platform={platform.key} />}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

/** The agency's SocialAPI key, set once in Agency settings. Saving it also turns on live alerts. */
export function SocialApiSettings() {
  const request = useSocialRequest()
  const [status, setStatus] = useState<{ configured: boolean; webhook: boolean; callbackUrl: string } | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    request<{ configured: boolean; webhook: boolean; callbackUrl: string }>("setup").then(setStatus).catch(() => setStatus(null))
  }, [request])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!apiKey.trim()) return
    setSaving(true)
    try {
      const result = await request<{ webhook: boolean; webhookError?: string }>("setup", { method: "POST", body: { apiKey } })
      if (result.webhook) toast.success("Social accounts are on.")
      else toast.warning(`Key saved, but live alerts aren't on yet${result.webhookError ? `: ${result.webhookError}` : "."}`)
      setApiKey("")
      setStatus((current) => (current ? { ...current, configured: true, webhook: result.webhook } : current))
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Couldn't save the key.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {status?.configured ? "Clients can connect their accounts from their settings page. Paste a new key to replace it." : "Add your SocialAPI key so clients can connect their accounts."}{" "}
        In the SocialAPI dashboard, allow the callback address <code className="break-all text-foreground">{status?.callbackUrl || "/api/social/callback"}</code>.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="social-api-key">SocialAPI key</Label>
        <Input id="social-api-key" type="password" autoComplete="off" placeholder={status?.configured ? "Saved" : "sapi_key_…"} value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
      </div>
      <Button type="submit" size="sm" disabled={saving || !apiKey.trim()}>
        {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Save key
      </Button>
    </form>
  )
}
