import type { ReactNode } from "react"
import {
  BarChart3,
  Clock3,
  Database,
  Globe,
  Layers,
  LayoutTemplate,
  Lock,
  MonitorSmartphone,
  MousePointer2,
  Plug,
  Radio,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react"

import type { CartService } from "@/lib/cart"
import { cn } from "@/lib/utils"

/**
 * A drawn picture for each service, made from small mock interface pieces on a
 * violet or night background, so every card shows what the service actually is.
 */

type Tone = "bright" | "night"

const TONES: Record<Tone, string> = {
  bright: "bg-[linear-gradient(135deg,#6d28d9_0%,#7c5cf6_55%,#a395fb_100%)]",
  night: "bg-[linear-gradient(160deg,#160f36_0%,#24185a_60%,#35258a_100%)]",
}

function Frame({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <div className={cn("relative aspect-[16/9] overflow-hidden rounded-2xl", TONES[tone])} aria-hidden="true">
      {tone === "night" ? (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:28px_28px]" />
      ) : (
        <div className="absolute -right-1/4 -top-1/4 size-[120%] rotate-12 bg-white/[0.06]" />
      )}
      {children}
    </div>
  )
}

/** A small square icon tile. */
function Tile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={cn("grid size-9 place-items-center rounded-xl bg-violet-900/70 text-white shadow-lg ring-1 ring-white/15", className)}>
      <Icon className="size-4" />
    </span>
  )
}

/** A short coloured dash plus a long faint line, like a placeholder text row. */
function Row({ dark = false, accent = "bg-emerald-400" }: { dark?: boolean; accent?: string }) {
  return (
    <div className={cn("flex h-9 items-center gap-2 rounded-lg px-3 shadow-sm", dark ? "bg-black/60 ring-1 ring-violet-400/30" : "bg-white/95")}>
      <span className="h-1 w-3 rounded-full bg-violet-300" />
      <span className={cn("h-1 w-3 rounded-full", accent)} />
      <span className={cn("ml-auto h-px w-1/2", dark ? "bg-violet-300/50" : "bg-violet-300")} />
    </div>
  )
}

/** A dark pill with an icon and a few words. */
function Chip({ icon: Icon, label, className }: { icon: LucideIcon; label: string; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 rounded-lg bg-black/55 px-3 py-2 text-[11px] font-medium whitespace-nowrap text-white ring-1 ring-violet-300/30", className)}>
      <Icon className="size-3.5 shrink-0" />
      {label}
    </span>
  )
}

/** Stacked screens beside two icon tiles: a site or app with several pages. */
function ScreensArt({ icons, rows = 3 }: { icons: [LucideIcon, LucideIcon]; rows?: number }) {
  return (
    <Frame tone="bright">
      <div className="absolute left-[12%] top-[16%] flex flex-col gap-2">
        <Tile icon={icons[0]} />
        <Tile icon={icons[1]} className="bg-emerald-500" />
      </div>
      <div className="absolute left-[32%] right-[14%] top-[14%] flex flex-col gap-2">
        {Array.from({ length: rows }, (_, index) => <Row key={index} accent={index % 2 ? "bg-violet-300" : "bg-emerald-400"} />)}
      </div>
    </Frame>
  )
}

/** A globe tile wired to labelled chips: a full app's moving parts. */
function StackArt({ chips }: { chips: { icon: LucideIcon; label: string }[] }) {
  return (
    <Frame tone="night">
      <Tile icon={Globe} className="absolute left-[12%] top-1/2 size-11 -translate-y-1/2 bg-violet-500" />
      <span className="absolute left-[calc(12%+2.75rem)] top-1/2 h-px w-[10%] bg-violet-300/60" />
      <span className="absolute left-[calc(22%+2.75rem)] top-[24%] bottom-[24%] w-px bg-violet-300/60" />
      <div className="absolute right-[8%] top-1/2 flex -translate-y-1/2 flex-col gap-2">
        {chips.map((chip) => <Chip key={chip.label} icon={chip.icon} label={chip.label} />)}
      </div>
    </Frame>
  )
}

