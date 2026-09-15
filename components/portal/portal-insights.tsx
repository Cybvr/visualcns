"use client"

import { useCallback, useEffect, useState } from "react"
import { Globe, Megaphone, Palette, RefreshCw, Sparkles, TrendingUp, type LucideIcon } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Item = { title: string; detail: string; impact: string; effort: string }
type Category = { key: string; label: string; summary: string; items: Item[] }
type Payload = { generatedAt: string; categories: Category[] }

const ICONS: Record<string, LucideIcon> = {
  website: Globe,
  social: Megaphone,
  brand: Palette,
  content: TrendingUp,
}

const IMPACT_STYLE: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-900",
  medium: "bg-amber-50 text-amber-900",
  low: "bg-muted text-muted-foreground",
}

function whenText(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function CategoryCard({ category }: { category: Category }) {
  const Icon = ICONS[category.key] ?? Sparkles
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{category.label}</h3>
          {category.summary && <p className="mt-1 text-xs leading-5 text-muted-foreground">{category.summary}</p>}
        </div>
      </div>
      {category.items.length ? (
        <ul className="space-y-3">
          {category.items.map((item, index) => (
            <li key={index} className="rounded-lg bg-muted/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 text-sm font-medium">{item.title}</p>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", IMPACT_STYLE[item.impact] ?? IMPACT_STYLE.low)}>
                  {item.impact} impact
                </span>
              </div>
              {item.detail && <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{item.detail}</p>}
              <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{item.effort} effort</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing to suggest here yet.</p>
      )}
    </section>
  )
}

export function PortalInsights() {
  const { user } = useAuth()
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(
    async (refresh: boolean) => {
      if (!user) return
      refresh ? setRefreshing(true) : setLoading(true)
      setError("")
      try {
        const token = await user.getIdToken()
        const response = await fetch("/api/insights", {
          method: refresh ? "POST" : "GET",
          headers: refresh
            ? { "content-type": "application/json", Authorization: `Bearer ${token}` }
            : { Authorization: `Bearer ${token}` },
          ...(refresh ? { body: JSON.stringify({}) } : {}),
        })
        const body = await response.json()
        if (!response.ok) {
          setError(body?.error || "Could not load insights.")
          return
        }
        setPayload(body as Payload)
      } catch {
        setError("Could not load insights. Please try again.")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [user],
  )

  useEffect(() => {
    void load(false)
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Sparkles className="size-5 text-muted-foreground" />
            Insights
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Suggestions for growing your business across your website, social media, brand, and content. Based on your account and the work we're doing together.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {payload?.generatedAt && !loading && (
            <span className="hidden text-xs text-muted-foreground sm:inline">Updated {whenText(payload.generatedAt)}</span>
          )}
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={loading || refreshing}>
            <RefreshCw className={cn("mr-2 size-3.5", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">{error}</div>
      )}

      {loading && !payload && (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-52 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      )}

      {payload && (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {payload.categories.map((category) => (
            <CategoryCard key={category.key} category={category} />
          ))}
        </div>
      )}
    </div>
  )
}
