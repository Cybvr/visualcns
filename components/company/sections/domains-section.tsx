"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Check, Copy, Globe, Link2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { SectionAddButton } from "@/components/company/section-add-button"
import { CollectionView } from "@/components/dashboard/collection-view"
import { useNgaiChats } from "@/components/ngai/use-ngai-chats"
import { SiteThumbnail } from "@/components/ngai/site-thumbnail"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dnsRecordsFor, isValidDomain, normalizeDomain, type ConnectedDomain } from "@/lib/domains"
import { ngaiPublishedUrl } from "@/lib/ngai"
import { cn } from "@/lib/utils"

const NO_SITE = "none"

/** A row in the list: a free address a published site gets, or a custom domain the company connected. */
type DomainItem =
  | { kind: "free"; name: string; title: string; url: string; code: string; date: number }
  | { kind: "custom"; name: string; domain: ConnectedDomain; date?: number }

function StatusBadge({ status, label }: { status: ConnectedDomain["status"]; label?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
      status === "connected" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    )}>
      <span className={cn("size-1.5 rounded-full", status === "connected" ? "bg-emerald-500" : "bg-amber-500")} aria-hidden="true" />
      {label ?? (status === "connected" ? "Connected" : "Waiting for DNS")}
    </span>
  )
}

/** The company's custom domains: add one, set its DNS records, check it and choose the website it shows. */
export function DomainsSection() {
  const { company } = useCompanyPage()
  const { user } = useAuth()
  const { chats } = useNgaiChats(50)
  const [domains, setDomains] = useState<ConnectedDomain[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [openName, setOpenName] = useState<string | null>(null)

  const request = useCallback(async (path: string, method: string, body?: Record<string, unknown>) => {
    if (!user) throw new Error("Please sign in again.")
    const response = await fetch(path, {
      method,
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify({ companyId: company.id, ...body }) : undefined,
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Something went wrong. Please try again.")
    return data
  }, [company.id, user])

  useEffect(() => {
    if (!user) return
    let active = true
    request(`/api/domains?companyId=${encodeURIComponent(company.id)}`, "GET")
      .then((data) => { if (active) setDomains(data.domains ?? []) })
      .catch((error) => {
        if (!active) return
        setDomains([])
        toast.error(error instanceof Error ? error.message : "Couldn't load your domains.")
      })
    return () => { active = false }
  }, [company.id, request, user])

  const sites = (chats ?? []).filter((chat) => chat.slug)
  const open = domains?.find((domain) => domain.name === openName) ?? null

  function patch(name: string, next: Partial<ConnectedDomain>) {
    setDomains((current) => current?.map((domain) => (domain.name === name ? { ...domain, ...next } : domain)) ?? current)
  }

  async function remove(domain: ConnectedDomain) {
    await request("/api/domains", "DELETE", { name: domain.name })
    setDomains((current) => current?.filter((item) => item.name !== domain.name) ?? current)
    if (openName === domain.name) setOpenName(null)
  }

  if (!user) return <p className="mt-9 text-center text-sm text-muted-foreground">Sign in to manage your domains.</p>

  return (
    <div className="mt-5">
      <h2 className="sr-only">Domains</h2>
      <CollectionView<DomainItem>
        className="mt-4"
        items={[
          // Every published site is live at its free address, with no setup.
          ...sites.map((site): DomainItem => {
            const url = ngaiPublishedUrl(site.slug!)
            return { kind: "free", name: url.replace("https://", ""), title: site.title, url, code: site.code, date: site.updatedAt }
          }),
          ...(domains ?? []).map((domain): DomainItem => ({ kind: "custom", name: domain.name, domain, date: domain.createdAt })),
        ]}
        loading={domains === null}
        getKey={(item) => item.name}
        searchFields={(item) => item.kind === "free" ? [item.name, item.title] : [item.name, item.domain.siteSlug, item.domain.status]}
        searchPlaceholder="Search domains"
        viewKey="company-domains"
        actions={<SectionAddButton label="Connect a domain" onClick={() => setAdding(true)} />}
        empty={{
          icon: Link2,
          title: "No domains yet",
          action: <SectionAddButton label="Connect a domain" onClick={() => setAdding(true)} />,
        }}
        date={(item) => item.date}
        itemActions={(item) => item.kind === "custom" ? {
          noun: "domain",
          name: item.name,
          onDelete: () => remove(item.domain),
          deleteLabel: "Disconnect",
          deleteMessage: `${item.name} will stop showing your website.`,
        } : { noun: "address", name: item.name, onOpen: () => window.open(item.url, "_blank", "noopener,noreferrer") }}
        card={(item) => item.kind === "free" ? {
          title: item.name,
          icon: <Globe className="size-4 text-muted-foreground" aria-hidden="true" />,
          placeholder: <Globe className="size-8 text-muted-foreground/60" aria-hidden="true" />,
          // The site itself, with the Live tag over it.
          preview: (
            <span className="relative block size-full">
              <SiteThumbnail code={item.code} title={item.title} />
              <span className="absolute bottom-2 left-2"><StatusBadge status="connected" label="Live" /></span>
            </span>
          ),
          onClick: () => window.open(item.url, "_blank", "noopener,noreferrer"),
          ariaLabel: `Open ${item.name}`,
        } : {
          title: item.name,
          icon: <Link2 className="size-4 text-muted-foreground" aria-hidden="true" />,
          placeholder: <Link2 className="size-8 text-muted-foreground/60" aria-hidden="true" />,
          preview: (
            <div className="flex size-full flex-col items-center justify-center gap-2 bg-muted/50 p-3 text-center">
              <span className="max-w-full truncate text-sm font-medium text-foreground">{item.name}</span>
              <StatusBadge status={item.domain.status} />
            </div>
          ),
          onClick: () => setOpenName(item.name),
          ariaLabel: `Open ${item.name}`,
        }}
        row={(item) => ({ subtitle: item.kind === "free" ? `Live · ${item.title}` : item.domain.status === "connected" ? "Connected" : "Waiting for DNS" })}
      />

      <AddDomainDialog
        open={adding}
        onOpenChange={setAdding}
        onAdd={async (name) => {
          const data = await request("/api/domains", "POST", { name })
          setDomains((current) => [data.domain as ConnectedDomain, ...(current ?? [])])
          setAdding(false)
          setOpenName(name)
        }}
      />

      <DomainDialog
        domain={open}
        sites={sites.map((site) => ({ slug: site.slug!, title: site.title }))}
        onOpenChange={(value) => { if (!value) setOpenName(null) }}
        onCheck={async (domain) => {
          const data = await request("/api/domains/check", "POST", { name: domain.name })
          patch(domain.name, { status: data.status })
          return data.status as ConnectedDomain["status"]
        }}
        onSite={async (domain, siteSlug) => {
          await request("/api/domains", "PATCH", { name: domain.name, siteSlug })
          patch(domain.name, { siteSlug })
        }}
      />
    </div>
  )
}

function AddDomainDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (open: boolean) => void; onAdd: (name: string) => Promise<void> }) {
  const [value, setValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setValue("")
    setError("")
  }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const name = normalizeDomain(value)
    if (!isValidDomain(name)) {
      setError("Enter a domain like yourbusiness.com.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await onAdd(name)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't connect that domain.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Connect a domain</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            <Input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="yourbusiness.com"
              aria-label="Domain"
              aria-invalid={Boolean(error)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !value.trim()}>{saving ? "Connecting…" : "Connect"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={`Copy ${value}`}
      onClick={() => void navigator.clipboard?.writeText(value).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) })}
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
    </button>
  )
}

