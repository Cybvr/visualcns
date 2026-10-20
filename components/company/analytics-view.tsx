"use client"

import { useState } from "react"
import { SectionHeader } from "@/components/dashboard/section-header"
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"

import { ListSearch } from "@/components/dashboard/list-search"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { Invoice } from "@/lib/billing"
import { creativeStatus, CREATIVE_STATUSES, type CampaignCreative } from "@/lib/campaign-creatives"
import { PERSON_STATUSES, type CampaignPerson } from "@/lib/campaign-people"

type AnalyticsScope =
  | { type: "company"; companyId: string }
  | { type: "campaign"; campaignId: string }

type AnalyticsRange = "1d" | "7d" | "30d" | "90d" | "all"

const analyticsRanges: Array<{ value: AnalyticsRange; label: string; days: number | null }> = [
  { value: "1d", label: "Last 24 hours", days: 1 },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "all", label: "All time", days: null },
]

const creatorChartConfig = {
  creators: { label: "Creators", color: "var(--chart-1)" },
} satisfies ChartConfig

const contentChartConfig = {
  posts: { label: "Posts", color: "var(--chart-1)" },
} satisfies ChartConfig

const platformChartConfig = {
  creators: { label: "Creators", color: "var(--chart-1)" },
} satisfies ChartConfig

const campaignChartConfig = {
  creators: { label: "Creators", color: "var(--chart-1)" },
  posts: { label: "Posts", color: "var(--chart-2)" },
} satisfies ChartConfig

const creatorPaymentChartConfig = {
  paid: { label: "Creators paid", color: "var(--chart-1)" },
  outstanding: { label: "Creator payments due", color: "var(--chart-3)" },
} satisfies ChartConfig

const billingChartConfig = {
  collected: { label: "Collected", color: "var(--chart-1)" },
  outstanding: { label: "Outstanding", color: "var(--destructive)" },
  draft: { label: "Draft", color: "var(--chart-2)" },
  voided: { label: "Voided", color: "var(--muted-foreground)" },
} satisfies ChartConfig

const chartColors = ["var(--chart-2)", "var(--chart-1)", "var(--chart-3)", "var(--chart-5)"]

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)
}

function formatMoney(value: number, currency: string, compact = true) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 2,
    }).format(value / 100)
  } catch {
    return `${currency} ${compactNumber(value / 100)}`
  }
}

function invoiceTime(invoice: Invoice) {
  const issued = invoice.issuedOn ? new Date(`${invoice.issuedOn}T00:00:00`).getTime() : Number.NaN
  return Number.isNaN(issued) ? invoice.createdAt?.toMillis() ?? 0 : issued
}

function outstandingInvoiceAmount(invoice: Invoice) {
  if (invoice.status === "draft" || invoice.status === "void" || invoice.status === "paid") return 0
  const recordedBalance = Math.max(0, Number(invoice.amount || 0) - Number(invoice.amountPaid || 0))
  return recordedBalance || Math.max(0, Number(invoice.amount || 0))
}

function collectedInvoiceAmount(invoice: Invoice) {
  const total = Math.max(0, Number(invoice.amount || 0))
  if (invoice.status === "paid") return total
  if (invoice.status === "draft" || invoice.status === "void") return 0
  return Math.max(0, total - outstandingInvoiceAmount(invoice))
}

function EmptyChart({ children }: { children: string }) {
  return (
    <div className="mt-6 flex min-h-60 items-center justify-center rounded-xl bg-muted/40 px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

/** Loading state shared by client-wide and campaign analytics. */
export function AnalyticsSkeleton({ scope }: { scope: "company" | "campaign" }) {
  return (
    <div role="status" aria-label="Loading analytics" aria-busy="true" className="space-y-8">
      <span className="sr-only">Loading analytics…</span>

      {scope === "campaign" && <Skeleton className="h-6 w-44" />}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-11 w-full max-w-sm rounded-full" />
        <Skeleton className="h-11 w-full rounded-full sm:w-40" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-2xl bg-muted/60 px-4 py-4">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="mt-2 h-4 w-28 max-w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: scope === "company" ? 6 : 5 }, (_, index) => {
          const wide = scope === "company" ? index === 0 || index >= 3 : index >= 2
          return (
            <section key={index} className={wide ? "rounded-2xl border border-border p-5 sm:p-6 xl:col-span-2" : "rounded-2xl border border-border p-5 sm:p-6"}>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-2 h-4 w-64 max-w-full" />
              <Skeleton className="mt-6 h-60 w-full rounded-xl" />
            </section>
          )
        })}
      </div>
    </div>
  )
}

