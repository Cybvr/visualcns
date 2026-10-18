"use client"

import { useEffect, useState, type FormEvent } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { platformLabel, SOCIAL_PLATFORMS } from "@/lib/social"
import { useSocialAccounts, useSocialRequest } from "@/lib/social-client"

const RESULT_MESSAGES: Record<string, [ok: boolean, message: string]> = {
  connected: [true, "Account connected."],
  cancelled: [false, "Connecting was cancelled."],
  expired: [false, "That link expired. Please try again."],
  error: [false, "Couldn't connect that account."],
}

/**
 * A company's social accounts on its settings page. The client (or the
 * agency) clicks Connect, signs in on the platform itself, and comes back.
 * The agency also decides whether the client may post on their own.
 */
export function SocialAccounts({ companyId, companyName }: { companyId: string; companyName: string }) {
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

  async function setClientPosting(clientPosting: boolean) {
    try {
      await request("accounts", { method: "PATCH", body: { companyId, clientPosting } })
      await reload()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Couldn't save.")
    }
  }

  // The SocialAPI key lives in Agency settings; until it's added there is nothing to connect.
  if (info && !info.configured) return null

  return (
    <section className="py-2">
      <h2 className="surface-section-label">Social accounts</h2>
      <div className="mt-5 space-y-5">
        {loading && !info ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading</p>
        ) : !info ? (
          <p className="text-sm text-muted-foreground">{error || "Couldn't load social accounts."}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect accounts so posts can go out and messages come in here. You sign in on the platform itself; your password is never shared.
            </p>

            {info.accounts.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {info.accounts.map((account) => (
                  <li key={account.id} className="flex items-center gap-3 px-4 py-3">
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
              {SOCIAL_PLATFORMS.map((platform) => (
                <Button key={platform.key} type="button" variant="outline" size="sm" disabled={Boolean(connecting)} onClick={() => void connect(platform.key)}>
                  {connecting === platform.key ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                  {platform.label}
                </Button>
              ))}
            </div>

            {info.role === "agency" && (
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
                <Label htmlFor={`social-client-posting-${companyId}`} className="grid gap-1 text-sm font-normal">
                  <span className="font-medium">Let {companyName} post on their own</span>
                  <span className="text-muted-foreground">Off: they approve, your team posts. On: they can also schedule approved posts.</span>
                </Label>
                <Switch id={`social-client-posting-${companyId}`} checked={info.clientPosting} onCheckedChange={(checked) => void setClientPosting(checked)} />
              </div>
            )}
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
