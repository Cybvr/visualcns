"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { FileText, Globe } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { useCompanyPage } from "@/components/company/company-page-context"
import { useSubscription } from "@/components/company/company-plan"
import { SiteThumbnail } from "@/components/ngai/site-thumbnail"
import { useNgaiChats } from "@/components/ngai/use-ngai-chats"
import { useNgaiTemplates } from "@/components/ngai/use-ngai-templates"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/billing"
import { invoiceIsOpen, invoiceIsOverdue } from "@/lib/invoice-reminders"
import { ngaiPublishedUrl, openInBuilder } from "@/lib/ngai"
import { invoiceBalance } from "@/lib/portal-model"
import { planAccess } from "@/lib/subscription"
import { cn } from "@/lib/utils"
import { visitDay, visitTime, watchKiosk, watchVisitors, type Visitor, type VisitorKiosk } from "@/lib/visitors"

/* Home pages for Websites, Finance and Security: the next step, the key numbers, then the latest items. */

type Step = { title: string; text: string; cta: string; href?: string; onClick?: () => void }

/** `step` is undefined while loading, null when there's nothing to do. */
function NextStep({ step, done }: { step: Step | null | undefined; done: string }) {
  if (step === undefined) return <div className="h-40 animate-pulse rounded-lg bg-muted/50" aria-hidden="true" />
  if (!step) {
    return (
      <section aria-label="Next recommended step" className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">All set</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{done}</p>
      </section>
    )
  }
  return (
    <section aria-label="Next recommended step" className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Next recommended step</p>
      <h2 className="mt-2 text-xl font-semibold leading-snug tracking-[-0.02em] text-foreground sm:text-2xl">{step.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
      {step.href ? (
        <Button asChild className="mt-5"><Link href={step.href}>{step.cta}</Link></Button>
      ) : (
        <Button type="button" className="mt-5" onClick={step.onClick}>{step.cta}</Button>
      )}
    </section>
  )
}

function Stats({ items }: { items: { label: string; value: ReactNode; tone?: "bad" }[] }) {
  return (
    <dl className="mt-4 grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-lg bg-muted/50 p-4">
          <dt className="truncate text-xs text-muted-foreground">{item.label}</dt>
          <dd className={cn("mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl", item.tone === "bad" ? "text-destructive" : "text-foreground")}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ListCard({ title, href, link, empty, children }: { title: string; href: string; link: string; empty: string; children: ReactNode[] }) {
  return (
    <section aria-label={title} className="mt-4 rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        <Link href={href} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">{link}</Link>
      </div>
      {children.length ? <ul className="mt-3 divide-y divide-border">{children}</ul> : <p className="mt-2 text-sm text-muted-foreground">{empty}</p>}
    </section>
  )
}

/** Websites: the company's sites and domains. */
export function WebsitesHomeSection() {
  const { company, sectionHref } = useCompanyPage()
  const { user } = useAuth()
  const { chats } = useNgaiChats(50)
  const templates = useNgaiTemplates()
  const [domains, setDomains] = useState<{ name: string; status: string }[] | null>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    user.getIdToken()
      .then((token) => fetch(`/api/domains?companyId=${encodeURIComponent(company.id)}`, { headers: { Authorization: `Bearer ${token}` } }))
      .then((response) => response.json().catch(() => ({})))
      .then((data) => { if (active) setDomains(Array.isArray(data.domains) ? data.domains : []) })
      .catch(() => { if (active) setDomains([]) })
    return () => { active = false }
  }, [company.id, user])

  const open = (path: string) => void openInBuilder(path, async () => user ? user.getIdToken() : null)
  const sites = chats ?? []
  const live = sites.filter((site) => site.slug)
  const draft = sites.find((site) => !site.slug)
  const connected = (domains ?? []).filter((domain) => domain.status === "connected").length

  const step: Step | null = !sites.length
    ? { title: "Build your website", text: "Describe your business and get a fast website you can edit yourself, in minutes.", cta: "Start building", onClick: () => open("/dashboard") }
    : !live.length && draft
      ? { title: `Publish ${draft.title}`, text: "Your site is ready to go live. Pick a name and it gets its own address straight away.", cta: "Open and publish", onClick: () => open(`/chat/${encodeURIComponent(draft.id)}`) }
      : domains && !domains.length
        ? { title: "Use your own domain", text: "Point yourbusiness.com at your website so customers find you at your own address.", cta: "Connect a domain", href: sectionHref("domains") }
        : null

  return (
    <div className="mt-4">
      <NextStep step={chats === null || domains === null ? undefined : step} done="Your website is live on your own domain." />
      <Stats items={[
        { label: "Websites", value: chats === null ? "–" : sites.length },
        { label: "Live", value: chats === null ? "–" : live.length },
        { label: "Domains connected", value: domains === null ? "–" : connected },
      ]} />
      <section aria-label="Your websites" className="mt-4 rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-medium text-foreground">Your websites</h3>
          <Link href={sectionHref("sites")} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">See all</Link>
        </div>
        {sites.length ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {sites.slice(0, 3).map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => site.slug ? window.open(ngaiPublishedUrl(site.slug), "_blank", "noopener,noreferrer") : open(`/chat/${encodeURIComponent(site.id)}`)}
                className="min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block aspect-video overflow-hidden rounded-lg border border-border"><SiteThumbnail code={site.code} title={site.title} /></span>
                <span className="mt-1.5 block truncate text-sm font-medium text-foreground">{site.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{site.slug ? "Live" : "Draft"}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Globe className="size-4" aria-hidden="true" />No websites yet.</p>
        )}
      </section>
      {templates?.length !== 0 && (
        <section aria-label="Start with a template" className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="min-w-0 text-base font-medium text-foreground">Start with a template</h3>
            <button type="button" onClick={() => open("/dashboard/templates")} className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">See all</button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates === null
              ? Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-video animate-pulse rounded-lg bg-muted/50" aria-hidden="true" />)
              : templates.slice(0, 6).map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => open(`/start/${encodeURIComponent(template.id)}`)}
                  title={template.description}
                  className="group min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block aspect-video overflow-hidden rounded-lg border border-border transition-colors group-hover:border-foreground/40"><SiteThumbnail code={template.code} title={template.title} /></span>
                  <span className="mt-1.5 block truncate text-sm font-medium text-foreground">{template.title}</span>
                  <span className="block text-xs font-medium text-muted-foreground">${template.price}</span>
                </button>
              ))}
          </div>
        </section>
      )}
    </div>
  )
}