/** The shared analytics surface, guarded so every caller can expose only its intended scope. */
export function AnalyticsView({
  scope,
  people,
  content,
  campaigns = [],
  invoices = [],
}: {
  scope: AnalyticsScope
  people: CampaignPerson[]
  content: CampaignCreative[]
  campaigns?: Array<{ id: string; title: string }>
  invoices?: Invoice[]
}) {
  const [query, setQuery] = useState("")
  const [range, setRange] = useState<AnalyticsRange>("30d")
  const [now] = useState(() => Date.now())
  const term = query.trim().toLowerCase()
  const selectedRange = analyticsRanges.find((option) => option.value === range) ?? analyticsRanges[2]
  const rangeStart = selectedRange.days === null ? null : now - selectedRange.days * 24 * 60 * 60 * 1000
  const isInRange = (time: number) => rangeStart === null || time >= rangeStart
  const scopePeople = people.filter((person) => scope.type === "company"
    ? person.companyId === scope.companyId
    : person.projectId === scope.campaignId)
  const scopeContent = content.filter((post) => scope.type === "company"
    ? post.companyId === scope.companyId
    : post.projectId === scope.campaignId)
  const scopeInvoices = scope.type === "company"
    ? invoices
    : invoices.filter((invoice) => invoice.projectId === scope.campaignId)
  const allScopedPeople = scopePeople.filter((person) => isInRange(person.createdAt?.toMillis() ?? 0))
  const allScopedContent = scopeContent.filter((post) => isInRange(post.createdAt?.toMillis() ?? 0))
  const allScopedInvoices = scopeInvoices.filter((invoice) => isInRange(invoiceTime(invoice)))
  const scopedPeople = allScopedPeople.filter((person) => !term || [
    person.handle,
    person.app,
    person.tier,
    person.status,
    person.category,
    person.wave,
    person.pay,
    person.currency,
    person.paid ? "paid" : "outstanding",
  ].some((value) => String(value ?? "").toLowerCase().includes(term)))
  const scopedContent = allScopedContent.filter((post) => !term || [
    post.title,
    post.status,
    post.body,
    post.postedBy,
    post.type,
  ].some((value) => String(value ?? "").toLowerCase().includes(term)))
  const invoiceMatchesSearch = (invoice: Invoice) => !term || [
    invoice.invoiceNumber,
    invoice.title,
    invoice.project,
    invoice.client,
    invoice.status,
    invoice.currency,
    invoice.amount,
    invoice.amountPaid,
  ].some((value) => String(value ?? "").toLowerCase().includes(term))
  const currentInvoices = scopeInvoices.filter(invoiceMatchesSearch)
  const scopedInvoices = allScopedInvoices.filter(invoiceMatchesSearch)
  const isCompany = scope.type === "company"
  const scopeId = isCompany ? scope.companyId : scope.campaignId

  const totalReach = scopedPeople.reduce((sum, person) => sum + Math.max(0, person.followers || 0), 0)
  const hasReachData = scopedPeople.some((person) => Math.max(0, person.followers || 0) > 0)
  const livePosts = scopedPeople.filter((person) => person.status === "Posted").length
  const approvedPosts = scopedContent.filter((post) => creativeStatus(post) === "Approved").length
  const unpaidInvoices = currentInvoices.filter((invoice) => outstandingInvoiceAmount(invoice) > 0)
  const outstandingByCurrency = [...unpaidInvoices.reduce((totals, invoice) => {
    const currency = invoice.currency || "NGN"
    totals.set(currency, (totals.get(currency) || 0) + outstandingInvoiceAmount(invoice))
    return totals
  }, new Map<string, number>())]
  const hasOutstanding = outstandingByCurrency.some(([, amount]) => amount > 0)
  const outstandingValue = outstandingByCurrency.length
    ? outstandingByCurrency.map(([currency, amount]) => formatMoney(amount, currency)).join(" + ")
    : formatMoney(0, currentInvoices[0]?.currency || scopeInvoices[0]?.currency || "NGN")

  const creatorData = PERSON_STATUSES.map((status) => ({
    status,
    creators: scopedPeople.filter((person) => person.status === status).length,
  }))

  const contentData = CREATIVE_STATUSES.map((status) => ({
    status,
    posts: scopedContent.filter((post) => creativeStatus(post) === status).length,
  }))

  const platformData = [...scopedPeople.reduce((platforms, person) => {
    const platform = person.app?.trim() || "Other"
    platforms.set(platform, (platforms.get(platform) || 0) + 1)
    return platforms
  }, new Map<string, number>())]
    .map(([platform, creators]) => ({ platform, creators }))
    .sort((a, b) => b.creators - a.creators)

  const campaignData = campaigns
    .map((campaign) => {
      const titleMatches = !term || campaign.title.toLowerCase().includes(term)
      const campaignPeople = (titleMatches ? allScopedPeople : scopedPeople).filter((person) => person.projectId === campaign.id)
      const campaignContent = (titleMatches ? allScopedContent : scopedContent).filter((post) => post.projectId === campaign.id)
      return {
        campaign: campaign.title,
        creators: campaignPeople.length,
        posts: campaignContent.length,
        visible: !term || titleMatches || campaignPeople.length > 0 || campaignContent.length > 0,
      }
    })
    .filter((campaign) => campaign.visible && campaign.creators + campaign.posts > 0)
    .sort((a, b) => (b.creators + b.posts) - (a.creators + a.posts))
    .slice(0, 8)

  const paymentCampaigns = isCompany
    ? campaigns
    : [{ id: scope.campaignId, title: "This campaign" }]
  const creatorPaymentData = paymentCampaigns
    .map((campaign) => {
      const titleMatches = !term || campaign.title.toLowerCase().includes(term)
      const creators = (titleMatches ? allScopedPeople : scopedPeople)
        .filter((person) => person.projectId === campaign.id && Math.max(0, person.pay || 0) > 0)
      return {
        campaign: campaign.title,
        paid: creators.filter((person) => person.paid).length,
        outstanding: creators.filter((person) => !person.paid).length,
        visible: !term || titleMatches || creators.length > 0,
      }
    })
    .filter((campaign) => campaign.visible && campaign.paid + campaign.outstanding > 0)
    .sort((a, b) => (b.paid + b.outstanding) - (a.paid + a.outstanding))
    .slice(0, 8)

  const campaignIds = new Set(campaigns.map((campaign) => campaign.id))
  const billingCampaigns = isCompany && allScopedInvoices.some((invoice) => !invoice.projectId || !campaignIds.has(invoice.projectId))
    ? [...paymentCampaigns, { id: "__other__", title: "Other invoices" }]
    : paymentCampaigns
  const billingData = billingCampaigns
    .flatMap((campaign) => {
      const titleMatches = !term || campaign.title.toLowerCase().includes(term)
      const source = titleMatches ? allScopedInvoices : scopedInvoices
      const campaignInvoices = source.filter((invoice) => campaign.id === "__other__"
        ? !invoice.projectId || !campaignIds.has(invoice.projectId)
        : invoice.projectId === campaign.id)
      const currencies = [...new Set(campaignInvoices.map((invoice) => invoice.currency || "NGN"))]
      return currencies.map((currency) => {
        const currencyInvoices = campaignInvoices.filter((invoice) => (invoice.currency || "NGN") === currency)
        return {
          campaign: currencies.length > 1 ? `${campaign.title} · ${currency}` : campaign.title,
          currency,
          collected: currencyInvoices.reduce((sum, invoice) => sum + collectedInvoiceAmount(invoice), 0),
          outstanding: currencyInvoices.reduce((sum, invoice) => sum + outstandingInvoiceAmount(invoice), 0),
          draft: currencyInvoices.filter((invoice) => invoice.status === "draft").reduce((sum, invoice) => sum + Math.max(0, Number(invoice.amount || 0)), 0),
          voided: currencyInvoices.filter((invoice) => invoice.status === "void").reduce((sum, invoice) => sum + Math.max(0, Number(invoice.amount || 0)), 0),
          visible: !term || titleMatches || currencyInvoices.length > 0,
        }
      })
    })
    .filter((campaign) => campaign.visible && campaign.collected + campaign.outstanding + campaign.draft + campaign.voided > 0)
    .sort((a, b) => (b.collected + b.outstanding + b.draft + b.voided) - (a.collected + a.outstanding + a.draft + a.voided))
    .slice(0, 8)

  const stats = [
    { value: outstandingValue, label: "Outstanding invoices", danger: hasOutstanding },
    { value: hasReachData ? compactNumber(totalReach) : "—", label: "Potential reach", danger: false },
    { value: `${livePosts}/${scopedPeople.length}`, label: "Creators posted", danger: false },
    { value: `${approvedPosts}/${scopedContent.length}`, label: "Posts approved", danger: false },
  ]
  const hasPeopleOutsideRange = scopePeople.length > 0 && allScopedPeople.length === 0
  const hasContentOutsideRange = scopeContent.length > 0 && allScopedContent.length === 0
  const hasInvoicesOutsideRange = scopeInvoices.length > 0 && allScopedInvoices.length === 0
  const hasActivityOutsideRange = (scopePeople.length > 0 || scopeContent.length > 0) && allScopedPeople.length === 0 && allScopedContent.length === 0
  const hasCreatorPaymentsOutsideRange = scopePeople.some((person) => Math.max(0, person.pay || 0) > 0)
    && !allScopedPeople.some((person) => Math.max(0, person.pay || 0) > 0)

  const filters = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <ListSearch value={query} onChange={setQuery} placeholder="Search analytics" className="w-full max-w-sm sm:flex-1" />
      <Select value={range} onValueChange={(value) => setRange(value as AnalyticsRange)}>
        <SelectTrigger size="default" aria-label="Date range" className="h-11 w-full rounded-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {analyticsRanges.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="space-y-8">
      {isCompany ? (
        filters
      ) : (
        <div className="space-y-3">
          <SectionHeader title="Campaign analytics" />
          {filters}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-muted/60 px-4 py-4">
            <p className={`font-semibold tabular-nums tracking-[-0.02em] ${outstandingByCurrency.length > 1 && stat.label === "Outstanding invoices" ? "text-lg" : "text-2xl"} ${stat.danger ? "text-destructive" : "text-foreground"}`}>{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {isCompany && (
          <section className="rounded-2xl border border-border p-5 sm:p-6 xl:col-span-2">
          <SectionHeader as="h3" title="Campaign activity" />
            {campaignData.length === 0 ? (
              <EmptyChart>{term && (allScopedPeople.length || allScopedContent.length) ? "No campaign activity matches your search." : hasActivityOutsideRange ? "No campaign activity in this period." : "Add campaigns to compare activity."}</EmptyChart>
            ) : (
              <ChartContainer
                id={`${scopeId}-campaign-activity`}
                config={campaignChartConfig}
                className="mt-6 min-h-60 w-full"
                style={{ height: Math.max(240, campaignData.length * 48) }}
              >
                <BarChart accessibilityLayer data={campaignData} layout="vertical" margin={{ left: 4, right: 24 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis
                    dataKey="campaign"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={116}
                    tickFormatter={(value: string) => value.length > 18 ? `${value.slice(0, 17)}…` : value}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="creators" fill="var(--color-creators)" radius={[0, 6, 6, 0]} />
                  <Bar dataKey="posts" fill="var(--color-posts)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-border p-5 sm:p-6">
          <SectionHeader as="h3" title="Creator pipeline" />
          <p className="mt-1 text-sm text-muted-foreground">
            {isCompany ? "Where rostered creators are across campaigns." : "Where rostered creators are in the campaign."}
          </p>
          {scopedPeople.length === 0 ? (
            <EmptyChart>{term && allScopedPeople.length ? "No creators match your search." : hasPeopleOutsideRange ? "No creators in this period." : "Add creators to see their progress."}</EmptyChart>
          ) : (
            <ChartContainer id={`${scopeId}-creator-pipeline`} config={creatorChartConfig} className="mt-6 min-h-60 w-full">
              <BarChart accessibilityLayer data={creatorData} layout="vertical" margin={{ left: 4, right: 16 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis dataKey="status" type="category" tickLine={false} axisLine={false} width={72} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel indicator="line" />} />
                <Bar dataKey="creators" radius={[0, 6, 6, 0]}>
                  {creatorData.map((row, index) => <Cell key={row.status} fill={chartColors[index]} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </section>

        <section className="rounded-2xl border border-border p-5 sm:p-6">
          <SectionHeader as="h3" title="Content pipeline" />
          <p className="mt-1 text-sm text-muted-foreground">
            {isCompany ? "How campaign posts are moving through review." : "How this campaign's posts are moving through review."}
          </p>
          {scopedContent.length === 0 ? (
            <EmptyChart>{term && allScopedContent.length ? "No content matches your search." : hasContentOutsideRange ? "No content in this period." : "Add content to see its review progress."}</EmptyChart>
          ) : (
            <ChartContainer id={`${scopeId}-content-pipeline`} config={contentChartConfig} className="mt-6 min-h-60 w-full">
              <BarChart accessibilityLayer data={contentData} layout="vertical" margin={{ left: 4, right: 16 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis dataKey="status" type="category" tickLine={false} axisLine={false} width={112} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel indicator="line" />} />
                <Bar dataKey="posts" radius={[0, 6, 6, 0]}>
                  {contentData.map((row, index) => <Cell key={row.status} fill={chartColors[index]} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </section>

        <section className="rounded-2xl border border-border p-5 sm:p-6 xl:col-span-2">
          <SectionHeader as="h3" title="Billing by campaign" />
          <p className="mt-1 text-sm text-muted-foreground">Invoice value by campaign and status.</p>
          {billingData.length === 0 ? (
            <EmptyChart>{term && allScopedInvoices.length ? "No invoices match your search." : hasInvoicesOutsideRange ? "No invoices in this period." : "No invoices yet."}</EmptyChart>
          ) : (
            <ChartContainer
              id={`${scopeId}-billing`}
              config={billingChartConfig}
              className="mt-6 min-h-60 w-full"
              style={{ height: Math.max(240, billingData.length * 48) }}
            >
              <BarChart accessibilityLayer data={billingData} layout="vertical" margin={{ left: 4, right: 24 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  dataKey="campaign"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={116}
                  tickFormatter={(value: string) => value.length > 18 ? `${value.slice(0, 17)}…` : value}
                />
                <ChartTooltip
                  cursor={false}
                  content={(
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(value, name, item) => (
                        <>
                          <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: String(item.color || "") }} />
                          <span className="text-muted-foreground">{billingChartConfig[String(name) as keyof typeof billingChartConfig]?.label}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{formatMoney(Number(value), String((item.payload as { currency?: string } | undefined)?.currency || "NGN"), false)}</span>
                        </>
                      )}
                    />
                  )}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="collected" stackId="billing" fill="var(--color-collected)" />
                <Bar dataKey="outstanding" stackId="billing" fill="var(--color-outstanding)" />
                <Bar dataKey="draft" stackId="billing" fill="var(--color-draft)" />
                <Bar dataKey="voided" stackId="billing" fill="var(--color-voided)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </section>

        <section className="rounded-2xl border border-border p-5 sm:p-6 xl:col-span-2">
          <SectionHeader as="h3" title="Creator payments" />
          {creatorPaymentData.length === 0 ? (
            <EmptyChart>{term && allScopedPeople.some((person) => Math.max(0, person.pay || 0) > 0) ? "No payments match your search." : hasCreatorPaymentsOutsideRange ? "No creator payments in this period." : "Add creator fees to track payments."}</EmptyChart>
          ) : (
            <ChartContainer
              id={`${scopeId}-creator-payments`}
              config={creatorPaymentChartConfig}
              className="mt-6 min-h-60 w-full"
              style={{ height: Math.max(240, creatorPaymentData.length * 48) }}
            >
              <BarChart accessibilityLayer data={creatorPaymentData} layout="vertical" margin={{ left: 4, right: 24 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  dataKey="campaign"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={116}
                  tickFormatter={(value: string) => value.length > 18 ? `${value.slice(0, 17)}…` : value}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="paid" fill="var(--color-paid)" radius={[0, 6, 6, 0]} />
                <Bar dataKey="outstanding" fill="var(--color-outstanding)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </section>

        <section className="rounded-2xl border border-border p-5 sm:p-6 xl:col-span-2">
          <SectionHeader as="h3" title="Creators by platform" />
          {platformData.length === 0 ? (
            <EmptyChart>{term && allScopedPeople.length ? "No platforms match your search." : hasPeopleOutsideRange ? "No creators in this period." : "Add creators to compare platforms."}</EmptyChart>
          ) : (
            <ChartContainer
              id={`${scopeId}-platforms`}
              config={platformChartConfig}
              className="mt-6 min-h-60 w-full"
              style={{ height: Math.max(240, platformData.length * 44) }}
            >
              <BarChart accessibilityLayer data={platformData} layout="vertical" margin={{ left: 4, right: 24 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis dataKey="platform" type="category" tickLine={false} axisLine={false} width={76} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel indicator="line" />} />
                <Bar dataKey="creators" fill="var(--color-creators)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </section>
      </div>
    </div>
  )
}
