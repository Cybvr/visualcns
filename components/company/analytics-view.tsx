"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"

import { ListSearch } from "@/components/dashboard/list-search"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { creativeStatus, CREATIVE_STATUSES, type CampaignCreative } from "@/lib/campaign-creatives"
import { PERSON_STATUSES, type CampaignPerson } from "@/lib/campaign-people"

type AnalyticsScope =
  | { type: "company"; companyId: string }
  | { type: "campaign"; campaignId: string }

const creatorChartConfig = {
  creators: { label: "Creators", color: "var(--chart-1)" },
} satisfies ChartConfig

const contentChartConfig = {
  posts: { label: "Posts", color: "var(--chart-1)" },
} satisfies ChartConfig

const reachChartConfig = {
  reach: { label: "Potential reach", color: "var(--chart-1)" },
} satisfies ChartConfig

const campaignChartConfig = {
  creators: { label: "Creators", color: "var(--chart-1)" },
  posts: { label: "Posts", color: "var(--chart-2)" },
} satisfies ChartConfig

const paymentChartConfig = {
  paid: { label: "Paid", color: "var(--chart-1)" },
  outstanding: { label: "Outstanding", color: "var(--chart-3)" },
} satisfies ChartConfig

const chartColors = ["var(--chart-2)", "var(--chart-1)", "var(--chart-3)", "var(--chart-5)"]

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)
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

      {scope === "campaign" ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-11 w-full max-w-sm rounded-full" />
        </div>
      ) : (
        <Skeleton className="h-11 w-full max-w-sm rounded-full" />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-2xl bg-muted/60 px-4 py-4">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="mt-2 h-4 w-28 max-w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: scope === "company" ? 5 : 4 }, (_, index) => {
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
}: {
  scope: AnalyticsScope
  people: CampaignPerson[]
  content: CampaignCreative[]
  campaigns?: Array<{ id: string; title: string }>
}) {
  const [query, setQuery] = useState("")
  const term = query.trim().toLowerCase()
  const allScopedPeople = people.filter((person) => scope.type === "company"
    ? person.companyId === scope.companyId
    : person.projectId === scope.campaignId)
  const allScopedContent = content.filter((post) => scope.type === "company"
    ? post.companyId === scope.companyId
    : post.projectId === scope.campaignId)
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
  const isCompany = scope.type === "company"
  const scopeId = isCompany ? scope.companyId : scope.campaignId

  const totalReach = scopedPeople.reduce((sum, person) => sum + Math.max(0, person.followers || 0), 0)
  const livePosts = scopedPeople.filter((person) => person.status === "Posted").length
  const approvedPosts = scopedContent.filter((post) => creativeStatus(post) === "Approved").length
  const averageMatch = scopedPeople.length
    ? Math.round(scopedPeople.reduce((sum, person) => sum + Math.max(0, person.overlap || 0), 0) / scopedPeople.length)
    : null

  const creatorData = PERSON_STATUSES.map((status) => ({
    status,
    creators: scopedPeople.filter((person) => person.status === status).length,
  }))

  const contentData = CREATIVE_STATUSES.map((status) => ({
    status,
    posts: scopedContent.filter((post) => creativeStatus(post) === status).length,
  }))

  const channelReach = [...scopedPeople.reduce((channels, person) => {
    const channel = person.app || "Other"
    channels.set(channel, (channels.get(channel) || 0) + Math.max(0, person.followers || 0))
    return channels
  }, new Map<string, number>())]
    .map(([channel, reach]) => ({ channel, reach }))
    .filter((item) => item.reach > 0)
    .sort((a, b) => b.reach - a.reach)

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
    .filter((campaign) => campaign.visible)
    .sort((a, b) => (b.creators + b.posts) - (a.creators + a.posts))
    .slice(0, 8)

  const paymentCampaigns = isCompany
    ? campaigns
    : [{ id: scope.campaignId, title: "This campaign" }]
  const paymentData = paymentCampaigns
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

  const stats = [
    { value: compactNumber(totalReach), label: "Potential reach" },
    { value: `${livePosts}/${scopedPeople.length}`, label: "Creators posted" },
    { value: `${approvedPosts}/${scopedContent.length}`, label: "Posts approved" },
    { value: averageMatch === null ? "—" : `${averageMatch}%`, label: "Audience match" },
  ]

  return (
    <div className="space-y-8">
      {isCompany ? (
        <ListSearch value={query} onChange={setQuery} placeholder="Search analytics" className="max-w-sm" />
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Campaign analytics</h2>
          <ListSearch value={query} onChange={setQuery} placeholder="Search analytics" className="max-w-sm" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-muted/60 px-4 py-4">
            <p className="text-2xl font-semibold tabular-nums tracking-[-0.02em] text-foreground">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {isCompany && (
          <section className="rounded-2xl border border-border p-5 sm:p-6 xl:col-span-2">
            <h3 className="font-semibold tracking-[-0.01em] text-foreground">Campaign activity</h3>
            <p className="mt-1 text-sm text-muted-foreground">Rostered creators and written posts across campaigns.</p>
            {campaignData.length === 0 ? (
              <EmptyChart>{term && campaigns.length ? "No campaigns match your search." : "Add campaigns to compare activity."}</EmptyChart>
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
          <h3 className="font-semibold tracking-[-0.01em] text-foreground">Creator pipeline</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isCompany ? "Where rostered creators are across campaigns." : "Where rostered creators are in the campaign."}
          </p>
          {scopedPeople.length === 0 ? (
            <EmptyChart>{term && allScopedPeople.length ? "No creators match your search." : "Add creators to see their progress."}</EmptyChart>
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
          <h3 className="font-semibold tracking-[-0.01em] text-foreground">Content pipeline</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isCompany ? "How campaign posts are moving through review." : "How this campaign's posts are moving through review."}
          </p>
          {scopedContent.length === 0 ? (
            <EmptyChart>{term && allScopedContent.length ? "No content matches your search." : "Add content to see its review progress."}</EmptyChart>
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
          <h3 className="font-semibold tracking-[-0.01em] text-foreground">Creator payments</h3>
          <p className="mt-1 text-sm text-muted-foreground">Creators paid and awaiting payment by campaign.</p>
          {paymentData.length === 0 ? (
            <EmptyChart>{term && allScopedPeople.some((person) => Math.max(0, person.pay || 0) > 0) ? "No payments match your search." : "Add creator fees to track payments."}</EmptyChart>
          ) : (
            <ChartContainer
              id={`${scopeId}-creator-payments`}
              config={paymentChartConfig}
              className="mt-6 min-h-60 w-full"
              style={{ height: Math.max(240, paymentData.length * 48) }}
            >
              <BarChart accessibilityLayer data={paymentData} layout="vertical" margin={{ left: 4, right: 24 }}>
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
          <h3 className="font-semibold tracking-[-0.01em] text-foreground">Potential reach by channel</h3>
          <p className="mt-1 text-sm text-muted-foreground">Combined follower counts for rostered creators on each platform.</p>
          {channelReach.length === 0 ? (
            <EmptyChart>Add creators with follower counts to compare channels.</EmptyChart>
          ) : (
            <ChartContainer
              id={`${scopeId}-channel-reach`}
              config={reachChartConfig}
              className="mt-6 min-h-60 w-full"
              style={{ height: Math.max(240, channelReach.length * 44) }}
            >
              <BarChart accessibilityLayer data={channelReach} layout="vertical" margin={{ left: 4, right: 24 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="channel" type="category" tickLine={false} axisLine={false} width={76} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel indicator="line" />} />
                <Bar dataKey="reach" fill="var(--color-reach)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </section>
      </div>
    </div>
  )
}