/** Finance: what's owed, the plan, and the latest paperwork. */
export function FinanceHomeSection() {
  const { company, invoices, contracts, documents, sectionHref } = useCompanyPage()
  const billing = useSubscription(company.id)
  const open = invoices.filter(invoiceIsOpen)
  const overdue = open.filter((invoice) => invoiceIsOverdue(invoice))
  const currency = open[0]?.currency || invoices[0]?.currency || "NGN"
  const owed = open.filter((invoice) => (invoice.currency || "NGN") === currency).reduce((total, invoice) => total + invoiceBalance(invoice), 0)
  const access = billing === undefined ? null : planAccess(billing)
  const invoiceHref = (id: string) => sectionHref("documents", { doc: `invoice:${id}` })

  const step: Step | null = overdue.length
    ? { title: `Pay invoice ${overdue[0].invoiceNumber}`, text: `${formatMoney(invoiceBalance(overdue[0]), overdue[0].currency)} is overdue${overdue.length > 1 ? `, with ${overdue.length - 1} more overdue` : ""}.`, cta: "View invoice", href: invoiceHref(overdue[0].id) }
    : open.length
      ? { title: `Invoice ${open[0].invoiceNumber} is due`, text: `${formatMoney(invoiceBalance(open[0]), open[0].currency)}${open[0].dueOn ? ` due ${new Date(open[0].dueOn).toLocaleDateString(undefined, { dateStyle: "medium" })}` : ""}.`, cta: "View invoice", href: invoiceHref(open[0].id) }
      : access && !access.allowed
        ? { title: "Choose a plan", text: "Your plan is paused. Pick a plan to keep Marketing, Pass and more running.", cta: "See plans", href: sectionHref("billings") }
        : null

  const recent = [
    ...invoices.map((item) => ({ id: `invoice-${item.id}`, title: item.title || `Invoice ${item.invoiceNumber}`, meta: invoiceIsOverdue(item) ? "Overdue" : invoiceIsOpen(item) ? "Due" : item.status === "paid" ? "Paid" : "Invoice", href: invoiceHref(item.id), at: String(item.issuedOn || "") })),
    ...contracts.map((item) => ({ id: `contract-${item.id}`, title: item.title, meta: "Contract", href: sectionHref("documents", { doc: `contract:${item.id}` }), at: "" })),
    ...documents.map((item) => ({ id: `document-${item.id}`, title: item.title || "Document", meta: "Document", href: sectionHref("documents", { doc: `document:${item.id}` }), at: "" })),
  ].slice(0, 5)

  return (
    <div className="mt-4">
      <NextStep step={step} done="Nothing to pay right now." />
      <Stats items={[
        { label: "Outstanding", value: formatMoney(owed, currency) },
        { label: "Overdue", value: overdue.length, tone: overdue.length ? "bad" : undefined },
        { label: "Plan", value: access === null ? "–" : access.state === "active" || access.state === "grace" ? "Active" : access.state === "trial" ? "Trial" : "Paused" },
      ]} />
      <ListCard title="Latest documents" href={sectionHref("documents")} link="See all" empty="No invoices or documents yet.">
        {recent.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:underline-offset-4">
              <span className="flex min-w-0 items-center gap-2 text-foreground"><FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="truncate">{item.title}</span></span>
              <span className={cn("shrink-0 text-xs", item.meta === "Overdue" ? "text-destructive" : "text-muted-foreground")}>{item.meta}</span>
            </Link>
          </li>
        ))}
      </ListCard>
    </div>
  )
}

