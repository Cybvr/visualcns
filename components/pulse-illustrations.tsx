// Theme-aware SVG illustrations for the Pulse page hero, feature and step cards.

const FONT = { fontFamily: "inherit" } as const

function Frame({
  label,
  children,
  width = 400,
  height = 220,
}: {
  label: string
  children: React.ReactNode
  width?: number
  height?: number
}) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="h-auto w-full" style={FONT}>
      <rect width={width} height={height} rx="14" className="fill-muted/50" />
      {children}
    </svg>
  )
}

function Bar({ x, y, w }: { x: number; y: number; w: number }) {
  return <rect x={x} y={y} width={w} height="5" rx="2.5" className="fill-muted" />
}

/* Hero — a report card with score ring and the four sections */
export function PulseReportIllustration() {
  const rows = [
    { label: "Needs attention", count: "4", color: "#ef4444" },
    { label: "Opportunities", count: "7", color: "#10b981" },
    { label: "Market & competitors", count: "9", color: "#3b82f6" },
    { label: "Your business online", count: "6", color: "#8b5cf6" },
  ]
  return (
    <svg viewBox="0 0 360 300" role="img" aria-label="A Pulse report showing a health score of 72 and four sections" className="h-auto w-full" style={FONT}>
      <rect x="0" y="0" width="360" height="300" rx="20" fill="white" />
      <text x="24" y="38" fontSize="11" fontWeight="600" letterSpacing="1.5" fill="#71717a">BUSINESS HEALTH</text>
      <text x="24" y="62" fontSize="18" fontWeight="700" fill="#18181b">Acme Logistics</text>
      <circle cx="300" cy="52" r="30" fill="none" stroke="#e4e4e7" strokeWidth="7" />
      <circle
        cx="300"
        cy="52"
        r="30"
        fill="none"
        stroke="#10b981"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${0.72 * 188.5} 188.5`}
        transform="rotate(-90 300 52)"
      />
      <text x="300" y="58" textAnchor="middle" fontSize="17" fontWeight="700" fill="#18181b">72</text>
      {rows.map((row, i) => (
        <g key={row.label} transform={`translate(24 ${100 + i * 46})`}>
          <rect width="312" height="36" rx="10" fill="#f4f4f5" />
          <circle cx="18" cy="18" r="5" fill={row.color} />
          <text x="32" y="22" fontSize="12" fill="#27272a">{row.label}</text>
          <text x="296" y="22" textAnchor="end" fontSize="13" fontWeight="700" fill="#18181b">{row.count}</text>
        </g>
      ))}
    </svg>
  )
}

/* 01 — website crawl and technical checks */
export function ScanIllustration() {
  const checks = [
    { label: "Page speed", ok: false },
    { label: "Broken links", ok: false },
    { label: "Titles & meta", ok: true },
    { label: "Mobile layout", ok: true },
  ]
  return (
    <Frame label="A website is scanned and checks are marked passed or failed">
      <rect x="28" y="28" width="170" height="164" rx="10" className="fill-background stroke-border" strokeWidth="2" />
      <circle cx="42" cy="42" r="3" className="fill-muted-foreground" />
      <circle cx="52" cy="42" r="3" className="fill-muted-foreground" />
      <circle cx="62" cy="42" r="3" className="fill-muted-foreground" />
      <rect x="40" y="58" width="146" height="44" rx="6" className="fill-muted" />
      <Bar x={40} y={114} w={120} />
      <Bar x={40} y={126} w={100} />
      <Bar x={40} y={138} w={130} />
      <Bar x={40} y={150} w={80} />
      <rect x="40" y="164" width="60" height="16" rx="8" className="fill-primary" />
      <path d="M28 96 h170" className="stroke-primary" strokeWidth="2" strokeDasharray="5 4" />

      <path d="M210 110 h20" className="stroke-muted-foreground" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M228 104 l8 6 -8 6" fill="none" className="stroke-muted-foreground" strokeWidth="2" />

      <rect x="246" y="40" width="128" height="140" rx="10" className="fill-background stroke-border" strokeWidth="2" />
      {checks.map((check, i) => (
        <g key={check.label} transform={`translate(258 ${58 + i * 30})`}>
          <circle cx="8" cy="8" r="8" fill={check.ok ? "#10b981" : "#ef4444"} />
          {check.ok ? (
            <path d="M4 8 l3 3 5 -6" fill="none" stroke="white" strokeWidth="1.8" />
          ) : (
            <path d="M5 5 l6 6 M11 5 l-6 6" stroke="white" strokeWidth="1.8" />
          )}
          <text x="24" y="12" fontSize="10" className="fill-foreground">{check.label}</text>
        </g>
      ))}
    </Frame>
  )
}

/* 02 — competitors on a ranking chart */
export function CompetitorsIllustration() {
  const bars = [
    { label: "You", h: 92, you: true },
    { label: "Rival A", h: 120 },
    { label: "Rival B", h: 70 },
    { label: "Rival C", h: 54 },
  ]
  return (
    <Frame label="A bar chart comparing your business with three competitors">
      <text x="32" y="40" fontSize="12" fontWeight="700" className="fill-foreground">Search visibility</text>
      <path d="M32 180 h336" className="stroke-border" strokeWidth="1.5" />
      {bars.map((bar, i) => (
        <g key={bar.label}>
          <rect
            x={52 + i * 82}
            y={180 - bar.h}
            width="46"
            height={bar.h}
            rx="6"
            className={bar.you ? "fill-primary" : "fill-muted-foreground/40"}
          />
          <text x={75 + i * 82} y="198" textAnchor="middle" fontSize="10" fontWeight={bar.you ? 700 : 400} className="fill-muted-foreground">
            {bar.label}
          </text>
        </g>
      ))}
      <path d="M216 52 l18 -8" className="stroke-foreground" strokeWidth="1.5" />
      <rect x="236" y="30" width="118" height="24" rx="12" className="fill-foreground" />
      <text x="295" y="46" textAnchor="middle" fontSize="10" fontWeight="600" className="fill-background">New pricing page</text>
    </Frame>
  )
}

/* 03 — market opportunities: events, tenders, grants, partners */
export function OpportunitiesIllustration() {
  const items = [
    { tag: "Grant", title: "SME growth fund", meta: "Closes 14 Nov", color: "#10b981" },
    { tag: "Tender", title: "State logistics contract", meta: "Closes 2 Dec", color: "#3b82f6" },
    { tag: "Event", title: "Lagos trade expo", meta: "18–20 Jan", color: "#f59e0b" },
  ]
  return (
    <Frame label="A list of grants, tenders and events found for the business">
      {items.map((item, i) => (
        <g key={item.title} transform={`translate(32 ${26 + i * 58})`}>
          <rect width="336" height="48" rx="10" className="fill-background stroke-border" strokeWidth="1.5" />
          <rect x="12" y="14" width="52" height="20" rx="10" fill={item.color} opacity="0.15" />
          <text x="38" y="28" textAnchor="middle" fontSize="10" fontWeight="700" fill={item.color}>{item.tag}</text>
          <text x="76" y="22" fontSize="11" fontWeight="600" className="fill-foreground">{item.title}</text>
          <text x="76" y="37" fontSize="9" className="fill-muted-foreground">{item.meta}</text>
          <path d="M312 18 l6 6 -6 6" fill="none" className="stroke-muted-foreground" strokeWidth="1.8" />
        </g>
      ))}
    </Frame>
  )
}

/* 04 — prioritised action plan with steps */
export function ActionPlanIllustration() {
  const actions = [
    { level: "High", color: "#ef4444", title: "Fix 12 broken product links", done: true },
    { level: "High", color: "#ef4444", title: "Add Google Business profile", done: false },
    { level: "Medium", color: "#f59e0b", title: "Reply to 5 recent reviews", done: false },
  ]
  return (
    <Frame label="A prioritised list of actions, one marked done">
      <text x="32" y="40" fontSize="12" fontWeight="700" className="fill-foreground">What to do first</text>
      {actions.map((action, i) => (
        <g key={action.title} transform={`translate(32 ${54 + i * 50})`}>
          <rect width="336" height="40" rx="10" className="fill-background stroke-border" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="8" className={action.done ? "fill-primary" : "fill-background stroke-border"} strokeWidth="2" />
          {action.done && <path d="M16 20 l3 3 5 -6" fill="none" className="stroke-primary-foreground" strokeWidth="1.8" />}
          <text
            x="38"
            y="24"
            fontSize="11"
            className={action.done ? "fill-muted-foreground" : "fill-foreground"}
            textDecoration={action.done ? "line-through" : undefined}
          >
            {action.title}
          </text>
          <rect x="268" y="11" width="56" height="18" rx="9" fill={action.color} opacity="0.15" />
          <text x="296" y="24" textAnchor="middle" fontSize="9" fontWeight="700" fill={action.color}>{action.level}</text>
        </g>
      ))}
    </Frame>
  )
}

/* Step 1 — confirm business details */
export function DetailsStepIllustration() {
  return (
    <Frame label="A form with business name and website filled in" height={140}>
      <rect x="40" y="22" width="320" height="96" rx="10" className="fill-background stroke-border" strokeWidth="2" />
      <text x="56" y="46" fontSize="9" className="fill-muted-foreground">Business name</text>
      <rect x="56" y="52" width="288" height="16" rx="4" className="fill-muted" />
      <text x="62" y="64" fontSize="9" className="fill-foreground">Acme Logistics</text>
      <text x="56" y="86" fontSize="9" className="fill-muted-foreground">Website</text>
      <rect x="56" y="92" width="288" height="16" rx="4" className="fill-muted" />
      <text x="62" y="104" fontSize="9" className="fill-foreground">acmelogistics.ng</text>
    </Frame>
  )
}

/* Step 2 — scan running */
export function RunStepIllustration() {
  return (
    <Frame label="A scan in progress across six areas" height={140}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i} transform={`translate(${52 + (i % 3) * 104} ${30 + Math.floor(i / 3) * 46})`}>
          <rect width="88" height="34" rx="8" className="fill-background stroke-border" strokeWidth="1.5" />
          <circle cx="17" cy="17" r="7" className={i < 4 ? "fill-primary" : "fill-muted"} />
          {i < 4 && <path d="M13.5 17 l2.5 2.5 4 -5" fill="none" className="stroke-primary-foreground" strokeWidth="1.6" />}
          <rect x="30" y="14" width={i < 4 ? 44 : 36} height="6" rx="3" className="fill-muted" />
        </g>
      ))}
    </Frame>
  )
}

/* Step 3 — act on the plan */
export function ActStepIllustration() {
  return (
    <Frame label="A score rising after actions are completed" height={140}>
      <path d="M48 112 L120 96 L188 100 L256 70 L340 36" fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {[
        [48, 112],
        [120, 96],
        [188, 100],
        [256, 70],
        [340, 36],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="4.5" className="fill-background stroke-primary" strokeWidth="2.5" />
      ))}
      <text x="340" y="24" textAnchor="middle" fontSize="11" fontWeight="700" className="fill-foreground">84</text>
      <text x="48" y="128" textAnchor="middle" fontSize="9" className="fill-muted-foreground">58</text>
    </Frame>
  )
}