function DomainDialog({ domain, sites, onOpenChange, onCheck, onSite }: {
  domain: ConnectedDomain | null
  sites: Array<{ slug: string; title: string }>
  onOpenChange: (open: boolean) => void
  onCheck: (domain: ConnectedDomain) => Promise<ConnectedDomain["status"]>
  onSite: (domain: ConnectedDomain, siteSlug: string | null) => Promise<void>
}) {
  const [checking, setChecking] = useState(false)

  async function check() {
    if (!domain) return
    setChecking(true)
    try {
      const status = await onCheck(domain)
      if (status === "connected") toast.success(`${domain.name} is connected.`)
      else toast("DNS isn't pointing here yet. Changes can take up to 48 hours.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't check that domain.")
    } finally {
      setChecking(false)
    }
  }

  async function chooseSite(value: string) {
    if (!domain) return
    try {
      await onSite(domain, value === NO_SITE ? null : value)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save that.")
    }
  }

  const records = domain ? dnsRecordsFor(domain.name) : []

  return (
    <Dialog open={Boolean(domain)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {domain && (
          <>
            <DialogHeader>
              <DialogTitle className="break-all">{domain.name}</DialogTitle>
              <div><StatusBadge status={domain.status} /></div>
            </DialogHeader>

            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium text-foreground">Website</div>
              <Select value={domain.siteSlug ?? NO_SITE} onValueChange={(value) => void chooseSite(value)}>
                <SelectTrigger className="w-full" aria-label="Website">
                  <SelectValue placeholder="Choose a website" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SITE}>No website</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.slug} value={site.slug}>{site.title}</SelectItem>
                  ))}
                  {domain.siteSlug && !sites.some((site) => site.slug === domain.siteSlug) && (
                    <SelectItem value={domain.siteSlug}>{ngaiPublishedUrl(domain.siteSlug).replace("https://", "")}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-sm font-medium text-foreground">DNS records</div>
              <p className="text-sm text-muted-foreground">Add these at your domain provider.</p>
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,2fr)] gap-3 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <span>Type</span>
                  <span>Name</span>
                  <span>Value</span>
                </div>
                {records.map((record) => (
                  <div key={`${record.type}-${record.host}`} className="grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,2fr)] items-center gap-3 border-t border-border px-3 py-1.5 text-sm">
                    <span className="font-medium text-foreground">{record.type}</span>
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="truncate font-mono text-foreground">{record.host}</span>
                      <CopyButton value={record.host} />
                    </span>
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="truncate font-mono text-foreground">{record.value}</span>
                      <CopyButton value={record.value} />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
              <Button type="button" onClick={() => void check()} disabled={checking}>
                <RefreshCw className={cn("size-4", checking && "animate-spin")} aria-hidden="true" />
                {checking ? "Checking…" : "Check DNS"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