/** Security (Pass): who's in now, recent visits, and the front-desk sign-in. */
export function SecurityHomeSection() {
  const { company, visitorAgencyId, sectionHref } = useCompanyPage()
  const [visitors, setVisitors] = useState<Visitor[] | null>(null)
  const [kiosk, setKiosk] = useState<VisitorKiosk | null | undefined>(undefined)

  useEffect(() => {
    if (!visitorAgencyId) return
    return watchVisitors(visitorAgencyId, company.id, setVisitors, () => setVisitors([]))
  }, [company.id, visitorAgencyId])
  useEffect(() => watchKiosk(company.id, setKiosk, () => setKiosk(null)), [company.id])

  const counts = useMemo(() => {
    const list = visitors ?? []
    const startOfDay = new Date().setHours(0, 0, 0, 0)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const at = (visitor: Visitor) => visitor.signedInAt?.toMillis?.() ?? 0
    return {
      onSite: list.filter((visitor) => visitor.status === "on_site").length,
      today: list.filter((visitor) => at(visitor) >= startOfDay).length,
      week: list.filter((visitor) => at(visitor) >= weekAgo).length,
    }
  }, [visitors])

  const step: Step | null | undefined = kiosk === undefined || visitors === null
    ? undefined
    : !kiosk?.enabled
      ? { title: "Set up front-desk sign-in", text: "Turn on visitor sign-in to replace the paper visitor book. Guests sign in on a tablet or their phone, and hosts get an email.", cta: "Set up sign-in", href: sectionHref("visitors") }
      : counts.onSite
        ? { title: `${counts.onSite} ${counts.onSite === 1 ? "visitor is" : "visitors are"} on site`, text: "Sign people out when they leave, so your list stays accurate.", cta: "See who's in", href: sectionHref("visitors") }
        : null

  return (
    <div className="mt-4">
      <NextStep step={step} done="Front-desk sign-in is on. Nobody is on site right now." />
      <Stats items={[
        { label: "On site now", value: visitors === null ? "–" : counts.onSite },
        { label: "Today", value: visitors === null ? "–" : counts.today },
        { label: "This week", value: visitors === null ? "–" : counts.week },
      ]} />
      <ListCard title="Recent visitors" href={sectionHref("visitors")} link="See all" empty="No visitors yet.">
        {(visitors ?? []).slice(0, 5).map((visitor) => (
          <li key={visitor.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="block truncate text-foreground">{visitor.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{visitor.hostName ? `To see ${visitor.hostName}` : visitor.visitorCompany || "Visitor"}</span>
            </span>
            <span className="shrink-0 text-right text-xs text-muted-foreground">
              {visitor.status === "on_site" ? <span className="text-emerald-700 dark:text-emerald-400">On site</span> : visitDay(visitor.signedInAt)}
              <span className="block">{visitTime(visitor.signedInAt)}</span>
            </span>
          </li>
        ))}
      </ListCard>
    </div>
  )
}