/** A big soft tile with an icon and a cursor about to click it. */
function SpotlightArt({ icon: Icon, tags = [] }: { icon: LucideIcon; tags?: string[] }) {
  return (
    <Frame tone="bright">
      <div className="absolute left-1/2 top-1/2 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl bg-violet-100 shadow-[0_18px_40px_rgba(30,27,75,0.35)]">
        <Icon className="size-10 text-violet-600" />
      </div>
      <MousePointer2 className="absolute left-[calc(50%+2.2rem)] top-[calc(50%+1.4rem)] size-10 fill-neutral-950 text-white" />
      <div className="absolute bottom-[10%] left-[8%] flex flex-wrap gap-1.5">
        {tags.map((tag) => <span key={tag} className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-violet-700">{tag}</span>)}
      </div>
    </Frame>
  )
}

/** A terminal-like panel of API calls with their status codes. */
function ApiArt() {
  const calls: [string, string, string][] = [["GET", "/users", "200"], ["POST", "/orders", "201"], ["PUT", "/auth", "200"]]
  return (
    <Frame tone="night">
      <div className="absolute left-[10%] right-[18%] top-[16%] rounded-xl bg-black/70 p-3 ring-1 ring-violet-400/30">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-white"><Plug className="size-3.5" />Endpoints</div>
        <div className="mt-2 space-y-1.5 font-mono text-[10px]">
          {calls.map(([method, path, code]) => (
            <div key={path} className="flex items-center gap-2">
              <span className="w-9 text-violet-300">{method}</span>
              <span className="text-white/80">{path}</span>
              <span className="ml-auto text-emerald-400">{code}</span>
            </div>
          ))}
        </div>
      </div>
      <Tile icon={Database} className="absolute bottom-[14%] right-[8%] size-11 bg-violet-500" />
    </Frame>
  )
}

/** A browser window with a hero block and the platform's mark in the corner. */
function SiteArt({ mark, markClass }: { mark: string; markClass: string }) {
  return (
    <Frame tone="bright">
      <div className="absolute inset-x-[12%] top-[14%] bottom-0 rounded-t-xl bg-white/95 p-3 shadow-xl">
        <div className="flex gap-1">
          <span className="size-1.5 rounded-full bg-rose-400" /><span className="size-1.5 rounded-full bg-amber-400" /><span className="size-1.5 rounded-full bg-emerald-400" />
        </div>
        <div className="mt-3 h-2 w-2/3 rounded-full bg-violet-200" />
        <div className="mt-1.5 h-2 w-1/2 rounded-full bg-violet-100" />
        <div className="mt-3 h-5 w-20 rounded-md bg-violet-600" />
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <span className="h-8 rounded-md bg-violet-100" /><span className="h-8 rounded-md bg-violet-100" /><span className="h-8 rounded-md bg-violet-100" />
        </div>
      </div>
      <span className={cn("absolute right-[7%] top-[9%] grid size-12 place-items-center rounded-2xl text-lg font-black shadow-xl", markClass)}>{mark}</span>
    </Frame>
  )
}

/** A product card, a cart button and a sales line going up. */
function StoreArt() {
  return (
    <Frame tone="night">
      <div className="absolute left-[10%] top-[16%] w-[48%] rounded-xl bg-white/95 p-3 shadow-xl">
        <div className="h-10 rounded-lg bg-[linear-gradient(135deg,#1e3a8a,#60a5fa)]" />
        <div className="mt-2 text-[11px] font-semibold text-neutral-900">Navy cap</div>
        <div className="text-[11px] text-neutral-500">$59</div>
      </div>
      <span className="absolute left-[50%] top-[46%] grid size-10 place-items-center rounded-full bg-violet-500 text-white shadow-xl"><ShoppingCart className="size-4" /></span>
      <div className="absolute bottom-[12%] right-[8%] w-[44%] rounded-xl bg-black/60 p-2.5 ring-1 ring-violet-300/30">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white">$15,347 <span className="rounded bg-emerald-400/20 px-1 text-[9px] text-emerald-300">+17.5%</span></div>
        <svg viewBox="0 0 100 30" className="mt-1 h-6 w-full"><polyline points="0,26 18,22 34,24 50,15 66,17 82,8 100,4" fill="none" stroke="#34d399" strokeWidth="2" /></svg>
      </div>
    </Frame>
  )
}

/** A rising line with a headline number: growth and reporting. */
function ChartArt({ label, value }: { label: string; value: string }) {
  return (
    <Frame tone="night">
      <div className="absolute inset-x-[10%] top-[14%] bottom-[14%] rounded-xl bg-black/50 p-3 ring-1 ring-violet-300/30">
        <div className="flex items-center justify-between text-[11px] text-white/70">
          <span className="flex items-center gap-1.5"><BarChart3 className="size-3.5" />{label}</span>
          <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">{value}</span>
        </div>
        <svg viewBox="0 0 200 60" className="mt-2 h-[60%] w-full" preserveAspectRatio="none">
          <defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity="0.5" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs>
          <path d="M0,52 L30,46 L60,48 L90,34 L120,36 L150,20 L200,8 L200,60 L0,60 Z" fill="url(#chart-fill)" />
          <polyline points="0,52 30,46 60,48 90,34 120,36 150,20 200,8" fill="none" stroke="#a78bfa" strokeWidth="2.5" />
        </svg>
      </div>
    </Frame>
  )
}

/** A workflow's steps as nodes joined by a line, ending on a highlighted step. */
function FlowArt({ steps, tone }: { steps: string[]; tone: Tone }) {
  const shown = steps.slice(0, 3)
  return (
    <Frame tone={tone}>
      <div className="absolute inset-x-[8%] top-1/2 flex -translate-y-1/2 items-center">
        {shown.map((step, index) => (
          <div key={step} className="flex min-w-0 flex-1 items-center">
            <span className={cn(
              "min-w-0 truncate rounded-lg px-2.5 py-2 text-[11px] font-semibold shadow-lg",
              index === shown.length - 1 ? "bg-white text-violet-700" : "bg-black/55 text-white ring-1 ring-violet-300/30",
            )}>{step}</span>
            {index < shown.length - 1 && <span className="mx-1 h-px min-w-3 flex-1 bg-violet-200/70" />}
          </div>
        ))}
      </div>
      {steps.length > 3 && <span className="absolute bottom-[12%] right-[8%] rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium text-white">+{steps.length - 3} more steps</span>}
    </Frame>
  )
}

/** A speed dial with the response time under it: support you can count on. */
function GaugeArt({ response, hours, sweep }: { response: string; hours: string; sweep: number }) {
  const length = 220
  return (
    <Frame tone="night">
      <svg viewBox="0 0 120 120" className="absolute left-1/2 top-[8%] h-[76%] -translate-x-1/2">
        <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" strokeDasharray={`${length} 400`} strokeLinecap="round" transform="rotate(135 60 60)" />
        <circle cx="60" cy="60" r="46" fill="none" stroke="#2dd4bf" strokeWidth="7" strokeDasharray={`${length * sweep} 400`} strokeLinecap="round" transform="rotate(135 60 60)" />
      </svg>
      <Zap className="absolute left-1/2 top-[30%] size-10 -translate-x-1/2 fill-violet-500 text-violet-400" />
      <span className="absolute bottom-[8%] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-white ring-1 ring-violet-300/30">
        <Clock3 className="size-3.5" />{response} reply · {hours}
      </span>
    </Frame>
  )
}

export function ServiceArt({ service, index = 0 }: { service: CartService; index?: number }) {
  switch (service.id) {
    case "development-mvp-web-app": return <ScreensArt icons={[LayoutTemplate, MonitorSmartphone]} />
    case "development-full-web-app": return <StackArt chips={[{ icon: Lock, label: "Sign in & roles" }, { icon: Database, label: "Database" }, { icon: Plug, label: "Integrations" }]} />
    case "development-custom-web-app": return <SpotlightArt icon={Layers} tags={["Payments", "Real-time", "Streaming"]} />
    case "development-add-on-backend-api": return <ApiArt />
    case "platforms-webflow-site": return <SiteArt mark="W" markClass="bg-[#146ef5] text-white" />
    case "platforms-framer-site": return <SiteArt mark="F" markClass="bg-neutral-950 text-white" />
    case "platforms-wordpress-site": return <SiteArt mark="W" markClass="bg-white text-[#21759b] ring-4 ring-[#21759b]" />
    case "platforms-add-on-woocommerce": return <StoreArt />
    case "growth-visualhq-pro": return <ChartArt label="Campaign reach" value="+32%" />
  }
  if (service.group === "Maintenance") {
    const [hours = "", response = ""] = service.highlights ?? []
    const sweep = response.startsWith("Same") ? 0.95 : response.startsWith("24") ? 0.7 : 0.45
    return <GaugeArt response={response} hours={hours} sweep={sweep} />
  }
  if (service.steps?.length) {
    if (service.name === "Signal") return <ChartArt label="Leads this month" value="+17.5%" />
    return <FlowArt steps={service.steps} tone={index % 2 ? "bright" : "night"} />
  }
  const fallback: Record<string, LucideIcon> = { Development: Layers, Platforms: Globe, Growth: TrendingUp, Workflows: Radio, Maintenance: ShieldCheck }
  return <SpotlightArt icon={fallback[service.group] ?? Users} />
}
